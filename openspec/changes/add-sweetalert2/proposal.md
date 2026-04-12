## Why

Currently, the project uses the native browser `alert()` function for user notifications (seat conflicts, payment errors, session timeouts). These native alerts break the user experience with their basic styling and are inconsistent with the cinema's design system. Replacing them with SweetAlert2 will provide a consistent, professional UI that matches the project's aesthetic (dark theme, Source Serif 4 / Inter fonts).

## What Changes

- Install `sweetalert2` npm package in front-nuxt
- Create a reusable SweetAlert2 configuration composable that follows the project's design tokens
- Replace all native `alert()` calls with SweetAlert2 in booking flow
- Replace admin.vue alert with SweetAlert2
- Use FontAwesome icons instead of SweetAlert2's default icons

## Capabilities

### New Capabilities
- `sweetalert-integration`: Reusable SweetAlert2 wrapper composable with project-specific theming
- `alert-seat-conflict`: Custom alert for seat conflict notifications
- `alert-payment-error`: Custom alerts for payment failures (Stripe rejects, backend errors)
- `alert-timeout`: Custom alert for session timeout warnings
- `alert-success`: Custom success notification for completed payments
- `alert-input-validation`: Custom alerts for input validation (seat count mismatches)

### Modified Capabilities
- (none - no existing spec-level behavior changes)

## Impact

- **Dependencies**: Add `sweetalert2` package to front-nuxt/package.json
- **Code Changes**: Modify `front-nuxt/app/pages/booking/[id].vue` (6 alerts), `front-nuxt/app/pages/admin.vue` (1 alert)
- **New Files**: Create `front-nuxt/app/composables/useSwal.ts` (reusable configuration)