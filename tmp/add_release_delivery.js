const fs = require('fs');
const filePath = 'c:/Users/yoriy/OneDrive/Documentos/Projectos/old/inverno-erp/backend/src/mobile/mobile.service.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Adicionar releaseDelivery no MobileService
const releaseMethod = `

    /**
     * Driver releases a claimed delivery, making it available again for others.
     */
    async releaseDelivery(documentId: string, companyId: string) {
        const tenantSalesRepo = await this.getTenantRepo<SalesDocument>(SalesDocument, companyId);
        const doc = await tenantSalesRepo.findOne({ where: { id: documentId } });
        if (!doc) throw new NotFoundException('Entrega não encontrada');

        // Reset driver and status
        doc.driverId = null;
        doc.status = "APPROVED"; // Voltar ao estado disponível para qualquer um
        return tenantSalesRepo.save(doc);
    }`;

if (!content.includes("releaseDelivery")) {
    // Inserir antes da última chave (ou após assignDriverToDelivery)
    const lastBraceIndex = content.lastIndexOf('}');
    content = content.slice(0, lastBraceIndex) + releaseMethod + "\n" + content.slice(lastBraceIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Função releaseDelivery adicionada ao MobileService!');
} else {
    console.log('Função releaseDelivery já existe.');
}
