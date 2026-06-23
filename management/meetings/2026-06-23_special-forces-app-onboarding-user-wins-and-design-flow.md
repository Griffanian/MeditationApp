---
Type: Meeting Notes
date: 2026-06-23
url: https://notes.granola.ai/d/398d89be-8f28-4877-81b0-8d558988ae58
granola_id: not_hEAzkKqL42vAQ0
---
>[!Meta]
>participants::[[Miles Bloom]]
# Special forces app onboarding — user wins and design flow
## Summary
### User Archetype: Special Forces
- Core archetype: “the hero,” driven to be the best, seeking every competitive advantage
- Framing that landed: resilience and performance, not trauma healing
  - “Bulletproof emotionally” resonated; trauma language did not
- Key imagery that connected with actual SAS members: the spring (allostatic load)
  - Pull it too far, it breaks and loses form; recoil and return are essential
  - Other imagery to consider: draining the bucket, making the bucket bigger
- Profile: badged SAS members (and wives), stationed in Hereford, UK-based for this trial
  - Generally 6 months UK / 6 months away; on-call for counterterrorism and training
  - Expect \~12 participants, all opted in, higher compliance than typical app users
### Three Onboarding Pathways (Goal-Based Split)
- Opening question: “What’s your main goal?” routes users into one of three paths:
  1. Regulate: stress to calm, physical/emotional regulation
  2. Understand: confusion to clarity, recognizing patterns
  3. Learn: education on nervous system and emotions
- Personalization rationale: first trial round showed post-operational guys (desk jobs, feeling fine) didn’t know why they were in the regulate section
- Each pathway targets a distinct win:
  - Regulate: “I felt my nervous system shift, stressed to calm”
  - Understand: “I went from confusion to clarity, stuck to flow”
  - Learn: “I learned something that gives me an edge”
### First Win Design
- Speed to first win is the priority: hook users before they question whether to delete the app
- Regulate pathway win: a simple grounding or breathing exercise, not a full nervous system explainer
  - Headspace model: immediate breathe-in/breathe-out creates instant body awareness
  - Alternate nostril breathing noted as a good candidate (balances up and down regulation)
  - Body-unaware users need a guided post-exercise check-in to notice the shift
    - Walk them step by step: breathing slower? More comfortable? Then yes, you shifted
  - Onboarding exercise can differ from regular app content; “cheat it” slightly for speed
- Understand pathway win: onboarding with Sai (AI coach)
  - Skip the full life-story onboarding; offer quick-link prompts instead
    - e.g. “Resolve issue with my boss,” “Understand this pattern,” “Feel less stressed”
  - User clicks a prompt, Sai responds, they’re in immediately
- Learn pathway win: a data point or research finding that signals competitive advantage
  - e.g. breathwork and HRV research, nervous system regulation and sports performance
### Visual Identity and First Screen
- Color direction: black background, gold text, RM logo
- Tagline territory: functionality and longevity, not nervous system jargon
  - “Become the most functional for the longest amount of time”
  - “Become the most functional individual, be part of the most functional team”
- Opening animation idea: human outline filling with red (stress), then releasing
  - Shows the consequence of not releasing, then the relief of doing so
- Branding process starting now; exact wording easy to iterate
### Onboarding Time Budget
- Total journey from email to end of onboarding: \~15 minutes max
  - \~3 min intro video (existing user video, tweaked for this group)
  - \~1 min to read email
  - \~1 min to download and open app
  - \~5 min for sign-in and account setup (varies by tech savviness)
  - \~5 min from RM logo to end of onboarding
- App tour: offer on home screen after onboarding, not during it
### Next Steps
- **Map out the three onboarding pathways in detail (Miles)**

  Document each path's flow, screens, and first-win moment so it can be handed to Chris to build.

- **Gather design inspiration for UI style**

  Look at Marvin and similar tools; UI work needs visual references before building begins.

- **Consult on best use of the 5-minute onboarding window**

  Speak to Jim (or others) about how to spend those 5 minutes across the three pathways to guarantee a win.

---

