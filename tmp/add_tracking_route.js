const fs = require('fs');
const filePath = 'c:/Users/yoriy/OneDrive/Documentos/Projectos/old/inverno-erp/mobile/src/app/app-routing.module.ts';

let content = fs.readFileSync(filePath, 'utf8');

const trackingRoute = `  {
    path: 'tracking',
    loadComponent: () => import('./pages/tracking/tracking.page').then( m => m.TrackingPage)
  },`;

if (!content.includes("'tracking'")) {
    // Inserir após a rota home ou antes da rota notifications
    content = content.replace("path: 'home',", "path: 'home',\n" + trackingRoute);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Rota Tracking adicionada ao AppRoutingModule!');
} else {
    console.log('Rota Tracking já existe.');
}
