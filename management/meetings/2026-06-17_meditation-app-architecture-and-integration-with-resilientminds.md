---
title: "Meditation app architecture and integration with Resilientminds"
date: 2026-06-17
participants: [Miles Bloom, Roger]
tags: [meeting, resilientminds, product, white-label]
source: granola
granola_id: not_HN9nlHITLrgwRO
granola_url: https://notes.granola.ai/d/7fea4646-fb5f-4301-8f3e-d57ab2330aad
updated: 2026-06-17T10:29:53.471Z
---
>[!Meta]
>topics::[[Maths]],[[Pure-Maths]],[[Topology-]]
>sources::[[Topology 25-26 first half Notes.pdf#^UINJ6953]]
# Meditation app architecture and integration with Resilientminds

### Product Demo: Meditation App Overview

- Exercise bank: structured library of practices (yogic, Jewish, somatic, etc.) 
  - Each exercise broken into progressive stages (e.g. "Thought Control" has 5 stages)
  - Variables control duration per session, so day 1 might be 2 min, day 10 is 20 min
  - Segments: speech, sound effects, loops, split markers (for evenly spaced cues)
  - Drag-and-drop interface for building and reordering segments
- Programs layer on top: week-by-week schedules that sequence exercises and durations 
  - Inspired by Dr. K's (Healthy Gamer) meditation tracks, which only go to stage 2
  - App extends those programmatically, removing the manual audio-editing bottleneck
- AI assist built in: generates scripts from YouTube videos or PDFs 
  - Useful for drafting; needs human tweaking, especially for timed/variable scripts
  - Can also record your own voice per segment instead of using AI voice
- Player view: simple daily interface, press play and follow the guided session

### AI Voice and Content Quality

- AI voices have improved but still feel jarring for meditation specifically 
  - "Uncanny valley" effect is tolerable for learning videos, not for somatic/meditative work
  - Other party previously built ~20 somatic videos with AI, scrapped them all, switched to recording themselves
- Stage directions in scripts help guide tone, but don't fully solve the problem
- Recording own voice per segment is the cleaner solution for now

### Vision and Fit with RM

- Core value: bridges one-off exercises and a structured, progressive skill-building journey 
  - Analogy: exercise videos vs. a periodized lifting program with increasing weight
  - Aligns directly with "healing journeys" concept already in development at RM
- Proposed model: Miles's product, white-labeled and embedded inside RM as a button/module 
  - RM leases it; Miles retains ownership and develops it independently
- Potential content contributors: Jewish meditation teachers, yoga (friend with YouTube channel), somatic/therapy content from RM 
  - Skill-tree structure floated: e.g. "Beinoni" archetype from Tanya as a framework 
    - Branches: thought control, speech control, loving-kindness (metta), perceptual control
  - Different traditions kept separate but combinable by the user
- Dr. K's insight flagged as important: no one-size-fits-all meditation 
  - E.g. telling someone with OCD to "observe their thoughts" is actively harmful
- Integral hierarchy idea: map traditions (Jewish, Advaita Vedanta, Sufi, TM) onto progressive levels
- Ex-special-forces clinical psychologist (Oxford mindfulness for PTSD) already on other party's radar 
  - Potential to build a mindfulness module within RM
  - Free on the "special forces" app tier; paid add-on on the private/consumer version

### Next Steps

- Send viewer link to Roger (Miles)
- Enable content creation for Roger within a couple of days (Miles)
- Roger to explore the app and send feature feedback
- Arrange follow-up meeting to continue; intro to the ex-special-forces psychologist to explore collaboration

---

## Transcript

**Roger:** Longer.

**Roger:** Unexpected.

**Miles:** Yeah. I'm doing good.

**Roger:** Are you doing?

**Roger:** Yeah.

**Roger:** Great. Great. So because of that, I've only got

**Miles:** Doing good.

**Roger:** just over half an hour now.

**Roger:** So

**Roger:** we'll we'll go as far as we can.

**Roger:** And then

**Roger:** yeah, that might be enough, but we might have to follow that up with a

**Roger:** second meeting.

**Miles:** Yeah.

**Roger:** Or a third or a

**Miles:** That's fine.

**Miles:** Yeah.

**Roger:** Claude Fable has gone.

**Miles:** Okay.

**Miles:** So basically,

**Miles:** this is what I've got built so far.

**Miles:** It's very, like, bare bones. It's

**Miles:** it's it's very much a prototype. Like, I haven't spent

**Roger:** Sure.

**Miles:** any real time on the UI and stuff.

**Roger:** Sure. Small the the the idea in itself and the structure.

**Miles:** Yeah. Exactly.

**Miles:** So but basically, the the way it works is there's the exercise bank

**Miles:** which is like

**Miles:** has lists of different exercises. So I've just got

**Roger:** Yeah.

**Roger:** Do you have yogic practices and Jewish practices there?

**Miles:** yeah.

**Miles:** And then each exercise

**Miles:** is split into stages.

**Miles:** So, like, this is a

**Miles:** is an exercise. It's called thought control.

**Miles:** That has five different stages.

**Miles:** Like, the first one is awareness of thoughts and the second one is, like,

**Miles:** noticing how your thoughts are evoked by different

**Miles:** perceptions, discarding thoughts,

**Miles:** evoking positive thoughts, evoking negative thoughts.

**Miles:** And so the

**Miles:** the way this is sort of structured

**Miles:** is that because of the the stages, right,

**Miles:** it means that you have like play

**Miles:** clear goals and clear progressions

**Roger:** Right.

**Miles:** So, you know, you start with like

**Miles:** you know, five minutes of this and then you build up to ten minutes of

**Miles:** stage one and then maybe you'll move on to stage two and so on.

**Miles:** And the thing that's nice about

**Miles:** how this is structured

**Miles:** is you have variables

**Miles:** So this is how long you're doing the actual practice for. So like

**Miles:** this is

**Roger:** Right.

**Miles:** if you think in terms of

**Miles:** like, the gym,

**Miles:** right, which has been a big

**Miles:** part of my inspiration,

**Miles:** So this is like

**Miles:** you know, how long you'll

**Miles:** jogging for or whatever.

**Roger:** Yeah. How long how long you're meditating for?

**Miles:** Yeah.

**Miles:** And so the way it's set up,

**Miles:** is that there's these timelines. Right?

**Miles:** And so then it's split in between

**Miles:** you have

**Miles:** these are there's there's different kind of segments.

**Miles:** So this is a speech segment.

**Miles:** So it's it's just got a

**Miles:** a bit of a crap AI voice now, but

**Roger:** So what we're going to do now is simply be aware of thoughts.

**Roger:** What I want you to do is close your eyes for a moment.

**Miles:** And so there's there's

**Miles:** a bunch of different types of sex of segments.

**Miles:** So each segments can have variables,

**Miles:** You can, like, put the

**Miles:** pause

**Miles:** to be a variable the variable length

**Roger:** Right.

**Miles:** And so what happens is

**Miles:** essentially, you can

**Miles:** choose

**Miles:** entirely how long you want this to be.

**Miles:** So

**Miles:** you could have that on day one, it's two minutes and on

**Miles:** day 10, it's twenty minutes. Right?

**Roger:** Right.

**Miles:** And so then this is all structured.

**Miles:** Does does that also make sense? Is that in front of

**Roger:** Yep. Yeah.

**Miles:** you got?

**Roger:** All clear. It's a great idea.

**Miles:** And so and there's there's different

**Miles:** different versions of this. So the

**Miles:** actually gets quite technical for some of it.

**Miles:** So, like, you have loops as well.

**Roger:** Right. Makes sense.

**Miles:** So this is a

**Miles:** this is

**Miles:** open and nostril breathing. Right?

**Roger:** Yeah.

**Miles:** And so this bit, it's essentially it just loops

**Roger:** In. Right.

**Roger:** Switch out.

**Roger:** By the way, I can't hear your sound from your computer other than your voice.

**Miles:** Okay.

**Roger:** Yeah. So but I I understand that you were putting on for me to hear, but

**Miles:** Okay. Wait.

**Roger:** Switch out.

**Miles:** So, yeah, I can I'll I'll send you the link.

**Roger:** In.

**Miles:** So, anyway,

**Miles:** So anyway, the the voice reads it out and it goes, you know,

**Miles:** and it just will loop this. Right? And you can

**Miles:** set it up so that

**Miles:** you know, it does a certain number of loops,

**Roger:** Yes. But, again, you could do two minutes or twenty minutes easily.

**Miles:** Yeah. Or or that the loops are for a

**Miles:** in duration.

**Miles:** And so

**Miles:** And so, like and and also there's

**Miles:** a so this whole this whole interface

**Miles:** I sort of designed it so that it's, like, very

**Miles:** cut and stick and stuff.

**Roger:** Did you say

**Miles:** So you can

**Roger:** You say cut and cut and paste? Cut and stick?

**Miles:** yeah. So you you can, like,

**Roger:** Yeah.

**Miles:** it just drag different segments around.

**Roger:** Okay.

**Miles:** And, you know, it's like

**Miles:** pretty straightforward to add different things. Oh, I'm gonna add

**Miles:** a sound effect or a loop.

**Miles:** Split markers are a bit more complicated. I can

**Miles:** explain those.

**Miles:** So if we go so this is a a stillness practice.

**Miles:** Essentially, the the way the split markers work is

**Miles:** might have, like, a duration

**Miles:** that is spread over an entire section.

**Miles:** So, like,

**Miles:** because so in in the in the stillness practice, one of things

**Miles:** that is very useful is if there's, like,

**Miles:** constantly

**Miles:** you get a little pieces of input so that you're not just, like, alone in your body.

**Miles:** Trying not to move.

**Roger:** Yeah.

**Miles:** And so having these split markers means that you can split the duration

**Miles:** Right? So the total duration for this is five minutes.

**Miles:** And then

**Miles:** that dead space is split between each of the split markers.

**Miles:** And so

**Miles:** on day one, there might

**Miles:** so if you're doing two minutes of this practice,

**Miles:** every six seconds, you might get a bit of input.

**Miles:** And then if you're doing

**Miles:** Then if you're doing five minutes of this practice,

**Miles:** you get some input every twenty seconds.

**Roger:** Right.

**Miles:** And so that's that's the exercise bank.

**Miles:** Right? So it's it's all nicely structured. You can add stuff and

**Miles:** tweak stuff. There's also an AI that can help you build stuff.

**Miles:** That's built in.

**Miles:** And, like, you can get

**Miles:** you can, like, extract from a YouTube video or from a PDF and then the AI will make it.

**Miles:** It make the script with the segments and stuff.

**Miles:** It's not perfect, and I think, like,

**Miles:** you'll need

**Miles:** you'll probably need to tweak it, but it's just very helpful.

**Roger:** That's alright.

**Miles:** For drafting.

**Miles:** Yeah. Exactly.

**Roger:** I could take a video that I've made already.

**Roger:** And just pop it in there.

**Miles:** And

**Roger:** And it would

**Roger:** it would chop out all of the

**Roger:** would take out all of the sound, essentially.

**Miles:** Yeah. Well, it would do its best. It wouldn't

**Roger:** Does it

**Miles:** probably wouldn't do it perfectly.

**Roger:** Right.

**Miles:** And, also, like, one of the things that you find is that

**Miles:** there's

**Miles:** slightly diff it's slightly different when you're writing these structured

**Miles:** scripts

**Miles:** where the durations might change to if you're just

**Miles:** doing a guided meditation.

**Miles:** So, like but it's it's a very it's a very useful feature. You can also do it, like, from a

**Miles:** straight from a PDF.

**Miles:** So

**Miles:** this is, like,

**Miles:** a guy I like on YouTube called doctor k. Who teaches meditation and stuff.

**Roger:** Yeah.

**Roger:** Yeah. He's he's great.

**Miles:** So this is, like,

**Miles:** his notes on how you do a practice.

**Miles:** And so

**Miles:** I'd actually just there's a thing where you could put the PDF in, and then it will extract it, and then

**Miles:** help generate this sort of stuff.

**Miles:** So doctor k was was a good chunk of the inspiration for this.

**Roger:** Yeah.

**Miles:** So on his website, he has

**Roger:** He's the gamer guy, isn't he? He's a healthy gamer or something like that.

**Miles:** meditation

**Miles:** healthy gamer. Yeah.

**Roger:** Healthy. Yeah.

**Miles:** So, so on his website, he has this.

**Miles:** Right?

**Miles:** Which are essentially they're like

**Miles:** tracks that you where you put together different meditations.

**Miles:** So, like, on day one,

**Roger:** Gonna have a look at this. I haven't looked at this.

**Miles:** start

**Miles:** you start with just doing, like,

**Miles:** alternate nostril breathing.

**Miles:** Right?

**Miles:** And then on day two,

**Miles:** you have on week two, sorry, you might add. So this is

**Miles:** this is also the nostril breathing, but rather than

**Miles:** physically blocking one nostril,

**Miles:** you just pay attention to one nostril?

**Roger:** Right.

**Miles:** And then you keep going

**Miles:** and it's like, okay. So this is

**Miles:** what you feel the air

**Miles:** flowing all the way up.

**Miles:** To in between your third eye. This is where you focus on the third eye.

**Miles:** And so this structure, find really nice

**Miles:** it's one of the things like I

**Miles:** I do this most days.

**Roger:** And it has the badges as well, beginner, intermediate, and advanced. So you have

**Miles:** Where I'll sort of sit

**Roger:** the gamified aspect of it.

**Miles:** Exactly.

**Miles:** And so like this is

**Miles:** like, this is one of the practice, like, I

**Miles:** so

**Miles:** posted this and ripped it off into my app

**Miles:** because I wanted to

**Miles:** structure it and have

**Miles:** like because I'm not a a meditation teacher, so I don't really know how to

**Miles:** put together the programs or the scripts.

**Roger:** Right.

**Miles:** So, like, that's where I need other people

**Miles:** And so

**Miles:** this the the the thought control thing I was telling you about is is exactly here.

**Roger:** Yeah.

**Miles:** But the thing is he only has in this

**Miles:** in this in these meditation tracks

**Miles:** he only goes up to the end of stage two because

**Miles:** by the end of stage two, you're, like, eight weeks in.

**Miles:** And

**Miles:** that's

**Miles:** like, as far as I can tell, they were, like, actually by themselves, like,

**Miles:** editing these audios and cutting and sticking them together.

**Miles:** Which is just a lot of work.

**Miles:** Whereas if

**Miles:** with my system, it would be be programmatically.

**Miles:** Right? But this sort of structure was a big part of the inspiration. So you have

**Roger:** Right.

**Miles:** like, how

**Miles:** practice the technique,

**Miles:** and then you have how long you're gonna do it.

**Miles:** And so that's the programs.

**Roger:** Yeah.

**Miles:** So here so you have, you know, week one,

**Miles:** and then

**Miles:** because of how it's set up on this, you can have durations.

**Miles:** Right?

**Miles:** And so this is five minutes of Nali Shuddhi and two minutes of Kai Shneuram.

**Miles:** And then, essentially, what I did is I because I got to the end of

**Miles:** program,

**Miles:** I was like, I wanna keep going, and I wanna do stage three of thought control.

**Miles:** And so I added a couple of weeks using my system

**Miles:** so this is the same sort of thing where you do

**Miles:** know, the preparatory practices and then you do thought control,

**Miles:** But now it's doing stage three, right, rather than stage two.

**Miles:** And you can, you know,

**Miles:** that's gonna I'm gonna keep going with that and then I have

**Miles:** because because one of the goals that I wanna have

**Miles:** is

**Miles:** it should be as easy as possible, like, the

**Miles:** when you sit down, like because I I try and do it in the mornings before I start my day.

**Miles:** And I wanna just, like, sit down and press play.

**Miles:** And so that's sort of what this is is you have

**Roger:** Right.

**Miles:** like, each each of the week. So this is the first day

**Roger:** So let's begin. Sit with your back straight and close your eyes.

**Miles:** I don't know if you could you can't hear that, can you?

**Roger:** No. I can't hear it.

**Miles:** Okay.

**Roger:** Yeah. Send me a link later if you can.

**Roger:** I don't if I need a password a password or whatever, but

**Miles:** Yeah.

**Miles:** Yep.

**Miles:** Send you the link.

**Roger:** that would be

**Miles:** Yeah.

**Roger:** good.

**Roger:** And then I can have a play with it to understand it better.

**Roger:** Whether that's

**Miles:** So I can give you

**Roger:** on the user end or

**Roger:** whatever you

**Miles:** for now, there's there's only,

**Miles:** I haven't got the permission set up for other people.

**Miles:** I I there's like they can have

**Miles:** viewer

**Miles:** permissions.

**Roger:** Right.

**Miles:** The edit the admin permissions are a bit too strong, so I need to tweak that.

**Roger:** Yeah. I'm if you I can't need more than viewer right now just to have a look at

**Miles:** Yeah.

**Roger:** it.

**Miles:** So that's that's the login.

**Miles:** Yeah.

**Miles:** And then

**Roger:** Right. So we

**Miles:** just

**Miles:** so this is just the last study is that you can just

**Roger:** see yeah.

**Miles:** there's just a player where you can see

**Miles:** each day and then you, you know, you press play

**Roger:** So let's begin. Sit with your back straight and close your eyes.

**Miles:** and it takes you through

**Miles:** the script with

**Roger:** Raise your right hand and adopt Naseka Mudra.

**Miles:** each variable and you can see how long it's gonna be

**Miles:** Yeah.

**Miles:** That's that's that product.

**Roger:** I think it's great, Miles.

**Roger:** I think it's great. I think it has real potential.

**Roger:** Because it bridges the gap

**Roger:** it bridges the gap between

**Roger:** having meditations or ex automatic exercises that you might

**Roger:** do as a one off.

**Roger:** And then the actual sequential learning process where you can be pushing yourself

**Roger:** to to to grow more.

**Roger:** And

**Roger:** yeah,

**Roger:** mean and

**Roger:** know, I'd I'd mentioned this idea of kind of healing journeys, which I'd envisioned as

**Roger:** forget about the healing part of it, but I'd envisioned as

**Roger:** guided processes that take you through a period of time.

**Roger:** So it's really helping you

**Roger:** go from just here's a one off exercise to help regulate now into

**Roger:** here's how to build a a practice of mindfulness, resourcing, awareness,

**Roger:** journaling, like

**Roger:** all these different things and

**Roger:** and,

**Roger:** yeah, I really see that this has the possibility to

**Roger:** to systematize that

**Roger:** and to be able

**Miles:** Yeah. So one one of the things that's nice

**Roger:** them quite quickly as well.

**Miles:** is

**Miles:** you could use AI as much or as little as you want.

**Miles:** So you can use AI to help with the scripts or you can

**Miles:** and you can use it to read out the recordings.

**Miles:** Or if you don't like the way the voice sounds, you can just record

**Miles:** and set up in the app that you can record each of the segments yourself.

**Miles:** And then stick them together in the same way and then

**Roger:** Yeah.

**Miles:** generate the scripts.

**Roger:** Yeah. I think I tried because I tried building some with AI.

**Roger:** Then I tried meditating with them.

**Roger:** And they just feel really shitty.

**Miles:** Yeah. So I

**Miles:** I so

**Roger:** At least

**Miles:** it's okay.

**Roger:** at least

**Roger:** six months ago when I tried it.

**Miles:** Yeah. So so they it's the voices have got considerably better.

**Roger:** Right. Right.

**Miles:** And I

**Roger:** But then

**Roger:** finding the exact tone of the word in each moment is

**Miles:** And

**Roger:** is

**Miles:** Yeah.

**Roger:** yeah.

**Miles:** So I I

**Miles:** messing around with this. So in the scripts, there's you know, you can add stage directions.

**Miles:** So, like, how the

**Miles:** the the

**Miles:** reader should say certain things which helps a bit

**Roger:** Right.

**Miles:** But I honestly

**Miles:** I mean, I I think it depends on who you are. Right?

**Miles:** Because it it doesn't bother me so much.

**Miles:** It's like

**Miles:** you know,

**Miles:** I I like, I've used the AI voices myself.

**Miles:** And

**Miles:** I found

**Miles:** like, it was a little bit janky.

**Roger:** That's what I'm referring to.

**Miles:** But I was I was willing to tolerate that.

**Roger:** Right. See, I

**Miles:** For

**Roger:** I find for, like, learning videos that I really don't care.

**Roger:** Even on YouTube, you know, like, the amount of times I go to

**Miles:** Mhmm.

**Roger:** and they click on a video and it turns I can

**Roger:** can tell. It's like, oh,

**Roger:** not a real human.

**Miles:** Mhmm.

**Roger:** There is a disappointment there.

**Roger:** But I'll

**Roger:** but I'll push through it.

**Miles:** Mhmm.

**Roger:** A lot of the time.

**Roger:** I find that I'm doing, like, meditation videos. I find it really jarring.

**Miles:** Right. You wanna be, like, relaxed and

**Roger:** It's like that's

**Roger:** the moment.

**Miles:** able to, like, focus and whatever and

**Roger:** Yeah.

**Miles:** there was, like, that, like, uncanny valley.

**Roger:** Exactly. Which is why I ended up

**Miles:** Is probably

**Roger:** because originally, before you were on, like, all of the

**Roger:** all of the somatic exercise videos were built with AI originally.

**Roger:** I built, like,

**Roger:** I don't know, 20 of them.

**Roger:** Then it just that just gave me the ick. It's just, like, so cringey.

**Miles:** Yeah.

**Roger:** I was like, no.

**Roger:** I have to just

**Roger:** just do them ourselves for now until there's a better system in place.

**Miles:** Yeah. And

**Roger:** Okay. And

**Miles:** we you could also integrate

**Miles:** video components in the same sort of script way.

**Miles:** Haven't really

**Miles:** thought about that or built it yet.

**Miles:** But

**Miles:** it's definitely a direction we could go.

**Roger:** Right. Right.

**Roger:** Yeah. Because, I mean, a lot of those videos that I've made

**Roger:** it's like very brief intro,

**Roger:** then it's we're gonna repeat this exercise

**Roger:** a lot of times

**Roger:** so it's again, it's just

**Roger:** one exercise that gets repeated

**Miles:** Yeah.

**Roger:** however many times and then a and then a

**Roger:** the tiniest of outros.

**Miles:** Yeah.

**Roger:** So the same principle applies there.

**Roger:** So when you've been thinking about this, what

**Roger:** obviously, you've

**Roger:** you've set up

**Roger:** or you've suggested

**Roger:** this conversation.

**Roger:** How will you imagine this linking into RM?

**Miles:** So I I

**Roger:** Because I'm not

**Roger:** thought this through more than I have already.

**Miles:** so I I

**Miles:** so I I was thinking that, like,

**Miles:** it would be my product

**Miles:** and then there would be some sort of, like,

**Miles:** you know, where

**Miles:** because it because it doesn't need to be

**Miles:** like, even just the building process.

**Miles:** I think, would be

**Miles:** it, like,

**Miles:** enough that if if you structured that and then

**Miles:** pause it, like, white labeled it and ported it into RM,

**Miles:** that would be be very helpful.

**Miles:** So I was thinking, like, it would sort of be be my product

**Miles:** that I would lease to you guys.

**Roger:** Right. Right.

**Miles:** Because I can bunch of other things

**Roger:** And so within our end, it would look like

**Miles:** well.

**Roger:** would just look like a button inside our end.

**Miles:** Yeah.

**Roger:** Which opens up.

**Miles:** Yeah.

**Roger:** But we will be leasing it from you.

**Roger:** Yeah.

**Roger:** Great.

**Miles:** And there's also, like,

**Miles:** so there there's inside of RM, and there's also just generally

**Miles:** I wanted to speak to you because

**Miles:** like,

**Miles:** there's there's a bunch of different skills that I

**Miles:** would be nice to

**Miles:** build into it in a structured way.

**Miles:** The thought control is a nice example.

**Miles:** There's like, he talked about resourcing skills and

**Miles:** because, essentially,

**Miles:** like, I I think we both sort of get that you need to have this, like, regular

**Roger:** Yeah.

**Miles:** practice that's progressive.

**Miles:** And then you can build these as actual skills that you could take into your life.

**Roger:** Yep.

**Roger:** Yeah. I mean, literally, I was teaching somebody, like, mindfulness practices yesterday.

**Roger:** And then told them go and practice this.

**Roger:** They're like, oh, do you have, like, a video I can follow? I was like, okay. I'll have to record you a video of this.

**Miles:** Right.

**Roger:** This for me this as a as a as a tool for therapists,

**Miles:** Yeah.

**Roger:** to be able

**Roger:** record their own pieces and give them to their clients.

**Miles:** And then have them

**Miles:** structured because

**Miles:** there's there's a like

**Miles:** there's a couple of different directions.

**Miles:** Which is so one of the places I was thinking about it is very much in, a spiritual context.

**Miles:** There's a a lot of practices

**Miles:** especially within

**Miles:** so Jewish annotation sits in a weird place where it's like,

**Miles:** we have a lot of people that talk about it and very few people that do it.

**Miles:** And that's mostly because a lot of it is very inaccessible.

**Miles:** So a lot of the the things that are

**Miles:** talked about are actually quite advanced.

**Miles:** So there's like an idea of like visualizing certain

**Miles:** names, certain names of god.

**Miles:** And that's actually like

**Miles:** you need to have quite

**Miles:** advanced control over the mind's eye.

**Miles:** To do a practice like that.

**Miles:** And

**Miles:** so what

**Miles:** what I was thinking and what I was, like, hoping to do is

**Miles:** again, like,

**Miles:** this conversation is part of a a collection of conversations I'm hoping to have.

**Miles:** Like, tomorrow, I'm having a conversation with a friend of mine

**Miles:** who has a a YouTube channel where he teaches yoga

**Miles:** where essentially I wanna have

**Miles:** like this way of taking all of these like amazing ideas

**Miles:** breaking them down into these scripts and into these progressions

**Miles:** and then handing it over to the user so that it's literally just

**Miles:** sit down and press play.

**Miles:** And you can have that structure over

**Miles:** like years basically.

**Miles:** Where

**Miles:** I'm slowly

**Miles:** progressing, progressing, progressing,

**Miles:** and

**Miles:** it it really is a a tremendous difference to me. Like, the way

**Miles:** the way I think about the difference is, like, between

**Miles:** like, you know, those old fashioned exercise videos

**Miles:** It's like doing one of those every day

**Miles:** versus having a structured lifting program

**Miles:** where you increase the amount of weight that you lift

**Roger:** Right. Right.

**Miles:** And

**Roger:** I mean, already, I'm thinking about

**Roger:** you know, you're talking about the complexity of

**Roger:** of of

**Roger:** know, that particular

**Roger:** Jewish meditation.

**Roger:** Compared with, say, the simplicity of

**Roger:** a

**Roger:** what's it called, like, the path of life just doing the

**Miles:** Yeah.

**Roger:** you know, there's there's a real difference in-depth and complexity.

**Roger:** And

**Roger:** the difference between doing transcendental meditation or Advaita Vedanta

**Miles:** Mhmm.

**Roger:** recognition, like nondual meditations,

**Roger:** And you could probably

**Roger:** it wouldn't take too much thought to put those into, like, an integral hierarchy of

**Miles:** Yeah.

**Roger:** of what

**Roger:** meditation growth would look like.

**Roger:** And then being able to

**Roger:** build, you know,

**Roger:** you've got

**Roger:** level three You've got

**Roger:** you've got a kind of Western occidental Jewish Advaita Vedanta

**Roger:** Sufi

**Roger:** meditation set. And then level four, you've got

**Miles:** Yeah. Or or I mean, there's a question of

**Roger:** etcetera, etcetera.

**Miles:** get nervous when you mix and match.

**Miles:** Spiritual traditions.

**Roger:** Right. But you but people could choose to go down one spiritual tradition

**Miles:** Yeah.

**Roger:** or they could choose, like, cross transcultural.

**Miles:** Yeah.

**Miles:** Yeah. Absolutely.

**Miles:** That's that's a very cool idea.

**Miles:** Because

**Miles:** so one of the things

**Miles:** of the things that I find is

**Miles:** there's a lot of things that are spoken about within the Jewish practice

**Miles:** that there's actually an explicit way to do in some of the eastern systems.

**Miles:** So for example,

**Miles:** there's a a line in in Tanya, which is like the primary text of

**Miles:** Chabad Judaism.

**Miles:** That says the

**Miles:** you know,

**Miles:** the bendy, the

**Miles:** average person that we should aspire to to be

**Miles:** has this, like, great love for all people.

**Miles:** And I, like, heard that, and I was

**Miles:** like, that sounds exactly like meta meditation.

**Miles:** And so

**Miles:** like, another thing that I was thinking is if you had this, like, structured gamified process,

**Miles:** but we took, like,

**Miles:** this notion of a Benigny

**Miles:** right, and all these different skills that he's supposed to have. So he's supposed to

**Miles:** you know, control over thought, speech, and actions,

**Miles:** ability to generate certain emotions,

**Miles:** We took all those skills

**Miles:** and we broke them down into like

**Miles:** you know, like Skyrim, the skill trees.

**Roger:** In what?

**Miles:** Skyrim.

**Miles:** You ever play Skyrim?

**Roger:** No.

**Miles:** Okay.

**Miles:** Know those games where you have, like, skill trees where you progress

**Roger:** Yeah.

**Miles:** and you

**Miles:** go this direction and that direction and that direction?

**Miles:** And so we took all of these subsequent skills, and then there was a skill tree of

**Miles:** a bit of the vanity.

**Miles:** And you're gonna

**Miles:** go

**Miles:** this in terms of loving kindness and this in terms of

**Miles:** thought control and this in terms of speech control and this in terms of

**Miles:** perceptual control,

**Miles:** And then, essentially,

**Miles:** have the, like,

**Miles:** you can practice these things

**Miles:** as easily as possible because it's

**Miles:** even with

**Miles:** like, I

**Miles:** this this is something that I'm super interested in that I take

**Miles:** very seriously.

**Miles:** That I've done a bunch of research in.

**Miles:** And, like, I grew up with

**Miles:** like, my father.

**Miles:** Who obviously knows a lot about this.

**Miles:** And I still found it really, really hard to to put it into practice

**Roger:** Right.

**Miles:** till I found

**Miles:** doctor k's

**Miles:** meditation tracks, and that was the first time I felt like I had a proper

**Miles:** restructured practice that was going somewhere

**Roger:** Right.

**Miles:** And so then I saw that and was like,

**Miles:** I think that we could standardize

**Miles:** and optimize this and do it programmatically.

**Roger:** Right.

**Miles:** And

**Miles:** that was sort of the goal.

**Roger:** Yeah. Have you done it for passengers as well?

**Miles:** I've

**Miles:** I've done a little pieces of it.

**Miles:** I I a friend of mine is very into it, so I might go to

**Miles:** like, a a course that like, a ten day introductory course. I'm thinking about it.

**Roger:** Yeah.

**Roger:** Yeah. Yeah. It's good to experience it.

**Roger:** I think it's a great idea.

**Roger:** Because

**Roger:** yeah, I mean,

**Roger:** like, from my experience is meditating. Right? And I

**Roger:** like, I've been to India a few times to meditate with Mooji, and I've been to, like,

**Roger:** Ramana Ashram to meditate there.

**Miles:** That's cool.

**Roger:** And I've done three or four, like, 10 Devapassanas

**Roger:** So, like, I've got, like, sets of experiences and

**Roger:** like, transcendental meditation, did a course when I was, like, 19 or something.

**Roger:** So there are all sorts of kind of sets of meditation skills that I can just

**Roger:** kind of drop into and I can use and

**Roger:** But I've

**Roger:** I've never had what you're explaining now.

**Roger:** Which is

**Roger:** a systematized process

**Roger:** The idea of them being interrelatable to me is fantastic.

**Roger:** As well.

**Roger:** Because there are right types of meditations for

**Roger:** for the right people at the right time.

**Roger:** And so

**Miles:** Yeah. Like, my

**Roger:** being able

**Roger:** track where somebody's at or just being able

**Roger:** not

**Roger:** necessarily track where somebody's at, but suddenly, I'll just start at the beginning.

**Roger:** Be able to go through a path that

**Roger:** that

**Roger:** that

**Roger:** sets

**Roger:** solid foundations and allows you to

**Roger:** explore

**Roger:** the cavities of being in an orderly

**Roger:** way, I think, is

**Roger:** absolutely fantastic.

**Miles:** Yeah. Because I I also really do think

**Miles:** that

**Miles:** like, this is one of the things that the Vipassana people have as well that makes me a bit

**Miles:** funny is that

**Miles:** if you're a Vipassana guy who's, like, properly into it, it's like, oh, your meditation should be in at two hours a day.

**Miles:** Of just sitting there and

**Roger:** Yeah.

**Miles:** observing the the breath and the body.

**Roger:** Yeah. Yeah.

**Miles:** And, like,

**Miles:** that's crazy to me. Like,

**Miles:** learning to do that is great,

**Miles:** Saying that should be your whole practice for your whole life

**Roger:** Yeah.

**Miles:** is like like that's not enough for people.

**Miles:** So like it's one of the things

**Miles:** that that you said as well that reminds me of something, doctor k talks about.

**Miles:** Is

**Miles:** because he you know his background. He was a a monk He spent, like, nine, ten years Okay. So

**Roger:** I bet so that is background.

**Miles:** he was like a

**Miles:** addicted to video games, and then his he went to

**Miles:** India spent, like, ten years learning meditation and training to be a monk.

**Miles:** And then realized it wasn't for him.

**Miles:** Went back to The States,

**Miles:** trained as a psychiatrist,

**Miles:** and so he now has these, like,

**Miles:** sort of

**Miles:** nice

**Roger:** Right.

**Miles:** western eastern skills.

**Roger:** Right.

**Miles:** And so he talks about how

**Miles:** different

**Miles:** meditations are really like there is no one size fits all.

**Miles:** Like if you take someone

**Roger:** Yeah.

**Miles:** who has OCD and you tell them to just observe their thoughts,

**Roger:** You're fucking crazy.

**Miles:** you're fucking mental. That's like gonna send them in

**Roger:** The worst

**Miles:** So

**Roger:** worst thing you can do for somebody with OCD.

**Miles:** I know.

**Miles:** I have a a friend that has OCD and

**Miles:** done a lot of

**Miles:** different work and stuff like this. And so I just like it's just a a very apparent

**Miles:** metaphor for me.

**Miles:** And but the same sort of thing of, like, if you take someone

**Miles:** like because some people very happy to have very simple practice.

**Miles:** I'm not. I want very structured practice. I wanna like

**Miles:** see

**Miles:** where I'm going and why that matters and have clear goals and like

**Miles:** like,

**Miles:** that that that's who I am. Maybe there are some people that are more happy to just show up and

**Miles:** with the flow.

**Miles:** But I think you could sort of build these different different structures.

**Miles:** And it would be very cool to have

**Miles:** you know,

**Miles:** to bring in a whole bunch of different people to do

**Miles:** their own styles of things.

**Roger:** Right.

**Miles:** So, like, I know some people who teach Jewish meditation,

**Miles:** and I'll get them to come in and write the scripts in

**Miles:** in this structured way.

**Miles:** And then, you know, you could do

**Miles:** whatever it is somatic and

**Miles:** stuff from your backgrounds, and then my friend could do yoga stuff.

**Miles:** And then

**Miles:** would all sort of be

**Miles:** like, I I think there would be separate enough that you could clearly see what was what.

**Miles:** But then

**Roger:** Right.

**Miles:** also stick them together on your own if you wanted to.

**Roger:** Right.

**Miles:** Yeah. It's just it's a to me, it's it's a very exciting project.

**Roger:** Yeah. No. It's super exciting.

**Roger:** It's super exciting.

**Roger:** We only got a couple minutes more today, but I think this will

**Roger:** I think there'll be,

**Roger:** more conversations.

**Miles:** Mhmm.

**Roger:** What what do you need right now?

**Miles:** So

**Miles:** so I

**Miles:** I I so I I guess I have a

**Miles:** question about, like,

**Miles:** from a as someone who's

**Miles:** who's a therapist and a meditation teacher,

**Miles:** on a, like, user design flow of building these things

**Miles:** out,

**Miles:** is it sort of is it the sort of thing that you would use that would be helpful

**Miles:** helpful

**Miles:** And is there anything specific that you can think about in that direction?

**Miles:** Like, as a design expert?

**Roger:** When you ask that question, do mean, in terms of the content that I would

**Roger:** put in it or what I would need the struct what what I would need the system to do?

**Miles:** What you need the system to do on a on a feature level?

**Miles:** Like, it doesn't have to be like, I what I'm hoping is, you know, that you'll

**Miles:** take it home, go play around with it,

**Miles:** and then like

**Miles:** send me your thoughts.

**Roger:** Yeah. Yeah. I think that would be the best

**Miles:** Over that

**Roger:** the best thing.

**Roger:** I mean, nothing that's popping up instantly. Like,

**Roger:** just

**Roger:** obviously, I don't know it very well, but just the very first things I saw

**Roger:** it seems like it's doing a lot of the right things.

**Roger:** So, yeah, there's there's nothing that

**Roger:** exactly jumps out right now.

**Roger:** It's more a space of

**Miles:** So

**Roger:** the whole uncanny valley idea, making sure it feels right and so that

**Roger:** you know, the spaces don't suddenly feel robotic or things like that. So

**Roger:** at the moment, it comes every twenty one seconds. That might need to have variations of

**Roger:** you can switch it into, like,

**Roger:** two separate time sectors. So you can have

**Miles:** Yeah.

**Roger:** twenty one seventeen, twenty one seventeen, things like that, but, like,

**Miles:** Can do that. You can set have multiple split markers.

**Roger:** right.

**Roger:** There are certain things like that. Like, if you're recording music, like, I'm a drummer. Like,

**Roger:** if you if you if you put

**Roger:** if you record

**Roger:** drums and you record everything just electronically and you put

**Roger:** you know, bass on one and a kick on three, and you put hats

**Roger:** one, two, three, four, and you put a little triplet in every third, and then you listen to it,

**Roger:** Sounds shit.

**Roger:** You have to then

**Roger:** get some of it wrong

**Miles:** Right.

**Roger:** You have to move you know, every one of them is slightly bit

**Roger:** one's a bit louder, one's a bit quieter, one's slightly before, one's slightly

**Roger:** afterwards, and then it starts to sound right.

**Miles:** That's interesting.

**Roger:** So the wrongness makes it feel right.

**Miles:** Yeah. That's

**Miles:** like if you look at the Starbucks logo, it's asymmetrical.

**Miles:** They found that the symmetrical one creeped the fuck out of people.

**Roger:** Right.

**Roger:** That's funny.

**Roger:** That's funny. That's funny. Listen. I have to go because I've got a session starting now. But

**Roger:** yeah, have you sent that to me already?

**Miles:** Yeah. Yeah. And I I will build

**Miles:** of the things I'm gonna

**Miles:** build today is that

**Miles:** you'll have be able to make your own stuff.

**Roger:** Cool. Cool.

**Miles:** Within a couple days.

**Roger:** I I I love the idea.

**Roger:** And

**Roger:** I've been there's a guy, like an ex special forces guy

**Roger:** who is now a clinical psychologist.

**Roger:** And, did, a med

**Roger:** mindfulness for PTSD masters at Oxford. And I've been thinking about the idea of getting him to come in

**Roger:** to do

**Roger:** like, a mindfulness

**Roger:** module or project within

**Miles:** Mhmm.

**Roger:** RM.

**Roger:** And

**Roger:** so, literally, you've you've you've come in at the same time that I was thinking about

**Roger:** and I'm thinking, oh, why don't we bring these two together instantly?

**Roger:** And,

**Miles:** Yeah. So I would very much

**Roger:** yeah. And I've

**Miles:** like to talk to him.

**Roger:** yeah. And I'm imagining that as something that

**Roger:** is

**Roger:** available on the special forces version of the app

**Roger:** you know, for free for them. But then on the private

**Roger:** version of our rep.

**Roger:** That there are, like, added features so you can, like,

**Roger:** buy for an extra £10, you know, the

**Roger:** the guided meditation with that guy at the tip.

**Miles:** Yeah. Exactly.

**Roger:** As, like, additional features.

**Roger:** But,

**Roger:** yeah,

**Roger:** let's let's keep talking. Super fascinating. Love the idea. Well done. I think it's gonna be brilliant.

**Roger:** I hope it makes you lots of money.

**Miles:** Thank you.

**Roger:** Alright. Let's fix it.

**Miles:** Alright.

**Roger:** Cheers, Miles.

**Roger:** Bye for now.

**Miles:** Touch.



*[View in Granola](https://notes.granola.ai/t/a4fc68f9-6755-41b8-960d-34dc3882cd17)*
