/**
 * Motor dos modelos de impressão.
 *
 * Um modelo é HTML + CSS com campos {{grupo.campo}} e blocos de repetição {{#linhas}}...{{/linhas}}.
 * O modelo controla só o aspeto: os valores vêm sempre do documento gravado.
 *
 * Proteções:
 *  - validateTemplate: recusa código (script, eventos, ligações externas), truques de CSS que
 *    escondem ou tapam valores, campos desconhecidos, campos fiscais em falta e valores escritos à mão.
 *  - render: preenche os campos (sempre escapados); os campos fiscais ficam num <span data-f> protegido.
 *  - checkRendered: antes de entregar a impressão, compara o que vai ser impresso com os valores da
 *    base de dados e procura valores que não pertençam ao documento. Se não bater, a impressão é recusada.
 */

export type FieldScope = 'doc' | 'linha' | 'iva';
export type PrintModule = 'SALES' | 'PURCHASES' | 'TREASURY' | 'STOCK';
export const MODULES: PrintModule[] = ['SALES', 'PURCHASES', 'TREASURY', 'STOCK'];

export interface FieldDef {
  key: string;
  label: string;
  fiscal: boolean;
  scope: FieldScope;
  /** Módulos onde o campo existe (sem lista = todos). */
  modules?: PrintModule[];
  /** Módulos onde o campo é obrigatório no modelo. */
  requiredIn?: PrintModule[];
}

const COM: PrintModule[] = ['SALES', 'PURCHASES'];
const FIN: PrintModule[] = ['SALES', 'PURCHASES', 'TREASURY'];
const ART: PrintModule[] = ['SALES', 'PURCHASES', 'STOCK'];

