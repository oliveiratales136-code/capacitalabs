// auth.js — hashing de senha e tokens de sessão usando só o módulo "crypto" nativo do Node.
// (Zero dependências externas — nada para instalar, nada para dar errado.)
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const hashToCompare = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(hashToCompare, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function createToken(payload, expiresInMs = 12 * 60 * 60 * 1000) {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + expiresInMs }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(fromBase64url(body));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, createToken, verifyToken };
