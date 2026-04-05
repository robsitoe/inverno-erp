import re
import os

file_path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\services\data.service.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix company-001 vs 001
pattern_company = re.compile(r'<<<<<<< HEAD\s+const companyId = this\.activeCompanySubject\.value\?\.id \|\| \'company-001\';\s+=======\s+const companyId = this\.activeCompanySubject\.value\?\.id \|\| \'001\';\s+>>>>>>> feature/mobile-delivery-sync-core', re.MULTILINE)
content = pattern_company.sub("            const companyId = this.activeCompanySubject.value?.id || '001';", content)

# 2. Fix other minor company-001 patterns if any
content = content.replace("<<<<<<< HEAD\n            const companyId = this.activeCompanySubject.value?.id || 'company-001';\n=======\n            const companyId = this.activeCompanySubject.value?.id || '001';\n>>>>>>> feature/mobile-delivery-sync-core", "            const companyId = this.activeCompanySubject.value?.id || '001';")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
