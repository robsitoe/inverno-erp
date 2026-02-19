import os

path = r'c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\features\admin\license-manager.component.ts'

with open(path, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Identify the conflict block
# Find the start and end markers
start_marker = '<<<<<<< HEAD'
end_marker = '>>>>>>> 5f4b7dba193f92d09454ce6d573082fb686b9a9d'

if start_marker in content and end_marker in content:
    lines = content.splitlines()
    new_lines = []
    in_conflict = False
    head_content = []
    incoming_content = []
    current_section = None
    
    for line in lines:
        if line.strip() == start_marker:
            in_conflict = True
            current_section = 'HEAD'
            continue
        elif line.strip() == '=======':
            current_section = 'INCOMING'
            continue
        elif line.strip() == end_marker:
            # Resolve the conflict
            # We want both: offline notice AND renewal history
            resolved = []
            
            # 1. Offline notice (from incoming)
            for l in incoming_content:
                if 'license?.offline' in l:
                    # Adjust indentation and styling if needed
                    resolved.append('            <!-- Offline Notice -->')
                    resolved.append(l.replace('mb-6', 'mb-4').replace('text-blue-700', 'text-blue-700 flex items-center gap-2'))
                    # Add icon manually to the resolved string if we want to be fancy as in the previous plan
                    # but let's just keep it simple to ensure it works first
            
            resolved.append('')
            
            # 2. Renewal history (from HEAD)
            resolved.extend(head_content)
            
            new_lines.extend(resolved)
            in_conflict = False
            current_section = None
            continue
            
        if in_conflict:
            if current_section == 'HEAD':
                head_content.append(line)
            else:
                incoming_content.append(line)
        else:
            new_lines.append(line)
            
    with open(path, 'wb') as f:
        f.write('\n'.join(new_lines).encode('utf-8'))
    print("Conflict resolved successfully.")
else:
    print("Conflict markers not found.")
