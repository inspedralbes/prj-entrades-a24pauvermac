## Context

The front-nuxt project uses the browser's native `alert()` function for 7 notifications in the booking flow and admin panel. These alerts are styled by the browser OS, breaking visual consistency with the cinema's design system (dark theme, Source Serif 4 / Inter typography).

**Current State:**
- Native `alert()` in `booking/[id].vue`: seat conflict, seat limit, timeout, payment errors, success
- Native `alert()` in `admin.vue`: session creation error

**Constraints:**
- Must use npm package (not CDN)
- Must match existing CSS variables from `main.css` (colors, fonts, spacing)
- Must use FontAwesome icons already installed
- EMOJIS STRICTLY PROHIBITED

## Goals / Non-Goals

**Goals:**
- Replace all native `alert()` with SweetAlert2
- Create reusable composable `useSwal.ts` for consistent theming
- Match visual design to `main.css` tokens exactly
- Use FontAwesome icons (no emoji)

**Non-Goals:**
- Modify existing Vue components beyond replacing alerts
- Add new SweetAlert2 capabilities beyond notifications
- Modify backend or database

## Decisions

### Decision 1: Create composable vs. inline calls

**Choice:** Create `useSwal.ts` composable with preset configurations

**Rationale:** Encapsulates theme configuration in one place, allows easy updates. Reusable across all components. More testable.

### Decision 2: FontAwesome icons over default icons

**Choice:** Use FontAwesome icon components with SweetAlert2's `imageIcon` or custom HTML

**Rationale:** Project already has FontAwesome installed. Default SweetAlert2 icons (warning, error, success, info) are basic SVGs. Icons needed:
- Seat conflict: `fa-user-lock`
- Payment error: `fa-credit-card` + `fa-xmark`
- Timeout: `fa-clock`
- Success: `fa-check`
- Input validation: `fa-triangle-exclamation`

### Decision 3: Theme configuration approach

**Choice:** Configure SweetAlert2 globally via `Swal.mixin()` in composable

**Rationale:** Allows base configuration (padding, background, confirm button style) while enabling per-call overrides.

**Theme tokens from main.css:**
```javascript
{
  padding: '24px',
  background: '#F9F9F9',
  color: '#1A1A1A',
  confirmButtonColor: '#000000',
  confirmButtonTextColor: '#FFFFFF',
  confirmButtonBorderRadius: '9999px',
  customClass: { popup: 'swal-popup-custom' }
}
```

## Risks / Trade-offs

**[Risk]** Icon rendering complexity
→ **Mitigation:** Use custom FontAwesome component and inject as HTML icon: `Swal.fire({ iconHtml: '<font-awesome-icon icon="fa-solid fa-user-lock" />' })`

**[Risk]** Nuxt auto-imports may conflict with Swal
→ **Mitigation:** Import explicitly `import Swal from 'sweetalert2'` in composable

**[Risk]** Animation conflicts with CSS transitions
→ **Mitigation:** Keep default SweetAlert2 animations, they complement the existing `transition: all 0.3s ease` in main.css

## Migration Plan

1. Execute: `cd front-nuxt && npm install sweetalert2`
2. Create `app/composables/useSwal.ts`
3. Replace alerts in `booking/[id].vue`
4. Replace alert in `admin.vue`
5. Verify in development mode
6. Build and test

**No rollback needed** - native alerts are being removed as part of this change.

## Open Questions
**Icon component injection:** SweetAlert2's `iconHtml` expects an HTML string. We need to verify Vue FontAwesome component renders properly when injected as string. If not, use raw SVG strings or SweetAlert2's default icons with custom styling.

**Server-side rendering:** SweetAlert2 requires browser DOM. Ensure composable is client-only with `onMounted` or Nuxt's `<ClientOnly>` if needed.