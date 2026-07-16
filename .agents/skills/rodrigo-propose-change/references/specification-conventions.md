# Specification conventions

The Spec Corpus is the sole source of truth. Use ordinary OpenSpec specs and the repository's configured standard schema; the names below are content conventions, not custom artifact types.

## Product Specs

Use a Product Spec for externally observable behavior or domain rules. State requirements with `SHALL` and executable scenarios with `WHEN`/`THEN`. Describe outcomes and boundaries, not screens, classes, functions, or implementation sequences unless those details are themselves observable contracts.

## Engineering Specs

Use an Engineering Spec for internal properties that must remain true: architectural constraints, quality attributes, security properties, compatibility, operability, and verification obligations. State the required property without prescribing a coding recipe.

## Required discipline

- Every software change updates at least one Product Spec or Engineering Spec through a standard Spec Change.
- A Spec Change is the reviewable delta; an issue, plan, pull request, or Approval View cannot override it.
- Keep supporting evidence and non-normative notes distinct from requirements.
- If a proposed slice would leave the current specs or code inconsistent after its delivery commit, change the slice boundary before approval.
- If implementation later requires a normative change, classify it as Spec Drift and return for human approval.
