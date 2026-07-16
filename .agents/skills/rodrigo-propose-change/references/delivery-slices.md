# Delivery Slice criteria

A Delivery Slice is an independently mergeable vertical outcome represented by exactly one standard OpenSpec Spec Change, one generated Agent-Ready Issue, and one pull request.

Accept a slice only when:

- its merge leaves the repository's default branch, the code, and the Spec Corpus internally consistent;
- it delivers a verifiable behavior or engineering property rather than a horizontal layer;
- its acceptance criteria and Verification Contract can be evaluated independently;
- it has one stable ID `<initiative-id>-sNN` that never changes after publication;
- it maps to one unique OpenSpec change name, and no other slice maps to that change;
- every prerequisite is an explicit `blockedBy` edge to another stable slice ID;
- it does not depend on an issue body, conversation, or later slice to explain its normative contract.

Split a candidate when it cannot merge safely, has separable outcomes, or would need multiple pull requests. Combine candidates when either would leave the default branch incomplete or inconsistent on its own. Prefer the smallest vertical slices that preserve end-to-end meaning.

Before approval, check the graph for unknown IDs, self-dependencies, cycles, hidden ordering, and acceptance criteria that span multiple slices. Record blocking edges only in the Initiative Manifest, not by extending the OpenSpec schema.
