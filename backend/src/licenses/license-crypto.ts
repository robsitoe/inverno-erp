import { createPrivateKey, createPublicKey, sign, verify, createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';

/**
 * Licenças assinadas com Ed25519.
 *  - A chave PRIVADA existe só no servidor/PC do fabricante (LICENSE_PRIVATE_KEY ou LICENSE_PRIVATE_KEY_FILE).
 *  - A chave PÚBLICA vai dentro do produto; só serve para VERIFICAR — não permite criar licenças.
 * Formato do token: base64url(payload JSON) + "." + base64url(assinatura)
 */
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEATge7c/+ZR+E7S8PvUIUhsJU3Vc663ZzLV1UOL0GfiDU=
-----END PUBLIC KEY-----`;

const b64u = (b: Buffer) => b.toString('base64url');

function publicKey() {
  return createPublicKey(process.env.LICENSE_PUBLIC_KEY || LICENSE_PUBLIC_KEY_PEM);
}

function privateKey() {
  let pem = process.env.LICENSE_PRIVATE_KEY;
  const file = process.env.LICENSE_PRIVATE_KEY_FILE;
  if (!pem && file && existsSync(file)) pem = readFileSync(file, 'utf8');
  if (!pem) return null;
  return createPrivateKey(pem.replace(/\\n/g, '\n'));
}

export function canIssueLicenses(): boolean {
  try { return !!privateKey(); } catch { return false; }
}

export function signLicenseToken(payload: Record<string, any>, expiresInSeconds: number): string {
  const key = privateKey();
  if (!key) throw new Error('Emissão de licenças indisponível nesta instalação (sem chave privada do fabricante).');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  return `${b64u(body)}.${b64u(sign(null, body, key))}`;
}

/** Devolve o payload se a assinatura for válida e não tiver expirado; senão lança erro. */
export function verifyLicenseToken<T = any>(token: string, ignoreExpiry = false): T {
  const [p, s] = (token || '').trim().split('.');
  if (!p || !s) throw new Error('formato inválido');
  const body = Buffer.from(p, 'base64url');
  if (!verify(null, body, publicKey(), Buffer.from(s, 'base64url'))) throw new Error('assinatura inválida');
  const payload = JSON.parse(body.toString('utf8'));
  if (!ignoreExpiry && (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))) throw new Error('licença expirada');
  if (!payload.exp) throw new Error('licença sem validade');
  return payload as T;
}

export function hashInstallation(raw: string): string {
  return createHash('sha256').update('inverno-erp|' + raw).digest('hex').slice(0, 32);
}
