---
Type: Ideas
---
>[!Meta]
>Topics::[[UI/UX]], [[Users profiles]]
# Onboarding Design
## Key Insight
You can't onboard someone you don't understand. The [[Users profiles]] document maps out the full space of user qualities across 12 dimensions. Onboarding should sort users along the dimensions that actually change their experience.
## Two Distinct Flows
### Coach Onboarding (High Priority)
Each coach acquired is ~20 students. This flow is high-stakes.
**Questions to ask:**
- [[Users profiles#Creation Appetite|Creation Appetite]] — determines what they see first (editor vs library vs pre-built programmes)
- [[Users profiles#Who you manage|Who they manage]] — clients vs community, determines management tools to surface
**First win by type:**
- Full Creator → make their first exercise
- Curator → browse library, assign something to a student
- Passive Adopter → pick a pre-built programme, send it to a student
### Student Onboarding (Lower Priority, Simpler)
Students arrive because their coach sent them. Minimal friction to first play.
**Two paths depending on invite type:**
1. **Individual invite** — coach fills in the student's profile at invite time (experience, tradition, etc.) → student arrives to a fully personalised experience, almost no onboarding questions needed.
2. **Generic link** — student fills in their own profile during onboarding → same end state, just a few more questions for the student.
Both paths converge to the same experience. The difference is whether setup happens before (coach did it) or during (student does it) first visit.
**Default student onboarding:**
- Your teacher is [name + photo]
- They've assigned you [exercise/programme]
- Here's what to expect
- Press play
A full-control coach's students get "do this today." A no-control coach's students get "here's what's available, explore."
## Invite System
### Current State
- Builders require a personalised invite from Miles
- Builders must create a per-student invite link
### Target State
- Open sign-up link for coaches (security is not a real concern at this stage)
- Coaches can create **individual invites** (with pre-filled student profile) or a **generic invite link** (single link shared to a group, students self-onboard)
- Both options available — coach chooses based on whether they want to customise each student's experience or save time
## Who We're Not Building For
- Casual "meditate when I feel like it" crowd
- The Headspace/Calm market (convince me to meditate with push notifications)
- Pure unguided silence timer users
- Tradition-militant people who can't tolerate neutral exercises like box breathing
- Our minimum user is someone who has already decided to practise
## Design Principles
- **Clear structure with choice points** — not vague "just explore," not rigid single-path
- **Transparent lineage** — all content tagged with tradition, so purists can filter and eclectics can explore with awareness
- **Right amount of options** — not too few (trapped), not too many (overwhelmed)
- **Get to first win fast** — see [[Onboarding Best Practices]]
