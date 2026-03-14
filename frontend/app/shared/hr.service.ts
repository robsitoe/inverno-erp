import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, BehaviorSubject, tap, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';



const API_BASE = 'http://localhost:3000';



export interface EmployeeDocument {

  id: string;

  type: 'BI' | 'CONTRATO' | 'NUIT' | 'INSS' | 'OUTRO';

  label: string;

  filename: string;

  originalName: string;

  mimeType: string;

  size: number;

  uploadedAt: string;

  url: string;

}



export interface Employee {

  id: string;

  companyId: string;

  code: string;

  name: string;

  nif?: string;

  inss?: string;

  nib?: string;

  bankName?: string;

  email?: string;

  phone?: string;

  address?: string;

  department?: string;

  position?: string;

  contractType: string;

  hireDate?: string;

  endDate?: string;

  trialPeriodEnd?: string;

  weeklyHours?: number;

  salaryBase: number;

  subsidyTransport: number;

  subsidyFood: number;

  subsidyHousing: number;

  vacationBalance?: number;

  dependents?: number;

  isActive: boolean;

  photoUrl?: string; // Profile photo URL

  documents?: EmployeeDocument[]; // List of attachments

}



export interface PayrollRecord {

  id: string;

  employeeId: string;

  employeeName: string;

  employeeCode: string;

  year: number;

  month: number;

  grossSalary: number;

  inssEmployee: number;

  inssEmployer: number;

  irps: number;

  transportSubsidy: number;

  foodSubsidy: number;

  overtimeAmount?: number;

  bonusAmount?: number;

  dependents: number;

  absenceDays?: number;

  absenceDeduction?: number;

  vacationDays?: number;

  cashVoucherDeduction?: number;

  daysWorked?: number;

  netSalary: number;

  status: string;

}



export interface TaxBracket {

  id?: string;

  minAmount: number;

  maxAmount: number | null;

  rate: number;

  deduction0: number; // Parcela a abater para 0 dependentes

  deduction1: number; // 1 dependente

  deduction2: number; // 2 dependentes

  deduction3: number; // 3 dependentes

  deduction4Plus: number; // 4 ou mais dependentes

}



export interface HRSettings {

  companyId?: string;

  inssEmployeeRate: number;

  inssEmployerRate: number;

  currency: string;

}



/** Banks operating in Mozambique */

export const MOZAMBIQUE_BANKS = [

  'BCI - Banco Comercial e de Investimentos',

  'BIM - Millennium BIM',

  'Standard Bank Moçambique',

  'Absa Bank Moçambique',

  'FNB Moçambique',

  'Moza Banco',

  'Letshego Bank Moçambique',

  'Banco Único',

  'Ecobank Moçambique',

  'Novo Banco Moçambique',

  'BancABC Moçambique',

  'Societe Generale Moçambique',

  'UBA Moçambique',

  'Access Bank Moçambique',

  'First National Bank',

  'Outro',

];



@Injectable({

  providedIn: 'root'

})

export class HRService {

  private apiUrl = `${API_BASE}/hr`;



  private employeesSubject = new BehaviorSubject<Employee[]>([]);

  employees$ = this.employeesSubject.asObservable();



  constructor(private http: HttpClient) { }



  loadEmployees(companyId: string): Observable<Employee[]> {

    return this.http.get<Employee[]>(`${this.apiUrl}/employees?companyId=${companyId}`).pipe(

      tap(employees => this.employeesSubject.next(employees))

    );

  }



  findOne(id: string): Observable<Employee> {

    return this.http.get<Employee>(`${this.apiUrl}/employees/${id}`);

  }



  getSalaryHistory(employeeId: string, companyId: string): Observable<any[]> {

    return this.http.get<any[]>(`${this.apiUrl}/employees/${employeeId}/salary-history?companyId=${companyId}`);

  }



  getNextCode(companyId: string): Observable<{ code: string }> {

    return this.http.get<{ code: string }>(`${this.apiUrl}/employees/next-code?companyId=${companyId}`);

  }



  checkCode(code: string, companyId: string, excludeId?: string): Observable<{ available: boolean }> {

    const excl = excludeId ? `&excludeId=${excludeId}` : '';

    return this.http.get<{ available: boolean }>(`${this.apiUrl}/employees/check-code?code=${code}&companyId=${companyId}${excl}`);

  }



  createSalaryVariation(data: any, companyId: string): Observable<any> {

    return this.http.post<any>(`${this.apiUrl}/salary-variations?companyId=${companyId}`, data);

  }



  applySalaryVariation(id: string, companyId: string): Observable<any> {

    return this.http.patch<any>(`${this.apiUrl}/salary-variations/${id}/apply?companyId=${companyId}`, {});

  }



