const fs = require('fs');
const filePath = 'c:/Users/yoriy/OneDrive/Documentos/Projectos/old/inverno-erp/mobile/src/app/pages/home/home.page.ts';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Corrigir a chaveta extra no constructor do HomePage
const doubleBrace = /\s*\}\s*\}\s*ngOnInit\(\)/;

if (doubleBrace.test(content)) {
    console.log('Found double brace in HomePage!');
    content = content.replace(doubleBrace, "\n  }\n\n  ngOnInit()");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('HomePage Sintaxe Limpa!');
