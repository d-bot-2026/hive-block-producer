// Verifies a Hive Keychain requestSignBuffer() login: the signature over sha256(challenge) must recover to one
// of the account's current posting public keys on chain. No private key ever leaves the player's wallet.
const { Client, Signature, cryptoUtils } = require('@hiveio/dhive');

const DEFAULT_NODES = ['https://api.hive.blog', 'https://api.deathwing.me', 'https://anyx.io'];
const defaultClient = () => new Client(DEFAULT_NODES, { timeout: 8000, failoverThreshold: 2 });

async function verifyLogin({ username, challenge, signature }, client = defaultClient()) {
  if (!username || !challenge || !signature) return { ok: false, reason: 'missing-fields' };
  let recovered;
  try { recovered = Signature.fromString(signature).recover(cryptoUtils.sha256(challenge)).toString(); }
  catch (e) { return { ok: false, reason: 'bad-signature' }; }
  const [account] = await client.database.getAccounts([username]);
  if (!account) return { ok: false, reason: 'no-account' };
  const postingKeys = account.posting.key_auths.map(([key]) => String(key));
  return postingKeys.includes(recovered) ? { ok: true, publicKey: recovered } : { ok: false, reason: 'key-mismatch' };
}

module.exports = { verifyLogin, defaultClient };
