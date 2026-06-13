---
name: Meditation app architecture and stage design
description: Key architectural decisions and current thinking about how stages, variables, and timelines relate in the meditation editor
type: project
---

The app generates guided meditation audio from structured scripts. Current structure:

- **Instructions** have stages (e.g. Abdominal Breathing → Kapalbhati), each with description, directions, and progression
- **Variables** (e.g. roundsNum, breathsNum) control loop counts and get substituted into speech text
- **Timeline** is a flat script of segments (speech, pause, asset, loop) that gets assembled into an MP3

**Current thinking (as of conversation):** Each stage should potentially have its own variables and timeline, but the user is concerned about this getting confusing. Need to think carefully about how to structure this.

**Why:** Different stages have different parameters (e.g. beginner = 9 breaths, advanced = 33 breaths) and potentially different script structures.

**How to apply:** When implementing per-stage timelines, keep the UI simple — possibly tabs or a stage selector rather than showing everything at once.
