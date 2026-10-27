#!/usr/bin/env node
/**
 * Emissor de licenças Inverno ERP (USO EXCLUSIVO DO FABRICANTE).
 * Uso (sem --id a licenca cobre todas as empresas da instalacao): node emitir-licenca.js --empresa "Nome Lda" [--id <companyId>] --dias 365 [--plano PRO]  (DEMO|LITE|STANDARD|PRO|ENTERPRISE) [--instalacao <installationId>] [--utilizadores 10]
 * Requer PRIVADA-NAO-PARTILHAR.pem (ou LICENSE_PRIVATE_KEY_FILE). Guarde-a offline, com cópia segura.
 */
const { createPrivateKey, sign } = require('crypto');
const fs = require('fs'), path = require('path');
const a = {}; const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) a[argv[i].replace(/^--/, '')] = argv[i + 1];
if (!a.empresa || !a.dias) { console.error('Faltam: --empresa --dias'); process.exit(1); }
const PLANOS = ['DEMO', 'LITE', 'STANDARD', 'PRO', 'ENTERPRISE'];
const plano = (a.plano || 'PRO').toUpperCase();
if (!PLANOS.includes(plano)) { console.error('Plano inválido. Use: ' + PLANOS.join(', ')); process.exit(1); }
const file = process.env.LICENSE_PRIVATE_KEY_FILE || path.join(__dirname, 'PRIVADA-NAO-PARTILHAR.pem');
const key = createPrivateKey(fs.readFileSync(file, 'utf8'));
const now = Math.floor(Date.now() / 1000);
const payload = {
  sub: require('crypto').randomUUID(), cid: a.id || '*', cn: a.empresa, plan: plano,
  features: [], maxUsers: a.utilizadores ? +a.utilizadores : undefined, gracePeriodHours: 168,
  iid: a.instalacao || undefined, iat: now, exp: now + (+a.dias) * 86400,
};
const body = Buffer.from(JSON.stringify(payload));
console.log(body.toString('base64url') + '.' + sign(null, body, key).toString('base64url'));