export const FIELDS: FieldDef[] = [
  { key: 'empresa.nome', label: 'Nome da empresa', fiscal: true, scope: 'doc', requiredIn: MODULES },
  { key: 'empresa.nif', label: 'NIF/NUIT da empresa', fiscal: true, scope: 'doc', requiredIn: FIN },
  { key: 'empresa.morada', label: 'Morada da empresa', fiscal: false, scope: 'doc' },
  { key: 'empresa.telefone', label: 'Telefone da empresa', fiscal: false, scope: 'doc' },
  { key: 'empresa.email', label: 'Email da empresa', fiscal: false, scope: 'doc' },
  { key: 'empresa.website', label: 'Website da empresa', fiscal: false, scope: 'doc' },
  { key: 'empresa.logo', label: 'Logótipo da empresa', fiscal: false, scope: 'doc' },
  { key: 'entidade.nome', label: 'Entidade (cliente / fornecedor / beneficiário)', fiscal: true, scope: 'doc', modules: FIN, requiredIn: FIN },
  { key: 'entidade.nif', label: 'NIF/NUIT da entidade', fiscal: true, scope: 'doc', modules: COM, requiredIn: COM },
  { key: 'entidade.morada', label: 'Morada da entidade', fiscal: false, scope: 'doc', modules: COM },
  { key: 'documento.descricao', label: 'Tipo de documento (ex.: Fatura)', fiscal: false, scope: 'doc' },
  { key: 'documento.numero', label: 'Número do documento', fiscal: true, scope: 'doc', requiredIn: MODULES },
  { key: 'documento.serie', label: 'Série', fiscal: false, scope: 'doc' },
  { key: 'documento.data', label: 'Data do documento', fiscal: true, scope: 'doc', requiredIn: MODULES },
  { key: 'documento.vencimento', label: 'Data de vencimento', fiscal: true, scope: 'doc', modules: COM },
  { key: 'documento.condicao', label: 'Condição de pagamento', fiscal: false, scope: 'doc', modules: COM },
  { key: 'documento.referencia', label: 'Referência (V/Ref., documento relacionado)', fiscal: false, scope: 'doc', modules: ['PURCHASES', 'TREASURY'] },
  { key: 'documento.meioPagamento', label: 'Meio de pagamento', fiscal: false, scope: 'doc', modules: ['TREASURY'] },
  { key: 'documento.armazem', label: 'Armazém', fiscal: false, scope: 'doc', modules: ['STOCK'] },
  { key: 'documento.observacoes', label: 'Observações', fiscal: false, scope: 'doc' },
  { key: 'documento.copia', label: 'Via (Original, Duplicado...)', fiscal: false, scope: 'doc' },
  { key: 'linha.codigo', label: 'Código do artigo', fiscal: false, scope: 'linha', modules: ART },
  { key: 'linha.descricao', label: 'Descrição', fiscal: false, scope: 'linha' },
  { key: 'linha.unidade', label: 'Unidade', fiscal: false, scope: 'linha', modules: ['PURCHASES', 'STOCK'] },
  { key: 'linha.documento', label: 'Documento liquidado (ex.: FA 2026/1)', fiscal: true, scope: 'linha', modules: ['TREASURY'], requiredIn: ['TREASURY'] },
  { key: 'linha.valorOriginal', label: 'Valor original do documento liquidado', fiscal: true, scope: 'linha', modules: ['TREASURY'] },
  { key: 'linha.pendente', label: 'Pendente após liquidação', fiscal: true, scope: 'linha', modules: ['TREASURY'] },
  { key: 'linha.quantidade', label: 'Quantidade', fiscal: true, scope: 'linha', modules: ART, requiredIn: ART },
  { key: 'linha.precoUnitario', label: 'Preço unitário', fiscal: true, scope: 'linha', modules: ART, requiredIn: COM },
  { key: 'linha.desconto', label: 'Desconto', fiscal: true, scope: 'linha', modules: FIN },
  { key: 'linha.taxaIva', label: 'Taxa de IVA (%)', fiscal: true, scope: 'linha', modules: COM },
  { key: 'linha.iva', label: 'Valor do IVA da linha', fiscal: true, scope: 'linha', modules: COM },
  { key: 'linha.total', label: 'Total da linha / valor liquidado', fiscal: true, scope: 'linha', requiredIn: FIN },
  { key: 'totais.subtotal', label: 'Subtotal (mercadoria)', fiscal: true, scope: 'doc', modules: COM },
  { key: 'totais.descontos', label: 'Total de descontos', fiscal: true, scope: 'doc', modules: FIN },
  { key: 'totais.iva', label: 'Total de IVA', fiscal: true, scope: 'doc', modules: COM, requiredIn: COM },
  { key: 'totais.total', label: 'Total', fiscal: true, scope: 'doc', requiredIn: FIN },
  { key: 'iva.taxa', label: 'Resumo IVA: taxa (%)', fiscal: true, scope: 'iva', modules: COM },
  { key: 'iva.base', label: 'Resumo IVA: base tributável', fiscal: true, scope: 'iva', modules: COM },
  { key: 'iva.valor', label: 'Resumo IVA: valor do imposto', fiscal: true, scope: 'iva', modules: COM },
];

export const fieldsFor = (m: PrintModule) => FIELDS.filter(f => !f.modules || f.modules.includes(m));

const FIELD_MAP = new Map(FIELDS.map(f => [f.key, f]));
const LOOPS: Record<string, FieldScope> = { linhas: 'linha', resumoIva: 'iva' };
const MAX_SIZE = 600 * 1024;

export interface RenderData {
  doc: Record<string, string>;
  linhas: Record<string, string>[];
  resumoIva: Record<string, string>[];
  logoDataUri?: string;
}

export interface RenderOptions {
  watermark?: string;
  footer: string;
  title: string;
}

export interface ExpectedValue { key: string; value: string; }

// ---------------------------------------------------------------- formatação

