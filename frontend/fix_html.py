import re
import os

file_path = 'app/features/sales/sales-document-form.component.ts'
abs_path = os.path.abspath(file_path)

with open(abs_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the template block
# Assuming template: `...` structure
pattern = re.compile(r'(template:\s*`)(.*?)(`)', re.DOTALL)
match = pattern.search(content)

if match:
    start_marker = match.group(1)
    template_content = match.group(2)
    end_marker = match.group(3)
    
    # Apply fixes to template_content
    
    # 1. Fix * ng -> *ng
    fixed_content = re.sub(r'\*\s+ng', '*ng', template_content)
    
    # 2. Fix bindings with spaces: [prop] = "val" -> [prop]="val" and (event) = "val" -> (event)="val"
    # We look for ] = " or ) = "
    fixed_content = re.sub(r'(\])\s+=\s+"', r'\1="', fixed_content)
    fixed_content = re.sub(r'(\))\s+=\s+"', r'\1="', fixed_content)
    
    # 3. Fix space before closing tag bracket: " > -> "> and ' > -> '> and maybe just >
    # Be careful not to affect text content like "A > B"
    # Usually HTML tags end with >. 
    # Safe bet: fix " > and ' > which end attributes.
    fixed_content = re.sub(r'"\s+>', '">', fixed_content)
    fixed_content = re.sub(r"'\s+>", "'>", fixed_content)
    
    # Also <span > -> <span>
    fixed_content = re.sub(r'<([a-zA-Z0-9-]+)\s+>', r'<\1>', fixed_content)
    
    # 4. Fix < !-- -> <!--
    fixed_content = re.sub(r'<\s+!--', '<!--', fixed_content)
    
    # 5. Fix < ng-container -> <ng-container (if any)
    fixed_content = re.sub(r'<\s+([a-zA-Z])', r'<\1', fixed_content)
    
    # 6. Fix </ div> -> </div> (if any)
    fixed_content = re.sub(r'</\s+([a-zA-Z])', r'</\1', fixed_content)

    # 7. Fix [disabled] = "isLocked" (no quotes around isLocked sometimes?)
    # The view_file showed [disabled] = "isLocked"
    # But regex #2 handles it if it has quotes.
    
    # Reconstruct the file
    new_content = content[:match.start(2)] + fixed_content + content[match.end(2):]
    
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully fixed HTML syntax in template.")
else:
    print("Template block not found.")
