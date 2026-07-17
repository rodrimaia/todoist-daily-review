# appearance-theme Specification

## Purpose
Product behavior and engineering properties for choosing, resolving, persisting, and rendering the application's appearance theme.

## Requirements
### Requirement: Appearance preference selection
The application SHALL offer System, Light, and Dark appearance preferences in Settings, SHALL use System when no valid preference has been saved, and SHALL apply a newly selected preference immediately without requiring the user to save unrelated settings or reload the application.

#### Scenario: First visit
- **WHEN** a browser has no valid saved appearance preference
- **THEN** Settings shows System as selected and the application resolves its appearance from the operating-system color-scheme preference

#### Scenario: User selects an appearance
- **WHEN** the user selects System, Light, or Dark in Settings
- **THEN** the selected preference is shown, takes effect immediately across the application, and is saved for later visits in the same browser storage context

### Requirement: Resolved appearance behavior
The application SHALL resolve Light to the light appearance, Dark to the dark appearance, and System to the operating system's current color-scheme preference. While System is selected, the application SHALL update when the operating-system preference changes; while Light or Dark is selected, operating-system changes SHALL NOT override the explicit choice.

#### Scenario: System preference changes
- **WHEN** System is selected and the operating-system color-scheme preference changes
- **THEN** the application updates to the newly resolved appearance without a page reload

#### Scenario: Explicit preference remains stable
- **WHEN** Light or Dark is selected and the operating-system color-scheme preference changes
- **THEN** the application continues to use the explicitly selected appearance

### Requirement: Complete themed appearance
The resolved appearance SHALL apply consistently to every supported application route and visible application surface, including page backgrounds, text, cards, buttons, inputs, selection controls, dialogs, popovers, progress indicators, status colors, and compatible native browser controls, while preserving readable content and distinguishable interactive states.

#### Scenario: Dark appearance across supported routes
- **WHEN** Dark is resolved and the user visits `/`, `/review`, `/weekly-review`, and `/settings`, including opening available overlays and controls
- **THEN** each visible surface uses the dark appearance without a light-only page or component surface and content and interactive states remain distinguishable

#### Scenario: Light appearance remains available
- **WHEN** Light is resolved and the user visits the supported routes
- **THEN** the application retains a consistent light appearance and existing interaction behavior

### Requirement: Startup appearance consistency
The application SHALL resolve and expose the saved appearance before its first visible application frame and SHALL declare the matching browser color scheme so that startup and compatible native controls do not briefly present the opposite appearance.

#### Scenario: Direct dark-mode load
- **WHEN** a browser with Dark saved loads any supported URL directly
- **THEN** the first visible application frame and compatible native controls use the dark appearance

#### Scenario: Direct system-mode load
- **WHEN** a browser with System saved loads any supported URL directly
- **THEN** the first visible application frame uses the appearance matching the operating-system preference at load time
