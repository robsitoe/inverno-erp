const fs = require('fs');
const filePath = 'c:/Users/yoriy/OneDrive/Documentos/Projectos/old/inverno-erp/backend/src/mobile/mobile.service.ts';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Atualizar updateTruckStatus para aceitar driverId
const findUpdateMethod = /async updateTruckStatus\(truckPlate: string, data: any, companyId: string\) \{/;
const newUpdateMethod = `async updateTruckStatus(truckPlate: string, data: any, companyId: string, driverId?: string) {`;

if (content.includes("async updateTruckStatus(truckPlate: string, data: any, companyId: string) {")) {
    content = content.replace(findUpdateMethod, newUpdateMethod);
    // Adicionar gravação do driverId no corpo se não existir
    if (!content.includes("truck.driverId = driverId")) {
        content = content.replace("truck.lastUpdate = new Date();", "if (driverId) truck.driverId = driverId;\n        truck.lastUpdate = new Date();");
    }
}

// 2. Atualizar getResellerHistory para enriquecer com GPS
const findHistoryMethod = /async getResellerHistory\(customerId: string, companyId: string\) \{[\s\S]*?return \{ orders, payments \};\s*?\}/;

const upgradedHistoryMethod = `async getResellerHistory(customerId: string, companyId: string) {
        const logPath = path.join(process.cwd(), 'error-debug.log');
        fs.appendFileSync(logPath, \`\\n[AUDIT] Service getResellerHistory for Customer: \${customerId} on Company: \${companyId} at \${new Date().toISOString()}\\n\`);

        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const tenantTreasuryRepo = await this.getTenantRepo<TreasuryDocument>(TreasuryDocument, companyId);

        const orders = await tenantSalesRepo.find({
            where: { customerId },
            order: { date: 'DESC' },
            take: 20
        });

        // ENRICHMENT: Add real-time driver location for POSTED orders
        const enrichedOrders = await Promise.all(orders.map(async (order) => {
            const doc: any = { ...order };
            if (doc.status === 'POSTED' && doc.driverId) {
                // Find the truck assigned to this driver
                const truck = await this.truckRepo.findOne({ 
                    where: { driverId: doc.driverId, companyId } 
                });
                if (truck) {
                    doc.driverLat = truck.lastLat;
                    doc.driverLng = truck.lastLng;
                    doc.truckPlate = truck.truckPlate;
                }
            }
            return doc;
        }));

        const payments = await tenantTreasuryRepo.find({
            where: { customerCode: customerId },
            order: { date: 'DESC' },
            take: 20
        });

        return { orders: enrichedOrders, payments };
    }`;

if (content.includes("getResellerHistory")) {
    content = content.replace(findHistoryMethod, upgradedHistoryMethod);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('MobileService Atualizado: Rastreio GPS Ativo!');
