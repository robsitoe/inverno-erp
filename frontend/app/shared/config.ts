/**
 * Global Configuration for Inverno ERP
 * In production (Docker/nginx), the API is served from the same origin —
 * nginx proxies backend routes transparently. Set apiUrl to empty string.
 * For local development, point directly to the NestJS dev server.
 */
export const environment = {
    production: false,
    // Empty string = same origin (production via nginx proxy).
    // Override by setting INVERNO_API_URL in the build environment, or
    // change this value for direct-IP/LAN dev access.
    apiUrl: (window as any).__INVERNO_API_URL__ || '',
    frontendUrl: window.location.origin,
};

/**
 * Contacto do fornecedor do Inverno ERP (mostrado no ecrã de licença, para pedir/renovar).
 * Preencher antes de entregar a clientes. Deixar vazio esconde o botão correspondente.
 */
export const VENDOR_CONTACT = {
    name: 'Inverno ERP',
    phone: '849354296',   // ex.: '258841234567'
    email: 'roberto.manuelsitoe@gmail.com',   // ex.: 'suporte@inverno.co.mz'
};

/**
 * Dados de pagamento da licença, mostrados no assistente de configuração inicial ("Comprar agora").
 * Deixar vazio esconde a linha; sem nenhum preenchido, o cliente vê só os contactos do fornecedor.
 */
export const PAYMENT_INFO = {
    holder: '',   // titular, ex.: 'Roberto Sitoe'
    mpesa: '',    // ex.: '84 935 4296'
    emola: '',    // ex.: '86 000 0000'
    bank: '',     // ex.: 'BCI · NIB 0008 0000 1234 5678 9012 3'
};
