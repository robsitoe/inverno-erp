import { AsyncLocalStorage } from 'async_hooks';

export class TenancyContext {
    private static storage = new AsyncLocalStorage<string>();

    static run(companyId: string, next: () => any) {
        return this.storage.run(companyId, next);
    }

    static getCompanyId(): string | undefined {
        return this.storage.getStore();
    }
}
