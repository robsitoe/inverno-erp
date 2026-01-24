import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Batch {
    id: string;
    code: string;
    description: string;
    articleId?: string;
    articleCode?: string;
    articleName?: string;
    manufacturingDate?: string;
    expirationDate?: string;
    quantity: number;
    warehouse: string;
    location: string;
    status: 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
    notes: string;
}

@Component({
    selector: 'app-batch-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="flex flex-col h-full bg-[#F0F0F0]">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0">
        <button (click)="saveBatch()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">save</span>
          <span>Gravar</span>
        </button>
        <button (click)="newBatch()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Novo</span>
        </button>
        <button (click)="deleteBatch()" [disabled]="!currentBatch.id" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs disabled:opacity-50">
          <span class="material-symbols-outlined text-[18px]">delete</span>
          <span>Eliminar</span>
        </button>
        <div class="w-px h-4 bg-gray-300 mx-1"></div>
        <button (click)="checkExpiration()" class="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 text-xs">
          <span class="material-symbols-outlined text-[18px]">event_busy</span>
          <span>Verificar Validade</span>
        </button>
      </div>

      <!-- Form -->
      <div class="p-3 bg-white border-b border-gray-300 shrink-0">
        <div class="grid grid-cols-3 gap-3 text-xs mb-3">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Código Lote:</label>
            <input [(ngModel)]="currentBatch.code" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Artigo:</label>
            <input [(ngModel)]="currentBatch.articleCode" class="w-24 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" placeholder="Código" />
            <button class="px-2 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200">
              <span class="material-symbols-outlined text-[14px]">search</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Estado:</label>
            <select [(ngModel)]="currentBatch.status" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
              <option value="ACTIVE">Ativo</option>
              <option value="EXPIRED">Expirado</option>
              <option value="BLOCKED">Bloqueado</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-xs mb-3">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Data Fabrico:</label>
            <input type="date" [(ngModel)]="currentBatch.manufacturingDate" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Data Validade:</label>
            <input type="date" [(ngModel)]="currentBatch.expirationDate" (change)="checkBatchExpiration()" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Quantidade:</label>
            <input type="number" [(ngModel)]="currentBatch.quantity" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" step="0.01" />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 text-xs mb-3">
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Armazém:</label>
            <select [(ngModel)]="currentBatch.warehouse" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500">
              <option value="">Selecione...</option>
              <option *ngFor="let wh of warehouses" [value]="wh.code">{{ wh.code }} - {{ wh.name }}</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <label class="font-medium text-gray-700 w-28">Localização:</label>
            <input [(ngModel)]="currentBatch.location" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div class="flex items-start gap-2 text-xs">
          <label class="font-medium text-gray-700 w-28 pt-1">Descrição:</label>
          <input [(ngModel)]="currentBatch.description" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500" />
        </div>

        <div class="flex items-start gap-2 text-xs mt-2">
          <label class="font-medium text-gray-700 w-28 pt-1">Observações:</label>
          <textarea [(ngModel)]="currentBatch.notes" rows="2" class="flex-1 px-2 py-1 border border-gray-300 focus:outline-none focus:border-blue-500 resize-none"></textarea>
        </div>
      </div>

      <!-- Batches List -->
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full text-xs border-collapse">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold text-blue-700">Código Lote</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Descrição</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-left font-semibold">Artigo</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Data Fabrico</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Data Validade</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-right font-semibold">Quantidade</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Armazém</th>
              <th class="border-b border-r border-gray-300 px-2 py-2 text-center font-semibold">Localização</th>
              <th class="border-b border-gray-300 px-2 py-2 text-center font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let batch of batches" 
                (click)="editBatch(batch)"
                [class.bg-red-50]="batch.status === 'EXPIRED'"
                [class.bg-yellow-50]="batch.status === 'BLOCKED'"
                [class.bg-green-50]="batch.status === 'ACTIVE'"
                class="hover:bg-blue-50 cursor-pointer">
              <td class="border-b border-r border-gray-200 px-2 py-1 font-medium">{{ batch.code }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ batch.description }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1">{{ batch.articleCode }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ batch.manufacturingDate | date:'dd/MM/yyyy' }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center"
                  [class.text-red-600]="isExpiringSoon(batch.expirationDate)">
                {{ batch.expirationDate | date:'dd/MM/yyyy' }}
                <span *ngIf="isExpiringSoon(batch.expirationDate)" class="material-symbols-outlined text-[12px] align-middle ml-1">warning</span>
              </td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-right">{{ batch.quantity | number:'1.2-2' }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ batch.warehouse }}</td>
              <td class="border-b border-r border-gray-200 px-2 py-1 text-center">{{ batch.location }}</td>
              <td class="border-b border-gray-200 px-2 py-1 text-center">
                <span [class.text-green-600]="batch.status === 'ACTIVE'"
                      [class.text-red-600]="batch.status === 'EXPIRED'"
                      [class.text-orange-600]="batch.status === 'BLOCKED'"
                      class="font-medium">
                  {{ getStatusLabel(batch.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="px-3 py-2 bg-[#DCE4F2] border-t border-gray-300 shrink-0">
        <div class="flex justify-between items-center text-xs">
          <div class="flex gap-6">
            <span class="font-medium">Total Lotes: {{ batches.length }}</span>
            <span class="text-green-600 font-medium">Ativos: {{ getActiveBatches() }}</span>
            <span class="text-red-600 font-medium">Expirados: {{ getExpiredBatches() }}</span>
            <span class="text-orange-600 font-medium">A Expirar (30 dias): {{ getExpiringSoon() }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BatchManagementComponent implements OnInit {
    currentBatch: Batch = this.getEmptyBatch();
    batches: Batch[] = [];
    warehouses: any[] = [];

    ngOnInit() {
        this.loadWarehouses();
        this.loadBatches();
    }

    getEmptyBatch(): Batch {
        return {
            id: '',
            code: '',
            description: '',
            quantity: 0,
            warehouse: '',
            location: '',
            status: 'ACTIVE',
            notes: ''
        };
    }

    loadWarehouses() {
        const stored = localStorage.getItem('erp_warehouses');
        if (stored) {
            this.warehouses = JSON.parse(stored);
        }
    }

    loadBatches() {
        const stored = localStorage.getItem('erp_batches');
        if (stored) {
            this.batches = JSON.parse(stored);
        }
    }

    newBatch() {
        this.currentBatch = this.getEmptyBatch();
        this.currentBatch.code = `LOTE${Date.now()}`;
    }

    saveBatch() {
        if (!this.currentBatch.code) {
            alert('Preencha o código do lote.');
            return;
        }

        if (this.currentBatch.id) {
            const index = this.batches.findIndex(b => b.id === this.currentBatch.id);
            if (index !== -1) {
                this.batches[index] = { ...this.currentBatch };
            }
        } else {
            this.currentBatch.id = `B${Date.now()}`;
            this.batches.push({ ...this.currentBatch });
        }

        localStorage.setItem('erp_batches', JSON.stringify(this.batches));
        alert('Lote gravado com sucesso!');
        this.loadBatches();
    }

    editBatch(batch: Batch) {
        this.currentBatch = { ...batch };
    }

    deleteBatch() {
        if (!this.currentBatch.id) return;

        if (confirm(`Tem certeza que deseja eliminar o lote ${this.currentBatch.code}?`)) {
            this.batches = this.batches.filter(b => b.id !== this.currentBatch.id);
            localStorage.setItem('erp_batches', JSON.stringify(this.batches));
            alert('Lote eliminado com sucesso!');
            this.loadBatches();
            this.newBatch();
        }
    }

    checkBatchExpiration() {
        if (this.currentBatch.expirationDate) {
            const expDate = new Date(this.currentBatch.expirationDate);
            const today = new Date();

            if (expDate < today) {
                this.currentBatch.status = 'EXPIRED';
                alert('Este lote está expirado!');
            }
        }
    }

    checkExpiration() {
        let expiredCount = 0;
        let expiringSoonCount = 0;

        this.batches.forEach(batch => {
            if (batch.expirationDate) {
                const expDate = new Date(batch.expirationDate);
                const today = new Date();
                const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (expDate < today && batch.status !== 'EXPIRED') {
                    batch.status = 'EXPIRED';
                    expiredCount++;
                } else if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
                    expiringSoonCount++;
                }
            }
        });

        localStorage.setItem('erp_batches', JSON.stringify(this.batches));
        this.loadBatches();

        alert(`Verificação concluída:\n${expiredCount} lotes expirados\n${expiringSoonCount} lotes a expirar em 30 dias`);
    }

    isExpiringSoon(expirationDate?: string): boolean {
        if (!expirationDate) return false;

        const expDate = new Date(expirationDate);
        const today = new Date();
        const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
    }

    getStatusLabel(status: string): string {
        const labels: any = {
            'ACTIVE': 'Ativo',
            'EXPIRED': 'Expirado',
            'BLOCKED': 'Bloqueado'
        };
        return labels[status] || status;
    }

    getActiveBatches(): number {
        return this.batches.filter(b => b.status === 'ACTIVE').length;
    }

    getExpiredBatches(): number {
        return this.batches.filter(b => b.status === 'EXPIRED').length;
    }

    getExpiringSoon(): number {
        return this.batches.filter(b => this.isExpiringSoon(b.expirationDate)).length;
    }
}
