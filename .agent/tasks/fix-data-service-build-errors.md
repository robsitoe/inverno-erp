# Task: Fix DataService Build Errors and Missing Properties

## Status
- [x] Analyze `data.service.ts` for duplicate methods and malformed blocks
- [x] Identify and define missing `SalesCampaign` type
- [x] Identify and restore missing methods in `DataService`
- [x] Verify fix by running build or type-check

## Analysis
The application bundle generation failed due to:
1. **Duplicate class members** in `data.service.ts`: `getDeliveryPoints`, `saveDeliveryPoint`, `deleteDeliveryPoint`.
2. **Missing properties** on `DataService`: `getPendingMobileUsers`, `getApprovedMobileUsers`, `approveMobileUser`, `getVehicles`, `saveVehicle`, `getActiveTrips`, `startTrip`, `updateTripLocation`.
3. **Cannot find name 'SalesCampaign'**: Used in `data.service.ts` but not defined.

## Plan
1. **Locate and Clean Duplicates**: Search for all occurrences of duplicate methods in `data.service.ts` and keep only one functional version.
2. **Restore Missing Methods**: Check if the reported missing methods are present but perhaps misnamed or commented out. If not, re-implement them based on usage in components.
3. **Fix SalesCampaign Type**: Find or define the `SalesCampaign` interface.
4. **Validation**: Run `npx tsc --noEmit` to verify type safety.

## References
- `app/services/data.service.ts`
- `app/features/admin/mobile-approvals.component.ts`
- `app/features/inventory/fleet-management.component.ts`
- `app/features/inventory/fleet-map.component.ts`
- `app/features/inventory/vehicle-load-form.component.ts`
- `app/features/sales/driver-pos.component.ts`
