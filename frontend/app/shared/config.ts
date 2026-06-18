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
