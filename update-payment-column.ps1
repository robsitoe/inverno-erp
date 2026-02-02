# Script para atualizar a coluna de categoria na tabela de meios de pagamento
$file = "c:\Users\yoriy\OneDrive\Documentos\Projectos\old\inverno-erp\frontend\app\features\treasury\treasury-management.component.ts"

# Ler o arquivo
$lines = Get-Content $file -Encoding UTF8

# Encontrar e substituir a seção da coluna (linhas 353-363)
$startLine = 352  # 0-indexed
$endLine = 362    # 0-indexed

# Novo conteúdo para a coluna
$newColumn = @'
                           <td class="px-2 py-1">
                              <!-- Edit Mode: Category Dropdown -->
                              <select *ngIf="editingPaymentMethod?.id === pm.id" 
                                      [(ngModel)]="editingPaymentMethod.category"
                                      (change)="onCategoryChange(editingPaymentMethod)"
                                      class="w-full border border-blue-300 rounded-sm px-1 py-0.5 text-xs">
                                 <option *ngFor="let cat of paymentCategories" [value]="cat.id">
                                    {{ cat.icon }} {{ cat.name }}
                                 </option>
                              </select>
                              
                              <!-- View Mode: Show Category with Account Code -->
                              <span *ngIf="editingPaymentMethod?.id !== pm.id" class="flex items-center gap-1">
                                 <span>{{ getCategoryDisplay(pm.category) }}</span>
                                 <span class="text-[10px] text-gray-400" [title]="getTreasuryAccountDisplay(pm.treasuryAccountId)">
                                    ({{ getTreasuryAccountCode(pm.treasuryAccountId) }})
                                 </span>
                              </span>
                           </td>
'@

# Criar array de novas linhas
$newLines = $newColumn -split "`r`n"

# Substituir as linhas
$result = @()
$result += $lines[0..($startLine-1)]
$result += $newLines
$result += $lines[($endLine+1)..($lines.Length-1)]

# Salvar o arquivo
$result | Set-Content $file -Encoding UTF8

Write-Host "✅ Coluna de categoria atualizada com sucesso!"
Write-Host "Linhas $($startLine+1) a $($endLine+1) foram substituídas."
