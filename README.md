# WeakSpot

**Upload your chapter slides, answer a short quiz, and find out exactly which parts you don't know yet.**

WeakSpot is a study tool for university students. Instead of re-reading a whole chapter, you get a quick quiz built from your own slides, and a short list of the weak parts to review, with the slide numbers to go back to.

> Arabic working title: معيار

## The problem

Students spend about two days reviewing before an exam, and a good part of that time goes on material they already know. There is no quick way to tell which parts of a chapter are actually weak.

## What it does (MVP)

1. **Upload** a chapter's slides (one PDF).
2. **Answer** a short set of questions generated from those slides, one at a time.
3. **See your weak spots**: the topics you got wrong, with the slide numbers to review.

## Goal

Cut review time from **about 2 days to about 2 hours**.

How we'll know it worked: one week after the first real use, before an actual exam, review takes 2 hours or less and the student feels they understood what the lesson requires.

## Who it's for

A 20-year-old computer engineering student, using it on a phone right after finishing a study session. (Laptop use is still an open question.)

## Scope

**In the first version (4-day build, solo)**
- One PDF, one chapter per session
- Questions generated from the uploaded slides
- Results screen with weak topics and slide references

**Not in the first version**
- Accounts and login
- Saving results between sessions, or comparing chapters
- Explaining the lessons or teaching the material
- File types other than PDF (PowerPoint, images, scans)
- Multiple chapters or subjects in one session
- Publishing to an app store

## Open questions

- Phone, laptop, or both?
- How much of the two days goes on things the student already knows? (Not measured yet.)
- What do the slides look like: how many pages, mostly text or mostly images?
- Multiple choice or written answers, and how many questions per session?
- How does a student know they "understood" a lesson?

## Riskiest assumptions

1. Questions generated from slides reveal real weak spots, not just shallow recall.
2. The slides cover everything the exam will ask.
3. The time lost is mostly on material the student already knows, so finding weak spots really saves the time.

## Status

Idea and requirements stage. No code yet. Tech choices are still to be decided.

## Docs

- [PRD.md](./PRD.md): one-page product requirements (Arabic)
