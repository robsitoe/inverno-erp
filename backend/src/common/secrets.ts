/**
 * Segredos obrigatórios. Em produção o arranque FALHA se faltarem ou forem fracos,
 * para nunca correr com um valor por defeito conhecido (que permitiria forjar logins/licenças).
 */
export function getSecret(name: string, devFallback: string): string {
  const v = process.env[name];
  const weak = !v || v.length < 24 || /^change-this|secretKey|license-secret-change/i.test(v);
  if (!weak) return v as string;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[SEGURANÇA] ${name} em falta ou fraco (mín. 24 caracteres, não pode ser o valor de exemplo). Defina-o no .env.`);
  }
  console.warn(`[SEGURANÇA] ${name} não definido/fraco — a usar valor de desenvolvimento. NÃO usar em produção.`);
  return v || devFallback;
}

/**
 * Palavra-passe inicial do administrador.
 * Produção: INITIAL_ADMIN_PASSWORD ou aleatória (a imprimir uma só vez). Desenvolvimento: 'admin'.
 */
export function initialAdminPassword(): { value: string; generated: boolean } {
  const env = process.env.INITIAL_ADMIN_PASSWORD;
  if (env) return { value: env, generated: false };
  if (process.env.NODE_ENV === 'production') {
    return { value: require('crypto').randomBytes(9).toString('base64url'), generated: true };
  }
  return { value: 'admin', generated: false };
}
