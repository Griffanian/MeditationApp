---
name: User prefers incremental, focused changes
description: User wants to work through issues one at a time rather than big rewrites. Variables should be standalone entities that connect to loops/segments, not derived from them.
type: feedback
---

Variables should be first-class standalone entities stored separately (variables.json), not derived from loop repeat counts. They should be usable in:
- Loop repeat counts
- Speech text (template substitution)
- Pause durations

**Why:** The user sees variables as the primary concept that controls multiple aspects of the meditation, not as a byproduct of loops.

**How to apply:** When adding variable support to a new segment type, connect it to the standalone variables system, don't create a separate mechanism.
