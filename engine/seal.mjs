/* THE LOCK, the Brain's design (SECURITY.md, 18 Sep 2026) applied to the Engine.
   AES-256-GCM, key from the phrase by PBKDF2 (310,000 rounds, SHA-256). The salt is derived from the
   phrase so a device that remembered its key keeps working across nightly rebuilds; the IV is random
   per build. The published files are useless without the phrase. Nothing here prints a phrase. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const ITER = 310000;
const SALT_TAG = 'bb-engine-salt:';

export function seal(obj, phrase) {
  const salt = crypto.createHash('sha256').update(SALT_TAG + phrase).digest().subarray(0, 16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(phrase, salt, ITER, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64'), iter: ITER };
}
/* used by the self test: what was sealed must open with the same phrase and with nothing else */
export function unseal(box, phrase) {
  const salt = Buffer.from(box.salt, 'base64');
  const key = crypto.pbkdf2Sync(phrase, salt, box.iter, 32, 'sha256');
  const buf = Buffer.from(box.ct, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
  d.setAuthTag(buf.subarray(buf.length - 16));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString('utf8'));
}
/* lock-policy.js is the Brain's ONE definition of strong. Read from there, never copied. */
export function strength(phrase) {
  const p = path.join(os.homedir(), 'bb-brain', 'lock-policy.js');
  const src = fs.readFileSync(p, 'utf8').replace(/^#![^\n]*\n/, '');
  const mod = { exports: {} }; new Function('module', 'exports', 'require', src.replace(/if \(require\.main === module\)[\s\S]*$/, ''))(mod, mod.exports, () => ({}));
  return mod.exports.strength(phrase);
}
export function readPhrase(file) {
  try { return fs.readFileSync(path.join(os.homedir(), file), 'utf8').trim(); } catch { return ''; }
}
