## MODIFIED Requirements

### Requirement: Complete themed appearance
The resolved appearance SHALL apply consistently to every supported application route and visible application surface, including page backgrounds, text, cards, buttons, inputs, selection controls, dialogs, popovers, progress indicators, status colors, daily review completion celebration surfaces, and compatible native browser controls, while preserving readable content and distinguishable interactive states.

#### Scenario: Dark appearance across supported routes
- **WHEN** Dark is resolved and the user visits `/`, `/review`, `/weekly-review`, and `/settings`, including opening available overlays and controls and viewing the daily review completion celebration
- **THEN** each visible surface uses the dark appearance without a light-only page or component surface and content and interactive states remain distinguishable

#### Scenario: Light appearance remains available
- **WHEN** Light is resolved and the user visits the supported routes, including the daily review completion celebration
- **THEN** the application retains a consistent light appearance and existing interaction behavior
