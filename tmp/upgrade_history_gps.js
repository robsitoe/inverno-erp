const fs = require('fs');
const filePath = 'c:/Users/yoriy/OneDrive/Documentos/Projectos/old/inverno-erp/backend/src/mobile/mobile.service.ts';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Localizar o método getResellerHistory
const findMethod = /async getResellerHistory\(customerId: string, companyId: string\) \{[\s\S]*?return \{ orders, payments \};\s*?\}/;

const upgradedMethod = `async getResellerHistory(customerId: string, companyId: string) {
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
    content = content.replace(findMethod, upgradedMethod);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('getResellerHistory Enriquecido com GPS!');
} else {
    console.log('Método getResellerHistory não encontrado para upgrade.');
}
