import { Injectable } from '@angular/core';

/**
 * Segregação de funções: verifica permissões do utilizador autenticado.
 * As chaves vêm do backend no login (user.permissionKeys, resolvidas dos
 * perfis atribuídos). Utilizadores admin têm acesso total — instalações
 * mono-utilizador continuam a funcionar sem configuração.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {

    private get user(): any {
        try {
            return JSON.parse(localStorage.getItem('erp_current_user') || 'null');
        } catch {
            return null;
        }
    }

    get isAdmin(): boolean {
        const u = this.user;
        return !!(u && (u.isAdmin || u.isSuperAdmin || u.isTechnical));
    }

    hasPerm(key: string): boolean {
        const u = this.user;
        if (!u) return false;
        if (u.isAdmin || u.isSuperAdmin || u.isTechnical) return true;
        const keys: string[] = Array.isArray(u.permissionKeys) ? u.permissionKeys : [];
        return keys.includes(key);
    }

    hasAny(keys: string[]): boolean {
        return keys.some(k => this.hasPerm(k));
    }
}
