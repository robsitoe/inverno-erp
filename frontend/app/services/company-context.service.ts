import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CompanyInfo } from '../shared/models';

const COMPANY_STORAGE_KEY = 'erp_company_info';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private activeCompanySubject = new BehaviorSubject<CompanyInfo | null>(this.getStoredCompany());
  readonly activeCompany$ = this.activeCompanySubject.asObservable();

  get activeCompany(): CompanyInfo | null {
    return this.activeCompanySubject.value;
  }

  checkActiveCompanyContext(): boolean {
    const company = this.activeCompany;
    if (!company?.id) {
      console.error('[Security] Operação bloqueada: Nenhuma empresa ativa selecionada.');
      return false;
    }
    return true;
  }

  setActiveCompany(company: CompanyInfo | null): void {
    if (company) {
      localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(company));
    } else {
      localStorage.removeItem(COMPANY_STORAGE_KEY);
    }
    this.activeCompanySubject.next(company);
  }

  private getStoredCompany(): CompanyInfo | null {
    const stored = localStorage.getItem(COMPANY_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CompanyInfo) : null;
  }
}
