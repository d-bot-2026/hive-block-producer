// Reference server for Hive Block Producer: Hive login challenges plus a WebSocket room relay for versus matches.
// Run: npm install && node relay.js   (PORT, ALLOWED_ORIGIN and HIVE_NODES can be set in the environment)
// It is deliberately small: it relays protocol v1 messages (see net/multiplayer.js) between players in a room
// and attaches the verified Hive name to a player when the client sends a valid session token.
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { verifyLogin, defaultClient } = require('./hive-verify');

const LIMITS = { msgBytes: 4096, msgsPerSecond: 30, playersPerRoom: 8, challengeMs: 5 * 60e3, sessionMs: 7 * 864e5 };

function createServer({ allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://d-bot-2026.github.io', hiveClient = defaultClient() } = {}) {
  const challenges = new Map(); // challenge -> { username, expires }
  const sessions = new Map();   // token -> { username, expires }
  const rooms = new Map();      // room -> Set<socket>

  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(JSON.stringify(body));
  };
  const readBody = req => new Promise((resolve, reject) => {
    let raw = ''; req.on('data', c => { raw += c; if (raw.length > 8192) { reject(new Error('too-large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(e); } });
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if (req.method === 'GET' && url.pathname === '/auth/challenge') {
      const username = String(url.searchParams.get('user') || '').toLowerCase();
      if (!/^[a-z][a-z0-9.-]{2,15}$/.test(username)) return json(res, 400, { error: 'invalid-name' });
      const challenge = `hive-block-producer login\naccount: ${username}\ntime: ${new Date().toISOString()}\nnonce: ${crypto.randomBytes(12).toString('hex')}`;
      challenges.set(challenge, { username, expires: Date.now() + LIMITS.challengeMs });
      return json(res, 200, { challenge });
    }
    if (req.method === 'POST' && url.pathname === '/auth/verify') {
      let body; try { body = await readBody(req); } catch (e) { return json(res, 400, { error: 'bad-body' }); }
      const c = challenges.get(body.challenge);
      challenges.delete(body.challenge); // one use only
      if (!c || c.expires < Date.now() || c.username !== String(body.username || '').toLowerCase()) return json(res, 401, { ok: false, reason: 'challenge' });
      const v = await verifyLogin({ username: c.username, challenge: body.challenge, signature: body.signature }, hiveClient).catch(() => ({ ok: false, reason: 'node-error' }));
      if (!v.ok) return json(res, 401, v);
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, { username: c.username, expires: Date.now() + LIMITS.sessionMs });
      return json(res, 200, { ok: true, token, username: c.username });
    }
    json(res, 404, { error: 'not-found' });
  });

  const wss = new WebSocketServer({ server, maxPayload: LIMITS.msgBytes });
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    if (allowedOrigin !== '*' && origin && origin !== allowedOrigin) { ws.close(1008, 'origin'); return; }
    let room = null, budget = LIMITS.msgsPerSecond, hive = null;
    const refill = setInterval(() => { budget = LIMITS.msgsPerSecond; }, 1000);
    ws.on('message', raw => {
      if (--budget < 0) return; // drop floods silently
      let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || typeof msg.room !== 'string' || msg.room.length > 32 || typeof msg.t !== 'string') return;
      if (!room) {
        const set = rooms.get(msg.room) || new Set();
        if (set.size >= LIMITS.playersPerRoom) { ws.close(1013, 'room-full'); return; }
        set.add(ws); rooms.set(msg.room, set); room = msg.room;
      }
      if (msg.room !== room) return;
      if (msg.t === 'hello') {
        const s = msg.token && sessions.get(msg.token);
        hive = s && s.expires > Date.now() ? s.username : null;
        delete msg.token;
      }
      msg.hive = hive; // only the server may vouch for a Hive name
      const out = JSON.stringify(msg);
      for (const peer of rooms.get(room)) if (peer !== ws && peer.readyState === 1) peer.send(out);
    });
    ws.on('close', () => {
      clearInterval(refill);
      const set = room && rooms.get(room);
      if (set) { set.delete(ws); if (!set.size) rooms.delete(room); }
    });
  });
  return { server, wss, challenges, sessions, rooms };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createServer().server.listen(port, () => console.log(`hive-block-producer relay on :${port}`));
}
module.exports = { createServer, LIMITS };
