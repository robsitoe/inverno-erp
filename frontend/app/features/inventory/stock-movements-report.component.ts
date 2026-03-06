import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stock-movements-report',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="flex items-center justify-center h-full bg-[#F0F0F0]">
      <div class="text-center">
        <span class="material-symbols-outlined text-[64px] text-gray-400 mb-4">sync_alt</span>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Entradas/Saídas</h2>
        <p class="text-gray-500">Relatório de movimentações de entrada e saída de stock</p>
        <p class="text-sm text-gray-400 mt-4">Em desenvolvimento...</p>
      </div>
    </div>
  `
})
export class StockMovementsReportComponent { }
