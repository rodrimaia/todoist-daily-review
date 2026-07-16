# Agent-Ready Issue projection contract

Design every approved slice so `rodrigo-run-queue` can regenerate a complete issue for a fresh Worker. The issue is a source-linked Generated Projection, never a normative source.

The projection must contain these sections:

- Source
- Outcome
- Current Behavior
- Desired Behavior
- Spec Requirements
- Engineering Constraints
- Discovery Cues
- Acceptance Criteria
- Verification
- Blocked By
- Out of Scope
- Stop Conditions

The exact Spec Change and manifest entry must supply the behavioral context, constraints, dependencies, acceptance criteria, and verification guidance without prior conversation. Discovery Cues may identify repository evidence to inspect, but the body must not mandate a code path, implementation sequence, class, function, or coding recipe.

Generated markers identify the stable Delivery Slice ID and source commit. Reconciliation owns and may replace the generated body. Comments and execution state may accumulate separately, but normative edits must return through Spec Drift and human approval.
