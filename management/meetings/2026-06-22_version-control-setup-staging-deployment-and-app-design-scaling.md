---
Type: Meeting Notes
date: 2026-06-22
url: https://notes.granola.ai/d/353abcf7-7d41-401c-a9e4-af161ba5775c
granola_id: not_AIND9aHFNzwgyE
---
>[!Meta]
>participants::[[Miles Bloom]]
# Version control setup, staging deployment, and app design scaling
## Summary
### Version Control Workflow
- Branch strategy confirmed: feature branches with Linear ticket ID in name, merged to staging via pull request
- Branching model:
  - Feature branch: local dev work
  - Staging branch: pull request target for review
  - Main branch: production equivalent, only updated once staging is approved
- Pull requests to staging managed by either party; Git flags hard merge conflicts automatically
- Soft conflicts (e.g. back-end model change not reflected in front-end) won’t be caught by Git alone
  - No clean front/back-end split possible for this reason
  - Human review stays in the loop
### Automated Testing and Conflict Mitigation
- Plan: combine deterministic code tests and AI checks on pull requests to staging
- Deterministic tests: small code units that send requests and verify expected responses
  - Run automatically as part of branch pushes
  - Catch regressions without needing to understand why they pass
- AI checks: agents review branches for potential conflicts before merge
- Acknowledged limit: neither approach catches all integration issues; staging exists as the safety net before production
### Staging Review and Sprint Cadence
- Human review on staging: Roger checks new features against a checklist (look, feel, function)
- Governance tool Roger already uses for security can support this, designed for human and agent collaboration
- Feedback loop:
  - Issues logged as sub-issues in Linear against the relevant feature ticket
  - Approval signaled via a Linear sub-issue (“ready to deploy”)
- Two-week sprints agreed, not weekly: one week is too frequent at this stage
- Roger to get a GitHub account to review pull requests directly if needed
### App Design Scaling Across Versions
- Core design document stays as the single source of truth for shared components
- Per-client variants: separate design documents that pull from core, with addendums for client-specific features
  - Color skins, graphics, and feature additions handled per document
  - 20+ client versions anticipated; folder/channel per client in Linear
- Feature flags drive code-level variation, not separate codebases
  - App structured as a library: core pulled in, then configured per version
  - Example: ISA client revealed a new requirement (real identities, real groups) not anticipated in core
- Long-term vision: sales configures a new client instance by selecting core + skin + feature flags, no dev work needed
### Onboarding Flow
- Existing onboarding build (tour of app buttons) located in Miles’s branch, not yet merged
- Agreed it needs expanding: proper onboarding requires defining user types and routing to a “first win” quickly
- Mobbin flagged as a useful UI research tool (shows onboarding flows across real apps side by side)
- Design-first approach agreed: onboarding flow to be built into the design document before coding begins
- Meeting scheduled: Miles and Roger, Tuesday 23rd June at 10am, to scope the onboarding design
### Linear Triage and Other Items
- Linear review deferred: each person to go through their own tickets async and flag blockers in the group
- Key open items noted:
  - Regulation exercises integration: needs verification, reassigning to Miles
  - Video full-screen button: no play triangle visible, users missing videos; previously stalled on Apple video API
  - Old AI videos appearing in staging instead of new ones: still unresolved
- Private AI model (for military/ISA client):
  - Always-on GPU costs \~$1,700/month, not viable at launch
  - Plan: cold-start model on demand, \~15-30 second delay for user, server sleeps after 15 minutes idle
  - Acceptable given the audience (high security tolerance) and small initial cohort (12 people, September start)
  - Using Gemma 4 (Google, 12B parameters) for its lightweight footprint
- AI tooling costs: Roger switching from Claude Code back to Augment after unexpected $860 spend in two days
### Next Steps
- **Locate and share onboarding branch for review** (Miles)

  Branch is in Miles's local repo; Roger wants to see it ahead of the Tuesday design session.

- **Onboarding design session with Roger** (Miles)

  Tuesday 23rd June at 10am. Scope user types, routing logic, and first-win flows before building.

- **Send onboarding best-practices document to Roger** (Miles)

  Covers research on user types and the process for defining onboarding flows.

- **Review and triage own Linear tickets** (Miles)

  Verify which are done, flag blockers in the group channel.

- **Add Roger to design document and GitHub**

  Invite sent to roger@resilientmindsmatters; GitHub account setup also needed for pull request reviews.

---

