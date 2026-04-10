import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { DeliveryPoint } from '../src/customers/entities/delivery-point.entity';
import { SalesDocument } from '../src/sales/entities/sales-document.entity';

async function diagnose() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const pointRepo = dataSource.getRepository(DeliveryPoint);
    const salesRepo = dataSource.getRepository(SalesDocument);

    const points = await pointRepo.find();
    const sales = await salesRepo.find({ where: { documentType: 'GT' }, take: 10 });

    console.log('--- DIAGNÓSTICO DE GPS ---');
    console.log(`Total de Pontos de Entrega no BD: ${points.length}`);
    points.forEach(p => {
        console.log(`- Ponto: ${p.name} | Lat: ${p.latitude} | Lng: ${p.longitude} | Company: ${p.companyId}`);
    });

    console.log('\n--- ÚLTIMAS GUIAS (GT) ---');
    sales.forEach(s => {
        console.log(`- Documento: ${s.documentNumber} | GPS: ${s.latitude},${s.longitude} | PointID: ${s.deliveryPointId} | Company: ${s.companyId}`);
    });

    await app.close();
}
diagnose();
