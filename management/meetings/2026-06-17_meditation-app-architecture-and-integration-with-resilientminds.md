---
Type: Meeting Notes
date: 2026-06-17
url: https://notes.granola.ai/d/7fea4646-fb5f-4301-8f3e-d57ab2330aad
granola_id: not_HN9nlHITLrgwRO
---
>[!Meta]
>participants::[[Miles Bloom]],[[Roger]]
# Meditation app architecture and integration with Resilientminds
## Summary
### Product Demo: Meditation App Overview
- Exercise bank: structured library of practices (yogic, Jewish, somatic, etc.) 
  - Each exercise broken into progressive stages (e.g. “Thought Control” has 5 stages)
  - Variables control duration per session, so day 1 might be 2 min, day 10 is 20 min
  - Segments: speech, sound effects, loops, split markers (for evenly spaced cues)
  - Drag-and-drop interface for building and reordering segments
- Programs layer on top: week-by-week schedules that sequence exercises and durations 
  - Inspired by Dr. K’s (Healthy Gamer) meditation tracks, which only go to stage 2
  - App extends those programmatically, removing the manual audio-editing bottleneck
- AI assist built in: generates scripts from YouTube videos or PDFs 
  - Useful for drafting; needs human tweaking, especially for timed/variable scripts
  - Can also record your own voice per segment instead of using AI voice
- Player view: simple daily interface, press play and follow the guided session
### AI Voice and Content Quality
- AI voices have improved but still feel jarring for meditation specifically 
  - “Uncanny valley” effect is tolerable for learning videos, not for somatic/meditative work
  - Other party previously built \~20 somatic videos with AI, scrapped them all, switched to recording themselves
- Stage directions in scripts help guide tone, but don’t fully solve the problem
- Recording own voice per segment is the cleaner solution for now
### Vision and Fit with RM
- Core value: bridges one-off exercises and a structured, progressive skill-building journey 
  - Analogy: exercise videos vs. a periodized lifting program with increasing weight
  - Aligns directly with “healing journeys” concept already in development at RM
- Proposed model: Miles’s product, white-labeled and embedded inside RM as a button/module 
  - RM leases it; Miles retains ownership and develops it independently
- Potential content contributors: Jewish meditation teachers, yoga (friend with YouTube channel), somatic/therapy content from RM 
  - Skill-tree structure floated: e.g. “Beinoni” archetype from Tanya as a framework 
    - Branches: thought control, speech control, loving-kindness (metta), perceptual control
  - Different traditions kept separate but combinable by the user
- Dr. K’s insight flagged as important: no one-size-fits-all meditation 
  - E.g. telling someone with OCD to “observe their thoughts” is actively harmful
- Integral hierarchy idea: map traditions (Jewish, Advaita Vedanta, Sufi, TM) onto progressive levels
- Ex-special-forces clinical psychologist (Oxford mindfulness for PTSD) already on other party’s radar 
  - Potential to build a mindfulness module within RM
  - Free on the “special forces” app tier; paid add-on on the private/consumer version
