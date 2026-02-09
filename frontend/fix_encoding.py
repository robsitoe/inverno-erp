
import os

file_path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\features\treasury\treasury-management.component.ts'

# Try to read with different encodings
encodings = ['utf-8', 'windows-1252', 'latin-1', 'utf-16']
content = None
found_encoding = None

for enc in encodings:
    try:
        with open(file_path, 'r', encoding=enc) as f:
            content = f.read()
            found_encoding = enc
            print(f"Successfully read with {enc}")
            break
    except:
        continue

if content:
    # Save as UTF-8
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Converted file to UTF-8 from {found_encoding}")
    
    # Check for loadPendingDocuments
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if 'loadPendingDocuments()' in line:
            print(f"Line {i+1}: {line}")
            # Print a few lines around it
            for j in range(max(0, i-5), min(len(lines), i+50)):
                print(f"{j+1}: {lines[j]}")
            break
else:
    print("Could not read file with any common encoding")
