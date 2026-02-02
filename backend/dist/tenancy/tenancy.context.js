"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenancyContext = void 0;
const async_hooks_1 = require("async_hooks");
class TenancyContext {
    static storage = new async_hooks_1.AsyncLocalStorage();
    static run(companyId, next) {
        return this.storage.run(companyId, next);
    }
    static getCompanyId() {
        return this.storage.getStore();
    }
}
exports.TenancyContext = TenancyContext;
//# sourceMappingURL=tenancy.context.js.map