Chat with meeting transcript: [https://notes.granola.ai/t/5e15452f-6958-45d1-88a8-ecd0c6db3301](https://notes.granola.ai/t/5e15452f-6958-45d1-88a8-ecd0c6db3301)
### Transcript
[[speaker]]: Morning.
[[Miles Bloom]]: Morning.
[[speaker]]: Hello?
[[Miles Bloom]]: How are you doing?
[[speaker]]: Yes. Hot.
[[Miles Bloom]]: Yeah?
[[speaker]]: It's been
[[speaker]]: tidying
[[speaker]]: Everest sized pile of clothes.
[[speaker]]: I haven't been
[[speaker]]: dealt with for a few days.
[[Miles Bloom]]: Yeah. I imagine with kids, it's probably hard
[[Miles Bloom]]: to keep the place clean.
[[speaker]]: Gets pretty quick. Gets builds pretty fast. Let's just say that.
[[Miles Bloom]]: Just
[[speaker]]: Ah, okay.
[[Miles Bloom]]: wanna join?
[[speaker]]: Chris.
[[speaker]]: I forgot Chris is joining us. Let me just send this to him.
[[speaker]]: Very good.
[[speaker]]: How's the temperature in York?
[[Miles Bloom]]: It's
[[Miles Bloom]]: hot sometimes. I don't think it's as hot as down south.
[[speaker]]: Because right now,
[[speaker]]: actually because I've moved been moving around
[[speaker]]: Yes.
[[Miles Bloom]]: So it says, like, 22 here.
[[speaker]]: Yeah. It's already 27 here.
[[Miles Bloom]]: Yeah. That's a big difference.
[[speaker]]: Going to hit 34.
[[Miles Bloom]]: That's really hot.
[[speaker]]: By
[[Miles Bloom]]: Yeah. Like it might hit 30.
[[Miles Bloom]]: For us.
[[Miles Bloom]]: Yeah.
[[speaker]]: Toasty.
[[speaker]]: Toasty toasty.
[[speaker]]: So
[[speaker]]: Chris is gonna come in.
[[Miles Bloom]]: Mhmm.
[[speaker]]: Do you do you want to, like, show me stuff that you found from that
[[speaker]]: website that you showed me yesterday, or do you wanna or should we start with what you'd built before?
[[speaker]]: That's
[[Miles Bloom]]: I wanna show you this.
[[Miles Bloom]]: It just
[[speaker]]: Allows.
[[Miles Bloom]]: Let me just
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So this is my my notes on onboarding best
[[Miles Bloom]]: practices.
[[Miles Bloom]]: Basically, those I I watched a couple of videos, and this was the best
[[Miles Bloom]]: one I've had.
[[Miles Bloom]]: Had.
[[speaker]]: No. That user
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So essentially, the goal is
[[Miles Bloom]]: to get, like, to get them to their first win as quickly as possible.
[[Miles Bloom]]: So, like, if you think about
[[Miles Bloom]]: let me bring up
[[Miles Bloom]]: So, like, Headspace does this really well.
[[Miles Bloom]]: Which is
[[Miles Bloom]]: so, essentially, like, soon as you get in, they're, like, breathing
[[Miles Bloom]]: breathe out,
[[Miles Bloom]]: Is it like there's just that little feeling that you get?
[[Miles Bloom]]: Of like
[[Miles Bloom]]: doing something instantly
[[Miles Bloom]]: invited into something.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And then after that, I don't think it's so good. Like, mean, there's
[[Miles Bloom]]: you know, all the normal stuff like filling in your details.
[[Miles Bloom]]: And then
[[Miles Bloom]]: there's a essentially,
[[Miles Bloom]]: what I also think is important is this bit at the end.
[[Miles Bloom]]: Which is like what
[[Miles Bloom]]: what's your goals
[[Miles Bloom]]: in terms of the the app? Like, what is it that you're trying to get out of it?
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So I think so, like, my my version of
[[Miles Bloom]]: of figuring out my user
[[Miles Bloom]]: went, like this.
[[Miles Bloom]]: So the I I went through and made a bunch of different categories.
[[Miles Bloom]]: About
[[Miles Bloom]]: like, you know, all sorts of different things.
[[Miles Bloom]]: I I also found, like, it was helpful to have it as
[[Miles Bloom]]: like archetypal rather than just Right. Names.
[[Miles Bloom]]: Because it's easier to think about.
[[Miles Bloom]]: And so I I I would suggest that this is what we do first.
[[Miles Bloom]]: Is we think about
[[Miles Bloom]]: in terms of
[[Miles Bloom]]: like, I like I I because the the first POC is with special forces.
[[Miles Bloom]]: Yeah. So I think that the first
[[Miles Bloom]]: user type compression focus first. Yeah.
[[Miles Bloom]]: And so then there's a question of, like, what they want,
[[Miles Bloom]]: And so, where is it?
[[Miles Bloom]]: Yeah. So, like, understand like, who who they are, what
[[Miles Bloom]]: like what who who they who we want, who we don't want, what's their like
[[Miles Bloom]]: technical ability, how much
[[Miles Bloom]]: flexibility will they want, how much will they know,
[[Miles Bloom]]: stuff like that.
[[Miles Bloom]]: So I was just we, like, made make a document
[[Miles Bloom]]: Right?
[[Miles Bloom]]: Writing that down.
[[Miles Bloom]]: And then we Cool. Work backwards from that.
[[Miles Bloom]]: Yeah. Great. Let's do that.
[[Miles Bloom]]: Cool.
[[Miles Bloom]]: So special
[[Miles Bloom]]: forces user time.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So
[[Miles Bloom]]: in terms of let let's take the, like,
[[Miles Bloom]]: how much they might know about
[[Miles Bloom]]: psychology and different parts of the nervous system and stuff.
[[Miles Bloom]]: What what would you think that is?
[[Miles Bloom]]: And, like, what would be the Nothing.
[[Miles Bloom]]: Different types. Okay.
[[Miles Bloom]]: So knowledge,
[[Miles Bloom]]: begin a
[[speaker]]: If if you don't mind, before we
[[Miles Bloom]]: like
[[speaker]]: like,
[[speaker]]: I think before we talk about knowledge of nervous system, let's focus on what we do know about them.
[[Miles Bloom]]: Okay.
[[speaker]]: And
[[speaker]]: because what we do know about them is that they are
[[speaker]]: driven to be the best.
[[speaker]]: At an insane
[[Miles Bloom]]: Yeah. You don't get more insane then.
[[speaker]]: level.
[[speaker]]: Like,
[[speaker]]: you don't get more alpha than this.
[[Miles Bloom]]: Yeah.
[[speaker]]: And so in terms of archetype, these are the heroes.
[[Miles Bloom]]: Right.
[[speaker]]: And so these are people who
[[speaker]]: they're looking for every potential competitive advantage that they
[[speaker]]: can garner.
[[speaker]]: Will it make me stronger? Will it make me faster? Will
[[speaker]]: it make me better?
[[speaker]]: Etcetera.
[[speaker]]: Last longer.
[[Miles Bloom]]: Micros
[[speaker]]: So
[[speaker]]: morning, Chris. Welcome.
[[speaker]]: Hey.
[[speaker]]: So when we initially
[[speaker]]: were talking with them about
[[speaker]]: having an app that was designed for trauma healing. They were not interested.
[[speaker]]: But as soon as we
[[speaker]]: flipped it
[[speaker]]: flipped the idea around, so this is gonna help build resilience,
[[speaker]]: make you stronger, make you more bulletproof, long emotionally bulletproof.
[[speaker]]: They were all on board. They're like, oh, tell me. How does this work?
[[speaker]]: How do
[[speaker]]: how do I how do I use this?
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: Right.
[[speaker]]: So
[[speaker]]: just because Chris is here now,
[[speaker]]: Chris, we we we were just starting to look at
[[speaker]]: the the
[[speaker]]: the user. But
[[speaker]]: I'm not sure if
[[speaker]]: your time is best used, Chris,
[[speaker]]: diving in with us on
[[speaker]]: all the characteristics of the user for the workflow for the onboarding process.
[[speaker]]: I think
[[speaker]]: and correct me if I'm wrong. You might be look
[[speaker]]: here because you're into that. But I think that you're
[[speaker]]: idea of you being here this morning was to kind of guide us
[[speaker]]: into how to use the design document.
[[speaker]]: I mean, to be to be honest,
[[speaker]]: if you can just prepare text
[[speaker]]: that describes all the detail that you want because
[[speaker]]: gonna need to have that anyway to say to the AI.
[[speaker]]: Yeah.
[[speaker]]: Like you got you basically can't really you you wanna leave as little up to
[[speaker]]: imagination as possible in in a written form.
[[speaker]]: So maybe you could just, like, get to that point of having the written thing
[[speaker]]: and then let me know. And then I can, like, make sure it runs well.
[[Miles Bloom]]: That's that's good with me.
[[speaker]]: Okay.
[[speaker]]: Yeah.
[[speaker]]: I I mean, I think I'm I think it will.
[[speaker]]: But that will save your time. And if there's something does go wrong, it means I fix it in my own time. So
[[speaker]]: Okay.
[[speaker]]: Okay. So we'll just carry on with this and prepare this, and then
[[speaker]]: then we can set up another meeting.
[[speaker]]: Or we just hand it over to you for you to do.
[[speaker]]: Yeah. Yeah. Yeah. That's fine. Yeah.
[[speaker]]: Okay. But long long term, I think we still need to
[[speaker]]: do what I thought we were gonna do, which was
[[speaker]]: Intuitive iteratively ask it to do things.
[[speaker]]: Well,
[[speaker]]: Miles and I to know how to use that document so that we can be
[[speaker]]: updating things in a different way. No. That's fine.
[[speaker]]: Legit. Well, I'm just saying,
[[speaker]]: yeah. That's fine. I mean, we can also do that. That's fine. It's just I guess I guess, why not why not
[[speaker]]: prepare as much
[[Miles Bloom]]: At a time.
[[speaker]]: text as you can?
[[Miles Bloom]]: Just so we come to the end. We don't have to think
[[Miles Bloom]]: too much about it.
[[Miles Bloom]]: Mhmm. Yeah.
[[Miles Bloom]]: I think from my side, I definitely
[[Miles Bloom]]: Austin better at
[[Miles Bloom]]: creating not just in text, but creating with images.
[[Miles Bloom]]: Yeah. Right.
[[Miles Bloom]]: So not not totally sure.
[[Miles Bloom]]: But I'm happy to try that. So Miles and I can just crash on with Ah, okay. So
[[Miles Bloom]]: because not normally, I'd be like, oh, I think, you know, I think, you know, a big
[[Miles Bloom]]: button here and this there, and then I'd do it, but I know that looks shit. Let's redo this.
[[Miles Bloom]]: And and I'll move it around to work out what the Yeah. Yeah. Yeah.
[[Miles Bloom]]: Yeah. You can so the idea would be that you just do that by telling the AI to do those
[[Miles Bloom]]: changes and steps. And and we can add voice as well, you can voice
[[Miles Bloom]]: you know, you can voice talk to to do it.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So it should be okay.
[[Miles Bloom]]: Chris, have you got an AI that can come and clean my house for me?
[[Miles Bloom]]: Is that sort of the bullshit.
[[Miles Bloom]]: So that was the next step.
[[Miles Bloom]]: Cool. Okay, guys. Alright. Well, let me know when you get on, and we'll catch up in a
[[Miles Bloom]]: bit. Alright.
[[Miles Bloom]]: Cheers. Bye. Cheers, buddy. Bye.
[[Miles Bloom]]: So let's carry on where we were then. I think that was good.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: By the way, Miles, how long have you got this morning?
[[Miles Bloom]]: I have, like, an hour.
[[Miles Bloom]]: Okay. Good. Same as me. I've gotten to the eleventh. So
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So
[[Miles Bloom]]: Yeah. So, I they'll they'll know some base coming back to
[[Miles Bloom]]: yeah. So we're dealing with heroes.
[[Miles Bloom]]: Mhmm. We're dealing with people that are just looking, how can I be stronger, faster, better?
[[Miles Bloom]]: They're very driven to, like, be the best. They're very
[[Miles Bloom]]: driven to help
[[Miles Bloom]]: very humble. They're very funny.
[[Miles Bloom]]: Right. So in in my head,
[[Miles Bloom]]: when you say things like that,
[[Miles Bloom]]: I think about onboarding,
[[Miles Bloom]]: I think about like the
[[Miles Bloom]]: we want data
[[Miles Bloom]]: in the onboarding that's, like,
[[Miles Bloom]]: oh, we can
[[Miles Bloom]]: you know, people who regulate their nervous system do this
[[Miles Bloom]]: much better in
[[Miles Bloom]]: sports or stuff like that.
[[Miles Bloom]]: And then we can show them, like, you know,
[[Miles Bloom]]: oh, people who
[[Miles Bloom]]: like I know there's a bunch of research into different, like, breath work and how it relates
[[Miles Bloom]]: to HIV.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So, like, stuff like that. That's what that's what I think that, like, they'd wanna
[[Miles Bloom]]: see as, like,
[[Miles Bloom]]: pretty quickly is, like, this is gonna make you this much better.
[[Miles Bloom]]: Yeah. That's good.
[[Miles Bloom]]: And I think I think
[[Miles Bloom]]: I mean, I think if we also think about what our long term goal is with this,
[[Miles Bloom]]: And when we spoke to some of the some of the actual guys, like,
[[Miles Bloom]]: you know, the actual SAS members,
[[Miles Bloom]]: One of the images that hit them was, like, the spring. You know, we're talking about holding our
[[Miles Bloom]]: allostatic load. Mhmm. And this idea that
[[Miles Bloom]]: you know,
[[Miles Bloom]]: we can pull that spring, and you can hold you know, you can pull it, and you can pull it
[[Miles Bloom]]: and you can pull it. You got so much you can hold.
[[Miles Bloom]]: But if you pull at some point too much Yeah. That spring is gonna break. It's gonna lose
[[Miles Bloom]]: its form.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so there has to be recoil. There has to be a return.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: And they really connected with that image.
[[Miles Bloom]]: So some you know, just wondering about the imagery.
[[Miles Bloom]]: Whether that's draining the bucket
[[Miles Bloom]]: making the bucket bigger.
[[Miles Bloom]]: Allowing the spring to return. These are kind of
[[Miles Bloom]]: images to bear in mind.
[[Miles Bloom]]: I'm not saying that what you suggested isn't like, I agree. I think that's a great idea.
[[Miles Bloom]]: I'm just thinking about the meetings that I had with them in which
[[Miles Bloom]]: things really suddenly landed. Like,
[[Miles Bloom]]: the images landed with them.
[[Miles Bloom]]: Right. Whether or not we use that as separate,
[[Miles Bloom]]: Yeah. Because
[[Miles Bloom]]: like,
[[Miles Bloom]]: if you think about in terms of, like, you want, like, lasting
[[Miles Bloom]]: like, quick deep impressions.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so like something like
[[Miles Bloom]]: you know, if if if it was like, let's say, a nice animation
[[Miles Bloom]]: of someone whose, like, bucket is constantly overflowing,
[[Miles Bloom]]: and then the bucket expands and then it fills up and drains.
[[Miles Bloom]]: Something like that.
[[Miles Bloom]]: On, like, the first or second screen.
[[Miles Bloom]]: I think that that would be great.
[[Miles Bloom]]: Right. I mean, yeah, you could do it
[[Miles Bloom]]: I'm I'm just imagining it rather than being a bucket. You could almost have, like, a
[[Miles Bloom]]: a an outline of a human being filling up with red.
[[Miles Bloom]]: Something like that, like, as it talks about stress.
[[Miles Bloom]]: It's like if you don't know how to release it and you and then show it being released,
[[Miles Bloom]]: at some point, you're gonna explode, and we can have we can actually have
[[Miles Bloom]]: the man explode or something similar to that.
[[Miles Bloom]]: And then, like, it could be like a, you know, here's how you
[[Miles Bloom]]: how you release the pressure.
[[Miles Bloom]]: Exactly.
[[Miles Bloom]]: Exactly.
[[Miles Bloom]]: Because the long the long term goal here is
[[Miles Bloom]]: how do we make sure
[[Miles Bloom]]: how do we make sure that people that are coming into this
[[Miles Bloom]]: which is
[[Miles Bloom]]: the most
[[Miles Bloom]]: elite
[[Miles Bloom]]: team
[[Miles Bloom]]: of
[[Miles Bloom]]: violent logistics
[[Miles Bloom]]: in the world
[[Miles Bloom]]: which as they describe themselves Violent logistics is a crazy term.
[[Miles Bloom]]: Right?
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: I think and I think they call it we're an elite team. We're an elite logistical
[[Miles Bloom]]: team.
[[Miles Bloom]]: With the use of lethal violence.
[[Miles Bloom]]: Something like that.
[[Miles Bloom]]: Like, if you're bringing like, you're you're you're bringing people in, you're telling them about
[[Miles Bloom]]: this is gonna like, the most hardcore thing. We're gonna push you so hard
[[Miles Bloom]]: And, like, 99% of you are gonna fail,
[[Miles Bloom]]: the 1% of you that get through
[[Miles Bloom]]: gonna end up totally fucked and broken.
[[Miles Bloom]]: It'll be good.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Like,
[[Miles Bloom]]: we have to make sure that the 1% that gets in
[[Miles Bloom]]: gets through and out the other end
[[Miles Bloom]]: on form still.
[[Miles Bloom]]: So this is, like,
[[Miles Bloom]]: making sure that that hero
[[Miles Bloom]]: gets through that
[[Miles Bloom]]: movie and out the other side into the into the next part of it.
[[Miles Bloom]]: That's the long term. That's, I mean, that's the overall goal of our rep.
[[Miles Bloom]]: How do we get people through
[[Miles Bloom]]: their
[[Miles Bloom]]: ten, twenty years of service?
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: And so so so that's the so that's that's the goal this.
[[Miles Bloom]]: In those initial things
[[Miles Bloom]]: be like,
[[Miles Bloom]]: if you do if you follow this,
[[Miles Bloom]]: you're gonna come out the other end.
[[Miles Bloom]]: Like,
[[Miles Bloom]]: Right. So if if we think about
[[Miles Bloom]]: what counts as their wins,
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Because I feel like we've got a good understanding of who they are.
[[Miles Bloom]]: And so now, like,
[[Miles Bloom]]: we have what a win looks like for them.
[[Miles Bloom]]: What are you thinking?
[[Miles Bloom]]: Like, in terms of a concrete time frame.
[[Miles Bloom]]: Sorry?
[[Miles Bloom]]: Like on a concrete level, it's like we wanna get
[[Miles Bloom]]: so like if you think about like
[[Miles Bloom]]: know, a video game,
[[Miles Bloom]]: like, your first win is, you know, you win your first battle.
[[Miles Bloom]]: Right. So so that that that that's the level that we're talking on. When
[[Miles Bloom]]: winds look like
[[Miles Bloom]]: I will I
[[Miles Bloom]]: I was able to do an exercise, and I was unable to sleep.
[[Miles Bloom]]: Was able to do
[[Miles Bloom]]: an exercise.
[[Miles Bloom]]: I was able to sleep.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So that's that that that's a bit more long term. If if we think about, like,
[[Miles Bloom]]: the fastest win we can get them, is it something like
[[Miles Bloom]]: I was able to feel my nervous system change?
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: I
[[Miles Bloom]]: I've gone from stress to calm.
[[Miles Bloom]]: Right. That was one win.
[[Miles Bloom]]: I'm trying
[[Miles Bloom]]: Right. Because I I think
[[Miles Bloom]]: yeah.
[[Miles Bloom]]: Or I've gone from confusion to clarity.
[[Miles Bloom]]: Or just confusion to clarity.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: So from sync to to flow.
[[Miles Bloom]]: Like, the winds are
[[Miles Bloom]]: I was feeling
[[Miles Bloom]]: stressed
[[Miles Bloom]]: tense,
[[Miles Bloom]]: tight, pain, etcetera?
[[Miles Bloom]]: I'm now feeling calm, centered, relaxed.
[[Miles Bloom]]: Etcetera.
[[Miles Bloom]]: And
[[Miles Bloom]]: I was feeling stuck.
[[Miles Bloom]]: With x, y, and zed, and now I'm feeling unstuck.
[[Miles Bloom]]: So to me, we've got, like, the regulate section, which is bringing, like, stress to calm.
[[Miles Bloom]]: And we've got the side section that's bringing confusion to clarity.
[[Miles Bloom]]: Those are the kind of two the two pathways, both of which are
[[Miles Bloom]]: looking to bring us from fixity to flow.
[[Miles Bloom]]: Whether that's in the more in the more physical or the momentum.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So in terms of wins, I imagine that
[[Miles Bloom]]: if we want that we want them to
[[Miles Bloom]]: have two wins, we want them to have
[[Miles Bloom]]: a nervous system win
[[Miles Bloom]]: and then an AI win.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And and, I mean, as of here's another win we could give them.
[[Miles Bloom]]: Because
[[Miles Bloom]]: you know, Jim said that we love learning.
[[Miles Bloom]]: Anything we can learn that makes us feel like it might give us an advantage is a win.
[[Miles Bloom]]: And so Okay. That might be where the learn
[[Miles Bloom]]: learning something new comes in.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So there's
[[Miles Bloom]]: so, again, that's that's leaning into the learn section. So there are three potential wins there.
[[Miles Bloom]]: I feel better
[[Miles Bloom]]: I'm thinking more clearly, and I've learned something new.
[[Miles Bloom]]: Are all three clear wins here?
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: And, I mean, if we were to bring in your
[[Miles Bloom]]: something like something of what you're you've been proposing, then
[[Miles Bloom]]: then I'm starting to master my
[[Miles Bloom]]: inner
[[Miles Bloom]]: self knowledge. It would be a whole new level, but I think let's start with what
[[Miles Bloom]]: Right. Yeah. So for for
[[Miles Bloom]]: yeah. That's that's
[[Miles Bloom]]: that's that's a different different level.
[[Miles Bloom]]: Because we can we can iterate this as we go on. Right?
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Okay. So if we think about
[[Miles Bloom]]: I think that the fastest win they could get
[[Miles Bloom]]: would be on a regulation level.
[[Miles Bloom]]: Or or or an education level.
[[Miles Bloom]]: Depends who it is.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: Say more.
[[Miles Bloom]]: Well, somebody that's just feeling in general
[[Miles Bloom]]: like, we had this issue. We had
[[Miles Bloom]]: in the first round of trials that we did,
[[Miles Bloom]]: We had a bunch of guys that were postoperational.
[[Miles Bloom]]: Basically just had office jobs now,
[[Miles Bloom]]: They started using the app and and these and when it was only the regulate section,
[[Miles Bloom]]: Mhmm. And they were like, I'm going in, but I don't know why I'm here because I feel fine.
[[Miles Bloom]]: Right. So this this is super cool. So we can have
[[Miles Bloom]]: like
[[Miles Bloom]]: a question thing
[[Miles Bloom]]: that's like
[[Miles Bloom]]: do you feel like you need nervous system regulation
[[Miles Bloom]]: education,
[[Miles Bloom]]: like you'd benefit the most from any of these three and then the onboarding
[[Miles Bloom]]: would go differently for each one.
[[Miles Bloom]]: Fantastic.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Perfect.
[[Miles Bloom]]: Yeah. So
[[Miles Bloom]]: question of what's
[[Miles Bloom]]: your main goal.
[[Miles Bloom]]: And then we have three, so it's like
[[Miles Bloom]]: And I I think we can put it in these terms.
[[Miles Bloom]]: It's like there's confusion to clarity, which is on the level of intellect.
[[Miles Bloom]]: There's, like,
[[Miles Bloom]]: well, that's this is on the level of, like, understanding, I guess. Yeah. Yeah. Yeah. Yeah.
[[Miles Bloom]]: And then there's, like, nervous system win.
[[Miles Bloom]]: Regulate,
[[Miles Bloom]]: emotions
[[Miles Bloom]]: and then there's learn something new.
[[Miles Bloom]]: Okay. So so if we say
[[Miles Bloom]]: so in my head, I'm picturing, like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: there's a welcome to RM screen,
[[Miles Bloom]]: and then
[[Miles Bloom]]: you know,
[[Miles Bloom]]: signing and stuff is whatever.
[[Miles Bloom]]: And then there's
[[Miles Bloom]]: what's your main goal?
[[Miles Bloom]]: Is it
[[Miles Bloom]]: to understand the patterns of your life?
[[Miles Bloom]]: To
[[Miles Bloom]]: regulate your emotions in the present,
[[Miles Bloom]]: or to learn about how
[[Miles Bloom]]: your, nervous system and emotions work.
[[Miles Bloom]]: Does that does that sound good?
[[Miles Bloom]]: Yep. That was sounds good.
[[Miles Bloom]]: Just reminding me of the gonna go and have a look for
[[Miles Bloom]]: the original onboarding thing that I've done because
[[Miles Bloom]]: I can't even remember what we put in it, but a lot of that suddenly resonated
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: I think that's it's on the linear.
[[Miles Bloom]]: I'm just opening up in Figma.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Yeah. No. It's covering the same stuff, but it's it's way better what we're
[[Miles Bloom]]: thinking through right now.
[[Miles Bloom]]: It's way more personalized thinking it through this way.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so if you think about, like, the first the first screen,
[[Miles Bloom]]: now.
[[Miles Bloom]]: Like when they first arrive,
[[Miles Bloom]]: So like my version of this was, you know,
[[Miles Bloom]]: make hours, make months worth of meditation in hours.
[[Miles Bloom]]: Just like name, tagline, and then continue.
[[Miles Bloom]]: Maybe I'll add a graphic or something.
[[Miles Bloom]]: What's what's RM's version of that?
[[Miles Bloom]]: Sorry. I quite
[[Miles Bloom]]: I'm not I'm not quite sure what we're looking for. So the
[[Miles Bloom]]: so somebody says
[[Miles Bloom]]: like, yeah, confusion to clarity as an example.
[[Miles Bloom]]: So, like like like like this. Right? This is wait. Can you, resume?
[[Miles Bloom]]: Second.
[[Miles Bloom]]: So, like, this is when they first get
[[Miles Bloom]]: this this is the first thing that someone will see
[[Miles Bloom]]: when they get to
[[Miles Bloom]]: to Meditation Pro.
[[Miles Bloom]]: Right? Right.
[[Miles Bloom]]: And so this is this is their first time they see anything about
[[Miles Bloom]]: what we are.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: What's what do you want RMs first thing to be?
[[Miles Bloom]]: Like, what's the what's just on a
[[Miles Bloom]]: like, a descriptive level,
[[Miles Bloom]]: what's the first thing that you want them to
[[Miles Bloom]]: get hit with?
[[Miles Bloom]]: I mean, the words that in my head
[[Miles Bloom]]: I have
[[Miles Bloom]]: are about development and about resilience.
[[Miles Bloom]]: Like so I'm not sure but I'm not sure if it's, like, become the most
[[Miles Bloom]]: resilient you can be.
[[Miles Bloom]]: If it's
[[Miles Bloom]]: Something like, you know, make every
[[Miles Bloom]]: every part of you
[[Miles Bloom]]: every part of you keeps growing.
[[Miles Bloom]]: These are not well put together wording, but
[[Miles Bloom]]: just starting to get the ideas out.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So so if we think about
[[Miles Bloom]]: so so the the colors that you were suggesting was, like,
[[Miles Bloom]]: we want like a black and gold. Right?
[[Miles Bloom]]: That's what we've been playing with so far. Yeah.
[[Miles Bloom]]: The idea of, like, going for excellence.
[[Miles Bloom]]: Like,
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So, like,
[[Miles Bloom]]: if we if you have, like,
[[Miles Bloom]]: you know, the RM logo with
[[Miles Bloom]]: black backgrounds, gold text,
[[Miles Bloom]]: and then something like
[[Miles Bloom]]: you know, motivational and about how
[[Miles Bloom]]: you're gonna train
[[Miles Bloom]]: your
[[Miles Bloom]]: very nervous system
[[Miles Bloom]]: to be an asset for the team.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: That's what I I think about.
[[Miles Bloom]]: Yep.
[[Miles Bloom]]: There's some
[[Miles Bloom]]: there's something that's true about that.
[[Miles Bloom]]: I'm a I'm a bit
[[Miles Bloom]]: wary of even talking too much about nervous
[[Miles Bloom]]: system and coming out of, like, whole person focus.
[[Miles Bloom]]: Because they don't really give a fuck about nervous system.
[[Miles Bloom]]: They just wanna be
[[Miles Bloom]]: they wanna be functional. So
[[Miles Bloom]]: that that might be it, actually. It's like
[[Miles Bloom]]: it's something about how to become
[[Miles Bloom]]: the most functional
[[Miles Bloom]]: for the longest amount of time.
[[Miles Bloom]]: Like, that's what we're looking for because these people are highly functional,
[[Miles Bloom]]: but
[[Miles Bloom]]: they get thrown into such difficult situations that they become dysfunctional.
[[Miles Bloom]]: Or there's or there's a there's an overall buildup of stress that leads to that dysfunction.
[[Miles Bloom]]: And so So what about, like, something like
[[Miles Bloom]]: you know,
[[Miles Bloom]]: learn how to be your best
[[Miles Bloom]]: for the future.
[[Miles Bloom]]: Or something like that or like
[[Miles Bloom]]: Right. Something like that.
[[Miles Bloom]]: But without it sounding like it's Spy as a Tiger.
[[Miles Bloom]]: Yeah. You know? That's that's that's the direction.
[[Miles Bloom]]: It's it's
[[Miles Bloom]]: so so the comp
[[Miles Bloom]]: become the most functional individual
[[Miles Bloom]]: be part of the most functional teams,
[[Miles Bloom]]: It's along these lines
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So
[[Miles Bloom]]: And this is partly why we're starting the branding process now.
[[Miles Bloom]]: Right. Because because we we don't need to get this wording
[[Miles Bloom]]: Like, this is very much easy to change. Like,
[[Miles Bloom]]: if we just get the general structures, you can just Yeah. Yeah. Yeah. But it's
[[Miles Bloom]]: along those lines.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: So, like, if
[[Miles Bloom]]: we think about, like, first screen,
[[Miles Bloom]]: what I'm thinking is, like, you know,
[[Miles Bloom]]: Resilientmindsmatters,
[[Miles Bloom]]: and then
[[Miles Bloom]]: you know, functional tagline,
[[Miles Bloom]]: and that's that's it. Maybe some graphics.
[[Miles Bloom]]: Is it Yeah.
[[Miles Bloom]]: Does that sound to you?
[[Miles Bloom]]: Do you want more or less?
[[Miles Bloom]]: That's after what we've just been through.
[[Miles Bloom]]: Or before. So the the that's like
[[Miles Bloom]]: so the the functional tagline would be some version of this.
[[Miles Bloom]]: Right. But I what I'm curious about is if we just
[[Miles Bloom]]: stopped now
[[Miles Bloom]]: the process of understanding the people
[[Miles Bloom]]: because we started with the people, then we started asking what a win is.
[[Miles Bloom]]: Now are we are we looking at
[[Miles Bloom]]: what the actual pictures are as they show up?
[[Miles Bloom]]: Or the actual images
[[Miles Bloom]]: Well, I I I wanted to just do a bit of it.
[[Miles Bloom]]: To grounds
[[Miles Bloom]]: the way that we're thinking in
[[Miles Bloom]]: Yeah. The
[[Miles Bloom]]: like, I'm I'm
[[Miles Bloom]]: like, if if you
[[Miles Bloom]]: I I think we can go back and forth a bit, but it it felt like we were getting a bit abstract.
[[Miles Bloom]]: Yeah. Yeah. Yeah. That's great.
[[Miles Bloom]]: So, yeah, I imagine
[[Miles Bloom]]: the
[[Miles Bloom]]: the brain, the mark, the words,
[[Miles Bloom]]: and absolutely
[[Miles Bloom]]: a tagline of some of some description is great.
[[Miles Bloom]]: This is a very stupid way to be doing this. I just really
[[Miles Bloom]]: I don't know if it's
[[Miles Bloom]]: like,
[[Miles Bloom]]: maybe Figma would be better or something, but that
[[Miles Bloom]]: it
[[Miles Bloom]]: might take more time.
[[Miles Bloom]]: Mean, I've got Figma open right now.
[[Miles Bloom]]: So I can
[[Miles Bloom]]: Do do do you wanna take over? I
[[Miles Bloom]]: well, I can build at the same time that we're talking.
[[Miles Bloom]]: Right. Yeah. I think that might be better.
[[Miles Bloom]]: So we've got RM logo. We've got Resilientmindsmatters.
[[Miles Bloom]]: And we've got a
[[Miles Bloom]]: like,
[[Miles Bloom]]: a functional
[[Miles Bloom]]: you want me to share, or should I just carry on here? Yeah. That would be good.
[[Miles Bloom]]: We've got a functional tagline or some description.
[[Miles Bloom]]: So I've just opened it up in the old ones. There's
[[Miles Bloom]]: for those.
[[Miles Bloom]]: Stuff there. So they're literally just the first page here.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Is that single or a minute after a second? Otherwise, it's gonna
[[Miles Bloom]]: we're gonna be
[[Miles Bloom]]: so
[[Miles Bloom]]: So yeah. Yeah.
[[Miles Bloom]]: That's that's much more sensible than trying to type it.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: And so
[[Miles Bloom]]: Okay. So so that that that's where they arrive.
[[Miles Bloom]]: Right? And so
[[Miles Bloom]]: like, what what I was thinking in terms of process
[[Miles Bloom]]: is just when we get that initial impression
[[Miles Bloom]]: of sort of the game that we're playing.
[[Miles Bloom]]: And then we go back to what we were talking about with user types and wins.
[[Miles Bloom]]: Is that I think
[[Miles Bloom]]: The game we're playing.
[[Miles Bloom]]: Yeah. Like, the the very like, because it's
[[Miles Bloom]]: I I because I found that it's, like, it's
[[Miles Bloom]]: when you start thinking about, like, who your users are and stuff,
[[Miles Bloom]]: it it's easy for it to become, like, very abstract very quickly.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: And so
[[Miles Bloom]]: if like,
[[Miles Bloom]]: if as we continue to think about user wins and stuff, we ground it in
[[Miles Bloom]]: user wins that we can put in a
[[Miles Bloom]]: you know, clickable process
[[Miles Bloom]]: that they
[[Miles Bloom]]: will be able to get to
[[Miles Bloom]]: as they get to the app. That's that's that's the the name of the game, I think.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So when you say the game we're playing,
[[Miles Bloom]]: is this that we want a second
[[Miles Bloom]]: page here that just says something like,
[[Miles Bloom]]: nervous system regulation and developmental coaching?
[[Miles Bloom]]: Or or or imagery for that or
[[Miles Bloom]]: By by game we're playing, I I I meant more like
[[Miles Bloom]]: what you and I are doing.
[[Miles Bloom]]: Like, in in terms of this
[[Miles Bloom]]: the the the session.
[[Miles Bloom]]: One second. I'm just gonna hit turn on my fan because I'm
[[Miles Bloom]]: melting.
[[Miles Bloom]]: You just got somebody there who just shouts their name and says how good you are.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So in terms of
[[Miles Bloom]]: so in in terms of the winds that we we we were talking about. Right?
[[Miles Bloom]]: Not sorry. In terms of the
[[Miles Bloom]]: not the winds. The
[[Miles Bloom]]: the question about your main goal.
[[Miles Bloom]]: I think that should be
[[Miles Bloom]]: one of the next slides. Like, we can also figure out the ordering and stuff as we go.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So
[[Miles Bloom]]: just actually create
[[Miles Bloom]]: create the slides, work out the order second.
[[Miles Bloom]]: Yeah. That's that's why I was I mean, it it like,
[[Miles Bloom]]: it depends on on your process and
[[Miles Bloom]]: what works for you.
[[Miles Bloom]]: I'm
[[Miles Bloom]]: I'm
[[Miles Bloom]]: I think it's good to
[[Miles Bloom]]: create
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: It's good to edit separately.
[[Miles Bloom]]: So that's my only input sort of there. So I don't mind if we're creating or editing, but
[[Miles Bloom]]: I can't do the two things at the same time.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Because I'm sharing this so that I have all of my normal
[[Miles Bloom]]: things visible.
[[Miles Bloom]]: Covered my
[[Miles Bloom]]: tuba.
[[Miles Bloom]]: So
[[Miles Bloom]]: What's your goal today?
[[Miles Bloom]]: Week with that?
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Or, like,
[[Miles Bloom]]: what would be most
[[Miles Bloom]]: what would be most valuable?
[[Miles Bloom]]: Not today, though.
[[Miles Bloom]]: Well, so so the the onboarding is is trying to do two things.
[[Miles Bloom]]: It's trying to
[[Miles Bloom]]: figure out how we can get them to their first win.
[[Miles Bloom]]: But also how we can tailor
[[Miles Bloom]]: their app experience generally.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So if if you make it
[[Miles Bloom]]: too much
[[Miles Bloom]]: so it's like a it's a balancing act that we have to
[[Miles Bloom]]: to play.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Yeah. You don't get too foggy to, like,
[[Miles Bloom]]: man.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so the
[[Miles Bloom]]: So then just to kind of list
[[Miles Bloom]]: Yeah. So I can So
[[Miles Bloom]]: I can send you the list.
[[Miles Bloom]]: That I have.
[[Miles Bloom]]: K.
[[Miles Bloom]]: I sent it in Zoom.
[[Miles Bloom]]: Was me going off to
[[Miles Bloom]]: off to
[[Miles Bloom]]: off to WhatsApp.
[[Miles Bloom]]: And I could I could send it on WhatsApp,
[[Miles Bloom]]: It's an insane world we live in.
[[Miles Bloom]]: The amount of
[[Miles Bloom]]: possibilities we have
[[Miles Bloom]]: It's it's crazy.
[[Miles Bloom]]: Communication and
[[Miles Bloom]]: Yeah. That would have been a fax years ago.
[[Miles Bloom]]: Know, I had to send a messenger for
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Right. Exactly.
[[Miles Bloom]]: So
[[Miles Bloom]]: something like that.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so then I well,
[[Miles Bloom]]: the next step to me seems to be
[[Miles Bloom]]: how
[[Miles Bloom]]: we think about
[[Miles Bloom]]: given
[[Miles Bloom]]: each if they choose option a,
[[Miles Bloom]]: what's their first win?
[[Miles Bloom]]: Which might be like
[[Miles Bloom]]: onboarding with Sai.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: And then option b is, you know,
[[Miles Bloom]]: we'll
[[Miles Bloom]]: take them through the nervous system picker
[[Miles Bloom]]: then option three is, you know, we take them into the learn
[[Miles Bloom]]: and explain
[[Miles Bloom]]: you know,
[[Miles Bloom]]: if these courses
[[Miles Bloom]]: are structured in this way, blah blah blah.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Oh, I'm going.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So I got something like
[[Miles Bloom]]: halfway a
[[Miles Bloom]]: And so this is
[[Miles Bloom]]: Unloading with side.
[[Miles Bloom]]: Essentially.
[[Miles Bloom]]: Is that what you think would be the right
[[Miles Bloom]]: way to do that?
[[Miles Bloom]]: I mean, that's
[[Miles Bloom]]: in terms of getting them to the fastest win.
[[Miles Bloom]]: That seems pretty damn quick.
[[Miles Bloom]]: Like, if you've got a logo question, then you're straight into what you've just been told.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: I
[[Miles Bloom]]: I had imagined something that has way more
[[Miles Bloom]]: intro to the apps
[[Miles Bloom]]: first.
[[Miles Bloom]]: But I think that this is actually way smoother.
[[Miles Bloom]]: And the faster you're in, the better.
[[Miles Bloom]]: Yeah. Because
[[Miles Bloom]]: so we could have have the
[[Miles Bloom]]: the tour of the app.
[[Miles Bloom]]: Just available on the home screen? Yeah. Just like when you first get
[[Miles Bloom]]: to the home screen.
[[Miles Bloom]]: It pops up with, like,
[[Miles Bloom]]: hey. Welcome to the home screen. Click here to do a tour of the app.
[[Miles Bloom]]: And then Right. If you have this, it's like that.
[[Miles Bloom]]: They hit that win immediately.
[[Miles Bloom]]: And like, there there'll be some intermediary stuff, like,
[[Miles Bloom]]: there'll be
[[Miles Bloom]]: you know, sign in and
[[Miles Bloom]]: data and
[[Miles Bloom]]: we can have a
[[Miles Bloom]]: a general explainer if you want.
[[Miles Bloom]]: But I I I do think that, like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: as we were talking about the the speed to the win,
[[Miles Bloom]]: is
[[Miles Bloom]]: is what gets people hooked.
[[Miles Bloom]]: Because, like,
[[Miles Bloom]]: no. I I definitely think about, like, when I download an app,
[[Miles Bloom]]: I'm like,
[[Miles Bloom]]: very much thinking, like, is this worth my time?
[[Miles Bloom]]: Is this am I just gonna delete this in thirty seconds?
[[Miles Bloom]]: Right.
[[Miles Bloom]]: What is going on here?
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Yeah. I think that's valid.
[[Miles Bloom]]: I'll give things a try, but I won't last very long with them.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So b
[[Miles Bloom]]: regulation.
[[Miles Bloom]]: And save
[[Miles Bloom]]: lab.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Because because I think as well
[[Miles Bloom]]: one of the things that
[[Miles Bloom]]: I I found out when I was researching onboarding
[[Miles Bloom]]: is that you
[[Miles Bloom]]: actually want your onboarding content
[[Miles Bloom]]: to be kind of
[[Miles Bloom]]: different from your regular content.
[[Miles Bloom]]: Interesting.
[[Miles Bloom]]: In the
[[Miles Bloom]]: it's
[[Miles Bloom]]: you kind of cheat it a little bit.
[[Miles Bloom]]: Right?
[[Miles Bloom]]: And so, like, if I think about
[[Miles Bloom]]: you know,
[[Miles Bloom]]: regulation
[[Miles Bloom]]: I don't know if if we're gonna wanna have to Oh, here it's
[[Miles Bloom]]: you know, the different states that the nervous system could be in
[[Miles Bloom]]: here's this and that.
[[Miles Bloom]]: Like, in in my head, I I can picture, like,
[[Miles Bloom]]: you know, just like three different buttons that's like, do you wanna up regulate
[[Miles Bloom]]: Do you wanna
[[Miles Bloom]]: feel more present?
[[Miles Bloom]]: Do you wanna downregulate?
[[Miles Bloom]]: And then it takes them straight into it rather than
[[Miles Bloom]]: like because ideally, we'd want that more complicated system.
[[Miles Bloom]]: Where
[[Miles Bloom]]: I wonder if we could have
[[Miles Bloom]]: an AI thing in there where they just where they get to say how
[[Miles Bloom]]: they're feeling?
[[Miles Bloom]]: Because otherwise, we're starting
[[Miles Bloom]]: teach people about
[[Miles Bloom]]: the nervous system from the off.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: Like, people that
[[Miles Bloom]]: intuitively understand the regulation thing, it's
[[Miles Bloom]]: something they need to
[[Miles Bloom]]: have it
[[Miles Bloom]]: explained to them. Then then they can use it.
[[Miles Bloom]]: That's a yeah. That's a good point.
[[Miles Bloom]]: And so
[[Miles Bloom]]: I do wonder if that onboarding
[[Miles Bloom]]: like, the regulation one Mhmm.
[[Miles Bloom]]: Whether it just says,
[[Miles Bloom]]: okay. Great.
[[Miles Bloom]]: How are you feeling right now?
[[Miles Bloom]]: And people say, oh, you know, whatever they say, look.
[[Miles Bloom]]: Feeling shitty,
[[Miles Bloom]]: I was like, okay.
[[Miles Bloom]]: What about emotion picker?
[[Miles Bloom]]: I mean,
[[Miles Bloom]]: that
[[Miles Bloom]]: that has been a constant question in the back of my
[[Miles Bloom]]: not well, not in the back of my mind, right, before.
[[Miles Bloom]]: Should
[[Miles Bloom]]: should the regulate section
[[Miles Bloom]]: either be transformed into
[[Miles Bloom]]: emotion chooser
[[Miles Bloom]]: much like that app,
[[Miles Bloom]]: how we feel,
[[Miles Bloom]]: Mhmm. You see that?
[[Miles Bloom]]: Yeah. Yeah. Yeah.
[[Miles Bloom]]: I think you introduced it to
[[Miles Bloom]]: to to your dad.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Or
[[Miles Bloom]]: should
[[Miles Bloom]]: because
[[Miles Bloom]]: Or or keeping what we've actually got or even having, like, changeable
[[Miles Bloom]]: or or that if you click on, like,
[[Miles Bloom]]: fight flight, then it opens up all of the
[[Miles Bloom]]: all of the emotions that tend to be associated with fight flight.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Because because I'm picturing
[[Miles Bloom]]: like, if if I'm someone that's not so
[[Miles Bloom]]: emotional,
[[Miles Bloom]]: and it's asked like, how are you feeling?
[[Miles Bloom]]: Like, my response is just gonna be, yeah. Good.
[[Miles Bloom]]: Exactly.
[[Miles Bloom]]: So I mean and that's when we started getting into, like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: f levels in terms of body awareness.
[[Miles Bloom]]: You know?
[[Miles Bloom]]: Do you have any body awareness?
[[Miles Bloom]]: Like,
[[Miles Bloom]]: I don't it's very common that I work with people, and they say I don't know.
[[Miles Bloom]]: I don't know. How are you? I don't know.
[[Miles Bloom]]: Like, that's you know?
[[Miles Bloom]]: Ground zero.
[[Miles Bloom]]: Mhmm. Up up from there, minimum capacity for judgment.
[[Miles Bloom]]: How are you
[[Miles Bloom]]: Good? Bad?
[[Miles Bloom]]: Step up from there.
[[Miles Bloom]]: You know?
[[Miles Bloom]]: How are you?
[[Miles Bloom]]: Different level
[[Miles Bloom]]: but they can start getting into, like, images.
[[Miles Bloom]]: Yeah. It's a bit run down.
[[Miles Bloom]]: Still a bit
[[Miles Bloom]]: flattened.
[[Miles Bloom]]: Okay?
[[Miles Bloom]]: Go up from there, we and they start to be able to name emotions.
[[Miles Bloom]]: You know?
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: So
[[Miles Bloom]]: it's a bit risky
[[Miles Bloom]]: in that sense. Or or I feel like the regulation section has a long way to go.
[[Miles Bloom]]: Terms of its development.
[[Miles Bloom]]: To be able
[[Miles Bloom]]: to meet the the complexity
[[Miles Bloom]]: in that sense.
[[Miles Bloom]]: Because people just don't know at the beginning.
[[Miles Bloom]]: Right. Or some people don't.
[[Miles Bloom]]: It's often the people that need it the most that don't know
[[Miles Bloom]]: So could we
[[Miles Bloom]]: have something that would work
[[Miles Bloom]]: for everyone?
[[Miles Bloom]]: So like some sort of exercise that everyone could do
[[Miles Bloom]]: and like that they would just feel a little bit more calm.
[[Miles Bloom]]: And like, you know, if they're
[[Miles Bloom]]: like, I think about
[[Miles Bloom]]: you know, something like
[[Miles Bloom]]: like alternate nostril breathing.
[[Miles Bloom]]: Which like, you know, if you're a bit
[[Miles Bloom]]: up, it brings you to down. If you're a bit down, it brings you up.
[[Miles Bloom]]: And then we can sort of just
[[Miles Bloom]]: cut away the need for the individual to understand how they're feeling.
[[Miles Bloom]]: And just get them to notice some sort of change.
[[Miles Bloom]]: Write somebody off.
[[Miles Bloom]]: Right from the off without
[[Miles Bloom]]: because, again, at this point, they're not gonna have any education.
[[Miles Bloom]]: They might be entirely body unaware. But if they do a
[[Miles Bloom]]: an exercise,
[[Miles Bloom]]: well, like,
[[Miles Bloom]]: I I imagine that most people would
[[Miles Bloom]]: feel something from
[[Miles Bloom]]: doing some sort of exercise. Like, does that match your experience even if they weren't so aware of their body?
[[Miles Bloom]]: They often do
[[Miles Bloom]]: but they often don't know.
[[Miles Bloom]]: As in
[[Miles Bloom]]: we might do an exercise
[[Miles Bloom]]: and say, okay.
[[Miles Bloom]]: So how do you feel after doing that?
[[Miles Bloom]]: And they'll be like, alright.
[[Miles Bloom]]: Do notice any difference?
[[Miles Bloom]]: Not really.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: You know? How's your breathing right now in comparison
[[Miles Bloom]]: to afterwards?
[[Miles Bloom]]: It's alright?
[[Miles Bloom]]: Oh,
[[Miles Bloom]]: actually, I guess it's
[[Miles Bloom]]: maybe slightly
[[Miles Bloom]]: different.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: Can you tell in which way it's slightly different?
[[Miles Bloom]]: It's
[[Miles Bloom]]: ever so slightly
[[Miles Bloom]]: slower.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: Is ever so slightly slower, more comfortable?
[[Miles Bloom]]: Or less comfortable?
[[Miles Bloom]]: It's alright.
[[Miles Bloom]]: But would you rather it was slower? Would you rather it was faster?
[[Miles Bloom]]: No. I think I prefer slower. So as if that's a slower is more comfortable.
[[Miles Bloom]]: Yes.
[[Miles Bloom]]: And then we start backtracking.
[[Miles Bloom]]: So slower is more comfortable, and you're feeling more comfortable after doing the exercise, and
[[Miles Bloom]]: and so
[[Miles Bloom]]: so, actually,
[[Miles Bloom]]: you're feeling more comfortable than you were before. Is that fair? And they're like, well, I guess so. Yeah.
[[Miles Bloom]]: But, like,
[[Miles Bloom]]: they don't know that until you really walk
[[Miles Bloom]]: them down that pathway step by step to help them recognize it because there's just so much
[[Miles Bloom]]: separation from the body.
[[Miles Bloom]]: So do do you think we could build that
[[Miles Bloom]]: step by step questionnaire
[[Miles Bloom]]: into the process?
[[Miles Bloom]]: So it's something like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: how
[[Miles Bloom]]: you have some questions beforehand.
[[Miles Bloom]]: Then you have some questions then you do an exercise
[[Miles Bloom]]: and then you have some questions after.
[[Miles Bloom]]: Would that be that they could do that?
[[Miles Bloom]]: The question for me is how do we do it in such a way that doesn't make it
[[Miles Bloom]]: too
[[Miles Bloom]]: long winded?
[[Miles Bloom]]: Yes. But
[[Miles Bloom]]: I mean, the, you know, the short version we came up with is
[[Miles Bloom]]: you know,
[[Miles Bloom]]: how would you say your nervous system is right now
[[Miles Bloom]]: You know, what level
[[Miles Bloom]]: from one to 10 think it's at?
[[Miles Bloom]]: You think it's at?
[[Miles Bloom]]: But, I mean,
[[Miles Bloom]]: bringing the kinds of questions in that I'm saying, like,
[[Miles Bloom]]: would take this to a whole different level, like a much
[[Miles Bloom]]: better level.
[[Miles Bloom]]: Mhmm. Being able to answer ask these kinds of questions.
[[Miles Bloom]]: So
[[Miles Bloom]]: Because so so there's a
[[Miles Bloom]]: there's there seems to be a tension between
[[Miles Bloom]]: speeds
[[Miles Bloom]]: and effectiveness, and and that's that's what we're feeling at the moment.
[[Miles Bloom]]: Yeah. I think so.
[[Miles Bloom]]: Because
[[Miles Bloom]]: if if you, like,
[[Miles Bloom]]: if you think about what what Headspace does,
[[Miles Bloom]]: that immediate breathe in and breathe out,
[[Miles Bloom]]: Like I imagine for most people that
[[Miles Bloom]]: is almost
[[Miles Bloom]]: like, oh, okay. Cool.
[[Miles Bloom]]: And it's like, it's more of a graphic thing than a
[[Miles Bloom]]: emotional thing that they would feel.
[[Miles Bloom]]: But I think already it does actually just
[[Miles Bloom]]: make you take a deeper breath.
[[Miles Bloom]]: And it makes you be aware of your breath.
[[Miles Bloom]]: Mhmm.
[[Miles Bloom]]: And and so maybe we're we're trying to
[[Miles Bloom]]: expect too much from an onboarding.
[[Miles Bloom]]: Maybe just to
[[Miles Bloom]]: you know, a little
[[Miles Bloom]]: piece of more
[[Miles Bloom]]: a wet like a slight
[[Miles Bloom]]: awareness of the breath
[[Miles Bloom]]: would be enough
[[Miles Bloom]]: for for this path
[[Miles Bloom]]: way of the onboarding.
[[Miles Bloom]]: I think so. I mean, we want we want them to get a win. Right? So
[[Miles Bloom]]: what
[[Miles Bloom]]: So in terms of just
[[Miles Bloom]]: in terms of just having a wimp, are you suggesting there that we'd have, like, a breathe in, breathe out as an example
[[Miles Bloom]]: or just, like,
[[Miles Bloom]]: can you feel your seat?
[[Miles Bloom]]: Something very simple that brings them into the present.
[[Miles Bloom]]: Yeah. Like On a journey in.
[[Miles Bloom]]: Would then go on
[[Miles Bloom]]: to a deeper thing.
[[Miles Bloom]]: Or
[[Miles Bloom]]: Yeah. Yeah. Yeah. I I think, like,
[[Miles Bloom]]: what's it called when when you, like, look around and you
[[Miles Bloom]]: see different things?
[[Miles Bloom]]: Yeah. Like like something like that.
[[Miles Bloom]]: And then
[[Miles Bloom]]: you take them into
[[Miles Bloom]]: like after so it's like they do a bit of of of orienting.
[[Miles Bloom]]: And then they go into the video
[[Miles Bloom]]: that's like
[[Miles Bloom]]: you know,
[[Miles Bloom]]: this is how these are the states of your nervous system.
[[Miles Bloom]]: And then they fill in the checker and it's like, this is what it means to up
[[Miles Bloom]]: down, regulate, balance.
[[Miles Bloom]]: And then they do that and then maybe they do a real exercise.
[[Miles Bloom]]: I think that's good.
[[Miles Bloom]]: Yeah?
[[Miles Bloom]]: I think I think that as an idea is
[[Miles Bloom]]: good.
[[Miles Bloom]]: I think
[[Miles Bloom]]: what
[[Miles Bloom]]: what should be that initial thing.
[[Miles Bloom]]: I think breathing in general is
[[Miles Bloom]]: probably the easiest thing to go for.
[[Miles Bloom]]: Yeah. I mean,
[[Miles Bloom]]: Breathing and or grounding.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: But, like, if you're walking and you're doing it,
[[Miles Bloom]]: or if you're on the train, you're doing it.
[[Miles Bloom]]: I'm just thinking, like, where will people be when they do this?
[[Miles Bloom]]: As well.
[[Miles Bloom]]: Right. Because
[[Miles Bloom]]: so if you think about
[[Miles Bloom]]: I mean, I I guess it's a question for
[[Miles Bloom]]: for Jim.
[[Miles Bloom]]: Which is like
[[Miles Bloom]]: when
[[Miles Bloom]]: like,
[[Miles Bloom]]: you know,
[[Miles Bloom]]: when were they
[[Miles Bloom]]: be given this? What what would they like actually be?
[[Miles Bloom]]: Doing? What how would they approach be approaching this?
[[Miles Bloom]]: So
[[Miles Bloom]]: so, I mean, the guys that are gonna get this
[[Miles Bloom]]: are all
[[Miles Bloom]]: badged
[[Miles Bloom]]: SAS members.
[[Miles Bloom]]: Or wives of badged SAS members?
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: For this little
[[Miles Bloom]]: trial now.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And
[[Miles Bloom]]: as I understand it, there'll all be people that are
[[Miles Bloom]]: here in
[[Miles Bloom]]: The UK.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: The way they work is that they're generally, like,
[[Miles Bloom]]: six months in The UK, six months away. Mhmm.
[[Miles Bloom]]: If you're stationed in The UK, then you'll be doing, like,
[[Miles Bloom]]: counterterrorism, things like that. So you'll be, like, on call. You'll
[[Miles Bloom]]: you'll be doing training courses. You'll be
[[Miles Bloom]]: so
[[Miles Bloom]]: I'm assuming that we're going to get 12 who are all in
[[Miles Bloom]]: stationed in Hereford or Paul probably in Hereford.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And and
[[Miles Bloom]]: how are they gonna receive it? Is it gonna be, like,
[[Miles Bloom]]: you know, they get an email or they like have a sit down and a briefing?
[[Miles Bloom]]: Because that's a big difference. We have to define.
[[Miles Bloom]]: Because we have to define exactly what the
[[Miles Bloom]]: triad is and what we're gonna ask them.
[[Miles Bloom]]: So what we've been
[[Miles Bloom]]: so, I mean, partly, we're exploring this now together.
[[Miles Bloom]]: But the idea is
[[Miles Bloom]]: and on the one hand, they have a
[[Miles Bloom]]: there's just a URL link that they're gonna go into.
[[Miles Bloom]]: Meaning that they're part of the special forces, and then that will then
[[Miles Bloom]]: send them to the iOS and the Android links to open up.
[[Miles Bloom]]: So the question is, what are we gonna give them to go with that?
[[Miles Bloom]]: Mhmm. So
[[Miles Bloom]]: we'll need some kind of intro package
[[Miles Bloom]]: That's anonymous, so we're not gonna meet them.
[[Miles Bloom]]: So
[[Miles Bloom]]: I'm assuming that we're gonna need something like a video that explains what this trial is.
[[Miles Bloom]]: What we're asking of them.
[[Miles Bloom]]: Which is
[[Miles Bloom]]: a minimum of
[[Miles Bloom]]: them using it for five minutes three times a week.
[[Miles Bloom]]: And then once a month
[[Miles Bloom]]: filling in a five minute questionnaire.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: And and That's the minimum requirement.
[[Miles Bloom]]: One of the things that does make this this trial different to other
[[Miles Bloom]]: sort of onboarding things
[[Miles Bloom]]: is that we'll probably get more
[[Miles Bloom]]: compliance
[[Miles Bloom]]: Yeah. I think everybody that's on it
[[Miles Bloom]]: have agreed to be on it, and they'll take it very serious.
[[Miles Bloom]]: Right. Think every
[[Miles Bloom]]: everybody will do that.
[[Miles Bloom]]: Which which in terms of what we were thinking about earlier,
[[Miles Bloom]]: with
[[Miles Bloom]]: how, like, speeds versus a
[[Miles Bloom]]: effectiveness.
[[Miles Bloom]]: That might give us slightly more leeway
[[Miles Bloom]]: True.
[[Miles Bloom]]: To
[[Miles Bloom]]: take a little bit longer than the average person's attention span would be.
[[Miles Bloom]]: I agree. Yeah.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Which means that in terms of
[[Miles Bloom]]: we think about these three pathways,
[[Miles Bloom]]: if it's a slightly longer onboarding
[[Miles Bloom]]: then
[[Miles Bloom]]: know,
[[Miles Bloom]]: the average app store download would be comfortable with.
[[Miles Bloom]]: But it's still like less than five minutes.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: That's okay?
[[Miles Bloom]]: Yeah. Probably.
[[Miles Bloom]]: And so the
[[Miles Bloom]]: the choice of regulation exercise
[[Miles Bloom]]: I think if we say
[[Miles Bloom]]: you know,
[[Miles Bloom]]: if if we set a time for how long we want onboarding to take,
[[Miles Bloom]]: And, you know, that then
[[Miles Bloom]]: let's
[[Miles Bloom]]: I imagine this would be one of the things you agree. You know? You agreed to spend
[[Miles Bloom]]: ten minutes
[[Miles Bloom]]: watching the the video,
[[Miles Bloom]]: and then doing an onboarding.
[[Miles Bloom]]: And then we think we may figure out how long the video is, and then we can figure out
[[Miles Bloom]]: we have a
[[Miles Bloom]]: a framework for judging this.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So, like,
[[Miles Bloom]]: how long do you think
[[Miles Bloom]]: the whole en
[[Miles Bloom]]: onboarding should take
[[Miles Bloom]]: the moment they get the email
[[Miles Bloom]]: to
[[Miles Bloom]]: you know, they're done for the day.
[[Miles Bloom]]: The very first time
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So I'm imagining that they're gonna get that email, and that email will have, like, an
[[Miles Bloom]]: video.
[[Miles Bloom]]: Right. Let's
[[Miles Bloom]]: maybe that's maybe, like, the user video that we've already got. Right? It's about
[[Miles Bloom]]: three months now.
[[Miles Bloom]]: Okay.
[[Miles Bloom]]: So let's
[[Miles Bloom]]: say for argument, it might get tweaked
[[Miles Bloom]]: to be more specific for this group. But
[[Miles Bloom]]: Mhmm. That's a matter of they have a three minute It's a three minute intro video.
[[Miles Bloom]]: Video.
[[Miles Bloom]]: Maybe a minute.
[[Miles Bloom]]: To read a very short email.
[[Miles Bloom]]: A minute to download,
[[Miles Bloom]]: the app.
[[Miles Bloom]]: Yeah. Open it.
[[Miles Bloom]]: That's already five minutes of time.
[[Miles Bloom]]: So I think, ideally,
[[Miles Bloom]]: the initial onboarding process
[[Miles Bloom]]: should then be
[[Miles Bloom]]: five minutes from the moment they open the app.
[[Miles Bloom]]: At least to get
[[Miles Bloom]]: into it.
[[Miles Bloom]]: And
[[Miles Bloom]]: because they're gonna think because they're gonna have to open it, and they're gonna have
[[Miles Bloom]]: put in
[[Miles Bloom]]: they're gonna have to put in a username and a password.
[[Miles Bloom]]: That takes
[[Miles Bloom]]: a minute or two to think about.
[[Miles Bloom]]: There are some people that are tech savvy. They'll be flying
[[Miles Bloom]]: through that, and some people that aren't.
[[Miles Bloom]]: You know, every step will be a challenge.
[[Miles Bloom]]: Yeah. And it's like, oh, my password doesn't have
[[Miles Bloom]]: you know, a special character or whatever.
[[Miles Bloom]]: So I almost think that that whole process
[[Miles Bloom]]: until the moment that they've finished
[[Miles Bloom]]: putting in their details
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: From the moment that they've opened the email, so there should be, like, ten minutes.
[[Miles Bloom]]: And then
[[Miles Bloom]]: it's, like,
[[Miles Bloom]]: then they get to the REM logo.
[[Miles Bloom]]: So you think it
[[Miles Bloom]]: okay.
[[Miles Bloom]]: That's that's considerably longer than I I would have put that
[[Miles Bloom]]: Where is it?
[[Miles Bloom]]: Yeah. But I might be biased. Text
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: So you get in and you fly through that.
[[Miles Bloom]]: As with many other peep probably many people on that
[[Miles Bloom]]: would also do that.
[[Miles Bloom]]: But there might be some people that don't do that and are quite selective. So let's say
[[Miles Bloom]]: like, you know, five minutes so ten minutes for the
[[Miles Bloom]]: for the less savvy
[[Miles Bloom]]: and five for the
[[Miles Bloom]]: Something like that.
[[Miles Bloom]]: Five for the savvy.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And so that
[[Miles Bloom]]: So that means I think that we probably have about five minutes for the rest of this.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: But
[[Miles Bloom]]: so the question is, what should that actually include?
[[Miles Bloom]]: But isn't it it
[[Miles Bloom]]: could it be ten minutes?
[[Miles Bloom]]: The rest of this with this specific code? For the first time, yes.
[[Miles Bloom]]: So, like, fifteen minutes fifteen, twenty minutes overall or was that too long?
[[Miles Bloom]]: I think twenty is too long.
[[Miles Bloom]]: I think fifteen already feels like a max.
[[Miles Bloom]]: Right. As a as a minimum requirement.
[[Miles Bloom]]: Somebody who's then, like,
[[Miles Bloom]]: you know, totally caught up in it and and in
[[Miles Bloom]]: and
[[Miles Bloom]]: Yeah. So and so the hope is that they'll
[[Miles Bloom]]: want to spend more than this amount of time.
[[Miles Bloom]]: Correct.
[[Miles Bloom]]: But we know that they will spend at least this amount of time, which is a gift
[[Miles Bloom]]: compared to the normal user.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: So
[[Miles Bloom]]: I think that we we should say we we have five minutes from
[[Miles Bloom]]: the RM logo till they're finished onboarding.
[[Miles Bloom]]: Yep. That sounds good to me.
[[Miles Bloom]]: Right. It's probably gonna
[[Miles Bloom]]: One logo to end.
[[Miles Bloom]]: So we have to wrap up in a few minutes.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: But I I think that
[[Miles Bloom]]: at this stage,
[[Miles Bloom]]: where we are,
[[Miles Bloom]]: is if we say, you know,
[[Miles Bloom]]: there's five minutes to do that.
[[Miles Bloom]]: And then
[[Miles Bloom]]: you and, you know, maybe you speak to my dad or or some other people
[[Miles Bloom]]: about what
[[Miles Bloom]]: how we would best spend those five minutes to get them a win
[[Miles Bloom]]: in terms of
[[Miles Bloom]]: these three different onboarding pathways. Think
[[Miles Bloom]]: through those.
[[Miles Bloom]]: I mean,
[[Miles Bloom]]: I mean,
[[Miles Bloom]]: to be honest,
[[Miles Bloom]]: I think that
[[Miles Bloom]]: onboarding with Psy in that sense is
[[Miles Bloom]]: might even be built already.
[[Miles Bloom]]: Because you open up Sai, But we'd have to think it through. As you said, it doesn't have to be the normal thing.
[[Miles Bloom]]: Yeah. Because because what I would want
[[Miles Bloom]]: is
[[Miles Bloom]]: like, it initiates the
[[Miles Bloom]]: you click a button and it initiates the onboarding flow.
[[Miles Bloom]]: Because one of the
[[Miles Bloom]]: the onboarding conversation with
[[Miles Bloom]]: because one of the things I find with
[[Miles Bloom]]: AI is is it's so open
[[Miles Bloom]]: that people like kinda just don't know what to do.
[[Miles Bloom]]: Right.
[[Miles Bloom]]: It's like the thing. It might be worth in an onboarding
[[Miles Bloom]]: process with Si rather than doing, like, an onboarding as an old tell me your life
[[Miles Bloom]]: story.
[[Miles Bloom]]: It might just be good something like
[[Miles Bloom]]: here are some quick links.
[[Miles Bloom]]: What would you like right now?
[[Miles Bloom]]: And it might be
[[Miles Bloom]]: you know,
[[Miles Bloom]]: fix the relationship issue.
[[Miles Bloom]]: We would just, like, understand this pattern.
[[Miles Bloom]]: Understand my pattern.
[[Miles Bloom]]: We could just list
[[Miles Bloom]]: a bunch of potential wins to get, and someone can click on it, and the site can say,
[[Miles Bloom]]: you know, tell me what pattern you're spotting.
[[Miles Bloom]]: Let's start.
[[Miles Bloom]]: And and it just
[[Miles Bloom]]: so you just into it straight away.
[[Miles Bloom]]: Yeah. Because
[[Miles Bloom]]: I I do think that
[[Miles Bloom]]: the
[[Miles Bloom]]: the full life story onboarding
[[Miles Bloom]]: Yeah. That should be a secondary thing.
[[Miles Bloom]]: Is is not a quick win.
[[Miles Bloom]]: Agreed.
[[Miles Bloom]]: Agreed.
[[Miles Bloom]]: No. In that sense, I think that it
[[Miles Bloom]]: it
[[Miles Bloom]]: having things like
[[Miles Bloom]]: I made a list of these somewhere. Let just see if I can
[[Miles Bloom]]: of them.
[[Miles Bloom]]: I
[[Miles Bloom]]: I'm not sure where it is, but I wrote I a list of, like,
[[Miles Bloom]]: potential wins
[[Miles Bloom]]: Okay. So
[[Miles Bloom]]: don't have it here, but
[[Miles Bloom]]: I will find it. But it just
[[Miles Bloom]]: just
[[Miles Bloom]]: things along those lines of
[[Miles Bloom]]: you know, I want to feel less stressed. I want to
[[Miles Bloom]]: I want to
[[Miles Bloom]]: get energized. I want to resolve the problem with my boss.
[[Miles Bloom]]: I want to whatever it might be in that in that kind of
[[Miles Bloom]]: sense.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: And and so I I think
[[Miles Bloom]]: what what I think in terms of progress for now
[[Miles Bloom]]: is if
[[Miles Bloom]]: you go map these out
[[Miles Bloom]]: and then pass them to me,
[[Miles Bloom]]: and then I'll go build them out.
[[Miles Bloom]]: As a, like, actual
[[Miles Bloom]]: physical
[[Miles Bloom]]: onboarding
[[Miles Bloom]]: process.
[[Miles Bloom]]: Cool.
[[Miles Bloom]]: And it it would also be helpful
[[Miles Bloom]]: to have some of the
[[Miles Bloom]]: like,
[[Miles Bloom]]: the graphics style stuff done.
[[Miles Bloom]]: Just as a
[[Miles Bloom]]: like I've got
[[Miles Bloom]]: As as as a guide. Yeah.
[[Miles Bloom]]: And then that's that's why I would recommend, like,
[[Miles Bloom]]: looking at
[[Miles Bloom]]: Marvin and stuff that
[[Miles Bloom]]: design inspiration.
[[Miles Bloom]]: Because I I find
[[Miles Bloom]]: like,
[[Miles Bloom]]: all the UI people that I've I've spoken to seem to like
[[Miles Bloom]]: talk about how
[[Miles Bloom]]: important it is to
[[Miles Bloom]]: to have
[[Miles Bloom]]: inspiration and stuff like that because otherwise, it's just so hard.
[[Miles Bloom]]: Yeah.
[[Miles Bloom]]: Okay. Makes a lot of sense to me.
[[Miles Bloom]]: That's brilliant. Alright. Thanks, Miles. That's fantastic.
[[Miles Bloom]]: Yeah. Was this
[[Miles Bloom]]: was this helpful? Was this
[[Miles Bloom]]: this good? Yeah. Yeah. Great.
[[Miles Bloom]]: Think somebody goes.
[[Miles Bloom]]: It's good.
[[Miles Bloom]]: Alright. Great.
[[Miles Bloom]]: Great.
[[Miles Bloom]]: Alright.
[[Miles Bloom]]: Nice to see you.
[[Miles Bloom]]: Alright. Nice to see you. Be in touch. Cheers. Bye bye.
[[Miles Bloom]]: Bye.
