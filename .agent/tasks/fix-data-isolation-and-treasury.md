# Task: Fix Data Isolation and Treasury Enhancements

## 🎯 Objectives
1.  **Fix Document Type Isolation**: Update frontend components to use `DataService` instead of direct `localStorage` access for document types.
2.  **Migrate Document Types to Backend**: Create a `DocumentType` entity and controller to store config in Postgres instead of `localStorage`.
3.  **Implement Payment Mapping**: Implement automatic mapping from Meio de Pagamento (NUM, TRF, etc.) to Treasury Accounts (11.x, 12.x) in the Receipt process.
4.  **Enhance UI/UX**: Ensure the Treasury and Sales interfaces feel premium and responsive.

## 🛠️ Phase 1: Backend (Document Types)
- [ ] Create `DocumentType` entity in `backend/src/common-entities/entities/document-type.entity.ts`.
- [ ] Add `DocumentType` to `AppModule`.
- [ ] Create endpoints in `AppController` for CRUD on `DocumentType`.

## 🛠️ Phase 2: Frontend Service (Data Handling)
- [ ] Update `DataService.getDocumentTypes` and `saveDocumentTypes` to use the backend API.
- [ ] Migrate existing `localStorage` data to backend (if possible) or ensure fresh start works.

## 🛠️ Phase 3: Component Refactoring (UI/UX)
- [ ] **SalesDocumentForm**: Use `DataService` for series/doc types.
- [ ] **ReceiptModalComponent**: 
    - Use `DataService` for doc types.
    - Implement the "Dados Liquidação" tab with Payment Method mapping.
    - Add "Adiantamento de Cliente (ADC)" support.

## 🛠️ Phase 4: Payment Logic
- [ ] Update `createAccountingEntry` in `ReceiptModalComponent` to handle multiple payment methods and correct accounts.

## 🏁 Verification
- [ ] Verify that document types created for Company A do not appear in Company B.
- [ ] Verify that selecting "Transferência" automatically selects the Bank account (12.x).
- [ ] Verify accounting entries for ADC.
