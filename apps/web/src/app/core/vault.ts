import { SealedBox } from './models';

/* THE LOCK IN THE BROWSER, the Brain's design: the phrase becomes a key by PBKDF2 (310,000 rounds)
   and the key opens the AES-GCM box. The KEY is remembered on the device, never the phrase, so a
   changed phrase signs every device out (the off switch when someone leaves). */
const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const toB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

export async function keyFrom(pass: string, box: SealedBox): Promise<string> {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iter, hash: 'SHA-256' }, km, 256);
  return toB64(bits);
}
export async function openBox<T>(box: SealedBox, rawKey: string): Promise<T | null> {
  try {
    const key = await crypto.subtle.importKey('raw', b64(rawKey), 'AES-GCM', false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch { return null; }
}
