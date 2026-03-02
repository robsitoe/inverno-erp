# HR Module Implementation (Recursos Humanos)

## Goal
Build a complete HR module for Mozambique ERP, including Employee records, Payroll calculation (IRM/INSS), Vacations/Absences, Accounting integration, and PDF Payslips.

## Tasks
- [ ] Task 1: Create Backend HR Module Infrastructure (Entities: Employee, Contract, SalaryStep, Attendance, Payroll) → Verify: `nest generate module hr` and entities exported in `AppModule`.
- [ ] Task 2: Implement Mozambique Tax Engine (IRM 2024 Brackets & INSS 4%/3%) → Verify: Unit tests with sample salaries (e.g., 20,000 MT, 50,000 MT, 150,000 MT).
- [ ] Task 3: Develop Employee Management API (CRUD with Document Upload support) → Verify: `GET /hr/employees` returns list, `POST /hr/employees` creates new record.
- [ ] Task 4: Implement Payroll Processing Logic (Monthly runs, Bonus, Overtime calculation) → Verify: API endpoint `/hr/payroll/process` generates payroll records for all active employees.
- [ ] Task 5: Accounting Integration for Salaries (Automatic Journal Entries) → Verify: Payroll posting creates `JournalEntry` in Accounting module (Class 6 vs Class 4).
- [ ] Task 6: Build Frontend HR Dashboard & Employee List → Verify: Navigation link to "Recursos Humanos" and list rendering with Tailwind styles.
- [ ] Task 7: Implement Payroll Processing UI & Payslip Preview → Verify: Modal for monthly processing and interactive payslip preview.
- [ ] Task 8: PDF Generation for Payslips (Mozilla-compliant format) → Verify: "Download PDF" button generates valid payslip file.

## Done When
- [ ] Employee records can be managed with full history.
- [ ] Payroll calculates correct IRM and INSS according to 2024/2025 Mozambican law.
- [ ] Payslips are generated accurately and integrated with company accounting.
- [ ] PDF exports for bank transfers and payslips are functional.

## Notes
- IRM Brackets: 0-42k (10%), 42k-168k (15%), 168k-504k (20%), 504k-1.5M (25%), >1.5M (32%).
- INSS: Employee 4%, Employer 3%. Total 7%.
- Accounting: Debitar 6.2 (Gastos com Pessoal), Creditar 4.4 (IRM), 4.4 (INSS), 1.1/1.2 (Disponibilidades).
