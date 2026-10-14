// End-to-end checks for the reference server: Hive login (with a throwaway key) and room relay.
const assert = require('assert');
const WebSocket = require('ws');
const { PrivateKey, cryptoUtils } = require('@hiveio/dhive');
const { createServer } = require('./relay');

(async () => {
  const key = PrivateKey.fromSeed('hbp-test-' + Date.now());
  const pub = key.createPublic().toString();
  const fakeChain = { database: { getAccounts: async names => names.map(n => (n === 'alice' ? { name: n, posting: { key_auths: [[pub, 1]] } } : null)).filter(Boolean) } };
  const { server } = createServer({ allowedOrigin: '*', hiveClient: fakeChain });
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  // login: challenge -> sign like Keychain does (sha256 of the message, posting key) -> verify
  const { challenge } = await (await fetch(`${base}/auth/challenge?user=alice`)).json();
  const signature = key.sign(cryptoUtils.sha256(challenge)).toString();
  const ok = await (await fetch(`${base}/auth/verify`, { method: 'POST', body: JSON.stringify({ username: 'alice', challenge, signature }) })).json();
  assert.ok(ok.ok && ok.token, 'valid signature should log in');
  const replay = await fetch(`${base}/auth/verify`, { method: 'POST', body: JSON.stringify({ username: 'alice', challenge, signature }) });
  assert.strictEqual(replay.status, 401, 'a challenge can be used only once');
  const { challenge: c2 } = await (await fetch(`${base}/auth/challenge?user=alice`)).json();
  const forged = PrivateKey.fromSeed('someone-else').sign(cryptoUtils.sha256(c2)).toString();
  const bad = await fetch(`${base}/auth/verify`, { method: 'POST', body: JSON.stringify({ username: 'alice', challenge: c2, signature: forged }) });
  assert.strictEqual(bad.status, 401, 'a signature from another key must fail');

  // relay: two players in a room; the server stamps the verified Hive name and strips the token
  const open = () => new Promise(r => { const w = new WebSocket(base.replace('http', 'ws')); w.on('open', () => r(w)); });
  const a = await open(), b = await open();
  const got = new Promise(r => b.on('message', m => r(JSON.parse(m))));
  b.send(JSON.stringify({ v: 1, t: 'ready', from: 'b', room: 'r1' }));
  await new Promise(r => setTimeout(r, 50));
  a.send(JSON.stringify({ v: 1, t: 'hello', from: 'a', room: 'r1', name: 'alice', hive: 'bob', token: ok.token }));
  const msg = await got;
  assert.strictEqual(msg.hive, 'alice', 'server vouches for the verified Hive name only');
  assert.ok(!('token' in msg), 'token never reaches peers');
  const other = await open(); const leak = [];
  other.on('message', m => leak.push(m));
  other.send(JSON.stringify({ v: 1, t: 'ready', from: 'c', room: 'r2' }));
  a.send(JSON.stringify({ v: 1, t: 'attack', from: 'a', room: 'r1', lines: 2 }));
  await new Promise(r => setTimeout(r, 80));
  assert.strictEqual(leak.length, 0, 'rooms are isolated');
  [a, b, other].forEach(w => w.close()); server.close();
  console.log('server tests passed');
})().catch(e => { console.error(e); process.exit(1); });