  checkNib(nib: string, companyId: string, excludeId?: string): Observable<{ available: boolean; usedBy?: string }> {

    if (!nib?.trim()) return of({ available: true });

    const excl = excludeId ? `&excludeId=${excludeId}` : '';

    return this.http.get<{ available: boolean; usedBy?: string }>(`${this.apiUrl}/employees/check-nib?nib=${encodeURIComponent(nib)}&companyId=${companyId}${excl}`);

  }



  saveEmployee(employee: Employee, companyId: string): Observable<Employee> {

    // Clean payload for backend (remove read-only or separate-endpoint fields)

    const {

      id, photoUrl, documents, createdAt, updatedAt,

      salaryBase, subsidyTransport, subsidyFood, subsidyHousing, weeklyHours, dependents,

      ...cleanData

    } = employee as any;



    const payload = {

      ...cleanData,

      companyId: companyId,

      salaryBase: Number(salaryBase || 0),

      subsidyTransport: Number(subsidyTransport || 0),

      subsidyFood: Number(subsidyFood || 0),

      subsidyHousing: Number(subsidyHousing || 0),

      weeklyHours: Number(weeklyHours || 44),

      dependents: Number(dependents || 0),

    };



    if (employee.id) {

      return this.http.patch<Employee>(`${this.apiUrl}/employees/${employee.id}?companyId=${companyId}`, payload);

    } else {

      return this.http.post<Employee>(`${this.apiUrl}/employees`, payload);

    }

  }



  uploadPhoto(employeeId: string, companyId: string, file: File): Observable<Employee> {

    const formData = new FormData();

    formData.append('photo', file);

    return this.http.post<Employee>(`${this.apiUrl}/employees/${employeeId}/photo?companyId=${companyId}`, formData);

  }



  uploadDocument(employeeId: string, companyId: string, file: File, type: string, label: string): Observable<Employee> {

    const formData = new FormData();

    formData.append('file', file);

    const params = `?companyId=${companyId}&type=${type}&label=${encodeURIComponent(label)}`;

    return this.http.post<Employee>(`${this.apiUrl}/employees/${employeeId}/documents${params}`, formData);

  }



  removeDocument(employeeId: string, docId: string, companyId: string): Observable<Employee> {

    return this.http.delete<Employee>(`${this.apiUrl}/employees/${employeeId}/documents/${docId}?companyId=${companyId}`);

  }



  getFileUrl(path: string): string {

    return `${API_BASE}${path}`;

  }



  deleteEmployee(id: string): Observable<any> {

    return this.http.delete(`${this.apiUrl}/employees/${id}`);

  }



  processPayroll(year: number, month: number, companyId: string): Observable<PayrollRecord[]> {

    return this.http.post<PayrollRecord[]>(`${this.apiUrl}/payroll/process?companyId=${companyId}`, { year, month });

  }



  postPayrollToAccounting(year: number, month: number, companyId: string): Observable<any> {

    return this.http.post<any>(`${this.apiUrl}/payroll/post-to-accounting?companyId=${companyId}`, { year, month });

  }



  // ── Tax brackets & Settings ────────────────────────────────────────────────



  getTaxBrackets(companyId: string): Observable<TaxBracket[]> {

    return this.http.get<TaxBracket[]>(`${this.apiUrl}/tax-brackets?companyId=${companyId}`);

  }



  saveTaxBracket(bracket: TaxBracket, companyId: string): Observable<TaxBracket> {

    return this.http.post<TaxBracket>(`${this.apiUrl}/tax-brackets?companyId=${companyId}`, bracket);

  }



  deleteTaxBracket(id: string, companyId: string): Observable<any> {

    return this.http.delete(`${this.apiUrl}/tax-brackets/${id}?companyId=${companyId}`);

  }



  getHRSettings(companyId: string): Observable<HRSettings> {

    return this.http.get<HRSettings>(`${this.apiUrl}/settings?companyId=${companyId}`);

  }



  updateHRSettings(settings: HRSettings, companyId: string): Observable<HRSettings> {

    return this.http.post<HRSettings>(`${this.apiUrl}/settings?companyId=${companyId}`, settings);

  }



  // ── Reports ─────────────────────────────────────────────────────────────────



  getPayrollSheetReport(year: number, month: number, companyId: string): Observable<any> {

    return this.http.get(`${this.apiUrl}/reports/payroll-sheet?year=${year}&month=${month}&companyId=${companyId}`);

  }



  getNominalRelationReport(companyId: string): Observable<any> {

    return this.http.get(`${this.apiUrl}/reports/nominal-relation?companyId=${companyId}`);

  }



  getSeniorityReport(companyId: string): Observable<any[]> {

    return this.http.get<any[]>(`${this.apiUrl}/reports/seniority?companyId=${companyId}`);

  }



  getVacationPlanReport(year: number, companyId: string): Observable<any[]> {

    return this.http.get<any[]>(`${this.apiUrl}/reports/vacation-plan?year=${year}&companyId=${companyId}`);

  }

}

