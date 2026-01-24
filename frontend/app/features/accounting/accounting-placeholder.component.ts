import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounting-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full bg-white items-center justify-center">
      <span class="material-symbols-outlined text-[120px] text-gray-300">construction</span>
      <h2 class="text-2xl font-semibold text-gray-700 mt-4">{{ title }}</h2>
      <p class="text-gray-500 mt-2">Funcionalidade em desenvolvimento</p>
      <div class="mt-6 p-4 bg-blue-50 rounded-lg max-w-md">
        <p class="text-sm text-gray-700">
          Esta funcionalidade será implementada em breve. O sistema já está preparado
          para integração com base de dados e geração de relatórios.
        </p>
      </div>
    </div>
  `
})
export class AccountingPlaceholderComponent {
  title = 'Em Desenvolvimento';
}
