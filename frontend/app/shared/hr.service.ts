import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

const API_BASE = 'http://localhost:3000';

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
  salaryBase: number;
  subsidyTransport: number;
  subsidyFood: number;
  subsidyHousing: number;
  isActive: boolean;
}

export interface PayrollRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  year: number;
  month: number;
  grossSalary: number;
  inssEmployee: number;
  inssEmployer: number;
  irm: number;
  netSalary: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class HRService {
  private apiUrl = `${API_BASE}/hr`;
  
  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  employees$ = this.employeesSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadEmployees(companyId: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees?companyId=${companyId}`).pipe(
      tap(employees => this.employeesSubject.next(employees))
    );
  }

  saveEmployee(employee: Employee): Observable<Employee> {
    if (employee.id) {
      return this.http.patch<Employee>(`${this.apiUrl}/employees/${employee.id}`, employee);
    } else {
      return this.http.post<Employee>(`${this.apiUrl}/employees`, employee);
    }
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
}
