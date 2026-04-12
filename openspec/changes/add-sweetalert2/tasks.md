## 1. Setup

- [x] 1.1 Install sweetalert2 npm package in front-nuxt: `npm install sweetalert2`
- [x] 1.2 Add @types/sweetalert2 for TypeScript support (if needed for types)

## 2. Create SweetAlert2 Composable

- [x] 2.1 Create `front-nuxt/app/composables/useSwal.ts` with base configuration
- [x] 2.2 Implement default theme using main.css tokens (colors, fonts, spacing)
- [x] 2.3 Export helper functions: fire(), warning(), error(), success(), info()
- [x] 2.4 Test composable imports without SSR errors

## 3. Replace Alerts in booking/[id].vue

- [x] 3.1 Import useSwal composable in script section
- [x] 3.2 Replace socket event `conflicto_asiento` alert with `Swal.warning()`
- [x] 3.3 Replace seat limit alert with `Swal.warning()`
- [x] 3.4 Replace timeout alert with `Swal.warning()`
- [x] 3.5 Replace backend authorization error alert with `Swal.error()`
- [x] 3.6 Replace payment error alert (Stripe) with `Swal.error()`
- [x] 3.7 Replace ticket generation error alert with `Swal.error()`
- [x] 3.8 Replace payment success alert with `Swal.success()`

## 4. Replace Alert in admin.vue

- [x] 4.1 Import useSwal composable in admin.vue
- [x] 4.2 Replace session creation error alert with `Swal.error()`

## 5. Verification

- [x] 5.1 Run `npm run dev` and verify no console errors on page load
- [x] 5.2 Test each alert trigger in booking flow
- [x] 5.3 Test alert in admin panel
- [x] 5.4 Verify FontAwesome icons render correctly
- [x] 5.5 Verify visual consistency with main.css theme