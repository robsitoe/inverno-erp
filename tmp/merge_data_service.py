import re
import os

feature_path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\services\data.service.ts'
develop_path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\tmp\develop_data_service.ts'

# Detect encoding
def get_content(path):
    for enc in ['utf-8', 'utf-16', 'latin-1']:
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read()
        except:
            continue
    return ""

feature_content = get_content(feature_path)
develop_content = get_content(develop_path)

if not feature_content or not develop_content:
    print("Could not read files")
    exit(1)

# 1. Update Imports
if "SalesCampaign" not in feature_content:
    feature_content = feature_content.replace(
        "import { Injectable } from '@angular/core';",
        "import { Injectable } from '@angular/core';\nimport { SalesCampaign, SalesCampaignType, WorkflowStatus } from '../shared/models';"
    )

if "environment" not in feature_content:
    feature_content = feature_content.replace(
        "import { Injectable } from '@angular/core';",
        "import { Injectable } from '@angular/core';\nimport { environment } from '../shared/config';"
    )

# 2. Fix apiUrl
feature_content = feature_content.replace("'http://localhost:3000'", "environment.apiUrl")
feature_content = feature_content.replace("'company-001'", "'001'")

# 3. Robust Section (Backup & Switch & Campaigns)
marker = "// --- Backup & Mode Switch"
if marker in feature_content and marker in develop_content:
    feature_parts = feature_content.split(marker)
    develop_parts = develop_content.split(marker)
    
    # Robust section from develop
    robust_section = marker + develop_parts[1]
    # Remove the last closing brace and any whitespace
    robust_section = robust_section.rstrip()
    if robust_section.endswith('}'):
        robust_section = robust_section[:-1].rstrip()
    if robust_section.endswith('}'): # Case of double brace at end
        robust_section = robust_section[:-1].rstrip()

    # Find NEW methods in feature content (simplified search)
    new_methods = [
        "getDeliveryPoints",
        "saveDeliveryPoint",
        "deleteDeliveryPoint",
        "getPendingMobileDeliveries",
        "getApprovedDrivers",
        "assignMobileRoute",
        "optimizeMobileRoute",
        "getOptimizedSequence", 
        "assignRoute", 
        "getDrivers"
    ]
    
    added_methods = ""
    for m in new_methods:
        if m in feature_content and m not in robust_section:
            # Extract method body: search for method name until next method or end of file
            # Simplified: search for method name and take until next \n\n\s\s\s\s[a-zA-Z]
            match = re.search(r'\n\s+' + m + r'\(.*?\).*?\{.*?\}\n', feature_content, re.DOTALL)
            if match:
                added_methods += match.group(0)

    final_content = feature_parts[0] + robust_section + "\n" + added_methods + "\n}"
    
    with open(feature_path, 'w', encoding='utf-8') as f:
        f.write(final_content)
else:
    print("Marker NOT found. Feature index:", feature_content.find(marker), "Develop index:", develop_content.find(marker))
    # Fallback to just saving feature version but fixed
    with open(feature_path, 'w', encoding='utf-8') as f:
        f.write(feature_content)
