## ADDED Requirements

### Requirement: SweetAlert2 integration is available as a composable
The system SHALL provide a `useSwal()` composable that wraps SweetAlert2 with the project's design tokens from `main.css`.

#### Scenario: Composable exists and exports helper functions
- **WHEN** a component imports `useSwal` from `~/composables/useSwal.ts`
- **THEN** the composable provides functions: `Swal.fire()`, `Swal.warning()`, `Swal.error()`, `Swal.success()`, `Swal.info()`

#### Scenario: Default theme matches project styling
- **WHEN** calling `Swal.fire({ title: 'Test', text: 'Message' })`
- **THEN** the modal uses: background `#F9F9F9`, color `#1A1A1A`, confirm button with gradient `#000000` to `#1A1A1A`, border-radius `9999px`

#### Scenario: Composable is usable in client-side context
- **WHEN** calling any Swal function from a Vue component
- **THEN** the function executes without SSR errors

### Requirement: Seat conflict alert shows user that seat was taken
The system SHALL display a warning modal when another user has already booked a selected seat.

#### Scenario: Seat conflict detected
- **WHEN** the socket event `conflicto_asiento` triggers
- **THEN** system displays: title "Asiento no disponible", text "Este asiento acaba de ser reservado por otro cliente.", icon using FontAwesome `fa-user-lock`, confirm button "Entendido"

### Requirement: Payment error alerts communicate failures clearly
The system SHALL display error modals when Stripe or backend rejects a payment.

#### Scenario: Stripe rejects payment
- **WHEN** `resultadoDeStripe.error` is received
- **THEN** system displays: title "Error de pago", text containing the Stripe error message, icon using FontAwesome `fa-credit-card` + `fa-xmark`, confirm button "Cerrar"

#### Scenario: Backend authorization fails
- **WHEN** backend denies payment authorization
- **THEN** system displays: title "Error", text "El backend no nos dio autorización para abrir la pasarela de pago.", icon using FontAwesome `fa-server`, confirm button "Cerrar"

### Requirement: Timeout alert warns user of session expiration
The system SHALL display a warning modal when the 5-minute reservation timer expires.

#### Scenario: Reservation timer expires
- **WHEN** `tiempoRestante` reaches 0
- **THEN** system displays: title "Tiempo agotado", text "El tiempo de reserva (5 min) ha expirado. Hemos liberado tus butacas para otros clientes.", icon using FontAwesome `fa-clock`, confirm button "Volver"

### Requirement: Success alert confirms payment completion
The system SHALL display a success modal when payment completes successfully.

#### Scenario: Payment succeeds
- **WHEN** payment confirmation is successful
- **THEN** system displays: title "Pago realizado", text "Tu pago ha sido procesado con exito. Las entradas son tuyas.", icon using FontAwesome `fa-check`, confirm button "Continuar"

### Requirement: Input validation alerts inform seat limit issues
The system SHALL display a warning modal when user attempts to select more seats than paid for.

#### Scenario: User exceeds seat limit
- **WHEN** user clicks a seat but `totalSeats >= entradasSeleccionadas`
- **THEN** system displays: title "Limite alcanzado", text "Solo has pagado por X entradas. Deselecciona algun asiento primero.", icon using FontAwesome `fa-triangle-exclamation`, confirm button "Entendido"

### Requirement: Admin session creation error is displayed properly
The system SHALL display an error modal in admin panel when session creation fails.

#### Scenario: Admin session creation fails
- **WHEN** `createSession` returns an error
- **THEN** system displays: title "Error", text "No se pudo crear la sesion. Por favor, revisa los datos.", icon using FontAwesome `fa-xmark`, confirm button "Cerrar"