### Next Steps
- Send viewer link to Roger (Miles)
- Enable content creation for Roger within a couple of days (Miles)
- Roger to explore the app and send feature feedback
- Arrange follow-up meeting to continue; intro to the ex-special-forces psychologist to explore collaboration
## Transcript
**Roger:** Longer.
**Roger:** Unexpected.
**Miles Bloom:** Yeah. I'm doing good.
**Roger:** Are you doing?
**Roger:** Yeah.
**Roger:** Great. Great. So because of that, I've only got
**Miles Bloom:** Doing good.
**Roger:** just over half an hour now.
**Roger:** So
**Roger:** we'll we'll go as far as we can.
**Roger:** And then
**Roger:** yeah, that might be enough, but we might have to follow that up with a
**Roger:** second meeting.
**Miles Bloom:** Yeah.
**Roger:** Or a third or a
**Miles Bloom:** That's fine.
**Miles Bloom:** Yeah.
**Roger:** Claude Fable has gone.
**Miles Bloom:** Okay.
**Miles Bloom:** So basically,
**Miles Bloom:** this is what I've got built so far.
**Miles Bloom:** It's very, like, bare bones. It's
**Miles Bloom:** it's it's very much a prototype. Like, I haven't spent
**Roger:** Sure.
**Miles Bloom:** any real time on the UI and stuff.
**Roger:** Sure. Small the the the idea in itself and the structure.
**Miles Bloom:** Yeah. Exactly.
**Miles Bloom:** So but basically, the the way it works is there's the exercise bank
**Miles Bloom:** which is like
**Miles Bloom:** has lists of different exercises. So I've just got
**Roger:** Yeah.
**Roger:** Do you have yogic practices and Jewish practices there?
**Miles Bloom:** yeah.
**Miles Bloom:** And then each exercise
**Miles Bloom:** is split into stages.
**Miles Bloom:** So, like, this is a
**Miles Bloom:** is an exercise. It's called thought control.
**Miles Bloom:** That has five different stages.
**Miles Bloom:** Like, the first one is awareness of thoughts and the second one is, like,
**Miles Bloom:** noticing how your thoughts are evoked by different
**Miles Bloom:** perceptions, discarding thoughts,
**Miles Bloom:** evoking positive thoughts, evoking negative thoughts.
**Miles Bloom:** And so the
**Miles Bloom:** the way this is sort of structured
**Miles Bloom:** is that because of the the stages, right,
**Miles Bloom:** it means that you have like play
**Miles Bloom:** clear goals and clear progressions
**Roger:** Right.
**Miles Bloom:** So, you know, you start with like
**Miles Bloom:** you know, five minutes of this and then you build up to ten minutes of
**Miles Bloom:** stage one and then maybe you'll move on to stage two and so on.
**Miles Bloom:** And the thing that's nice about
**Miles Bloom:** how this is structured
**Miles Bloom:** is you have variables
**Miles Bloom:** So this is how long you're doing the actual practice for. So like
**Miles Bloom:** this is
**Roger:** Right.
**Miles Bloom:** if you think in terms of
**Miles Bloom:** like, the gym,
**Miles Bloom:** right, which has been a big
**Miles Bloom:** part of my inspiration,
**Miles Bloom:** So this is like
**Miles Bloom:** you know, how long you'll
**Miles Bloom:** jogging for or whatever.
**Roger:** Yeah. How long how long you're meditating for?
**Miles Bloom:** Yeah.
**Miles Bloom:** And so the way it's set up,
**Miles Bloom:** is that there's these timelines. Right?
**Miles Bloom:** And so then it's split in between
**Miles Bloom:** you have
**Miles Bloom:** these are there's there's different kind of segments.
**Miles Bloom:** So this is a speech segment.
**Miles Bloom:** So it's it's just got a
**Miles Bloom:** a bit of a crap AI voice now, but
**Roger:** So what we're going to do now is simply be aware of thoughts.
**Roger:** What I want you to do is close your eyes for a moment.
**Miles Bloom:** And so there's there's
**Miles Bloom:** a bunch of different types of sex of segments.
**Miles Bloom:** So each segments can have variables,
**Miles Bloom:** You can, like, put the
**Miles Bloom:** pause
**Miles Bloom:** to be a variable the variable length
**Roger:** Right.
**Miles Bloom:** And so what happens is
**Miles Bloom:** essentially, you can
**Miles Bloom:** choose
**Miles Bloom:** entirely how long you want this to be.
**Miles Bloom:** So
**Miles Bloom:** you could have that on day one, it's two minutes and on
**Miles Bloom:** day 10, it's twenty minutes. Right?
**Roger:** Right.
**Miles Bloom:** And so then this is all structured.
**Miles Bloom:** Does does that also make sense? Is that in front of
**Roger:** Yep. Yeah.
**Miles Bloom:** you got?
**Roger:** All clear. It's a great idea.
**Miles Bloom:** And so and there's there's different
**Miles Bloom:** different versions of this. So the
**Miles Bloom:** actually gets quite technical for some of it.
**Miles Bloom:** So, like, you have loops as well.
**Roger:** Right. Makes sense.
**Miles Bloom:** So this is a
**Miles Bloom:** this is
**Miles Bloom:** open and nostril breathing. Right?
**Roger:** Yeah.
**Miles Bloom:** And so this bit, it's essentially it just loops
**Roger:** In. Right.
**Roger:** Switch out.
**Roger:** By the way, I can't hear your sound from your computer other than your voice.
**Miles Bloom:** Okay.
**Roger:** Yeah. So but I I understand that you were putting on for me to hear, but
**Miles Bloom:** Okay. Wait.
**Roger:** Switch out.
**Miles Bloom:** So, yeah, I can I'll I'll send you the link.
**Roger:** In.
**Miles Bloom:** So, anyway,
**Miles Bloom:** So anyway, the the voice reads it out and it goes, you know,
**Miles Bloom:** and it just will loop this. Right? And you can
**Miles Bloom:** set it up so that
**Miles Bloom:** you know, it does a certain number of loops,
**Roger:** Yes. But, again, you could do two minutes or twenty minutes easily.
**Miles Bloom:** Yeah. Or or that the loops are for a
**Miles Bloom:** in duration.
**Miles Bloom:** And so
**Miles Bloom:** And so, like and and also there's
**Miles Bloom:** a so this whole this whole interface
**Miles Bloom:** I sort of designed it so that it's, like, very
**Miles Bloom:** cut and stick and stuff.
**Roger:** Did you say
**Miles Bloom:** So you can
**Roger:** You say cut and cut and paste? Cut and stick?
**Miles Bloom:** yeah. So you you can, like,
**Roger:** Yeah.
**Miles Bloom:** it just drag different segments around.
**Roger:** Okay.
**Miles Bloom:** And, you know, it's like
**Miles Bloom:** pretty straightforward to add different things. Oh, I'm gonna add
**Miles Bloom:** a sound effect or a loop.
**Miles Bloom:** Split markers are a bit more complicated. I can
**Miles Bloom:** explain those.
**Miles Bloom:** So if we go so this is a a stillness practice.
**Miles Bloom:** Essentially, the the way the split markers work is
**Miles Bloom:** might have, like, a duration
**Miles Bloom:** that is spread over an entire section.
**Miles Bloom:** So, like,
**Miles Bloom:** because so in in the in the stillness practice, one of things
**Miles Bloom:** that is very useful is if there's, like,
**Miles Bloom:** constantly
**Miles Bloom:** you get a little pieces of input so that you're not just, like, alone in your body.
**Miles Bloom:** Trying not to move.
**Roger:** Yeah.
**Miles Bloom:** And so having these split markers means that you can split the duration
**Miles Bloom:** Right? So the total duration for this is five minutes.
**Miles Bloom:** And then
**Miles Bloom:** that dead space is split between each of the split markers.
**Miles Bloom:** And so
**Miles Bloom:** on day one, there might
**Miles Bloom:** so if you're doing two minutes of this practice,
**Miles Bloom:** every six seconds, you might get a bit of input.
**Miles Bloom:** And then if you're doing
**Miles Bloom:** Then if you're doing five minutes of this practice,
**Miles Bloom:** you get some input every twenty seconds.
**Roger:** Right.
**Miles Bloom:** And so that's that's the exercise bank.
**Miles Bloom:** Right? So it's it's all nicely structured. You can add stuff and
**Miles Bloom:** tweak stuff. There's also an AI that can help you build stuff.
**Miles Bloom:** That's built in.
**Miles Bloom:** And, like, you can get
**Miles Bloom:** you can, like, extract from a YouTube video or from a PDF and then the AI will make it.
**Miles Bloom:** It make the script with the segments and stuff.
**Miles Bloom:** It's not perfect, and I think, like,
**Miles Bloom:** you'll need
**Miles Bloom:** you'll probably need to tweak it, but it's just very helpful.
**Roger:** That's alright.
**Miles Bloom:** For drafting.
**Miles Bloom:** Yeah. Exactly.
**Roger:** I could take a video that I've made already.
**Roger:** And just pop it in there.
**Miles Bloom:** And
**Roger:** And it would
**Roger:** it would chop out all of the
**Roger:** would take out all of the sound, essentially.
**Miles Bloom:** Yeah. Well, it would do its best. It wouldn't
**Roger:** Does it
**Miles Bloom:** probably wouldn't do it perfectly.
**Roger:** Right.
**Miles Bloom:** And, also, like, one of the things that you find is that
**Miles Bloom:** there's
**Miles Bloom:** slightly diff it's slightly different when you're writing these structured
**Miles Bloom:** scripts
**Miles Bloom:** where the durations might change to if you're just
**Miles Bloom:** doing a guided meditation.
**Miles Bloom:** So, like but it's it's a very it's a very useful feature. You can also do it, like, from a
**Miles Bloom:** straight from a PDF.
**Miles Bloom:** So
**Miles Bloom:** this is, like,
**Miles Bloom:** a guy I like on YouTube called doctor k. Who teaches meditation and stuff.
**Roger:** Yeah.
**Roger:** Yeah. He's he's great.
**Miles Bloom:** So this is, like,
**Miles Bloom:** his notes on how you do a practice.
**Miles Bloom:** And so
**Miles Bloom:** I'd actually just there's a thing where you could put the PDF in, and then it will extract it, and then
**Miles Bloom:** help generate this sort of stuff.
**Miles Bloom:** So doctor k was was a good chunk of the inspiration for this.
**Roger:** Yeah.
**Miles Bloom:** So on his website, he has
**Roger:** He's the gamer guy, isn't he? He's a healthy gamer or something like that.
**Miles Bloom:** meditation
**Miles Bloom:** healthy gamer. Yeah.
**Roger:** Healthy. Yeah.
**Miles Bloom:** So, so on his website, he has this.
**Miles Bloom:** Right?
**Miles Bloom:** Which are essentially they're like
**Miles Bloom:** tracks that you where you put together different meditations.
**Miles Bloom:** So, like, on day one,
**Roger:** Gonna have a look at this. I haven't looked at this.
**Miles Bloom:** start
**Miles Bloom:** you start with just doing, like,
**Miles Bloom:** alternate nostril breathing.
**Miles Bloom:** Right?
**Miles Bloom:** And then on day two,
**Miles Bloom:** you have on week two, sorry, you might add. So this is
**Miles Bloom:** this is also the nostril breathing, but rather than
**Miles Bloom:** physically blocking one nostril,
**Miles Bloom:** you just pay attention to one nostril?
**Roger:** Right.
**Miles Bloom:** And then you keep going
**Miles Bloom:** and it's like, okay. So this is
**Miles Bloom:** what you feel the air
**Miles Bloom:** flowing all the way up.
**Miles Bloom:** To in between your third eye. This is where you focus on the third eye.
**Miles Bloom:** And so this structure, find really nice
**Miles Bloom:** it's one of the things like I
**Miles Bloom:** I do this most days.
**Roger:** And it has the badges as well, beginner, intermediate, and advanced. So you have
**Miles Bloom:** Where I'll sort of sit
**Roger:** the gamified aspect of it.
**Miles Bloom:** Exactly.
**Miles Bloom:** And so like this is
**Miles Bloom:** like, this is one of the practice, like, I
**Miles Bloom:** so
**Miles Bloom:** posted this and ripped it off into my app
**Miles Bloom:** because I wanted to
**Miles Bloom:** structure it and have
**Miles Bloom:** like because I'm not a a meditation teacher, so I don't really know how to
**Miles Bloom:** put together the programs or the scripts.
**Roger:** Right.
**Miles Bloom:** So, like, that's where I need other people
**Miles Bloom:** And so
**Miles Bloom:** this the the the thought control thing I was telling you about is is exactly here.
**Roger:** Yeah.
**Miles Bloom:** But the thing is he only has in this
**Miles Bloom:** in this in these meditation tracks
**Miles Bloom:** he only goes up to the end of stage two because
**Miles Bloom:** by the end of stage two, you're, like, eight weeks in.
**Miles Bloom:** And
**Miles Bloom:** that's
**Miles Bloom:** like, as far as I can tell, they were, like, actually by themselves, like,
**Miles Bloom:** editing these audios and cutting and sticking them together.
**Miles Bloom:** Which is just a lot of work.
**Miles Bloom:** Whereas if
**Miles Bloom:** with my system, it would be be programmatically.
**Miles Bloom:** Right? But this sort of structure was a big part of the inspiration. So you have
**Roger:** Right.
**Miles Bloom:** like, how
**Miles Bloom:** practice the technique,
**Miles Bloom:** and then you have how long you're gonna do it.
**Miles Bloom:** And so that's the programs.
**Roger:** Yeah.
**Miles Bloom:** So here so you have, you know, week one,
**Miles Bloom:** and then
**Miles Bloom:** because of how it's set up on this, you can have durations.
**Miles Bloom:** Right?
**Miles Bloom:** And so this is five minutes of Nali Shuddhi and two minutes of Kai Shneuram.
**Miles Bloom:** And then, essentially, what I did is I because I got to the end of
**Miles Bloom:** program,
**Miles Bloom:** I was like, I wanna keep going, and I wanna do stage three of thought control.
**Miles Bloom:** And so I added a couple of weeks using my system
**Miles Bloom:** so this is the same sort of thing where you do
**Miles Bloom:** know, the preparatory practices and then you do thought control,
**Miles Bloom:** But now it's doing stage three, right, rather than stage two.
**Miles Bloom:** And you can, you know,
**Miles Bloom:** that's gonna I'm gonna keep going with that and then I have
**Miles Bloom:** because because one of the goals that I wanna have
**Miles Bloom:** is
**Miles Bloom:** it should be as easy as possible, like, the
**Miles Bloom:** when you sit down, like because I I try and do it in the mornings before I start my day.
**Miles Bloom:** And I wanna just, like, sit down and press play.
**Miles Bloom:** And so that's sort of what this is is you have
**Roger:** Right.
**Miles Bloom:** like, each each of the week. So this is the first day
**Roger:** So let's begin. Sit with your back straight and close your eyes.
**Miles Bloom:** I don't know if you could you can't hear that, can you?
**Roger:** No. I can't hear it.
**Miles Bloom:** Okay.
**Roger:** Yeah. Send me a link later if you can.
**Roger:** I don't if I need a password a password or whatever, but
**Miles Bloom:** Yeah.
**Miles Bloom:** Yep.
**Miles Bloom:** Send you the link.
**Roger:** that would be
**Miles Bloom:** Yeah.
**Roger:** good.
**Roger:** And then I can have a play with it to understand it better.
**Roger:** Whether that's
**Miles Bloom:** So I can give you
**Roger:** on the user end or
**Roger:** whatever you
**Miles Bloom:** for now, there's there's only,
**Miles Bloom:** I haven't got the permission set up for other people.
**Miles Bloom:** I I there's like they can have
**Miles Bloom:** viewer
**Miles Bloom:** permissions.
**Roger:** Right.
**Miles Bloom:** The edit the admin permissions are a bit too strong, so I need to tweak that.
**Roger:** Yeah. I'm if you I can't need more than viewer right now just to have a look at
**Miles Bloom:** Yeah.
**Roger:** it.
**Miles Bloom:** So that's that's the login.
**Miles Bloom:** Yeah.
**Miles Bloom:** And then
**Roger:** Right. So we
**Miles Bloom:** just
**Miles Bloom:** so this is just the last study is that you can just
**Roger:** see yeah.
**Miles Bloom:** there's just a player where you can see
**Miles Bloom:** each day and then you, you know, you press play
**Roger:** So let's begin. Sit with your back straight and close your eyes.
**Miles Bloom:** and it takes you through
**Miles Bloom:** the script with
**Roger:** Raise your right hand and adopt Naseka Mudra.
**Miles Bloom:** each variable and you can see how long it's gonna be
**Miles Bloom:** Yeah.
**Miles Bloom:** That's that's that product.
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
**Miles Bloom:** Yeah. So one one of the things that's nice
**Roger:** them quite quickly as well.
**Miles Bloom:** is
**Miles Bloom:** you could use AI as much or as little as you want.
**Miles Bloom:** So you can use AI to help with the scripts or you can
**Miles Bloom:** and you can use it to read out the recordings.
**Miles Bloom:** Or if you don't like the way the voice sounds, you can just record
**Miles Bloom:** and set up in the app that you can record each of the segments yourself.
**Miles Bloom:** And then stick them together in the same way and then
**Roger:** Yeah.
**Miles Bloom:** generate the scripts.
**Roger:** Yeah. I think I tried because I tried building some with AI.
**Roger:** Then I tried meditating with them.
**Roger:** And they just feel really shitty.
**Miles Bloom:** Yeah. So I
**Miles Bloom:** I so
**Roger:** At least
**Miles Bloom:** it's okay.
**Roger:** at least
**Roger:** six months ago when I tried it.
**Miles Bloom:** Yeah. So so they it's the voices have got considerably better.
**Roger:** Right. Right.
**Miles Bloom:** And I
**Roger:** But then
**Roger:** finding the exact tone of the word in each moment is
**Miles Bloom:** And
**Roger:** is
**Miles Bloom:** Yeah.
**Roger:** yeah.
**Miles Bloom:** So I I
**Miles Bloom:** messing around with this. So in the scripts, there's you know, you can add stage directions.
**Miles Bloom:** So, like, how the
**Miles Bloom:** the the
**Miles Bloom:** reader should say certain things which helps a bit
**Roger:** Right.
**Miles Bloom:** But I honestly
**Miles Bloom:** I mean, I I think it depends on who you are. Right?
**Miles Bloom:** Because it it doesn't bother me so much.
**Miles Bloom:** It's like
**Miles Bloom:** you know,
**Miles Bloom:** I I like, I've used the AI voices myself.
**Miles Bloom:** And
**Miles Bloom:** I found
**Miles Bloom:** like, it was a little bit janky.
**Roger:** That's what I'm referring to.
**Miles Bloom:** But I was I was willing to tolerate that.
**Roger:** Right. See, I
**Miles Bloom:** For
**Roger:** I find for, like, learning videos that I really don't care.
**Roger:** Even on YouTube, you know, like, the amount of times I go to
**Miles Bloom:** Mhmm.
**Roger:** and they click on a video and it turns I can
**Roger:** can tell. It's like, oh,
**Roger:** not a real human.
**Miles Bloom:** Mhmm.
**Roger:** There is a disappointment there.
**Roger:** But I'll
**Roger:** but I'll push through it.
**Miles Bloom:** Mhmm.
**Roger:** A lot of the time.
**Roger:** I find that I'm doing, like, meditation videos. I find it really jarring.
**Miles Bloom:** Right. You wanna be, like, relaxed and
**Roger:** It's like that's
**Roger:** the moment.
**Miles Bloom:** able to, like, focus and whatever and
**Roger:** Yeah.
**Miles Bloom:** there was, like, that, like, uncanny valley.
**Roger:** Exactly. Which is why I ended up
**Miles Bloom:** Is probably
**Roger:** because originally, before you were on, like, all of the
**Roger:** all of the somatic exercise videos were built with AI originally.
**Roger:** I built, like,
**Roger:** I don't know, 20 of them.
**Roger:** Then it just that just gave me the ick. It's just, like, so cringey.
**Miles Bloom:** Yeah.
**Roger:** I was like, no.
**Roger:** I have to just
**Roger:** just do them ourselves for now until there's a better system in place.
**Miles Bloom:** Yeah. And
**Roger:** Okay. And
**Miles Bloom:** we you could also integrate
**Miles Bloom:** video components in the same sort of script way.
**Miles Bloom:** Haven't really
**Miles Bloom:** thought about that or built it yet.
**Miles Bloom:** But
**Miles Bloom:** it's definitely a direction we could go.
**Roger:** Right. Right.
**Roger:** Yeah. Because, I mean, a lot of those videos that I've made
**Roger:** it's like very brief intro,
**Roger:** then it's we're gonna repeat this exercise
**Roger:** a lot of times
**Roger:** so it's again, it's just
**Roger:** one exercise that gets repeated
**Miles Bloom:** Yeah.
**Roger:** however many times and then a and then a
**Roger:** the tiniest of outros.
**Miles Bloom:** Yeah.
**Roger:** So the same principle applies there.
**Roger:** So when you've been thinking about this, what
**Roger:** obviously, you've
**Roger:** you've set up
**Roger:** or you've suggested
**Roger:** this conversation.
**Roger:** How will you imagine this linking into RM?
**Miles Bloom:** So I I
**Roger:** Because I'm not
**Roger:** thought this through more than I have already.
**Miles Bloom:** so I I
**Miles Bloom:** so I I was thinking that, like,
**Miles Bloom:** it would be my product
**Miles Bloom:** and then there would be some sort of, like,
**Miles Bloom:** you know, where
**Miles Bloom:** because it because it doesn't need to be
**Miles Bloom:** like, even just the building process.
**Miles Bloom:** I think, would be
**Miles Bloom:** it, like,
**Miles Bloom:** enough that if if you structured that and then
**Miles Bloom:** pause it, like, white labeled it and ported it into RM,
**Miles Bloom:** that would be be very helpful.
**Miles Bloom:** So I was thinking, like, it would sort of be be my product
**Miles Bloom:** that I would lease to you guys.
**Roger:** Right. Right.
**Miles Bloom:** Because I can bunch of other things
**Roger:** And so within our end, it would look like
**Miles Bloom:** well.
**Roger:** would just look like a button inside our end.
**Miles Bloom:** Yeah.
**Roger:** Which opens up.
**Miles Bloom:** Yeah.
**Roger:** But we will be leasing it from you.
**Roger:** Yeah.
**Roger:** Great.
**Miles Bloom:** And there's also, like,
**Miles Bloom:** so there there's inside of RM, and there's also just generally
**Miles Bloom:** I wanted to speak to you because
**Miles Bloom:** like,
**Miles Bloom:** there's there's a bunch of different skills that I
**Miles Bloom:** would be nice to
**Miles Bloom:** build into it in a structured way.
**Miles Bloom:** The thought control is a nice example.
**Miles Bloom:** There's like, he talked about resourcing skills and
**Miles Bloom:** because, essentially,
**Miles Bloom:** like, I I think we both sort of get that you need to have this, like, regular
**Roger:** Yeah.
**Miles Bloom:** practice that's progressive.
**Miles Bloom:** And then you can build these as actual skills that you could take into your life.
**Roger:** Yep.
**Roger:** Yeah. I mean, literally, I was teaching somebody, like, mindfulness practices yesterday.
**Roger:** And then told them go and practice this.
**Roger:** They're like, oh, do you have, like, a video I can follow? I was like, okay. I'll have to record you a video of this.
**Miles Bloom:** Right.
**Roger:** This for me this as a as a as a tool for therapists,
**Miles Bloom:** Yeah.
**Roger:** to be able
**Roger:** record their own pieces and give them to their clients.
**Miles Bloom:** And then have them
**Miles Bloom:** structured because
**Miles Bloom:** there's there's a like
**Miles Bloom:** there's a couple of different directions.
**Miles Bloom:** Which is so one of the places I was thinking about it is very much in, a spiritual context.
**Miles Bloom:** There's a a lot of practices
**Miles Bloom:** especially within
**Miles Bloom:** so Jewish annotation sits in a weird place where it's like,
**Miles Bloom:** we have a lot of people that talk about it and very few people that do it.
**Miles Bloom:** And that's mostly because a lot of it is very inaccessible.
**Miles Bloom:** So a lot of the the things that are
**Miles Bloom:** talked about are actually quite advanced.
**Miles Bloom:** So there's like an idea of like visualizing certain
**Miles Bloom:** names, certain names of god.
**Miles Bloom:** And that's actually like
**Miles Bloom:** you need to have quite
**Miles Bloom:** advanced control over the mind's eye.
**Miles Bloom:** To do a practice like that.
**Miles Bloom:** And
**Miles Bloom:** so what
**Miles Bloom:** what I was thinking and what I was, like, hoping to do is
**Miles Bloom:** again, like,
**Miles Bloom:** this conversation is part of a a collection of conversations I'm hoping to have.
**Miles Bloom:** Like, tomorrow, I'm having a conversation with a friend of mine
**Miles Bloom:** who has a a YouTube channel where he teaches yoga
**Miles Bloom:** where essentially I wanna have
**Miles Bloom:** like this way of taking all of these like amazing ideas
**Miles Bloom:** breaking them down into these scripts and into these progressions
**Miles Bloom:** and then handing it over to the user so that it's literally just
**Miles Bloom:** sit down and press play.
**Miles Bloom:** And you can have that structure over
**Miles Bloom:** like years basically.
**Miles Bloom:** Where
**Miles Bloom:** I'm slowly
**Miles Bloom:** progressing, progressing, progressing,
**Miles Bloom:** and
**Miles Bloom:** it it really is a a tremendous difference to me. Like, the way
**Miles Bloom:** the way I think about the difference is, like, between
**Miles Bloom:** like, you know, those old fashioned exercise videos
**Miles Bloom:** It's like doing one of those every day
**Miles Bloom:** versus having a structured lifting program
**Miles Bloom:** where you increase the amount of weight that you lift
**Roger:** Right. Right.
**Miles Bloom:** And
**Roger:** I mean, already, I'm thinking about
**Roger:** you know, you're talking about the complexity of
**Roger:** of of
**Roger:** know, that particular
**Roger:** Jewish meditation.
**Roger:** Compared with, say, the simplicity of
**Roger:** a
**Roger:** what's it called, like, the path of life just doing the
**Miles Bloom:** Yeah.
**Roger:** you know, there's there's a real difference in-depth and complexity.
**Roger:** And
**Roger:** the difference between doing transcendental meditation or Advaita Vedanta
**Miles Bloom:** Mhmm.
**Roger:** recognition, like nondual meditations,
**Roger:** And you could probably
**Roger:** it wouldn't take too much thought to put those into, like, an integral hierarchy of
**Miles Bloom:** Yeah.
**Roger:** of what
**Roger:** meditation growth would look like.
**Roger:** And then being able to
**Roger:** build, you know,
**Roger:** you've got
**Roger:** level three You've got
**Roger:** you've got a kind of Western occidental Jewish Advaita Vedanta
**Roger:** Sufi
**Roger:** meditation set. And then level four, you've got
**Miles Bloom:** Yeah. Or or I mean, there's a question of
**Roger:** etcetera, etcetera.
**Miles Bloom:** get nervous when you mix and match.
**Miles Bloom:** Spiritual traditions.
**Roger:** Right. But you but people could choose to go down one spiritual tradition
**Miles Bloom:** Yeah.
**Roger:** or they could choose, like, cross transcultural.
**Miles Bloom:** Yeah.
**Miles Bloom:** Yeah. Absolutely.
**Miles Bloom:** That's that's a very cool idea.
**Miles Bloom:** Because
**Miles Bloom:** so one of the things
**Miles Bloom:** of the things that I find is
**Miles Bloom:** there's a lot of things that are spoken about within the Jewish practice
**Miles Bloom:** that there's actually an explicit way to do in some of the eastern systems.
**Miles Bloom:** So for example,
**Miles Bloom:** there's a a line in in Tanya, which is like the primary text of
**Miles Bloom:** Chabad Judaism.
**Miles Bloom:** That says the
**Miles Bloom:** you know,
**Miles Bloom:** the bendy, the
**Miles Bloom:** average person that we should aspire to to be
**Miles Bloom:** has this, like, great love for all people.
**Miles Bloom:** And I, like, heard that, and I was
**Miles Bloom:** like, that sounds exactly like meta meditation.
**Miles Bloom:** And so
**Miles Bloom:** like, another thing that I was thinking is if you had this, like, structured gamified process,
**Miles Bloom:** but we took, like,
**Miles Bloom:** this notion of a Benigny
**Miles Bloom:** right, and all these different skills that he's supposed to have. So he's supposed to
**Miles Bloom:** you know, control over thought, speech, and actions,
**Miles Bloom:** ability to generate certain emotions,
**Miles Bloom:** We took all those skills
**Miles Bloom:** and we broke them down into like
**Miles Bloom:** you know, like Skyrim, the skill trees.
**Roger:** In what?
**Miles Bloom:** Skyrim.
**Miles Bloom:** You ever play Skyrim?
**Roger:** No.
**Miles Bloom:** Okay.
**Miles Bloom:** Know those games where you have, like, skill trees where you progress
**Roger:** Yeah.
**Miles Bloom:** and you
**Miles Bloom:** go this direction and that direction and that direction?
**Miles Bloom:** And so we took all of these subsequent skills, and then there was a skill tree of
**Miles Bloom:** a bit of the vanity.
**Miles Bloom:** And you're gonna
**Miles Bloom:** go
**Miles Bloom:** this in terms of loving kindness and this in terms of
**Miles Bloom:** thought control and this in terms of speech control and this in terms of
**Miles Bloom:** perceptual control,
**Miles Bloom:** And then, essentially,
**Miles Bloom:** have the, like,
**Miles Bloom:** you can practice these things
**Miles Bloom:** as easily as possible because it's
**Miles Bloom:** even with
**Miles Bloom:** like, I
**Miles Bloom:** this this is something that I'm super interested in that I take
**Miles Bloom:** very seriously.
**Miles Bloom:** That I've done a bunch of research in.
**Miles Bloom:** And, like, I grew up with
**Miles Bloom:** like, my father.
**Miles Bloom:** Who obviously knows a lot about this.
**Miles Bloom:** And I still found it really, really hard to to put it into practice
**Roger:** Right.
**Miles Bloom:** till I found
**Miles Bloom:** doctor k's
**Miles Bloom:** meditation tracks, and that was the first time I felt like I had a proper
**Miles Bloom:** restructured practice that was going somewhere
**Roger:** Right.
**Miles Bloom:** And so then I saw that and was like,
**Miles Bloom:** I think that we could standardize
**Miles Bloom:** and optimize this and do it programmatically.
**Roger:** Right.
**Miles Bloom:** And
**Miles Bloom:** that was sort of the goal.
**Roger:** Yeah. Have you done it for passengers as well?
**Miles Bloom:** I've
**Miles Bloom:** I've done a little pieces of it.
**Miles Bloom:** I I a friend of mine is very into it, so I might go to
**Miles Bloom:** like, a a course that like, a ten day introductory course. I'm thinking about it.
**Roger:** Yeah.
**Roger:** Yeah. Yeah. It's good to experience it.
**Roger:** I think it's a great idea.
**Roger:** Because
**Roger:** yeah, I mean,
**Roger:** like, from my experience is meditating. Right? And I
**Roger:** like, I've been to India a few times to meditate with Mooji, and I've been to, like,
**Roger:** Ramana Ashram to meditate there.
**Miles Bloom:** That's cool.
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
**Miles Bloom:** Yeah. Like, my
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
**Miles Bloom:** Yeah. Because I I also really do think
**Miles Bloom:** that
**Miles Bloom:** like, this is one of the things that the Vipassana people have as well that makes me a bit
**Miles Bloom:** funny is that
**Miles Bloom:** if you're a Vipassana guy who's, like, properly into it, it's like, oh, your meditation should be in at two hours a day.
**Miles Bloom:** Of just sitting there and
**Roger:** Yeah.
**Miles Bloom:** observing the the breath and the body.
**Roger:** Yeah. Yeah.
**Miles Bloom:** And, like,
**Miles Bloom:** that's crazy to me. Like,
**Miles Bloom:** learning to do that is great,
**Miles Bloom:** Saying that should be your whole practice for your whole life
**Roger:** Yeah.
**Miles Bloom:** is like like that's not enough for people.
**Miles Bloom:** So like it's one of the things
**Miles Bloom:** that that you said as well that reminds me of something, doctor k talks about.
**Miles Bloom:** Is
**Miles Bloom:** because he you know his background. He was a a monk He spent, like, nine, ten years Okay. So
**Roger:** I bet so that is background.
**Miles Bloom:** he was like a
**Miles Bloom:** addicted to video games, and then his he went to
**Miles Bloom:** India spent, like, ten years learning meditation and training to be a monk.
**Miles Bloom:** And then realized it wasn't for him.
**Miles Bloom:** Went back to The States,
**Miles Bloom:** trained as a psychiatrist,
**Miles Bloom:** and so he now has these, like,
**Miles Bloom:** sort of
**Miles Bloom:** nice
**Roger:** Right.
**Miles Bloom:** western eastern skills.
**Roger:** Right.
**Miles Bloom:** And so he talks about how
**Miles Bloom:** different
**Miles Bloom:** meditations are really like there is no one size fits all.
**Miles Bloom:** Like if you take someone
**Roger:** Yeah.
**Miles Bloom:** who has OCD and you tell them to just observe their thoughts,
**Roger:** You're fucking crazy.
**Miles Bloom:** you're fucking mental. That's like gonna send them in
**Roger:** The worst
**Miles Bloom:** So
**Roger:** worst thing you can do for somebody with OCD.
**Miles Bloom:** I know.
**Miles Bloom:** I have a a friend that has OCD and
**Miles Bloom:** done a lot of
**Miles Bloom:** different work and stuff like this. And so I just like it's just a a very apparent
**Miles Bloom:** metaphor for me.
**Miles Bloom:** And but the same sort of thing of, like, if you take someone
**Miles Bloom:** like because some people very happy to have very simple practice.
**Miles Bloom:** I'm not. I want very structured practice. I wanna like
**Miles Bloom:** see
**Miles Bloom:** where I'm going and why that matters and have clear goals and like
**Miles Bloom:** like,
**Miles Bloom:** that that that's who I am. Maybe there are some people that are more happy to just show up and
**Miles Bloom:** with the flow.
**Miles Bloom:** But I think you could sort of build these different different structures.
**Miles Bloom:** And it would be very cool to have
**Miles Bloom:** you know,
**Miles Bloom:** to bring in a whole bunch of different people to do
**Miles Bloom:** their own styles of things.
**Roger:** Right.
**Miles Bloom:** So, like, I know some people who teach Jewish meditation,
**Miles Bloom:** and I'll get them to come in and write the scripts in
**Miles Bloom:** in this structured way.
**Miles Bloom:** And then, you know, you could do
**Miles Bloom:** whatever it is somatic and
**Miles Bloom:** stuff from your backgrounds, and then my friend could do yoga stuff.
**Miles Bloom:** And then
**Miles Bloom:** would all sort of be
**Miles Bloom:** like, I I think there would be separate enough that you could clearly see what was what.
**Miles Bloom:** But then
**Roger:** Right.
**Miles Bloom:** also stick them together on your own if you wanted to.
**Roger:** Right.
**Miles Bloom:** Yeah. It's just it's a to me, it's it's a very exciting project.
**Roger:** Yeah. No. It's super exciting.
**Roger:** It's super exciting.
**Roger:** We only got a couple minutes more today, but I think this will
**Roger:** I think there'll be,
**Roger:** more conversations.
**Miles Bloom:** Mhmm.
**Roger:** What what do you need right now?
**Miles Bloom:** So
**Miles Bloom:** so I
**Miles Bloom:** I I so I I guess I have a
**Miles Bloom:** question about, like,
**Miles Bloom:** from a as someone who's
**Miles Bloom:** who's a therapist and a meditation teacher,
**Miles Bloom:** on a, like, user design flow of building these things
**Miles Bloom:** out,
**Miles Bloom:** is it sort of is it the sort of thing that you would use that would be helpful
**Miles Bloom:** helpful
**Miles Bloom:** And is there anything specific that you can think about in that direction?
**Miles Bloom:** Like, as a design expert?
**Roger:** When you ask that question, do mean, in terms of the content that I would
**Roger:** put in it or what I would need the struct what what I would need the system to do?
**Miles Bloom:** What you need the system to do on a on a feature level?
**Miles Bloom:** Like, it doesn't have to be like, I what I'm hoping is, you know, that you'll
**Miles Bloom:** take it home, go play around with it,
**Miles Bloom:** and then like
**Miles Bloom:** send me your thoughts.
**Roger:** Yeah. Yeah. I think that would be the best
**Miles Bloom:** Over that
**Roger:** the best thing.
**Roger:** I mean, nothing that's popping up instantly. Like,
**Roger:** just
**Roger:** obviously, I don't know it very well, but just the very first things I saw
**Roger:** it seems like it's doing a lot of the right things.
**Roger:** So, yeah, there's there's nothing that
**Roger:** exactly jumps out right now.
**Roger:** It's more a space of
**Miles Bloom:** So
**Roger:** the whole uncanny valley idea, making sure it feels right and so that
**Roger:** you know, the spaces don't suddenly feel robotic or things like that. So
**Roger:** at the moment, it comes every twenty one seconds. That might need to have variations of
**Roger:** you can switch it into, like,
**Roger:** two separate time sectors. So you can have
**Miles Bloom:** Yeah.
**Roger:** twenty one seventeen, twenty one seventeen, things like that, but, like,
**Miles Bloom:** Can do that. You can set have multiple split markers.
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
**Miles Bloom:** Right.
**Roger:** You have to move you know, every one of them is slightly bit
**Roger:** one's a bit louder, one's a bit quieter, one's slightly before, one's slightly
**Roger:** afterwards, and then it starts to sound right.
**Miles Bloom:** That's interesting.
**Roger:** So the wrongness makes it feel right.
**Miles Bloom:** Yeah. That's
**Miles Bloom:** like if you look at the Starbucks logo, it's asymmetrical.
**Miles Bloom:** They found that the symmetrical one creeped the fuck out of people.
**Roger:** Right.
**Roger:** That's funny.
**Roger:** That's funny. That's funny. Listen. I have to go because I've got a session starting now. But
**Roger:** yeah, have you sent that to me already?
**Miles Bloom:** Yeah. Yeah. And I I will build
**Miles Bloom:** of the things I'm gonna
**Miles Bloom:** build today is that
**Miles Bloom:** you'll have be able to make your own stuff.
**Roger:** Cool. Cool.
**Miles Bloom:** Within a couple days.
**Roger:** I I I love the idea.
**Roger:** And
**Roger:** I've been there's a guy, like an ex special forces guy
**Roger:** who is now a clinical psychologist.
**Roger:** And, did, a med
**Roger:** mindfulness for PTSD masters at Oxford. And I've been thinking about the idea of getting him to come in
**Roger:** to do
**Roger:** like, a mindfulness
**Roger:** module or project within
**Miles Bloom:** Mhmm.
**Roger:** RM.
**Roger:** And
**Roger:** so, literally, you've you've you've come in at the same time that I was thinking about
**Roger:** and I'm thinking, oh, why don't we bring these two together instantly?
**Roger:** And,
**Miles Bloom:** Yeah. So I would very much
**Roger:** yeah. And I've
**Miles Bloom:** like to talk to him.
**Roger:** yeah. And I'm imagining that as something that
**Roger:** is
**Roger:** available on the special forces version of the app
**Roger:** you know, for free for them. But then on the private
**Roger:** version of our rep.
**Roger:** That there are, like, added features so you can, like,
**Roger:** buy for an extra £10, you know, the
**Roger:** the guided meditation with that guy at the tip.
**Miles Bloom:** Yeah. Exactly.
**Roger:** As, like, additional features.
**Roger:** But,
**Roger:** yeah,
**Roger:** let's let's keep talking. Super fascinating. Love the idea. Well done. I think it's gonna be brilliant.
**Roger:** I hope it makes you lots of money.
**Miles Bloom:** Thank you.
**Roger:** Alright. Let's fix it.
**Miles Bloom:** Alright.
**Roger:** Cheers, Miles.
**Roger:** Bye for now.
**Miles Bloom:** Touch.
