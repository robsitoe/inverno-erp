export declare class TenancyContext {
    private static storage;
    static run(companyId: string, next: () => any): any;
    static getCompanyId(): string | undefined;
}
