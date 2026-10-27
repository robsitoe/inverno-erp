const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
    ShadingType, VerticalAlign, PageNumber, LevelFormat, ExternalHyperlink,
    TableOfContents,
} = require('C:/Users/Roberto Sitoe/AppData/Roaming/npm/node_modules/docx');
const fs = require('fs');

// ── Helpers ──────────────────────────────────────────────────────────────────

const BLUE = '1E3A5F';
const LIGHT_BLUE = 'D6E4F0';
const ORANGE = 'C0392B';
const GRAY = 'F2F2F2';
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text, bold: true, color: BLUE, size: 32 })],
        spacing: { before: 360, after: 120 },
    });
}
function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text, bold: true, color: BLUE, size: 26 })],
        spacing: { before: 280, after: 80 },
    });
}
function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text, bold: true, color: '2C3E50', size: 24 })],
        spacing: { before: 200, after: 60 },
    });
}
function para(text, opts = {}) {
    return new Paragraph({
        children: [new TextRun({ text, size: 22, ...opts })],
        spacing: { after: 100 },
    });
}
function bold(text) { return para(text, { bold: true }); }
function bullet(text, level = 0) {
    return new Paragraph({
        numbering: { reference: 'bullets', level },
        children: [new TextRun({ text, size: 22 })],
        spacing: { after: 60 },
    });
}
function numbered(text, level = 0) {
    return new Paragraph({
        numbering: { reference: 'numbers', level },
        children: [new TextRun({ text, size: 22 })],
        spacing: { after: 80 },
    });
}
function code(text) {
    return new Paragraph({
        children: [new TextRun({ text, font: 'Courier New', size: 18, color: '2C3E50' })],
        shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
        spacing: { after: 60 },
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 8, color: BLUE } },
    });
}
function note(text) {
    return new Paragraph({
        children: [
            new TextRun({ text: '⚠ NOTA: ', bold: true, size: 20, color: ORANGE }),
            new TextRun({ text, size: 20, color: '5D4037' }),
        ],
        shading: { fill: 'FFF3E0', type: ShadingType.CLEAR },
        spacing: { after: 100 },
        indent: { left: 200, right: 200 },
        border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
            left: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
            right: { style: BorderStyle.SINGLE, size: 4, color: ORANGE },
        },
    });
}
function tip(text) {
    return new Paragraph({
        children: [
            new TextRun({ text: '✓ DICA: ', bold: true, size: 20, color: '1B5E20' }),
            new TextRun({ text, size: 20, color: '2E7D32' }),
        ],
        shading: { fill: 'E8F5E9', type: ShadingType.CLEAR },
        spacing: { after: 100 },
        indent: { left: 200, right: 200 },
        border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '4CAF50' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '4CAF50' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '4CAF50' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '4CAF50' },
        },
    });
}
function divider() {
    return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BLUE } },
        spacing: { before: 200, after: 200 },
        children: [],
    });
}
function pageBreak() {
    return new Paragraph({ pageBreakBefore: true, children: [] });
}
function twoColTable(rows) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: rows.map(([label, value]) => new TableRow({
            children: [
                new TableCell({
                    borders: BORDERS,
                    width: { size: 2600, type: WidthType.DXA },
                    shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
                }),
                new TableCell({
                    borders: BORDERS,
                    width: { size: 6760, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: 'Courier New' })] })],
                }),
            ],
        })),
        margins: { bottom: 120 },
    });
}
function spacer() {
    return new Paragraph({ children: [], spacing: { after: 80 } });
}

// ── Document ──────────────────────────────────────────────────────────────────