Chat with meeting transcript: [https://notes.granola.ai/t/a4c30003-ce32-49db-9e8c-8a8f43e2a41b](https://notes.granola.ai/t/a4c30003-ce32-49db-9e8c-8a8f43e2a41b)
### Transcript
[[speaker]]: Got an annoying All good. Blocked up nose, which means I struggle
[[speaker]]: to talk and breathe at the same time, which is not ideal.
[[speaker]]: But
[[Miles Bloom]]: So
[[Miles Bloom]]: people
[[speaker]]: yeah, exactly. It's quite annoying, to be honest.
[[speaker]]: But
[[speaker]]: otherwise, I am doing okay. How are you guys?
[[speaker]]: Not too bad.
[[speaker]]: Good.
[[speaker]]: Glad to hear that. Congratulations on getting a first.
[[Miles Bloom]]: Thank you.
[[speaker]]: Very impressive. A bit happy with that, you?
[[Miles Bloom]]: Yeah. Very happy.
[[speaker]]: Good.
[[speaker]]: Good for you.
[[speaker]]: So where were you guys?
[[Miles Bloom]]: We were just talking about
[[Miles Bloom]]: the version control stuff
[[Miles Bloom]]: we're gonna do.
[[speaker]]: Okay.
[[Miles Bloom]]: So
[[Miles Bloom]]: we have we have the the read me with the
[[Miles Bloom]]: you know,
[[Miles Bloom]]: the rules that we
[[Miles Bloom]]: we talked about last week.
[[Miles Bloom]]: So, like, each feature gets its own branch. We keep the branch feature
[[Miles Bloom]]: small, they get merged into master before starting another.
[[speaker]]: Right.
[[Miles Bloom]]: They include
[[Miles Bloom]]: each branch
[[Miles Bloom]]: has the linear ticket ID
[[Miles Bloom]]: in the
[[Miles Bloom]]: name.
[[Miles Bloom]]: Stuff like that. And then so we would
[[Miles Bloom]]: just saying that
[[Miles Bloom]]: you know,
[[Miles Bloom]]: we can stop
[[Miles Bloom]]: As long as, like, everything's up to date,
[[Miles Bloom]]: which
[[Miles Bloom]]: think it is
[[Miles Bloom]]: from
[[Miles Bloom]]: the main branch, then we're gonna start
[[Miles Bloom]]: having that new version control system with the design document
[[speaker]]: So
[[Miles Bloom]]: we talked about.
[[speaker]]: Okay. Great.
[[speaker]]: Great.
[[speaker]]: So are we going to have similar
[[speaker]]: you know, at the moment, we've had we've got production and staging. Will that work in a similar way?
[[speaker]]: Yeah.
[[Miles Bloom]]: Yeah. That'll be unaffected by the
[[speaker]]: The same same production and staging. Same too.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Yeah. The
[[speaker]]: Yeah. So the thick
[[Miles Bloom]]: different.
[[speaker]]: so as you update, you'll update things onto staging, and when we consider it's ready, we'll we'll
[[speaker]]: push it to production.
[[Miles Bloom]]: Well, there there is this
[[Miles Bloom]]: so
[[Miles Bloom]]: that there's the how we deal with the repo,
[[Miles Bloom]]: is one conversation.
[[Miles Bloom]]: And there's what we push to staging and production, which is a second conversation.
[[speaker]]: Sorry. Excuse me. It was repo?
[[Miles Bloom]]: The
[[Miles Bloom]]: The repository, like the
[[Miles Bloom]]: folder on GitHub.
[[speaker]]: Okay. Okay.
[[speaker]]: The files of the code, basically.
[[speaker]]: Right. Thank you.
[[speaker]]: All good. I'm here to go.
[[Miles Bloom]]: Yes. So so there is a
[[Miles Bloom]]: gonna be a a conversation
[[Miles Bloom]]: I mean, I I don't know. Like, in terms of
[[Miles Bloom]]: my understanding, we're using
[[Miles Bloom]]: staging
[[Miles Bloom]]: for, like, you know,
[[Miles Bloom]]: whatever is not in production. So like
[[Miles Bloom]]: it's each time we
[[Miles Bloom]]: merge something into main I mean, I don't know. What what are you like, I was imagining local development
[[Miles Bloom]]: for something that we're working on and then
[[Miles Bloom]]: when you merge it into main, then you push it to testing.
[[Miles Bloom]]: Does that align with how you're thinking,
[[speaker]]: No. You don't you don't you don't go into main until you're already
[[speaker]]: deployed to production. So
[[Miles Bloom]]: Okay.
[[speaker]]: you that's the last thing you do before you deploy to production, basically.
[[speaker]]: Or you bring it all together and you sort of so we'll have a branch called main. We'll have a
[[speaker]]: branch called staging.
[[speaker]]: And
[[speaker]]: yeah, we
[[speaker]]: can get a bit annoying, if I'm honest, like, doing branch management to different testing, different
[[speaker]]: stuff. So we'll need to work out basically every basically, everything
[[speaker]]: everything slows down and gets more annoying by trying to be formal about it.
[[speaker]]: Because it and you have to manage all the different ways that all the branches can possibly come together.
[[speaker]]: So maybe we wanted, like,
[[speaker]]: do
[[speaker]]: I don't know. Anything we can work out along this journey to make our life easier for ourselves
[[speaker]]: Good.
[[Miles Bloom]]: Right.
[[speaker]]: Because
[[speaker]]: Yes.
[[speaker]]: It gets a bit it gets a bit messy. We've only got one staging server.
[[speaker]]: One staging database.
[[speaker]]: We can get around that. I
[[speaker]]: I there there are other ways of getting around that you can have away.
[[speaker]]: Different dog places and
[[speaker]]: different and serving versions for different feature branches.
[[speaker]]: That can be a cool thing. Well,
[[speaker]]: each feature branch gets its own
[[speaker]]: staging link,
[[Miles Bloom]]: That would be cool.
[[speaker]]: Yeah.
[[speaker]]: Well, yeah.
[[Miles Bloom]]: So for
[[Miles Bloom]]: for this week,
[[Miles Bloom]]: what what are you thinking
[[Miles Bloom]]: about how I should work?
[[speaker]]: Well, I guess there's the point of, like, are we you know, is everything you do gonna
[[speaker]]: going to go to staging for some kind of sign off?
[[speaker]]: If not, or if you get over we bundle a bunch
[[speaker]]: of different features into one you know,
[[speaker]]: deployment of staging,
[[speaker]]: then
[[speaker]]: know, we can review it all in one go. That might make things easier. Right?
[[Miles Bloom]]: So
[[Miles Bloom]]: should we say
[[Miles Bloom]]: so, like,
[[Miles Bloom]]: I'm gonna work on features in the feature branch.
[[speaker]]: Mhmm.
[[Miles Bloom]]: And then
[[Miles Bloom]]: I'm like, this is done.
[[Miles Bloom]]: What's the next stage
[[Miles Bloom]]: from there?
[[Miles Bloom]]: We're not gonna merge it into main until we're ready for it to be in production.
[[speaker]]: So
[[speaker]]: No. You set up you set up what's called a pull request, so you'd set up a pull request.
[[Miles Bloom]]: Yeah.
[[speaker]]: Between that branch and
[[speaker]]: the staging branch.
[[speaker]]: And then we'd
[[speaker]]: that would get merged over to staging, and any issues would get resolved in that pull request.
[[speaker]]: And then at the end of that process, you merge the same branch
[[speaker]]: into main.
[[speaker]]: So we're basically
[[speaker]]: basically a way of, like, sort of gatekeeping new stuff in each of these feature branches.
[[speaker]]: As it comes across.
[[Miles Bloom]]: Right. So what I'm
[[Miles Bloom]]: imagining is
[[Miles Bloom]]: that we have the the main branch
[[Miles Bloom]]: that's
[[Miles Bloom]]: up to date now.
[[Miles Bloom]]: We're gonna make a copy of it that will be the staging branch.
[[speaker]]: Yeah.
[[Miles Bloom]]: And then
[[Miles Bloom]]: each feature branch
[[Miles Bloom]]: I make a pull request to
[[Miles Bloom]]: pull,
[[Miles Bloom]]: Are those gonna be authorized by you
[[Miles Bloom]]: Is that what you're thinking?
[[Miles Bloom]]: Or just the big
[[Miles Bloom]]: just
[[Miles Bloom]]: happen automatic
[[Miles Bloom]]: automatically?
[[speaker]]: It depends if there's any conflicts or any problems.
[[speaker]]: And we can also use an agent to help us do that as well.
[[Miles Bloom]]: Right.
[[speaker]]: Let's just get to the point of
[[speaker]]: having pull requests.
[[speaker]]: Because I think, also, you might be able you you know, I think either of us should be able to do
[[speaker]]: manage pull requests, basically.
[[Miles Bloom]]: So
[[Miles Bloom]]: so we'll we'll just
[[speaker]]: So
[[Miles Bloom]]: say we're we're gonna be sensible about
[[Miles Bloom]]: we're gonna think about
[[Miles Bloom]]: conflicts.
[[Miles Bloom]]: Before we pull something into staging.
[[Miles Bloom]]: And if
[[Miles Bloom]]: you know,
[[speaker]]: It will it it Git will tell us if there's a problem.
[[speaker]]: Like a like an actual problem it can detect.
[[Miles Bloom]]: Yes.
[[Miles Bloom]]: It it will only tell us if there's, like,
[[speaker]]: There is a certain class of problem. Yeah.
[[Miles Bloom]]: actually, oh, you know, this branch says this thing and
[[Miles Bloom]]: you know, it's unclear about
[[Miles Bloom]]: which order the code was written or
[[Miles Bloom]]: something.
[[speaker]]: Well, it's it's supposed to be kinda smart way. Right? Yeah.
[[speaker]]: It'll it'll say if if two users have changed the same thing,
[[speaker]]: and it doesn't know how to resolve which one's better than the other one,
[[speaker]]: it will say there's a merge conflict,
[[Miles Bloom]]: Right. But that's not sufficient because it
[[Miles Bloom]]: you change a model
[[Miles Bloom]]: on the back end and then I'm referencing it in the front end, that won't show up
[[Miles Bloom]]: much conflict.
[[speaker]]: Yeah. No. But the yeah. This is why
[[speaker]]: don't think we can I don't think we can have a clean front end and back end division?
[[speaker]]: Otherwise, yeah, that reason. Right? Like, it was just
[[speaker]]: it's
[[speaker]]: yeah.
[[speaker]]: If there's there's two different things that are changing, it can't keep them together.
[[speaker]]: Then it can't work it out.
[[Miles Bloom]]: Okay.
[[speaker]]: I mean, the
[[speaker]]: I mean, yeah, I mean, the only I mean, I honestly like, the only other
[[speaker]]: the only other thing to do is, like,
[[speaker]]: someone has to hold the entire program in their head, basically.
[[speaker]]: And, like, know when there's a problem.
[[speaker]]: Right? This basically brings human review back into the loop.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: I mean, like,
[[Miles Bloom]]: I I would be happy
[[Miles Bloom]]: like, I I don't know if this is too much work for you,
[[Miles Bloom]]: but
[[Miles Bloom]]: have
[[Miles Bloom]]: you know,
[[Miles Bloom]]: before before poor requests
[[Miles Bloom]]: the term what's it called when it's committed or whatever?
[[speaker]]: Mhmm.
[[Miles Bloom]]: It's made, but before it's committed,
[[Miles Bloom]]: like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: we send each other because it's only the two of us
[[Miles Bloom]]: Right? So we just send each other a text.
[[Miles Bloom]]: And say, like,
[[Miles Bloom]]: we check
[[Miles Bloom]]: poor request and see if it's gonna mess up anything that you
[[speaker]]: Yeah. But the problem
[[Miles Bloom]]: working on.
[[speaker]]: Yeah. But the problem is I won't know. I won't I know how to answer that question.
[[speaker]]: As
[[speaker]]: individual. Right? Because I normally leave it up to the AI to decide what's correct or not.
[[speaker]]: So I can ask my AI. Is this gonna mess something up? We can ask our AIs to, like, check
[[Miles Bloom]]: Right.
[[speaker]]: that for us.
[[Miles Bloom]]: Right. But that's
[[Miles Bloom]]: I I I find that
[[Miles Bloom]]: I don't know. At least
[[Miles Bloom]]: the way
[[Miles Bloom]]: like, my experience with AI is is that
[[Miles Bloom]]: they're not quite good enough at that.
[[speaker]]: And
[[speaker]]: Yeah.
[[speaker]]: Yeah. I don't I don't I honestly, I don't know what to do.
[[speaker]]: That's a thing.
[[speaker]]: Yeah.
[[Miles Bloom]]: I mean, we could just say, you know,
[[speaker]]: It's
[[Miles Bloom]]: we're gonna let that
[[Miles Bloom]]: we're gonna let you know, we'll send each other a
[[Miles Bloom]]: we'll have some sort of process where there's a
[[Miles Bloom]]: mutual
[[Miles Bloom]]: AI checker thing.
[[speaker]]: Mhmm.
[[Miles Bloom]]: And pull that into staging. And then we'll just test it on
[[Miles Bloom]]: And if something goes wrong, it's not on the production, and then we'll
[[speaker]]: Yeah. I mean,
[[Miles Bloom]]: fix it.
[[speaker]]: also, we have can also, we should have automated tests.
[[Miles Bloom]]: Yeah.
[[speaker]]: Right.
[[speaker]]: Should have, like, tests, switch testings. Right? And tests should catch stuff.
[[Miles Bloom]]: For sure.
[[speaker]]: So
[[speaker]]: so, really, you are, like,
[[speaker]]: the best catcher. So
[[Miles Bloom]]: Because the the the like,
[[Miles Bloom]]: there's always gonna be bugs that make it to production.
[[Miles Bloom]]: So
[[speaker]]: Mhmm.
[[Miles Bloom]]: like, with with that in mind, I feel like
[[Miles Bloom]]: so I I just
[[Miles Bloom]]: so I I I always
[[Miles Bloom]]: saying that, like, we have separate feature branches. We'll merge it into
[[Miles Bloom]]: main, and we'll have tests
[[Miles Bloom]]: Like, each time you add a new feature, you'll add tests to make sure it's still working.
[[Miles Bloom]]: And then
[[Miles Bloom]]: if the
[[Miles Bloom]]: that will prevent the problem of one change or won't prevent
[[Miles Bloom]]: all.
[[Miles Bloom]]: Mitigate
[[Miles Bloom]]: the problem of
[[Miles Bloom]]: like, merge conflicts.
[[speaker]]: Merge
[[speaker]]: merge conflict are actually kinda good because they tell you where the problem
[[speaker]]: didn't they tell you there's a problem?
[[Miles Bloom]]: Right.
[[speaker]]: So that that and that's
[[Miles Bloom]]: No. I I mean, complex gen generally, like,
[[speaker]]: that's not
[[speaker]]: yeah. Yeah.
[[Miles Bloom]]: rather than
[[Miles Bloom]]: specifically in the
[[Miles Bloom]]: like, any sort of conflict that comes from us merging different stuff.
[[speaker]]: Yeah. I
[[speaker]]: I mean, I think we could just, like, write
[[speaker]]: like,
[[speaker]]: a kind of a skill or a MD file and just tell the tell our agents, like,
[[speaker]]: do work for us to, like, check if anything like this is
[[speaker]]: going on. And we can make that test deterministic
[[speaker]]: This is my new thing I'm getting into. Right? I'm I'm getting into, like, using
[[speaker]]: deterministic checks to check the code problems.
[[speaker]]: Which is
[[speaker]]: you know, kind of a
[[speaker]]: big change. But
[[speaker]]: it seemed like
[[speaker]]: but I think we I think we can do something that will protect us.
[[Miles Bloom]]: Okay.
[[speaker]]: Okay. So
[[speaker]]: can I can I double check if if I understand the process then?
[[speaker]]: So the the idea is
[[speaker]]: that you will
[[speaker]]: build in a feature branch.
[[speaker]]: Once it's ready, you'll do a pull request
[[speaker]]: to then commit it into staging.
[[speaker]]: And, hopefully, there'll be an AI check at that point to make sure there are no conflicts.
[[speaker]]: And if there are no conflicts, then it gets loaded up to staging successfully.
[[speaker]]: Is it right until then?
[[speaker]]: Is that
[[speaker]]: is that the plan? I think it's open now. Yeah. Yeah. Yeah.
[[Miles Bloom]]: This is more that we have combination of
[[speaker]]: So then once it's in staging,
[[Miles Bloom]]: AI tests and
[[Miles Bloom]]: deterministic
[[Miles Bloom]]: coding tests.
[[speaker]]: Yeah.
[[speaker]]: There can be a range of things we can do. Yeah.
[[Miles Bloom]]: So, like, Roger, do do you know how
[[Miles Bloom]]: tests work outside of the AI context?
[[speaker]]: No.
[[Miles Bloom]]: So it's it's
[[Miles Bloom]]: basically just like
[[Miles Bloom]]: little pieces of code
[[Miles Bloom]]: that go and, like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: let's say,
[[Miles Bloom]]: send a request to the back end and check
[[Miles Bloom]]: the
[[Miles Bloom]]: it's getting the expected response.
[[speaker]]: Right.
[[Miles Bloom]]: And so if we have a combination like, that's
[[Miles Bloom]]: that's that's how you did
[[Miles Bloom]]: this
[[Miles Bloom]]: before
[[Miles Bloom]]: you had any AI. You had
[[Miles Bloom]]: you know, all your tests and
[[Miles Bloom]]: if they all passed,
[[Miles Bloom]]: regardless of whether you knew why,
[[Miles Bloom]]: you would commit it. Right?
[[Miles Bloom]]: It's a joke, but
[[speaker]]: Okay.
[[speaker]]: And it's very normal to run these tests automatically as part of,
[[Miles Bloom]]: Yeah.
[[speaker]]: like, pushing branches and things like that, we can settle that.
[[speaker]]: Okay.
[[speaker]]: So it gets
[[speaker]]: into staging.
[[speaker]]: With those I AI checks and deterministic code checks.
[[speaker]]: So that
[[speaker]]: once it's in the staging,
[[speaker]]: section,
[[speaker]]: I think, ideally, we want to be
[[speaker]]: we want to have a
[[speaker]]: potentially an AI test
[[speaker]]: But but more than that, I'm imagining we wanna
[[speaker]]: human test it at that point. Right? We want somebody that's actually using it and saying,
[[speaker]]: it looks right, feels right, etcetera.
[[Miles Bloom]]: Yeah. So one
[[Miles Bloom]]: Yeah. So once it's on staging, I was imagining that
[[Miles Bloom]]: people would
[[Miles Bloom]]: be able to use it
[[Miles Bloom]]: and that that, you know, if you're in test flight or whatever, then you can mess around with it.
[[Miles Bloom]]: And then it's like a human choice to move that into production.
[[speaker]]: Right.
[[speaker]]: Right. But it would be so it would be good, though, to get some kind of
[[speaker]]: formal governance system for that.
[[speaker]]: Wherein, you know, once a week, somebody is going in at a certain time of
[[speaker]]: day or a certain time of the week.
[[speaker]]: Etcetera, to go and test the new staging version.
[[speaker]]: Like, if we could get, for example,
[[speaker]]: a little
[[speaker]]: list of things that have been built
[[speaker]]: or or changed or whatever it might be.
[[speaker]]: And then we could just go in and and check each of the features that have been added or
[[speaker]]: or
[[speaker]]: or
[[speaker]]: built to make sure that they're functioning appropriately, look
[[speaker]]: good, etcetera.
[[speaker]]: Is that
[[speaker]]: is that
[[speaker]]: workable?
[[speaker]]: I I mean, you guys
[[speaker]]: know vastly more than I do in this field, so
[[speaker]]: is it normally done at that point?
[[speaker]]: Is there a normal?
[[speaker]]: I think I think what you just sent us out is really reasonable.
[[Miles Bloom]]: I I I think it generally sounds reasonable. I think that it
[[Miles Bloom]]: being
[[Miles Bloom]]: the at the same time each week,
[[Miles Bloom]]: seems
[[speaker]]: Okay.
[[Miles Bloom]]: unlikely and difficult.
[[Miles Bloom]]: Because
[[Miles Bloom]]: some weeks, they'll be more
[[speaker]]: I mean, know so
[[speaker]]: I might I mean, I might even
[[speaker]]: basically
[[speaker]]: yeah,
[[speaker]]: it might even be worth us working on, like, two weeks.
[[speaker]]: As a as a as a rotation rather than one week.
[[speaker]]: Right.
[[speaker]]: Just as I've generally found that
[[speaker]]: basically, there's there's a kind of, like, a a cost
[[speaker]]: that you pay between, like, having one developer and, like,
[[speaker]]: say, three or four on a manager. Right?
[[speaker]]: Because, basically, as you add you know, there's a lot more to do.
[[speaker]]: Basically, by keeping things organized.
[[speaker]]: So it might be better for us to, like, work on two weeks sprints, which is which is actually completely normal.
[[speaker]]: One week actually isn't normal.
[[speaker]]: One week does sound too frequent at this stage. Yeah. Yeah. Yeah.
[[speaker]]: It's, like, annoying to get
[[speaker]]: you know it's just yeah. So I think if we aim for, like, two weeks sprints, that'd be good.
[[Miles Bloom]]: Yeah. That sounds good.
[[speaker]]: So,
[[speaker]]: so at the point where you're
[[speaker]]: where the two of you are
[[speaker]]: building things in the feature branches.
[[speaker]]: Can we have a
[[speaker]]: then where where the things that get
[[speaker]]: built get sent into a list
[[speaker]]: somewhere.
[[speaker]]: To be checked.
[[speaker]]: To be humanly checked in staging.
[[Miles Bloom]]: So we can, yeah, we could just have a file that would
[[speaker]]: Yep.
[[Miles Bloom]]: keep track of all the differences between
[[Miles Bloom]]: like, that we've added from staging to
[[Miles Bloom]]: production.
[[Miles Bloom]]: In the
[[speaker]]: Okay.
[[Miles Bloom]]: keep track of that for us.
[[speaker]]: Okay. I mean, I'm
[[speaker]]: I'm thinking as a
[[speaker]]: I'm thinking that you guys are gonna be building
[[speaker]]: I'm thinking that it's probably going to be me that ends up looking at those things.
[[speaker]]: To see how they how they look and feel from a more
[[speaker]]: user
[[speaker]]: user end. And so I'm imagining
[[speaker]]: just like a tick box where I could go through them, tick them off, be like, yep. That feels good. That looks good.
[[speaker]]: Or not. Yeah.
[[Miles Bloom]]: Yeah.
[[speaker]]: Yeah. Yeah. Yeah. I mean, I've got I remember remember I've got this, governance
[[Miles Bloom]]: That's that's that's very good.
[[speaker]]: program that I've used for the security.
[[speaker]]: So we can use that.
[[speaker]]: And that's designed to be, like, human usable and agent usable. So it's basically, like,
[[speaker]]: how you bring human and humans and agents
[[speaker]]: in to collaborate together.
[[speaker]]: Yeah. Yes. I mean, that would be amazing. If the if the AI can run through a governance
[[speaker]]: check making making sure everything works, and then there can be a human check
[[speaker]]: terms of how it feels.
[[speaker]]: Yeah.
[[speaker]]: I think makes sense.
[[speaker]]: Okay.
[[speaker]]: So,
[[speaker]]: and presumably, at that point,
[[speaker]]: what happens then if there are things in staging
[[speaker]]: that we decide, no, this doesn't look or feel right?
[[speaker]]: Then you go back to the feature branch, make the change,
[[speaker]]: redeploy to staging,
[[speaker]]: check it looks alright.
[[speaker]]: Once it does look alright, then you merge that branch into main,
[[speaker]]: then deploy to production.
[[speaker]]: Right. So if but if I'm the one that's checking that,
[[speaker]]: and have you know, it doesn't have to be me at all. It's just
[[speaker]]: but looking at this team and imagining the two of you building,
[[speaker]]: it seems to make more sense if I'm if somebody else is
[[speaker]]: going through them or looking at them.
[[speaker]]: So if I'm looking at that
[[speaker]]: should I then write those things down on linear to go back to and and re
[[speaker]]: like, how do I what's the best way of me then letting you guys know
[[speaker]]: I need to go back to the picture branch. You you could
[[speaker]]: you could you could you could join us in GitHub.
[[speaker]]: And there's a pull pull request screen.
[[speaker]]: And you could just, like, comment there directly on how you think the branch is.
[[speaker]]: Okay.
[[speaker]]: You telling me that I can just join you on GitHub sounds very similar to you saying to me,
[[speaker]]: oh, just say it to me in Mandarin.
[[speaker]]: No. Yeah. Don't worry. I I don't think you have you got
[[speaker]]: don't have you got a GitHub account yet?
[[speaker]]: No. I don't think so. But, I mean, it's There. You can get one.
[[speaker]]: And then, yeah, it's quite it's relatively simple.
[[speaker]]: It's and and and is, obviously, just like using a website. It's fine.
[[Miles Bloom]]: Oh, okay.
[[Miles Bloom]]: I think
[[speaker]]: That is the right thing to do, though.
[[Miles Bloom]]: also in terms of linear,
[[speaker]]: I think.
[[speaker]]: Okay.
[[speaker]]: Oh, also also, sorry. Remember, all feature branches are supposed to be
[[Miles Bloom]]: could have, like,
[[speaker]]: twin with linear ID tickets. So, yeah,
[[speaker]]: be honest, you could just do it.
[[Miles Bloom]]: that
[[speaker]]: Like,
[[speaker]]: in Linear against that ID of that feature.
[[Miles Bloom]]: That that's what I was thinking. We could just have a
[[Miles Bloom]]: you know, there's
[[Miles Bloom]]: the main
[[Miles Bloom]]: feature
[[Miles Bloom]]: you know, build
[[Miles Bloom]]: x
[[Miles Bloom]]: then you could add, like, a sub
[[Miles Bloom]]: task.
[[Miles Bloom]]: That's like, oh, this part of it doesn't look quite right.
[[Miles Bloom]]: Change this.
[[Miles Bloom]]: Because
[[speaker]]: And
[[Miles Bloom]]: oh, you can do that on linear?
[[speaker]]: I just want us to find
[[speaker]]: whatever is gonna work to the most efficiently
[[Miles Bloom]]: Look at the
[[Miles Bloom]]: Best.
[[Miles Bloom]]: I mean,
[[Miles Bloom]]: that
[[speaker]]: getting used to GitHub, that's fine.
[[Miles Bloom]]: as me.
[[speaker]]: If it's more efficient with linear, great.
[[speaker]]: So yeah.
[[Miles Bloom]]: Yeah. So so you can add sub issues on
[[Miles Bloom]]: this is what I would be inclined to is is
[[Miles Bloom]]: you just add a sub sub issue
[[Miles Bloom]]: on
[[Miles Bloom]]: on linear.
[[Miles Bloom]]: Find it to someone.
[[speaker]]: Okay.
[[speaker]]: Sounds easy.
[[speaker]]: So assuming we go through that,
[[speaker]]: then,
[[speaker]]: sub issue like, problems get put into sub issues in linear.
[[speaker]]: And if things are okay,
[[speaker]]: then
[[speaker]]: how do we go how do I let you know things are all okay?
[[speaker]]: To go
[[speaker]]: staging into
[[Miles Bloom]]: Could just be a
[[speaker]]: a year.
[[Miles Bloom]]: different sub issue.
[[Miles Bloom]]: Like, hey. Deploy this to
[[Miles Bloom]]: production.
[[Miles Bloom]]: Or, like, this is ready to deploy?
[[Miles Bloom]]: Or whatever?
[[Miles Bloom]]: Yeah.
[[speaker]]: Oh, so I just did linear.
[[speaker]]: Cool.
[[Miles Bloom]]: We'll just
[[Miles Bloom]]: yeah. I I think
[[Miles Bloom]]: does that make sense to you, Chris?
[[speaker]]: Yeah.
[[speaker]]: Let's try it.
[[speaker]]: Let's see if we can add
[[speaker]]: Okay. So question. I've heard you guys talking about main.
[[speaker]]: Is main different to production?
[[speaker]]: No. Main main is main is the name of the root branch.
[[speaker]]: Which is production. So main and main and production are kind of the same thing.
[[Miles Bloom]]: So in
[[speaker]]: Okay.
[[speaker]]: Good.
[[speaker]]: So is that so stuff
[[speaker]]: so stuff stuff should only be in main once it's deployed to production?
[[speaker]]: So that's like
[[speaker]]: things were okay.
[[speaker]]: Or or what is currently production. So if I was to give you the okay, it would get
[[speaker]]: deploy it would get deployed from staging into main?
[[speaker]]: And therefore be into the Yeah. Not well,
[[Miles Bloom]]: Okay. Wait. Wait. Wait. Wait. Wait. We need to explain GitHub branches.
[[speaker]]: you've been
[[speaker]]: gone.
[[speaker]]: Yeah.
[[Miles Bloom]]: Because otherwise, this is not gonna make any sense.
[[Miles Bloom]]: So
[[Miles Bloom]]: GitHub is
[[Miles Bloom]]: is basically a
[[Miles Bloom]]: tracks version control.
[[Miles Bloom]]: Right?
[[Miles Bloom]]: So what happens is, like, you make a change
[[speaker]]: Okay.
[[Miles Bloom]]: to a file, like, you add a line,
[[Miles Bloom]]: and then there's a bit of
[[Miles Bloom]]: you know, code that shows, hey.
[[Miles Bloom]]: In this version,
[[Miles Bloom]]: we didn't have this line, and in the next version,
[[Miles Bloom]]: it did have this line.
[[speaker]]: K.
[[Miles Bloom]]: I have branches
[[Miles Bloom]]: which are like
[[Miles Bloom]]: different
[[Miles Bloom]]: histories.
[[Miles Bloom]]: Right? So, like,
[[Miles Bloom]]: if you imagine
[[Miles Bloom]]: like,
[[Miles Bloom]]: like a a bit like
[[Miles Bloom]]: it's it's it's exactly what it sounds like. It's
[[Miles Bloom]]: one person works on this thing, he make
[[Miles Bloom]]: one branch and makes
[[Miles Bloom]]: these changes.
[[Miles Bloom]]: And then another person works on a different branch and makes
[[Miles Bloom]]: different changes and those attract independently.
[[Miles Bloom]]: So main is a branch
[[speaker]]: Yeah.
[[Miles Bloom]]: Production
[[Miles Bloom]]: is a type of
[[Miles Bloom]]: deployment.
[[Miles Bloom]]: Which is happening
[[Miles Bloom]]: in terms of the app
[[speaker]]: Right. Perfect.
[[Miles Bloom]]: not in terms of the version control tracking.
[[speaker]]: Perfect. Thank you.
[[speaker]]: Yeah. That's crystal clear.
[[speaker]]: But confusingly,
[[speaker]]: we may have a staging environment and the staging branch.
[[speaker]]: So for staging, they're both named the same thing. It just so happens that GitHub these days
[[speaker]]: uses the word
[[speaker]]: main for its, like,
[[speaker]]: main branch.
[[speaker]]: We could actually rename that branch to production.
[[speaker]]: But we don't have to as well. Just
[[speaker]]: main and production are named differently. Staging staging
[[speaker]]: could be named the same.
[[speaker]]: It's Git isn't opinionated about what a branch is called or how you use it. It just
[[speaker]]: happens to be that's a convention.
[[speaker]]: Okay. That's fine.
[[speaker]]: It's good just to understand it.
[[speaker]]: Yeah. I mean, Git Git is known as
[[speaker]]: one of the most
[[speaker]]: absurd and complicated things in the world.
[[speaker]]: Everyone's got used to it by now. But when it was first made in 2008, everyone was like,
[[speaker]]: some of news.
[[speaker]]: So everyone's got music now.
[[speaker]]: Right. Right.
[[speaker]]: So
[[speaker]]: when
[[speaker]]: you know, very soon we're gonna start working on the content for the ISA,
[[speaker]]: app. And so for the first time, we're gonna start having
[[speaker]]: two versions.
[[speaker]]: How will multiple versions of the app
[[speaker]]: start to fit into this
[[speaker]]: mapping that we are doing at the moment?
[[speaker]]: From a design point of view or a coding point of view or both?
[[speaker]]: Well, I think let's talk about both of those things.
[[speaker]]: So let let's about design first of all because, obviously, you've made a
[[speaker]]: initial design document.
[[speaker]]: With, as you'd suggested, what might be, like,
[[speaker]]: considered the core features.
[[speaker]]: So
[[speaker]]: I was imagining
[[speaker]]: well, I'm I'm interested to hear what you're imagining, actually.
[[speaker]]: Yeah. Yeah. Yeah. Probably more realistic.
[[speaker]]: If we can keep it simple, I would try and keep it
[[speaker]]: you know,
[[speaker]]: If we can keep it simple, I would try and keep it very simple. So
[[speaker]]: I wouldn't have different documents
[[speaker]]: per app version. I would try and keep just one one design document that covers everything, basically.
[[speaker]]: And possibly even
[[speaker]]: we don't even
[[speaker]]: we don't even use that design document
[[speaker]]: to make, you know,
[[speaker]]: It depends it depends if we need to, like,
[[speaker]]: you know, show other stakeholders. It doesn't really need to communicate.
[[speaker]]: You know, that design to other people. Maybe you can, like, explore a version of it.
[[speaker]]: That would be a very useful thing to be able to do, to be
[[speaker]]: show them what we're planning for them.
[[speaker]]: Them.
[[speaker]]: Yeah.
[[speaker]]: So
[[speaker]]: what maybe we should do is create
[[speaker]]: so we have different color skins of the app.
[[speaker]]: And then
[[speaker]]: if there if there are other features, we just
[[speaker]]: of add them in as addendums to the main design document or something like that.
[[speaker]]: To put relatively simple.
[[speaker]]: So so so that that as an idea sounds good. Let's put it into practice a second.
[[speaker]]: So, like,
[[speaker]]: on this design
[[speaker]]: our minds dot app,
[[speaker]]: page three is the home.
[[speaker]]: Or feature three is the home page. Right?
[[speaker]]: So
[[speaker]]: just as an idea, right,
[[speaker]]: this this is where I where I start to find it difficult.
[[speaker]]: We have one image.
[[speaker]]: But for the the special forces one, we're gonna want a button on there
[[speaker]]: the,
[[speaker]]: the the assist thing. What's it called? The JSP assist
[[speaker]]: So
[[speaker]]: where will that appear on this image?
[[speaker]]: But then design doc.
[[speaker]]: Yes. So I would imagine that at the end of the design doc, once you've done
[[speaker]]: start the core,
[[speaker]]: we then have extra pages for extra apps.
[[speaker]]: Okay. So at the moment, we've got 10 pages of
[[speaker]]: we, I think?
[[speaker]]: No. We've It's a bit it's a bit messy at the moment. We need to we need to tell pages. Yeah. Update a bit more.
[[Miles Bloom]]: So the the that works
[[speaker]]: Yeah.
[[Miles Bloom]]: fine as long as there isn't any
[[Miles Bloom]]: features
[[Miles Bloom]]: that are conflicting.
[[speaker]]: Right.
[[Miles Bloom]]: So if
[[Miles Bloom]]: like, so for for a lot of things, it's not
[[Miles Bloom]]: too important what they actually say. Like, if
[[Miles Bloom]]: there's
[[Miles Bloom]]: you know
[[Miles Bloom]]: a collection of buttons on the home screen
[[Miles Bloom]]: and one of them say
[[Miles Bloom]]: you know, like, think about the sidebar. One of them says j JSP and the other one says groups.
[[Miles Bloom]]: Like,
[[Miles Bloom]]: exactly what the
[[Miles Bloom]]: different things say isn't really that important on a design thing. It's just a nav bar. Right?
[[speaker]]: Yes.
[[speaker]]: What yeah. I mean, you say that, but that's exactly what
[[speaker]]: presumably
[[speaker]]: when
[[speaker]]: when
[[speaker]]: when we take the eyesight information from them, we say, right. We've gotta build this. We've imagine this.
[[speaker]]: I or we
[[speaker]]: gonna take the information that we've
[[speaker]]: agreed with them, and we're gonna
[[speaker]]: in Chris's words, shout at the AI to create images
[[speaker]]: that would
[[speaker]]: look roughly like what we've discussed with them.
[[speaker]]: Would be keeping the the overall format. But as you said, you know,
[[speaker]]: adding
[[speaker]]: adding groups somewhere.
[[speaker]]: But then based on those images that we create, that's what you're gonna then go design.
[[speaker]]: So the idea that they're kind of vague
[[speaker]]: feels like it would be
[[speaker]]: almost self defeating.
[[speaker]]: As if we want something that's really crystal clear for each of the different apps.
[[speaker]]: Apps.
[[speaker]]: Like, right now, there are
[[speaker]]: well, there's one app, and there's about to be a second.
[[speaker]]: But
[[speaker]]: there's
[[speaker]]: idea is by the end of next year that we've got, like, 20 of these. Like,
[[speaker]]: this this is gonna become chaos.
[[speaker]]: So it almost feels to me like we need whether it's folders
[[speaker]]: or
[[speaker]]: slightly different versions for each one. And we've got, like, a kit a core version, you know, design lines
[[speaker]]: dot app.
[[speaker]]: And then we've got one, two, or ISO, whatever.
[[speaker]]: And in each one, you just have the slight variations of each one.
[[speaker]]: Which makes it easy to show to the clients as well.
[[speaker]]: Yeah. I mean, they can
[[speaker]]: we can add
[[speaker]]: We can
[[speaker]]: yeah. We can go to, like,
[[speaker]]: we could go to, like, having a poor and then having, like,
[[speaker]]: variations and make them spread across different document versions.
[[speaker]]: And it'll just take a bit more, like, effort in terms of setting it up and what we'll do, I'm telling you.
[[speaker]]: Right. I mean, I'm all on board
[[Miles Bloom]]: So this
[[speaker]]: for the easiest one. It just has to make sense.
[[Miles Bloom]]: there's a question there's a difference between the design level and the coding level here.
[[Miles Bloom]]: And I think that's sort of what
[[speaker]]: Well, and remember remember remember, we're planning to do variations on the app.
[[speaker]]: From
[[speaker]]: feature flags.
[[speaker]]: They
[[speaker]]: There shouldn't there shouldn't be different code
[[speaker]]: Like, there should
[[speaker]]: shouldn't be very much different code per app.
[[speaker]]: Apart from
[[speaker]]: apart from things that are only turned on in, like,
[[speaker]]: this app or that app. Obviously, that is code, but
[[speaker]]: you know, it's specific to that version.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: But but I I I think that the design documents
[[Miles Bloom]]: is more supposed to reflect the
[[Miles Bloom]]: codes
[[Miles Bloom]]: that will be built than how the design will look.
[[speaker]]: Oh, no. It can be it can be can be it can be both.
[[Miles Bloom]]: At least from my
[[Miles Bloom]]: Can I?
[[speaker]]: Why why can't it be designed as well?
[[Miles Bloom]]: Well, I I just think it's well, it's just gonna get confusing because if we have
[[Miles Bloom]]: if we have the the the design document tracks the default,
[[Miles Bloom]]: mean we can maybe have a separate thing that
[[speaker]]: No. No. No. No. We can have we can we can have, like, 20 design dumplings. That's fine.
[[speaker]]: And we can have a core design document the other ones pull in from.
[[speaker]]: And you can only change
[[speaker]]: the core one in the core
[[speaker]]: document, and you can only change the individual ones in the individual documents. So we just
[[speaker]]: 20 channels in Lean.
[[speaker]]: And each one of them is one of our clients, and they each get a design doc that looks correct.
[[speaker]]: We can do that.
[[speaker]]: That that that sounds logically good to me.
[[Miles Bloom]]: Yes.
[[speaker]]: If anyone can say something better, then great. But that's
[[Miles Bloom]]: I think so.
[[speaker]]: the first thing that I'm like, ah, that sounds clear.
[[speaker]]: That's okay. It's just I was just trying to keep it simple.
[[speaker]]: But, yeah, no. We we can move towards a setup like that. Yeah.
[[speaker]]: But if there's something more simple and equally clear No. Right. No. No. No.
[[speaker]]: No. No. There isn't anything more simple from a user. I think the people using the design system point of view.
[[speaker]]: But it's a more complicated code to them. Like, so I'll go I'll need to I'll basically make
[[speaker]]: like,
[[speaker]]: design documents can, like, pull into each other and all this kind of stuff. So, yeah, it'll be funky.
[[speaker]]: That's fine. I like the challenge.
[[Miles Bloom]]: And
[[Miles Bloom]]: would the
[[Miles Bloom]]: so from a
[[Miles Bloom]]: from a building
[[Miles Bloom]]: perspective of the code,
[[Miles Bloom]]: I think it's it's also just a
[[Miles Bloom]]: we need to we need to keep them
[[Miles Bloom]]: like,
[[Miles Bloom]]: similar ish. Like, the the the implementation of this
[[Miles Bloom]]: is what would be complicated.
[[Miles Bloom]]: Because, like, the the core features
[[Miles Bloom]]: so the the core features would have worked the same, and then they would
[[Miles Bloom]]: be just be looked and be represented slightly differently in the
[[Miles Bloom]]: 20 different versions.
[[Miles Bloom]]: Is that right?
[[speaker]]: Approximately, I think there'll be, like, you know, slight
[[speaker]]: color changes. And then in
[[speaker]]: know, some of the
[[speaker]]: the the images, the graphics that will be used will be a bit different in some of them.
[[speaker]]: But they'll but
[[speaker]]: there will be feature changes, and we don't really know yet.
[[speaker]]: What features we're gonna need. Like,
[[speaker]]: it wasn't till we spoke to the ISR people that we realized that they
[[speaker]]: it doesn't need to be anonymous. They need to be able to they need to have the real people. We don't need to have
[[speaker]]: the real groups of people that are going out to different countries.
[[speaker]]: In chat groups together.
[[speaker]]: And so that's
[[speaker]]: just a totally new feature that we hadn't
[[speaker]]: just hadn't discussed before.
[[speaker]]: We don't know what people are gonna bring to us in the future as well.
[[speaker]]: It might be totally different things that we haven't thought of yet.
[[Miles Bloom]]: This
[[speaker]]: So
[[Miles Bloom]]: is like an incredibly difficult
[[Miles Bloom]]: thing.
[[Miles Bloom]]: To manage.
[[Miles Bloom]]: Like, having all of these different
[[speaker]]: What is?
[[Miles Bloom]]: slightly different versions with some features on and
[[Miles Bloom]]: some features off.
[[Miles Bloom]]: And then different skins.
[[Miles Bloom]]: Like, in
[[speaker]]: Yeah. It's pretty it's it's
[[Miles Bloom]]: Like, you feel that things are gonna pull through the crack
[[speaker]]: So, yeah, it's a it's a a it's a pretty thing. It's I mean,
[[speaker]]: you know, it's it's just, a lot it's just a lot of detail.
[[speaker]]: But that's why using the feature flags
[[speaker]]: should make it easier because then it's just like state and get set in the database. You know?
[[speaker]]: Yeah. Just configures itself based on that.
[[Miles Bloom]]: Right.
[[speaker]]: Yeah. No. The whole thing the whole thing needs
[[speaker]]: careful evolution.
[[speaker]]: But that just that's just it's not it's not any easier if we had 20 different actual apps.
[[speaker]]: I mean
[[Miles Bloom]]: No.
[[speaker]]: it's online.
[[Miles Bloom]]: I mean,
[[Miles Bloom]]: principle is is hard. There's a reason why
[[Miles Bloom]]: people generally don't do this.
[[speaker]]: I suppose.
[[speaker]]: I mean, no. No. It's true that they yeah. But also people
[[speaker]]: yeah. It's
[[speaker]]: it's hard as yeah. No. I mean, basically, all but also we should use we should use things like
[[Miles Bloom]]: But I think, yeah, we're we're choosing to do something hard.
[[Miles Bloom]]: Specifically
[[speaker]]: we should have, like, a lot like, a core
[[speaker]]: basically need to turn our app into, a sort of library.
[[speaker]]: So that the core is, like, in a specific library maybe.
[[speaker]]: And then each version is, like,
[[speaker]]: something that pulls in core and then configures it or something like that so that it can be a bit more
[[speaker]]: code clean. How does that sound?
[[Miles Bloom]]: That sounds good.
[[speaker]]: That sounds
[[speaker]]: yeah, that does sound good.
[[speaker]]: That's that's how my brain imagines this.
[[speaker]]: Like,
[[speaker]]: Yeah.
[[speaker]]: Like and and then you choose the specific books that
[[speaker]]: to add on to the library.
[[speaker]]: For each version?
[[speaker]]: Well, we can make look. I mean, maybe we can make the whole
[[speaker]]: apps
[[speaker]]: iOS and Android. Maybe we can make
[[speaker]]: all features composable. I mean, I think they should almost be like this anyway.
[[speaker]]: I mean, just have a central I mean, to honest, this is how the feature flag system should work anyway. And there's, like, a sort of
[[Miles Bloom]]: Yeah. You could have a, like,
[[speaker]]: a a
[[Miles Bloom]]: Mac, like, version with everything turned on.
[[speaker]]: you know, a switch a switch state.
[[speaker]]: A switch statement or, like, if it could even be, like, just a list of bloody ifs.
[[speaker]]: You know? Like, basically, you just wanna keep
[[speaker]]: that
[[speaker]]: kind of organized normal. But to be honest, like, we don't have to do that right now because we
[[speaker]]: only got, like,
[[speaker]]: you know,
[[speaker]]: one to two versions. Like, it's okay. We can sort of, like,
[[speaker]]: I don't know, find our way through that. But let's try and move to, like,
[[Miles Bloom]]: Yeah.
[[speaker]]: as much of an organized thing as possible.
[[speaker]]: Yeah. Yeah.
[[speaker]]: Yeah. I can almost imagine this at some point in the future where
[[speaker]]: the head of sales essentially
[[speaker]]: has the final meeting with the new client.
[[speaker]]: Goes on to, you know,
[[speaker]]: something like a Wagtail,
[[speaker]]: and just types in
[[speaker]]: core
[[speaker]]: plus red plus features a, b, c, d, and e.
[[speaker]]: And x.
[[speaker]]: Press go, and it and it comes online.
[[speaker]]: Like, I can I can imagine us getting to that place in Yeah? Yeah.
[[speaker]]: In a few years' time wherein all of those books of those libraries are built
[[speaker]]: it's just a case of
[[speaker]]: picking and choosing the right bits so that it sets it sets the app up appropriately.
[[speaker]]: Yeah.
[[speaker]]: You can even basically do that one.
[[speaker]]: Loom.
[[speaker]]: Already.
[[speaker]]: Anyway,
[[speaker]]: We'll see what we can get to.
[[speaker]]: Okay.
[[speaker]]: This all sounds good.
[[speaker]]: So
[[speaker]]: so we said let's start with the designs.
[[speaker]]: Then
[[speaker]]: I don't know. What's missing? What's next?
[[Miles Bloom]]: Linear
[[speaker]]: Actually, going
[[Miles Bloom]]: going through linear.
[[speaker]]: Actually, going through linear and seeing what needs to be updated.
[[Miles Bloom]]: What what needs to be done and by who and stuff?
[[Miles Bloom]]: Like that.
[[Miles Bloom]]: I think.
[[speaker]]: Okay.
[[speaker]]: Should we have a look at that?
[[speaker]]: Mhmm.
[[speaker]]: Everybody got linear open?
[[Miles Bloom]]: Yeah.
[[speaker]]: Integrate all regulation exercises and size knowledge bank.
[[speaker]]: Chris, is that
[[speaker]]: is that done?
[[speaker]]: I think
[[speaker]]: I mean, she'd have access to whatever it
[[speaker]]: whatever is in our database in terms of regulation outside of this.
[[speaker]]: I'm not sure it's working brilliantly.
[[speaker]]: Yeah. And at at one point, one of the issues of that
[[speaker]]: was
[[speaker]]: that it was pulling the exercises also from the learn section.
[[speaker]]: Which we wanted to turn off.
[[speaker]]: Mhmm.
[[speaker]]: So this is I mean, this is currently set to you, Chris.
[[speaker]]: Mhmm.
[[speaker]]: Can we give this to Miles, or is this a you thing?
[[speaker]]: Because this is partly what we wanna do right
[[speaker]]: Right? We want we wanna give Miles things to be to be working on. Yeah. Yeah. Yeah.
[[speaker]]: I
[[speaker]]: that could be okay just to verify how that's working.
[[speaker]]: Okay.
[[speaker]]: Feedback section
[[speaker]]: doesn't work in staging. Has that been fixed?
[[Miles Bloom]]: Think so.
[[speaker]]: I think this this might maybe this isn't a thing to do live on the call.
[[speaker]]: Think we need to verify a load of things.
[[Miles Bloom]]: So, you should
[[Miles Bloom]]: we have let, like,
[[Miles Bloom]]: you know, we're all gonna go through our own task
[[Miles Bloom]]: and see which ones are done and which ones haven't been done?
[[speaker]]: Yeah.
[[speaker]]: Maybe.
[[speaker]]: I think.
[[speaker]]: Depends how many there are. Sorry. I'm just trying to get on to Lynn there. Mhmm.
[[speaker]]: There's not anything I ever have any plan to go back to linear piece.
[[speaker]]: Alright. Thank you.
[[Miles Bloom]]: So the
[[speaker]]: Well, the
[[Miles Bloom]]: the functional
[[speaker]]: how about we do that?
[[Miles Bloom]]: we now have
[[Miles Bloom]]: in in the design document. Right? So that doesn't make sense
[[speaker]]: Sorry?
[[Miles Bloom]]: anymore.
[[Miles Bloom]]: The
[[Miles Bloom]]: the build functional spec
[[Miles Bloom]]: I I think that's
[[speaker]]: I mean, that is
[[Miles Bloom]]: yeah.
[[speaker]]: that is the design design on. Yeah. So
[[Miles Bloom]]: So that can go.
[[speaker]]: yeah.
[[speaker]]: Let's put in for
[[speaker]]: finish. Done.
[[Miles Bloom]]: So my
[[Miles Bloom]]: Like, I I think there's a lot of these tasks
[[Miles Bloom]]: that are out to
[[speaker]]: In staging, the old AI videos are appearing in staging instead of new videos.
[[speaker]]: That
[[speaker]]: that was a problem still recently.
[[speaker]]: Sorry. Does everybody just wanna go and check their own things to start with?
[[speaker]]: And see what they've got on there?
[[speaker]]: I think
[[speaker]]: I think I think Miles is sort of
[[speaker]]: like, actually I already got one two three four five six seven eight. Nine. Ten films on my issues.
[[speaker]]: And I think about 50 to 60% of them are
[[speaker]]: done or
[[speaker]]: placed to join.
[[speaker]]: Maybe more. Things like Apple Watch, Garmin,
[[speaker]]: but I'm not done.
[[speaker]]: Otherwise,
[[speaker]]: not awful.
[[Miles Bloom]]: And so
[[speaker]]: So I've got on here how do we make app fully private? Is that
[[speaker]]: is that all Yeah.
[[speaker]]: That's all done. Right? It's not well. We need to talk about that.
[[speaker]]: Yeah. Because we need to talk about
[[speaker]]: the
[[speaker]]: model that I need to run.
[[speaker]]: So
[[speaker]]: can you talk about that now?
[[speaker]]: Yeah. So in the basically, in terms of cost,
[[speaker]]: for getting
[[speaker]]: so what I think we're not gonna be able to start well, I don't think we're gonna be able to afford to start with.
[[speaker]]: Always on GPU.
[[speaker]]: Or
[[speaker]]: handling those
[[speaker]]: private model requests.
[[speaker]]: So what might have to happen is that when someone
[[speaker]]: when the
[[speaker]]: military
[[speaker]]: comes to use the app,
[[speaker]]: It would say to them, hey. We're just turning on your secure
[[speaker]]: you know, AI server. Please wait.
[[speaker]]: That might take I don't know.
[[speaker]]: Actually, fifteen thirty, you know, x number of seconds for it to start up.
[[speaker]]: Obviously, I'll try and make it start up as quickly as possible.
[[speaker]]: But
[[speaker]]: basically,
[[speaker]]: I think there were some costs coming back as, like,
[[speaker]]: £1,700 $1,700 a month.
[[speaker]]: To keep a GPU strong strong enough for all the time. I'm not sure that's exactly correct.
[[speaker]]: I think what we should do to start with is
[[speaker]]: have this delay
[[speaker]]: the start of having the airline respond.
[[speaker]]: Because
[[speaker]]: it's not safe enough to point to.
[[speaker]]: And I don't think you'll and I can probably tell the user
[[speaker]]: this is what we're doing. And, also, it means that
[[speaker]]: the app the server will then stay on for, fifteen minutes or something like that.
[[speaker]]: Whenever there's
[[speaker]]: people more and more people using
[[speaker]]: it's just that basically when no one do fifteen minutes, it gets guys
[[speaker]]: goes to sleep.
[[speaker]]: Okay. It saves us it saves us a huge amount of money.
[[speaker]]: Right. And I mean and the reality is is that at this moment,
[[speaker]]: well, we've agreed today that it will start in September.
[[speaker]]: It's only gonna be 12 people.
[[speaker]]: Mhmm.
[[speaker]]: So, you know,
[[speaker]]: that makes sense to me.
[[speaker]]: And and and it's just part of the fact that, you know,
[[speaker]]: you're in special you're you're in the SAS. You have to wait because
[[speaker]]: Yeah. Yeah. You have to have crazy secure security. Yeah. Yeah.
[[speaker]]: Yeah. And and that's gonna be part of the feedback that we
[[speaker]]: that we
[[speaker]]: uncover. You know?
[[speaker]]: Is that a game changer? Is that okay?
[[speaker]]: Mhmm. But it's certainly gonna be the first one. Right?
[[Miles Bloom]]: I I think it's probably the crate
[[Miles Bloom]]: they have more tolerance.
[[Miles Bloom]]: For that as you're saying.
[[speaker]]: Yeah. I think I think let's start let's start with it now because it's the least
[[speaker]]: basically, I looked into some other more complex options that would cost, like,
[[speaker]]: maybe 500, maybe 900.
[[speaker]]: But they're worse.
[[speaker]]: They're more developer effort to get working.
[[speaker]]: So I wanna start with, like, the thing that's the best quality, the least effort.
[[speaker]]: And
[[speaker]]: just we have to accept a little bit of a delay.
[[speaker]]: Cool.
[[speaker]]: Cool.
[[speaker]]: Okay. And on that on that front, is that has David got an RM card?
[[speaker]]: We got an RM card somewhere?
[[speaker]]: Yeah. I chatted to David,
[[speaker]]: I've asked him for that.
[[speaker]]: And
[[speaker]]: he didn't actually respond to that part of the conversation.
[[speaker]]: But I'll reach out again to him. But he's
[[speaker]]: he's putting me back on
[[speaker]]: back on the bank account so that I can request the card so that we've just got
[[speaker]]: card between us. We don't have to reach out every time. So
[[speaker]]: Cool.
[[speaker]]: So that's already been initiated.
[[speaker]]: Yeah. After my,
[[speaker]]: $860 cost for two days this morning, I'm
[[speaker]]: bit messed up.
[[speaker]]: That that's insane. What what was that for?
[[speaker]]: No. It's just no. So I thought so I've I've been even moving forward to augment codes.
[[speaker]]: The whole time. Right? I feel like
[[speaker]]: a year, I've been working with Augment. And I and I thought because no one used Augment code, it
[[speaker]]: like, really expensive and a bad thing to use, but I've just been carrying on using it.
[[speaker]]: And then I switched to called codes,
[[speaker]]: and it's like
[[speaker]]: yeah, it's like really token hungry.
[[speaker]]: And kind of
[[speaker]]: inefficient.
[[speaker]]: And, like,
[[speaker]]: slow. Am I, oh,
[[speaker]]: I'm just like, oh,
[[speaker]]: So, like, I thought I was switching down to this, like,
[[speaker]]: not underneath poor code all the time.
[[speaker]]: And it turns out
[[speaker]]: I'm gonna stay where I'm gonna stay where am with old men, and
[[speaker]]: seems like it seems like it does actually do some pretty type of stuff.
[[speaker]]: Right. It's only
[[speaker]]: it's it's only expensive compared to the Claude. Basically, when you pay Claude for the
[[speaker]]: 100, I think it's called the max plan,
[[speaker]]: that basically gives you
[[speaker]]: 20 times
[[speaker]]: $200.
[[speaker]]: So
[[speaker]]: that's, like, $44,000. That's, like, 4 Alright. Yeah. It gives you a blow.
[[speaker]]: I mean,
[[speaker]]: yeah, 20 times 200. 4,000.
[[Miles Bloom]]: Yeah. Both have.
[[speaker]]: Yeah, basically, you're getting 4,004 thousand dollars worth of tokens a month for $200. It's an incredible deal.
[[speaker]]: But I've
[[speaker]]: not been using that generally because
[[speaker]]: I sort of like, more like, a, I was getting, like, paid enough now. Although now
[[speaker]]: my my my values are going down, and I've been spending AI
[[speaker]]: Well, not not that badly for me, but, like,
[[speaker]]: yeah, if I carried on at that rate with poor code, I was on, like, $17,000 a month or something.
[[speaker]]: It's mad. Oh my god. So
[[speaker]]: you know? Anyway, anyway, it's all just been a bit of a shock to me because I thought I was already
[[speaker]]: doing the stupid things. Turns out I was actually doing the smartphone in some ways. Obviously, the smart thing to do is just
[[speaker]]: just pay for the $200. Do you ever hit the rate limit, Miles, on the $200?
[[Miles Bloom]]: I've only
[[Miles Bloom]]: I had one time
[[Miles Bloom]]: where
[[Miles Bloom]]: I, like,
[[Miles Bloom]]: did a whole bunch of stuff in one window.
[[Miles Bloom]]: It was basically, like, a day in one window.
[[speaker]]: Yeah.
[[speaker]]: Yeah.
[[Miles Bloom]]: And then I got to like, I hit my limit.
[[speaker]]: Yeah. Yeah. Yeah.
[[Miles Bloom]]: And so now I just every so often, I'll start a new tab.
[[speaker]]: Mhmm. Yeah. Yeah.
[[Miles Bloom]]: I
[[Miles Bloom]]: to get anywhere close to my limit.
[[speaker]]: Cool.
[[speaker]]: Oh, cool. Yeah. No. There's a lot of things to do, but
[[speaker]]: yeah.
[[speaker]]: I'll see what happens.
[[speaker]]: Thing is as well, also, I really like the way old men
[[speaker]]: does its work. Like, it seems really fast and efficient. Plus, also, I'm using GPT 5.5. That seems really good.
[[speaker]]: My total AI costs work out with something like
[[speaker]]: a $110 a day.
[[speaker]]: Which I can handle that.
[[speaker]]: Like, that's
[[speaker]]: that's fine for me.
[[speaker]]: I can
[[speaker]]: you know, at the cost, I can handle that. And, apparently, that's, a real cost as well. Like,
[[speaker]]: that shouldn't go up any higher in future.
[[speaker]]: So
[[speaker]]: why I've kind of been working like that. It's like to get, like, a
[[speaker]]: sort of premium experience, but
[[speaker]]: yeah.
[[speaker]]: Let's see.
[[speaker]]: See what happens. Yeah.
[[speaker]]: $809,100 dollars a day every two days is is too much.
[[speaker]]: Yeah. Right.
[[speaker]]: It's crazy.
[[speaker]]: Yeah.
[[speaker]]: Cool.
[[speaker]]: A couple of
[[speaker]]: sorry. So we need to carry on going through linear, don't we, and just make sure we've got everything
[[Miles Bloom]]: So, like,
[[Miles Bloom]]: I I'm happy to
[[Miles Bloom]]: to go through
[[Miles Bloom]]: stuff that's there and make sure that they're all ticked
[[Miles Bloom]]: off and say that's what I'm gonna do this week.
[[Miles Bloom]]: Because, like, I know there was the onboarding flow
[[Miles Bloom]]: Like, I don't actually know what happened with that because I I remember I
[[Miles Bloom]]: I passed that over to
[[Miles Bloom]]: to Chris.
[[Miles Bloom]]: Before I went on holiday.
[[Miles Bloom]]: Well,
[[Miles Bloom]]: went through my exams.
[[Miles Bloom]]: I I I
[[speaker]]: My thing was up?
[[Miles Bloom]]: I I I built a whole, onboarding thing
[[Miles Bloom]]: where it's like you see the different
[[speaker]]: Yeah.
[[Miles Bloom]]: buttons and stuff.
[[speaker]]: That's similar to what we were talking about today in the group meetings. Yeah.
[[speaker]]: The the need for that little explainer.
[[speaker]]: Did we but did we know where that went?
[[Miles Bloom]]: Well, I I I thought I
[[Miles Bloom]]: maybe
[[Miles Bloom]]: I thought I
[[Miles Bloom]]: sent that to you. You know?
[[Miles Bloom]]: Before
[[speaker]]: I mean, if it's committed in Git somewhere,
[[Miles Bloom]]: Pretty sure it is.
[[speaker]]: it should be somewhere.
[[speaker]]: Yeah.
[[speaker]]: We can just find wherever that is and get it out.
[[speaker]]: Great.
[[speaker]]: That would be good.
[[speaker]]: So is that something you could look for, Miles?
[[Miles Bloom]]: Yeah. I I know where it is. It's in Milesdale.
[[speaker]]: Okay.
[[speaker]]: Because I'd love to see that.
[[speaker]]: In
[[speaker]]: I'm also I'm wondering whether that's gonna be enough or whether we could actually
[[speaker]]: film some very or or just create some very short videos
[[Miles Bloom]]: So I I can
[[speaker]]: that essentially do the same thing. Sorry?
[[Miles Bloom]]: some research on this just
[[Miles Bloom]]: for for my own work.
[[Miles Bloom]]: That's why I came across this this
[[Miles Bloom]]: website that's super useful. It's called mobbin.
[[speaker]]: Mob in.
[[Miles Bloom]]: If you've heard of it.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: It's, like, spelled like this.
[[Miles Bloom]]: Essentially, like,
[[Miles Bloom]]: you can see
[[Miles Bloom]]: I
[[Miles Bloom]]: let me just show my screen.
[[Miles Bloom]]: So you you can go through
[[Miles Bloom]]: and see, like, all sorts of different apps.
[[Miles Bloom]]: And how they've done their onboarding and stuff.
[[Miles Bloom]]: It's just it's for
[[Miles Bloom]]: like, this is
[[Miles Bloom]]: find.
[[Miles Bloom]]: Like, this is this is Calm's onboarding process.
[[Miles Bloom]]: And you can see it all up just like this.
[[speaker]]: No.
[[Miles Bloom]]: And, like,
[[Miles Bloom]]: it's you can actually see them all right next to each other.
[[speaker]]: That's pretty cool, isn't it?
[[Miles Bloom]]: So super helpful for, like, UI
[[Miles Bloom]]: inspiration and stuff.
[[speaker]]: I'm headed this thing. Yes. I think it's written good.
[[Miles Bloom]]: And, yeah, I I do think that, like,
[[Miles Bloom]]: there is a general thing that we
[[Miles Bloom]]: have of, like,
[[Miles Bloom]]: trying to
[[Miles Bloom]]: have a whole
[[Miles Bloom]]: a whole process around that.
[[Miles Bloom]]: I I found, like,
[[Miles Bloom]]: figuring out exactly, like,
[[Miles Bloom]]: how to onboard required, like,
[[Miles Bloom]]: learning a bunch of stuff about the type of users that we want.
[[Miles Bloom]]: And, like,
[[Miles Bloom]]: because is it because so
[[Miles Bloom]]: from my research, you basically wanna have
[[Miles Bloom]]: like,
[[Miles Bloom]]: your
[[Miles Bloom]]: UI process
[[Miles Bloom]]: tailored
[[Miles Bloom]]: to the type of
[[Miles Bloom]]: user so that you can get them to their first win as fast as possible.
[[speaker]]: Yeah.
[[Miles Bloom]]: So there's
[[Miles Bloom]]: a a larger conversation around how we're gonna do
[[Miles Bloom]]: because it's it's actually quite a lot of
[[Miles Bloom]]: theoretical
[[Miles Bloom]]: market research.
[[Miles Bloom]]: Style stuff.
[[speaker]]: Yeah.
[[speaker]]: Okay.
[[Miles Bloom]]: I hope that was helpful.
[[speaker]]: Yep. That's really good to hear.
[[speaker]]: I'm gonna have a look.
[[Miles Bloom]]: Well, like,
[[Miles Bloom]]: can you
[[Miles Bloom]]: I I can send you a document with, like,
[[speaker]]: Sorry?
[[Miles Bloom]]: you know,
[[Miles Bloom]]: onboarding breast practices
[[Miles Bloom]]: that I I
[[Miles Bloom]]: found.
[[Miles Bloom]]: And then the process
[[Miles Bloom]]: the
[[Miles Bloom]]: I know. I found helpful for figuring out how we're gonna do that.
[[speaker]]: Yeah, please. That'd be great.
[[Miles Bloom]]: And, yeah, so
[[Miles Bloom]]: I think that
[[Miles Bloom]]: that we we have a basic, like, tour of the app.
[[Miles Bloom]]: Which is a good start.
[[Miles Bloom]]: But I I do think there needs to be more, and I and I'd be very happy to build that.
[[speaker]]: Cool.
[[speaker]]: So, again, that was something that we should really design
[[Miles Bloom]]: Yes.
[[speaker]]: and put in the design document, shouldn't we?
[[Miles Bloom]]: Or or even just in a a
[[speaker]]: Before
[[Miles Bloom]]: Just in a a a Figma or something.
[[Miles Bloom]]: Like, I know
[[Miles Bloom]]: I mean, Chris, is the the design documents out?
[[Miles Bloom]]: For building something like that?
[[speaker]]: What? Like, interactions and things like that?
[[Miles Bloom]]: Like, a whole onboarding flow.
[[speaker]]: Yeah.
[[speaker]]: Yeah. Yeah.
[[Miles Bloom]]: Okay. Great. Yeah.
[[speaker]]: They they they
[[speaker]]: Yeah.
[[speaker]]: I mean, it's home I mean,
[[speaker]]: that's the thing. It's like, there shouldn't be any limitations on what can be represented by a web page.
[[speaker]]: They give or take.
[[speaker]]: So
[[speaker]]: know, you can just ask the AI to do anything. Long as the AI can understand what it is you're
[[speaker]]: asking to build, we should build the bill.
[[Miles Bloom]]: Okay. Great.
[[Miles Bloom]]: So, yeah, then I guess there's a
[[Miles Bloom]]: a design process
[[Miles Bloom]]: The
[[Miles Bloom]]: like, I
[[Miles Bloom]]: I mean, Roger, is that something something you you would feel comfortable doing? Or
[[speaker]]: Good
[[speaker]]: Potentially. And it sounds like it sounds like you've done quite a lot of work on this.
[[speaker]]: Do you wanna just attack this with with what you know already?
[[Miles Bloom]]: I'd so I I'd be happy to I mean, I
[[Miles Bloom]]: I would need to have
[[Miles Bloom]]: probably sit down and have a conversation with you and maybe some other
[[Miles Bloom]]: people.
[[Miles Bloom]]: About
[[Miles Bloom]]: exactly what
[[Miles Bloom]]: it
[[Miles Bloom]]: takes. So, like,
[[Miles Bloom]]: for example, like, you need to define your user types.
[[Miles Bloom]]: In order to
[[Miles Bloom]]: onboard them properly.
[[Miles Bloom]]: So, like, for example, for
[[Miles Bloom]]: for my app, there's, like,
[[Miles Bloom]]: you know
[[Miles Bloom]]: have different amounts of creation appetite and different amounts of technical ability.
[[Miles Bloom]]: I have, like, some 12 different categories.
[[Miles Bloom]]: That it takes
[[Miles Bloom]]: and then the onboarding process
[[Miles Bloom]]: is gonna be
[[Miles Bloom]]: you know there'll be, like, a check-in, and that will take them
[[Miles Bloom]]: You know, if you're someone who wants to just
[[Miles Bloom]]: stick exercises together, that takes you to one place. And if you're
[[Miles Bloom]]: someone who wants to build your own exercises, that takes you to another place.
[[Miles Bloom]]: And so it would require some meetings and stuff, but I'm very happy to to go for it.
[[speaker]]: Cool.
[[Miles Bloom]]: Cool.
[[speaker]]: Yeah. I'm very happy to meet and discuss it.
[[speaker]]: Go through it together.
[[speaker]]: It just sounds like since you've already
[[Miles Bloom]]: Yeah. I I thought we went headfirst into that
[[speaker]]: dived into that, it sounds like
[[speaker]]: right. Right.
[[speaker]]: It sounds like he's probably gonna come up with the best
[[speaker]]: the best thing.
[[speaker]]: So should we set up a meeting, you and I, just to discuss that?
[[Miles Bloom]]: Yeah.
[[speaker]]: Great.
[[speaker]]: I
[[Miles Bloom]]: Tomorrow?
[[speaker]]: When is it?
[[speaker]]: I can do tomorrow morning.
[[Miles Bloom]]: I can do 10.
[[Miles Bloom]]: If that works.
[[speaker]]: Yep.
[[speaker]]: Cool.
[[Miles Bloom]]: Okay. Set.
[[speaker]]: So there's something here that says fix video full screen button in video player.
[[speaker]]: I've heard a couple of people mention this, that when they
[[speaker]]: they've been into
[[speaker]]: certain sections of the app where there's a video
[[speaker]]: to watch, like learn or regulate.
[[speaker]]: Think especially in the learn section, and they haven't realized that there's a video to watch,
[[speaker]]: because there hasn't been a
[[speaker]]: because there hasn't been an actual sign of it. Let me show you
[[speaker]]: I'll just show you on my screen here.
[[speaker]]: No. No. Share screen. No. No. Cancel that.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Yeah. I I can see the
[[speaker]]: Camera on.
[[speaker]]: Do you know what I'm talking about?
[[speaker]]: Like, here, because there's no, like, triangle in the middle, people would
[[speaker]]: didn't realize you have to
[[speaker]]: touch it for it to come on.
[[speaker]]: It it seems like a silly thing, but
[[speaker]]: more than one person has said to me, I I don't really know what to do until
[[speaker]]: I realized that there was actually a video to watch there.
[[Miles Bloom]]: Yeah. So from what I remember,
[[Miles Bloom]]: essentially, I was having some trouble with
[[Miles Bloom]]: linking up the Apple's video
[[Miles Bloom]]: stuff.
[[Miles Bloom]]: To the full screen and and and stuff like that.
[[Miles Bloom]]: And so I think
[[Miles Bloom]]: I think I might have had a conversation about passing it over
[[Miles Bloom]]: Chris, but I'm not sure.
[[speaker]]: I do remember you I do remember you
[[speaker]]: saying that you'd been working on it and couldn't get that final piece in play.
[[speaker]]: So, yeah, I think it's
[[speaker]]: it's set here to yours, Chris.
[[speaker]]: Full test bot. What's that?
[[Miles Bloom]]: We had it was we had a conversation about having a a bot go through and
[[speaker]]: Right.
[[Miles Bloom]]: test all
[[Miles Bloom]]: is an AI.
[[speaker]]: Cool.
[[speaker]]: So I think
[[speaker]]: rather than kind of going through these one by one, why doesn't everybody just
[[speaker]]: go at them?
[[speaker]]: The things that are on there? And if there's any confusion, we just ask about them in the group.
[[Miles Bloom]]: Yeah. I'm good with that.
[[speaker]]: Is that what for you, Chris?
[[speaker]]: Yeah.
[[speaker]]: All good. Okay.
[[speaker]]: Cool.
[[speaker]]: Should we
[[speaker]]: should we leave it there?
[[speaker]]: For today?
[[speaker]]: Yeah.
[[speaker]]: Yeah.
[[speaker]]: I guess I don't anyone just talk to me about anything they need or if they get stuck on anything.
[[speaker]]: I don't know.
[[speaker]]: Let me
[[speaker]]: yeah, if either of you wanna get started on the design document stuff, let me know when you're gonna
[[speaker]]: start so I can just
[[speaker]]: make sure it's as far as long as it can be.
[[speaker]]: I think
[[speaker]]: from my end, it's only gonna
[[speaker]]: be once we've got the okay from ISA.
[[speaker]]: At the moment,
[[speaker]]: just sent them a proposal. They need to go through the proposal, come back to us.
[[speaker]]: And so once That's
[[speaker]]: we get the response from them,
[[speaker]]: that will be the moment to sit down and start fleshing out
[[speaker]]: the new modules that they already exist. That's good. I mean, I'm really happy.
[[speaker]]: I'm really happy. Might be in a few weeks' time.
[[speaker]]: No. That's great. That's great. That's great. I'm really happy with where I managed to get the thing.
[[speaker]]: It's just I've got so much else on now. It's like
[[Miles Bloom]]: So
[[speaker]]: Sure. Sure. Gotta keep pushing. Okay. Cool. Alright. So
[[Miles Bloom]]: in in terms of
[[Miles Bloom]]: onboarding, if Roger and I are working on that tomorrow,
[[speaker]]: Oh, yeah.
[[speaker]]: Can we build that in the design document?
[[speaker]]: Yeah. Yeah. Yeah. You can you can just you can just start start asking to add new pages on the end or wherever you're
[[speaker]]: You can just tell it to
[[speaker]]: change everything.
[[speaker]]: And that's it, Will.
[[speaker]]: And if it doesn't look perfect or you get stuck on making it look perfect,
[[speaker]]: don't get bogged down in that. Just like
[[speaker]]: you know,
[[speaker]]: get some progress going.
[[Miles Bloom]]: Okay.
[[speaker]]: Yeah.
[[speaker]]: Do we do we have the sign in for the design document?
[[speaker]]: I would like to your voice about which
[[speaker]]: Roger, which email?
[[speaker]]: Do you want? I think I invited you, Miles, by the way.
[[Miles Bloom]]: So.
[[speaker]]: Roger at Resilientmindsmatters.
[[speaker]]: Yeah. That one. Yeah. Cool. Okay. The best one to use for all related things if we can.
[[speaker]]: Yeah.
[[speaker]]: Members
[[speaker]]: Miles. Yep. You're there as a member called roger at Resilient
[[speaker]]: Mhmm.
[[Miles Bloom]]: Yeah.
[[speaker]]: I've sent him an invite.
[[speaker]]: Cool.
[[speaker]]: Martin has asked for a new email. Oh, yeah. Yeah. Yeah.
[[speaker]]: How how
[[speaker]]: how do I get set set up, Chris? Because that feels like it's something that's probably really easy to do
[[speaker]]: is a bit of a time waste for you.
[[speaker]]: It's okay. Yeah. I'll just I'll make you an admin on the Google Workspace thing.
[[speaker]]: I need to I need to
[[speaker]]: yeah.
[[speaker]]: Need to
[[speaker]]: invoice some notes at some point.
[[speaker]]: But then
[[speaker]]: Alright. In the short term, can you just make a Martin one?
[[speaker]]: And so that we can send it to him because he's waiting to send a few things off?
[[speaker]]: Yeah. Yeah. Yeah.
[[speaker]]: Let's I'll I'll also just try and make you an admin quickly because it shouldn't tell me that long.
[[speaker]]: Okay. And the other thing was if you can send me the
[[speaker]]: some kind of easy to understand version of the security summary that I can turn in. It's
[[speaker]]: it's not it's not, that's not
[[speaker]]: urgent today. No. No. Let me let me finish
[[speaker]]: let me finish the
[[speaker]]: because this thing I'm doing getting that thing ready is is yeah. I mean, actually,
[[speaker]]: finished all the code stuff. Now I'm literally just setting up this special model on mobile.com.
[[speaker]]: I'm using the I'm using the Gemma four Google model because it's quite lightweight. It's quite chill. It's only 12,000,000,000 parameters or whatever.
[[speaker]]: So, yeah, hopefully hopefully it does hopefully it works
[[speaker]]: Also, we need to check if it actually works as an LLM or not. So but people are saying it's good. So
[[speaker]]: More details. Yep.
[[speaker]]: So, guys, explain to me something. Why is it that I've seen both of you today
[[speaker]]: with the Golden Gate Bridge as the background?
[[speaker]]: Has gone on as well. You had it as your screensaver today. I
[[speaker]]: know. Have you guys got something going on with San Francisco that I should know about? Are you both out there?
[[Miles Bloom]]: Yeah. We we have a seat.
[[Miles Bloom]]: Thing every so often where all the developers go to San Francisco.
[[speaker]]: I wish.
[[speaker]]: Just stare at
[[Miles Bloom]]: Exactly.
[[speaker]]: Just stare at the bridge. All hail the bridge.
[[speaker]]: Get paid get paid San Francisco rates.
[[speaker]]: Right. They're like they're like five they're like five times what they are here. It's ridiculous.
[[Miles Bloom]]: Really?
[[speaker]]: They sure are. Yeah. Yeah. Yeah. They sure are. It's really shit.
[[speaker]]: Basically, being a developer in The UK is
[[speaker]]: That's true. Anyway right. Okay. Cool.
[[speaker]]: Roger.
[[speaker]]: More options.
[[Miles Bloom]]: Alright.
[[Miles Bloom]]: So I I think
[[Miles Bloom]]: is that it for today?
[[speaker]]: I think so. Yeah. I think we're good.
[[Miles Bloom]]: I think
[[Miles Bloom]]: Yeah.
[[speaker]]: I think we're good.
[[Miles Bloom]]: Cool.
[[speaker]]: Yeah. Cool.
[[Miles Bloom]]: I'll see
[[Miles Bloom]]: Yep.
[[speaker]]: I'll see you tomorrow, Miles.
[[Miles Bloom]]: See you then.
[[Miles Bloom]]: Take care.
[[speaker]]: Cool.
[[speaker]]: Take care.