export function fmtMoney(n: any): string {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}
export function fmtQty(n: any): string {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}
export function fmtDate(d: any): string {
  const s = String(d || '').slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function unesc(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
}

// ---------------------------------------------------------------- validação

const FORBIDDEN_TAGS = /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math|style|frame|frameset|applet|template|noscript|audio|video|source|canvas)\b/i;

/** Regras de CSS que permitem esconder, tapar ou inventar valores. */
const CSS_RULES: { re: RegExp; msg: string }[] = [
  { re: /(^|[;{\s"'])position\s*:/i, msg: 'posicionamento (position) não é permitido — use tabelas ou flex para a disposição.' },
  { re: /(^|[;{\s"'])(top|left|right|bottom|inset)\s*:/i, msg: 'deslocamentos (top/left/right/bottom) não são permitidos.' },
  { re: /z-index/i, msg: 'z-index não é permitido (permitiria tapar valores).' },
  { re: /transform/i, msg: 'transformações (transform) não são permitidas.' },
  { re: /opacity/i, msg: 'transparência (opacity) não é permitida.' },
  { re: /visibility\s*:/i, msg: 'visibility não é permitido.' },
  { re: /display\s*:\s*none/i, msg: 'display:none não é permitido (esconderia conteúdo).' },
  { re: /\bclip(-path)?\s*:/i, msg: 'recortes (clip) não são permitidos.' },
  { re: /(^|[;{\s"'])filter\s*:/i, msg: 'filtros (filter) não são permitidos.' },
  { re: /mix-blend-mode|backdrop-filter/i, msg: 'efeitos de mistura não são permitidos.' },
  { re: /(^|[;{\s"'])content\s*:/i, msg: 'content não é permitido (permitiria escrever texto pelo CSS).' },
  { re: /::?(before|after|first-letter|first-line|marker)/i, msg: 'pseudo-elementos (::before/::after) não são permitidos.' },
  { re: /@import|@font-face/i, msg: '@import/@font-face não são permitidos.' },
  { re: /url\s*\(\s*(?!['"]?\s*data:image\/(png|jpe?g|gif|webp);base64,)/i, msg: 'url() só aceita imagens embutidas (data:image).' },
  { re: /expression\s*\(|behavior\s*:|-moz-binding|javascript:/i, msg: 'expressões de código no CSS não são permitidas.' },
  { re: /color\s*:\s*transparent/i, msg: 'texto transparente não é permitido.' },
  { re: /margin[a-z-]*\s*:[^;{}]*-\s*\d/i, msg: 'margens negativas não são permitidas.' },
  { re: /text-indent\s*:\s*-/i, msg: 'recuos negativos (text-indent) não são permitidos.' },
  { re: /line-height\s*:\s*0(\D|$)/i, msg: 'line-height 0 não é permitido.' },
  { re: /overflow\s*:\s*hidden|max-height\s*:\s*0|(^|[;{\s"'])height\s*:\s*0(\D|$)/i, msg: 'cortar conteúdo (overflow:hidden / altura 0) não é permitido.' },
];

function checkCss(css: string, where: string, errors: string[]) {
  for (const r of CSS_RULES) if (r.re.test(css)) errors.push(`${where}: ${r.msg}`);
  const sizes = css.matchAll(/font(?:-size)?\s*:[^;{}]*?(-?[\d.]+)\s*(px|pt|em|rem|%)/gi);
  for (const m of sizes) {
    const v = parseFloat(m[1]); const u = m[2].toLowerCase();
    const min = u === 'px' ? 7 : u === 'pt' ? 5 : u === '%' ? 50 : 0.5;
    if (v < min) errors.push(`${where}: tamanho de letra ${m[1]}${u} é demasiado pequeno (mínimo ${min}${u}).`);
  }
}

/** Texto fixo do modelo (sem campos nem marcação), para procurar valores escritos à mão. */
function staticText(html: string): string {
  return unesc(html
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ');
}

const AMOUNT_RE = /\d[\d .  ]*[.,]\d{2}(?!\d)/g;
const NIF_RE = /(?<!\d)\d{9}(?!\d)/g;
const DOCNUM_RE = /\b(FA|FR|FT|VD|NC|ND|GT|NE|OR|RE|PA)\s*\d{4}\s*\/\s*\d+/gi;

function literalFindings(text: string): string[] {
  const found = new Set<string>();
  for (const re of [AMOUNT_RE, NIF_RE, DOCNUM_RE]) for (const m of text.matchAll(re)) found.add(m[0].trim());
  return [...found];
}

export function validateTemplate(html: string, css: string, module: PrintModule = 'SALES'): string[] {
  const errors: string[] = [];
  html = html || ''; css = css || '';
  if (!html.trim()) return ['O modelo está vazio.'];
  if (html.length + css.length > MAX_SIZE) errors.push('O modelo é demasiado grande (máximo 600 KB, incluindo imagens).');

  // 1. Código e ligações externas
  const tag = FORBIDDEN_TAGS.exec(html);
  if (tag) errors.push(`HTML: a etiqueta <${tag[1].toLowerCase()}> não é permitida (o CSS vai no campo próprio).`);
  if (/\son[a-z]+\s*=/i.test(html)) errors.push('HTML: atributos de eventos (onclick, onload...) não são permitidos.');
  if (/javascript:|vbscript:/i.test(html)) errors.push('HTML: ligações javascript: não são permitidas.');
  if (/\s(href|action|formaction|xlink:href|srcset|poster|background)\s*=/i.test(html)) errors.push('HTML: ligações (href) e fontes externas não são permitidas.');
  for (const m of html.matchAll(/\ssrc\s*=\s*["']?([^"'\s>]*)/gi)) {
    if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(m[1])) errors.push('HTML: imagens só podem ser embutidas (data:image) — sem endereços externos.');
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/data-zona\s*=\s*["']?(logo|fundo)\b/i.test(m[0])) errors.push('HTML: cada imagem tem de estar marcada como data-zona="logo" ou data-zona="fundo".');
  }

  // 2. CSS (folha de estilos e atributos style)
  checkCss(css, 'CSS', errors);
  for (const m of html.matchAll(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) checkCss(m[2] ?? m[3] ?? '', 'HTML (style)', errors);

  // 3. Campos e blocos
  const opens = [...html.matchAll(/\{\{\s*#\s*([a-zA-Z]+)\s*\}\}/g)].map(m => m[1]);
  const closes = [...html.matchAll(/\{\{\s*\/\s*([a-zA-Z]+)\s*\}\}/g)].map(m => m[1]);
  for (const o of opens) if (!LOOPS[o]) errors.push(`Bloco desconhecido {{#${o}}} (use {{#linhas}} ou {{#resumoIva}}).`);
  for (const name of Object.keys(LOOPS)) {
    const a = opens.filter(o => o === name).length, b = closes.filter(c => c === name).length;
    if (a !== b) errors.push(`O bloco {{#${name}}} não está fechado com {{/${name}}}.`);
    if (a > 1) errors.push(`O bloco {{#${name}}} só pode aparecer uma vez.`);
  }
  const loopBodies: Record<string, string> = {};
  let outside = html;
  for (const name of Object.keys(LOOPS)) {
    const re = new RegExp(`\\{\\{\\s*#\\s*${name}\\s*\\}\\}([\\s\\S]*?)\\{\\{\\s*\\/\\s*${name}\\s*\\}\\}`);
    const m = re.exec(html);
    if (m) { loopBodies[name] = m[1]; outside = outside.replace(m[0], ' '); }
  }
  const used = new Set<string>();
  const checkFields = (text: string, allowed: FieldScope) => {
    for (const m of text.matchAll(/\{\{\s*([^#/][^}]*?)\s*\}\}/g)) {
      const key = m[1].trim();
      const def = FIELD_MAP.get(key);
      if (!def) { errors.push(`Campo desconhecido {{${key}}}.`); continue; }
      if (def.modules && !def.modules.includes(module)) { errors.push(`O campo {{${key}}} não existe neste tipo de documento.`); continue; }
      if (def.scope !== allowed) {
        errors.push(def.scope === 'doc'
          ? `O campo {{${key}}} não pode estar dentro de um bloco de repetição.`
          : `O campo {{${key}}} só pode ser usado dentro do bloco {{#${def.scope === 'linha' ? 'linhas' : 'resumoIva'}}}.`);
        continue;
      }
      used.add(key);
    }
  };
  checkFields(outside, 'doc');
  if (loopBodies.linhas !== undefined) checkFields(loopBodies.linhas, 'linha');
  if (loopBodies.resumoIva !== undefined) checkFields(loopBodies.resumoIva, 'iva');
  if (loopBodies.linhas === undefined) errors.push('Falta o bloco das linhas: {{#linhas}} ... {{/linhas}}.');
  if (loopBodies.resumoIva !== undefined && !['SALES', 'PURCHASES'].includes(module)) errors.push('O bloco {{#resumoIva}} só existe em vendas e compras.');
  for (const f of FIELDS) if (f.requiredIn?.includes(module) && !used.has(f.key)) errors.push(`Falta o campo obrigatório {{${f.key}}} (${f.label}).`);

  // 4. Valores escritos à mão no texto fixo
  const literals = literalFindings(staticText(html));
  if (literals.length) {
    errors.push(`O modelo tem valores escritos à mão: ${literals.slice(0, 5).join(', ')}. Valores, NIF e números de documento têm de vir dos campos.`);
  }
  return [...new Set(errors)];
}

// ---------------------------------------------------------------- preenchimento

const PROTECT = 'display:inline !important;visibility:visible !important;opacity:1 !important;color:#000 !important;background:transparent !important;';

function fieldHtml(key: string, value: string, data: RenderData): string {
  if (key === 'empresa.logo') {
    return data.logoDataUri && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(data.logoDataUri)
      ? `<img data-nf data-zona="logo" src="${data.logoDataUri}" style="max-height:80px;max-width:240px" alt="">` : '';
  }
  const def = FIELD_MAP.get(key)!;
  return def.fiscal
    ? `<span data-f="${key}" style="${PROTECT}">${esc(value)}</span>`
    : `<span data-nf>${esc(value).replace(/\n/g, '<br>')}</span>`;
}

function fill(text: string, values: Record<string, string>, data: RenderData): string {
  return text.replace(/\{\{\s*([^#/][^}]*?)\s*\}\}/g, (_, k) => fieldHtml(k.trim(), values[k.trim()] ?? '', data));
}

export function renderTemplate(html: string, css: string, data: RenderData, opts: RenderOptions): string {
  let body = html;
  for (const [name] of Object.entries(LOOPS)) {
    const re = new RegExp(`\\{\\{\\s*#\\s*${name}\\s*\\}\\}([\\s\\S]*?)\\{\\{\\s*\\/\\s*${name}\\s*\\}\\}`);
    body = body.replace(re, (_, inner) => ((data as any)[name] as Record<string, string>[]).map(row => fill(inner, row, data)).join(''));
  }
  body = fill(body, data.doc, data);
  const watermark = opts.watermark
    ? `<div data-sys="marca" style="border:2px solid #b91c1c;color:#b91c1c;font-weight:bold;text-align:center;padding:6px;margin-bottom:8px;letter-spacing:2px">${esc(opts.watermark)}</div>`
    : '';
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${esc(opts.title)}</title>`
    + `<style>@page{size:A4;margin:12mm}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:0}table{border-collapse:collapse}</style>`
    + `<style>${css || ''}</style></head><body>${watermark}<div data-sys="corpo">${body}</div>`
    + `<div data-sys="rodape" style="${PROTECT}display:block !important;margin-top:14px;border-top:1px solid #999;padding-top:4px;font-size:9px">${esc(opts.footer)}</div>`
    + `</body></html>`;
}

// ---------------------------------------------------------------- comparação antes de imprimir

/** Lista do que tem de aparecer na impressão, tirada da base de dados. */
export function expectedValues(html: string, data: RenderData): ExpectedValue[] {
  const exp: ExpectedValue[] = [];
  const keysIn = (t: string) => [...t.matchAll(/\{\{\s*([^#/][^}]*?)\s*\}\}/g)].map(m => m[1].trim()).filter(k => FIELD_MAP.get(k)?.fiscal);
  let outside = html;
  for (const [name] of Object.entries(LOOPS)) {
    const re = new RegExp(`\\{\\{\\s*#\\s*${name}\\s*\\}\\}([\\s\\S]*?)\\{\\{\\s*\\/\\s*${name}\\s*\\}\\}`);
    const m = re.exec(html);
    if (!m) continue;
    outside = outside.replace(m[0], ' ');
    const keys = keysIn(m[1]);
    for (const row of (data as any)[name] as Record<string, string>[]) for (const k of keys) exp.push({ key: k, value: row[k] ?? '' });
  }
  for (const k of keysIn(outside)) exp.push({ key: k, value: data.doc[k] ?? '' });
  return exp;
}

/** Devolve a lista de discordâncias entre a impressão e a base de dados (vazia = pode imprimir). */
export function checkRendered(rendered: string, expected: ExpectedValue[], allowedLiterals: string[]): string[] {
  const errors: string[] = [];
  const shown = [...rendered.matchAll(/<span data-f="([^"]+)"[^>]*>([\s\S]*?)<\/span>/g)].map(m => ({ key: m[1], value: unesc(m[2]) }));
  // a) cada valor fiscal gravado aparece na impressão, e não aparece nenhum outro
  if (shown.length !== expected.length) {
    errors.push(`A impressão mostra ${shown.length} valores fiscais, mas o documento tem ${expected.length}.`);
  }
  const count = (list: ExpectedValue[]) => {
    const m = new Map<string, number>();
    for (const x of list) m.set(`${x.key}\u0000${x.value}`, (m.get(`${x.key}\u0000${x.value}`) || 0) + 1);
    return m;
  };
  const want = count(expected), got = count(shown);
  for (const [k, n] of want) {
    if ((got.get(k) || 0) !== n) {
      const [key, value] = k.split('\u0000');
      const shownForKey = shown.filter(s => s.key === key).map(s => s.value);
      errors.push(`${FIELD_MAP.get(key)?.label || key}: o documento tem "${value}", a impressão mostra "${shownForKey.join('", "') || '(nada)'}".`);
      if (errors.length > 8) break;
    }
  }
  for (const [k] of got) {
    if (!want.has(k)) {
      const [key, value] = k.split('\u0000');
      errors.push(`${FIELD_MAP.get(key)?.label || key}: a impressão mostra "${value}", que não pertence ao documento.`);
      if (errors.length > 8) break;
    }
  }
  // b) nenhum valor, NIF ou número de documento fora dos campos (texto fixo do modelo)
  const body = /<div data-sys="corpo">([\s\S]*)<\/div><div data-sys="rodape"/.exec(rendered)?.[1] || '';
  const fixed = unesc(body
    .replace(/<span data-f="[^"]+"[^>]*>[\s\S]*?<\/span>/g, ' ')
    .replace(/<span data-nf>[\s\S]*?<\/span>/g, ' ')
    .replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ');
  const allowed = new Set(allowedLiterals.map(s => s.replace(/\s+/g, '')));
  const extra = literalFindings(fixed).filter(v => !allowed.has(v.replace(/\s+/g, '')));
  if (extra.length) errors.push(`A impressão tem valores que não pertencem ao documento: ${extra.slice(0, 5).join(', ')}.`);
  return errors;
}