const doc = new Document({
    numbering: {
        config: [
            {
                reference: 'bullets',
                levels: [
                    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                    { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
                ],
            },
            {
                reference: 'numbers',
                levels: [
                    { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                    { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
                ],
            },
        ],
    },
    styles: {
        default: { document: { run: { font: 'Calibri', size: 22 } } },
        paragraphStyles: [
            { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: 'Calibri' }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
            { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Calibri' }, paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 } },
            { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: 'Calibri' }, paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
        ],
    },
    sections: [
        // ── Capa ──────────────────────────────────────────────────────────────
        {
            properties: {
                page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
            },
            children: [
                new Paragraph({ spacing: { before: 2000 }, children: [] }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'INVERNO ERP', bold: true, size: 64, color: BLUE, font: 'Calibri' })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Manual de Instalacao e Operacao', size: 36, color: '555555', font: 'Calibri' })],
                    spacing: { after: 80 },
                }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Versao 1.0  |  Junho 2026', size: 22, color: '888888' })], spacing: { after: 800 } }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    shading: { fill: BLUE, type: ShadingType.CLEAR },
                    children: [new TextRun({ text: '  Documento Confidencial — Uso Interno  ', size: 22, color: 'FFFFFF', bold: true })],
                    spacing: { after: 400 },
                    indent: { left: 2000, right: 2000 },
                }),
                new Paragraph({ spacing: { before: 400 }, children: [] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Roberto Sitoe', size: 24, bold: true, color: BLUE })], spacing: { after: 40 } }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'roberto.manuelsitoe@gmail.com', size: 20, color: '555555' })] }),
            ],
        },
        // ── Indice + Conteudo ─────────────────────────────────────────────────
        {
            properties: {
                page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1200, bottom: 1440, left: 1440 } },
            },
            headers: {
                default: new Header({
                    children: [new Paragraph({
                        children: [
                            new TextRun({ text: 'Inverno ERP — Manual de Instalacao e Operacao', size: 18, color: '888888' }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BLUE } },
                    })],
                }),
            },
            footers: {
                default: new Footer({
                    children: [new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                            new TextRun({ text: 'Pagina ', size: 18, color: '888888' }),
                            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
                        ],
                        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGHT_BLUE } },
                    })],
                }),
            },
            children: [
                // Indice
                h1('Indice'),
                new TableOfContents('Indice', { hyperlink: true, headingStyleRange: '1-3' }),
                pageBreak(),

                // 1. Visao Geral
                h1('1. Visao Geral do Sistema'),
                para('O Inverno ERP funciona em dois modelos de instalacao. Escolha o modelo adequado a cada cliente antes de iniciar a instalacao.'),
                spacer(),
                new Table({
                    width: { size: 9360, type: WidthType.DXA },
                    columnWidths: [4680, 4680],
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODELO SAAS', bold: true, size: 22, color: 'FFFFFF' })] })] }),
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 150, right: 150 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODELO ON-PREMISE', bold: true, size: 22, color: 'FFFFFF' })] })] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [para('Cliente acessa via browser (Chrome, Edge) sem instalar nada. Tu hospedas tudo no teu servidor.')] }),
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, children: [para('Cliente instala o ERP no servidor dele. Tu verificas a licenca remotamente a cada 4 horas.')] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, shading: { fill: 'E8F5E9', type: ShadingType.CLEAR }, children: [para('Recomendado. Actualizacoes automaticas para todos os clientes.')] }),
                                new TableCell({ borders: BORDERS, width: { size: 4680, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 150, right: 150 }, shading: { fill: 'FFF3E0', type: ShadingType.CLEAR }, children: [para('Para clientes com politica de dados internos ou sem internet estavel.')] }),
                            ],
                        }),
                    ],
                }),
                spacer(),
                note('Podes ter clientes nos dois modelos em simultâneo. A diferenca e apenas na configuracao do .env.'),
                divider(),

                // 2. Servidor Central
                pageBreak(),
                h1('2. Configurar o Servidor Central (O Teu Servidor)'),
                para('Este servidor e o coracão do sistema. E aqui que todas as licencas sao geridas e onde os clientes SaaS acedem ao ERP.'),

                h2('2.1 Requisitos do Servidor'),
                new Table({
                    width: { size: 9360, type: WidthType.DXA },
                    columnWidths: [2800, 6560],
                    rows: [
                        ['Sistema Operativo', 'Ubuntu 22.04 LTS ou Debian 12 (recomendado)'],
                        ['RAM minima', '2 GB (4 GB recomendado para 10+ clientes)'],
                        ['Disco', '20 GB SSD minimo'],
                        ['CPU', '1 vCPU minimo (2 recomendado)'],
                        ['Rede', 'IP publico fixo ou dominio (ex: erp.inverno.co.mz)'],
                        ['Porta', '80 (HTTP) ou 443 (HTTPS com Nginx/Caddy)'],
                    ].map(([l, v]) => new TableRow({
                        children: [
                            new TableCell({ borders: BORDERS, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20 })] })] }),
                            new TableCell({ borders: BORDERS, width: { size: 6560, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })] }),
                        ],
                    })),
                }),
                spacer(),
                tip('DigitalOcean ou Hetzner sao boas opcoes. Um VPS de 2GB RAM custa entre 6-12 EUR/mes.'),

                h2('2.2 Instalacao no Servidor (Executar Uma Vez)'),
                para('Ligo ao servidor via SSH e executa o script de instalacao:'),
                code('ssh root@IP_DO_SERVIDOR'),
                code('bash <(curl -s https://raw.githubusercontent.com/robsitoe/inverno-erp/main/scripts/server-setup.sh)'),
                para('O script instala o Docker automaticamente, clona o repositorio para /opt/inverno-erp e cria o ficheiro .env.'),

                h2('2.3 Configurar o Ficheiro .env'),
                para('Apos o script terminar, edita o ficheiro de configuracao:'),
                code('nano /opt/inverno-erp/.env'),
                para('Preenche todos os valores:'),
                twoColTable([
                    ['DB_USERNAME', 'postgres'],
                    ['DB_PASSWORD', 'Uma password forte (min. 16 caracteres)'],
                    ['DB_DATABASE', 'inverno_erp'],
                    ['JWT_SECRET', 'Gera com o comando abaixo (32+ chars)'],
                    ['LICENSE_SECRET', 'Gera com o comando abaixo (diferente do JWT)'],
                    ['ALLOWED_ORIGINS', 'https://erp.tuaempresa.co.mz'],
                    ['APP_PORT', '80'],
                    ['APP_VERSION', '1.0.0'],
                ]),
                spacer(),
                para('Para gerar segredos seguros, executa este comando:'),
                code('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'),
                note('Nunca uses a mesma chave para JWT_SECRET e LICENSE_SECRET. Guarda estes valores num local seguro (ex: Bitwarden). Sao necessarios para recuperar o sistema.'),

                h2('2.4 Iniciar o Sistema pela Primeira Vez'),
                code('cd /opt/inverno-erp'),
                code('docker compose -f docker-compose.prod.yml up -d --build'),
                para('Verifica se esta a funcionar:'),
                code('docker compose -f docker-compose.prod.yml ps'),
                para('Deve mostrar os 3 servicos a correr: db, backend, frontend.'),
                code('curl http://localhost/admin/version'),
                para('Deve devolver um JSON com a versao. Se aparecer, o sistema esta operacional.'),
                tip('O primeiro arranque demora 3-5 minutos porque constroi as imagens Docker.'),

                h2('2.5 Configurar Deploy Automatico (GitHub Actions)'),
                para('Cada vez que fizeres git push para main, o GitHub actualiza o servidor automaticamente.'),
                para('Vai a https://github.com/robsitoe/inverno-erp → Settings → Secrets and variables → Actions e adiciona:'),
                new Table({
                    width: { size: 9360, type: WidthType.DXA },
                    columnWidths: [2800, 6560],
                    rows: [
                        ['VPS_HOST', 'IP ou dominio do teu servidor (ex: 104.21.33.44)'],
                        ['VPS_USER', 'root (ou o utilizador SSH que criaste)'],
                        ['VPS_SSH_KEY', 'Conteudo completo da tua chave privada SSH (~/.ssh/id_rsa)'],
                    ].map(([l, v]) => new TableRow({
                        children: [
                            new TableCell({ borders: BORDERS, width: { size: 2800, type: WidthType.DXA }, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20, font: 'Courier New' })] })] }),
                            new TableCell({ borders: BORDERS, width: { size: 6560, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })] }),
                        ],
                    })),
                }),
                spacer(),
                para('Para copiar a chave SSH (no teu PC Windows):'),
                code('type C:\\Users\\Roberto Sitoe\\.ssh\\id_rsa'),
                para('Copia todo o conteudo (incluindo as linhas BEGIN e END) para o campo VPS_SSH_KEY.'),
                note('Se nao tiveres chave SSH, cria uma: ssh-keygen -t rsa -b 4096 -C "deploy" e depois copia a chave publica para o servidor: ssh-copy-id root@IP_SERVIDOR'),
                divider(),

                // 3. Criar e Gerir Licencas
                pageBreak(),
                h1('3. Criar e Gerir Licencas de Clientes'),

                h2('3.1 Criar Conta de Utilizador SuperAdmin (Uma Vez)'),
                para('O SuperAdmin e a tua conta como proprietario do sistema. E criada na base de dados de forma manual na primeira vez.'),
                para('Entra no container do backend:'),
                code('docker compose -f docker-compose.prod.yml exec backend sh'),
                para('Dentro do container, ou via a interface de administracao do ERP, cria um utilizador com isSuperAdmin=true.'),
                tip('O ERP ja tem um sistema de seed. Verifica o ficheiro backend/src/seed-data.ts para ver os utilizadores criados automaticamente no primeiro arranque.'),

                h2('3.2 Gerar uma Licenca para um Novo Cliente'),
                para('Faz login como SuperAdmin e chama o endpoint de geracao de licenca:'),
                code('POST https://erp.tuaempresa.co.mz/licenses/generate'),
                code('Authorization: Bearer SEU_TOKEN_JWT'),
                para('Corpo do pedido (JSON):'),
                code('{'),
                code('  "companyId": "empresa-abc",'),
                code('  "companyName": "Empresa ABC, Lda.",'),
                code('  "plan": "STANDARD",'),
                code('  "durationDays": 365,'),
                code('  "contactEmail": "admin@empresaabc.co.mz",'),
                code('  "price": 25000'),
                code('}'),
                para('A resposta inclui um token que envias ao cliente para activacao.'),
                spacer(),
                para('Planos disponiveis:'),
                new Table({
                    width: { size: 9360, type: WidthType.DXA },
                    columnWidths: [2000, 3000, 4360],
                    rows: [
                        new TableRow({ children: ['PLANO', 'PRECO (MZN/ano)', 'MODULOS INCLUIDOS'].map((t, i) => new TableCell({ borders: BORDERS, width: { size: [2000, 3000, 4360][i], type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: 'FFFFFF' })] })] })) }),
                        new TableRow({ children: [['DEMO', 'Gratuito (30 dias)', 'Todos (limitado)'], ['LITE', '3.500', 'Vendas + Stock'], ['STANDARD', '15.000', 'Vendas + Compras + Stock + Tesouraria'], ['PRO', '25.000', 'Todos os modulos'], ['ENTERPRISE', 'Negociado', 'Todos + Multi-empresa']].slice(0)[0].map((t, i) => new TableCell({ borders: BORDERS, width: { size: [2000, 3000, 4360][i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, size: 20 })] })] })) }),
                        ...[['LITE', '3.500', 'Vendas + Stock'], ['STANDARD', '15.000', 'Vendas + Compras + Stock + Tesouraria'], ['PRO', '25.000', 'Todos os modulos'], ['ENTERPRISE', 'Negociado', 'Todos + Multi-empresa']].map(row => new TableRow({ children: row.map((t, i) => new TableCell({ borders: BORDERS, width: { size: [2000, 3000, 4360][i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, size: 20 })] })] })) })),
                    ],
                }),

                h2('3.3 Bloquear um Cliente (Nao Pagou)'),
                para('Faz login como SuperAdmin e executa:'),
                code('DELETE https://erp.tuaempresa.co.mz/licenses/empresa-abc'),
                code('Authorization: Bearer SEU_TOKEN_JWT'),
                code('Body: { "reason": "Fatura #45 em atraso ha 30 dias" }'),
                para('O cliente fica bloqueado imediatamente. A mensagem que ele ve e: "Licenca revogada. Contacte o fornecedor para regularizar o pagamento."'),

                h2('3.4 Reactivar apos Pagamento'),
                code('POST https://erp.tuaempresa.co.mz/licenses/subscribe'),
                code('Body: { "companyId": "empresa-abc", "plan": "STANDARD" }'),
                para('O cliente e desbloqueado automaticamente no proximo phone-home (maximo 4 horas).'),

                h2('3.5 Ver Todas as Licencas'),
                code('GET https://erp.tuaempresa.co.mz/licenses'),
                code('Authorization: Bearer SEU_TOKEN_JWT'),
                para('Devolve lista de todas as empresas com estado da licenca, data de expiracao e plano.'),
                divider(),

                // 4. Modelo SaaS
                pageBreak(),
                h1('4. Instalacao Modelo SaaS (Cliente sem Servidor Proprio)'),
                para('Neste modelo, o cliente acessa o ERP via browser. Nao instala nada. Tu gerais tudo no teu servidor central.'),

                h2('4.1 Criar a Empresa do Cliente no Sistema'),
                numbered('Gera a licenca (Seccao 3.2)'),
                numbered('Cria a empresa no ERP via administracao: POST /companies'),
                numbered('Cria o utilizador admin do cliente: POST /users'),
                numbered('Envia ao cliente: URL de acesso + utilizador + password temporaria'),

                h2('4.2 O Que o Cliente Faz'),
                numbered('Abre o browser e vai para https://erp.tuaempresa.co.mz'),
                numbered('Faz login com as credenciais recebidas'),
                numbered('Muda a password no primeiro acesso'),
                numbered('Comeca a usar o ERP'),
                tip('Para clientes SaaS, a phone-home nao e necessaria — controias tudo directamente na base de dados do teu servidor.'),
                divider(),

                // 5. On-Premise
                pageBreak(),
                h1('5. Instalacao Modelo On-Premise (Servidor do Cliente)'),
                para('Neste modelo, o ERP corre no servidor do proprio cliente. Tu verificas a licenca remotamente a cada 4 horas via phone-home.'),

                h2('5.1 Requisitos no Servidor do Cliente'),
                bullet('Ubuntu 22.04 LTS ou Debian 12'),
                bullet('Docker instalado (o script instala automaticamente)'),
                bullet('Minimo 2 GB RAM, 20 GB disco'),
                bullet('Acesso SSH do tecnico para instalacao inicial'),
                bullet('Ligacao a internet (mesmo que intermitente — ate 30 dias offline sao suportados)'),

                h2('5.2 Instalacao no Servidor do Cliente'),
                para('Passo 1: Liga ao servidor do cliente via SSH'),
                code('ssh admin@IP_DO_SERVIDOR_DO_CLIENTE'),
                para('Passo 2: Executa o script de instalacao'),
                code('bash <(curl -s https://raw.githubusercontent.com/robsitoe/inverno-erp/main/scripts/server-setup.sh)'),
                para('Passo 3: Configura o ficheiro .env'),
                code('nano /opt/inverno-erp/.env'),
                para('Preenche os valores especificos para instalacao on-premise:'),
                twoColTable([
                    ['DB_USERNAME', 'postgres'],
                    ['DB_PASSWORD', 'Password forte para a base de dados local'],
                    ['DB_DATABASE', 'inverno_erp'],
                    ['JWT_SECRET', 'Gera um segredo unico para este cliente'],
                    ['LICENSE_SECRET', 'DEVE SER O MESMO que o teu servidor central usa'],
                    ['PHONE_HOME_URL', 'https://erp.tuaempresa.co.mz (o teu servidor central)'],
                    ['APP_VERSION', '1.0.0'],
                    ['UPDATE_WEBHOOK_SECRET', 'Segredo para actualizacoes remotas (gera um unico)'],
                    ['APP_DIR', '/opt/inverno-erp'],
                ]),
                spacer(),
                note('O LICENSE_SECRET DEVE ser identico ao do teu servidor central. E com esta chave que o token operacional e assinado e verificado.'),

                h2('5.3 Arrancar o Sistema'),
                code('cd /opt/inverno-erp'),
                code('docker compose -f docker-compose.prod.yml up -d --build'),
                code('curl http://localhost/admin/version'),

                h2('5.4 Activar a Licenca do Cliente'),
                para('Passo 1: No teu servidor central, gera a licenca (Seccao 3.2)'),
                para('Passo 2: O endpoint de geracao devolve um token. Envia esse token ao sistema do cliente:'),
                code('POST http://IP_CLIENTE/licenses/activate'),
                code('Body: { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }'),
                para('Passo 3: Verifica que a activacao foi bem sucedida:'),
                code('GET http://IP_CLIENTE/licenses/status/empresa-abc'),
                para('Deve mostrar status: "ACTIVE".'),
                para('Passo 4: O phone-home corre automaticamente na proxima hora e obtem o primeiro token operacional (30 dias).'),
                tip('Se quiseres forcar o phone-home imediato, reinicia o backend: docker compose -f docker-compose.prod.yml restart backend'),

                h2('5.5 Configurar o Segredo de Actualizacao no Browser do Admin'),
                para('Para o admin do cliente poder clicar "Aplicar Actualizacao" no ERP:'),
                numbered('O admin abre o ERP no browser'),
                numbered('Pressiona F12 para abrir as ferramentas de desenvolvimento'),
                numbered('Va ao separador "Console"'),
                numbered('Escreve o seguinte e pressiona Enter:'),
                code('localStorage.setItem(\'erp_update_secret\', \'SEGREDO_DO_CLIENTE\')'),
                para('Substitui SEGREDO_DO_CLIENTE pelo valor de UPDATE_WEBHOOK_SECRET do .env do cliente.'),
                note('Este passo so e necessario uma vez por browser. Se o admin usar outro browser ou computador, repete o processo.'),
                divider(),

                // 6. Sistema de Licencas Offline
                pageBreak(),
                h1('6. Como Funciona a Verificacao de Licenca Offline'),
                para('O sistema usa dois mecanismos de seguranca em camadas para garantir que clientes com servidores proprios nao possam contornar o pagamento.'),

                h2('6.1 Token Operacional (Proteccao Criptografica)'),
                para('Quando o cliente liga a internet e o phone-home tem sucesso, o teu servidor emite um token JWT assinado valido por 30 dias. Este token:'),
                bullet('Contem a empresa, plano e data de expiracao'),
                bullet('E assinado com o LICENSE_SECRET (apenas tu tens esta chave)'),
                bullet('E verificado localmente — sem chamada a internet'),
                bullet('NAO pode ser falsificado nem alterado na base de dados do cliente'),
                spacer(),
                para('Comportamento:'),
                new Table({
                    width: { size: 9360, type: WidthType.DXA },
                    columnWidths: [3500, 5860],
                    rows: [
                        new TableRow({ children: ['SITUACAO', 'RESULTADO'].map((t, i) => new TableCell({ borders: BORDERS, width: { size: [3500, 5860][i], type: WidthType.DXA }, shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: 'FFFFFF' })] })] })) }),
                        ...[
                            ['Internet OK, licenca activa', 'Phone-home a cada 4h, token renovado automaticamente'],
                            ['Sem internet ha 3 dias', 'Token ainda valido (30 dias) — continua a trabalhar'],
                            ['Sem internet ha 31 dias', 'Token expirou — sistema bloqueado ate ligar a internet'],
                            ['Cliente altera base de dados', 'Assinatura invalida — sistema bloqueado'],
                            ['Licenca revogada por falta de pagamento', 'Proximo phone-home nao emite novo token — bloqueado em max 30 dias'],
                            ['Cliente paga — reactivado', 'Proximo phone-home (max 4h) desbloqueia automaticamente'],
                        ].map(([s, r]) => new TableRow({ children: [s, r].map((t, i) => new TableCell({ borders: BORDERS, width: { size: [3500, 5860][i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, size: 20 })] })] })) })),
                    ],
                }),

                h2('6.2 Configurar o Periodo Offline por Cliente'),
                para('Por defeito, o token dura 30 dias. Podes ajustar por cliente na coluna offlineGraceDays da tabela licenses:'),
                bullet('Cliente em Maputo com fibra: 7 dias (mais seguranca)'),
                bullet('Cliente em zona rural: 30 dias (padrao)'),
                bullet('Cliente sem internet permanente: 0 (desactiva o phone-home)'),
                divider(),

                // 7. Actualizacoes
                pageBreak(),
                h1('7. Processo de Actualizacao do Software'),

                h2('7.1 Actualizacao do Servidor Central (SaaS)'),
                para('Quando desenvolves uma funcionalidade nova ou corriges um erro:'),
                numbered('No teu PC: git add . && git commit -m "Descricao" && git push main'),
                numbered('O GitHub Actions conecta ao servidor automaticamente'),
                numbered('Faz git pull + docker compose build + docker compose up em background'),
                numbered('Em ~3 minutos todos os clientes SaaS tem a nova versao'),
                tip('Os clientes SaaS nem percebem que houve actualizacao — e como o Gmail, actualiza sem interromper.'),

                h2('7.2 Actualizacao de Clientes On-Premise'),
                para('Opcao A — Admin clica no banner (recomendado):'),
                numbered('Quando ha versao nova, o admin ve um banner azul no topo ao fazer login'),
                numbered('Clica "Aplicar Agora" quando nao ha trabalho em curso'),
                numbered('O servidor do cliente faz git pull + rebuild em background (~3 min)'),
                numbered('Utilizadores podem continuar a trabalhar durante a actualizacao'),
                numbered('O servidor reinicia sozinho quando a nova versao estiver pronta'),
                spacer(),
                para('Opcao B — Tu forces remotamente (sem precisar do cliente):'),
                code('POST http://IP_CLIENTE/admin/update'),
                code('Header: x-update-secret: SEGREDO_DO_CLIENTE'),
                para('Useful quando precisas de corrigir um erro urgente sem esperar pelo admin do cliente.'),
                divider(),

                // 8. Diagnostico
                pageBreak(),
                h1('8. Diagnostico e Resolucao de Problemas'),

                h2('8.1 Verificar Estado do Sistema'),
                para('No servidor (central ou cliente):'),
                code('docker compose -f docker-compose.prod.yml ps'),
                code('docker compose -f docker-compose.prod.yml logs backend --tail=50'),
                code('docker compose -f docker-compose.prod.yml logs frontend --tail=20'),

                h2('8.2 Base de Dados Nao Arranca'),
                para('Sintoma: container db em estado "Exited"'),
                numbered('Verifica o erro: docker compose -f docker-compose.prod.yml logs db'),
                numbered('Causa mais comum: DB_PASSWORD nao definida no .env'),
                numbered('Solucao: edita o .env e reinicia: docker compose -f docker-compose.prod.yml up -d'),

                h2('8.3 Backend Nao Consegue Ligar a Base de Dados'),
                para('Sintoma: logs do backend mostram "Unable to connect to the database. Retrying"'),
                numbered('Verifica que o container db esta a correr: docker ps'),
                numbered('Verifica que DB_HOST=db no .env (nao "localhost")'),
                numbered('Aguarda 30 segundos — o backend tenta automaticamente ate a BD estar pronta'),

                h2('8.4 Phone-Home Nao Funciona'),
                para('Sintoma: logs mostram "Phone-home failed for empresa-abc"'),
                numbered('Verifica que PHONE_HOME_URL esta correcto no .env do cliente'),
                numbered('Verifica que o servidor central esta acessivel a partir do servidor do cliente'),
                numbered('Testa: curl https://erp.tuaempresa.co.mz/admin/version'),
                numbered('Verifica o LICENSE_SECRET — deve ser identico nos dois servidores'),

                h2('8.5 Cliente Diz que Foi Bloqueado por Engano'),
                numbered('Verifica o estado: GET /licenses/status/empresa-abc no teu servidor'),
                numbered('Se status=REVOKED mas nao deveria: POST /licenses/subscribe para reactivar'),
                numbered('Se o token operacional expirou sem querer: o cliente precisa de ligar a internet para renovar'),
                divider(),

                // 9. Referencia Rapida
                pageBreak(),
                h1('9. Referencia Rapida de Comandos'),

                h2('Servidor (executar dentro de /opt/inverno-erp)'),
                twoColTable([
                    ['Iniciar tudo', 'docker compose -f docker-compose.prod.yml up -d'],
                    ['Parar tudo', 'docker compose -f docker-compose.prod.yml down'],
                    ['Ver estado', 'docker compose -f docker-compose.prod.yml ps'],
                    ['Ver logs backend', 'docker compose -f docker-compose.prod.yml logs backend -f'],
                    ['Reiniciar backend', 'docker compose -f docker-compose.prod.yml restart backend'],
                    ['Actualizar manualmente', 'git pull && docker compose -f docker-compose.prod.yml up -d --build'],
                    ['Backup da base de dados', 'docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres inverno_erp > backup.sql'],
                ]),
                spacer(),

                h2('API de Licencas (SuperAdmin)'),
                twoColTable([
                    ['Listar todas', 'GET /licenses'],
                    ['Ver estado de empresa', 'GET /licenses/status/:companyId'],
                    ['Gerar nova licenca', 'POST /licenses/generate'],
                    ['Activar licenca', 'POST /licenses/activate'],
                    ['Revogar (nao pagou)', 'DELETE /licenses/:companyId'],
                    ['Reactivar (pagou)', 'POST /licenses/subscribe'],
                    ['Historico de renovacoes', 'GET /licenses/:companyId/renewals'],
                ]),
                spacer(),

                h2('Contactos e Suporte'),
                twoColTable([
                    ['Email do proprietario', 'roberto.manuelsitoe@gmail.com'],
                    ['Repositorio GitHub', 'github.com/robsitoe/inverno-erp'],
                    ['Versao actual', '1.0.0 (Junho 2026)'],
                ]),
                spacer(),
                para('Documento gerado automaticamente. Mantem este ficheiro actualizado a cada versao major do sistema.'),
            ],
        },
    ],
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync('Inverno-ERP-Manual-Instalacao.docx', buffer);
    console.log('Documento gerado: Inverno-ERP-Manual-Instalacao.docx');
});
