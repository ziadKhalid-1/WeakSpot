# HANDOFF.md: معيار

For a developer building with Claude Code. Read together with **DESIGN.md** (look and components) and **mock.json** (sample data).
Source: the approved screens in the design canvas (`Proto-App` full flow, plus Upload / Quiz / Result screens).
Anything not visible in a screen is marked **[?]**. Items taken from the PRD rather than a screen are marked **[?] (PRD)**.

---

## 1. Who and why

| | |
|---|---|
| **Primary persona** | University Computer Engineering student, about 20, on a phone [?] (PRD). Spends about two days revising before an exam, part of it on lessons they already know [?] (PRD). |
| **Core task** | Upload one chapter's slides (PDF), answer short multiple-choice questions, and see which parts are weak and which slide numbers to go back to. |
| **Not for** | Teaching or explaining the lesson [?] (PRD) · more than one chapter or file per session · non-PDF files (PowerPoint, images, scans) [?] (PRD) · accounts, login, saved history [?] (PRD) · app-store install [?] (PRD) |

---

## 2. Screens

| # | Screen | One line |
|---|---|---|
| 1 | **Upload** (الرفع) | Title «ارفع سلايدات الفصل», a large dashed upload box, and the primary button «اختر ملف الفصل». Both open the phone's file picker for a PDF. |
| 2 | **Preparing** (نجهّز أسئلتك…) | Shows the chosen file name and a progress bar while questions are generated. |
| 3 | **Ready** (أسئلتك جاهزة) | Check icon, question count, file name card, «ابدأ الأسئلة» (primary) and «اختر ملف ثاني» (secondary). |
| 4 | **Quiz** (الأسئلة) | One question per screen: counter «سؤال ٣ من ١٠», progress bar, ✕ close, 4 options (أ ب ج د), and «التالي» (disabled until an option is picked; becomes «شوف النتيجة» on the last question). |
| 5 | **Result** (النتيجة) | «[٣] أجزاء تحتاج ترجع لها» / «من أصل [٨] أجزاء». One card per weak part with score and slide badges, a collapsible «أجزاء تعرفها ([٥])» list, and «ابدأ فصل جديد». |

---

## 3. Flows

### Happy path
1. **Upload:** student taps the upload box or «اختر ملف الفصل». The phone file picker opens (PDF only).
2. Student picks a PDF, and the app moves to **Preparing** showing the file name and a filling progress bar.
3. When questions are ready, the app moves to **Ready** showing «[١٠] أسئلة من الفصل.» and the file name.
4. Student taps «ابدأ الأسئلة», and **Quiz** opens at question ١ of N.
5. Student taps an option. It becomes selected (olive), and «التالي» becomes enabled.
6. Student taps «التالي». The next question slides in, and the counter and progress bar advance. Repeat 5–6.
7. On the last question the button reads «شوف النتيجة». Tapping it opens **Result**.
8. Student reads the weak-part cards and their slide numbers. Optionally taps «أجزاء تعرفها» to expand or collapse the known parts.
9. Student taps «ابدأ فصل جديد», which returns to **Upload** with everything cleared.

### Unhappy paths
| # | Trigger | What the screens show today | Needed |
|---|---|---|---|
| U1 | Student cancels the file picker | Stays on Upload, nothing changes | — |
| U2 | Wrong file picked (correct PDF, wrong chapter) | On **Ready**, «اختر ملف ثاني» returns to Upload and clears the file | — |
| U3 | Student wants to quit mid-quiz | ✕ returns to Upload immediately and discards all answers. No confirm dialog | Confirm dialog? [?] |
| U4 | Student taps «التالي» without picking | Button is disabled, nothing happens | — |
| U5 | File is not a PDF | **Not designed** [?] | Error state on Upload |
| U6 | PDF has no extractable text (scanned / images only) | **Not designed** [?] | Error state on Upload |
| U7 | PDF too large / too many slides | **Not designed** [?] | Error state + limit [?] |
| U8 | Question generation fails or times out | **Not designed** [?] | Error on Preparing + retry [?] |
| U9 | Student closes/refreshes the browser mid-quiz | **Not designed**. Session data is lost [?] (PRD: no saving between sessions) | Decide: lose or keep in local storage [?] |
| U10 | Student answers everything correctly (no weak parts) | **Not designed** [?] | Empty state on Result |
| U11 | Generated question is wrong or unrelated to the slides | **Not designed**. No way to report [?] | Report/skip? [?] |
| U12 | No network | **Not designed** [?] | — |

---

## 4. Data (nouns)

All data lives for one session only [?] (PRD). No user accounts.

**Session**
| Field | Type | Notes |
|---|---|---|
| id | string | |
| fileName | string | shown on Preparing and Ready, LTR, truncated |
| slideCount | integer | [?] needed to validate slide numbers; not shown |
| status | enum: `idle` · `preparing` · `ready` · `quiz` · `done` | matches the 5 screens |
| questionCount | integer | shown «[١٠] أسئلة», «سؤال ٣ من ١٠» |
| currentIndex | integer | 0-based question position |

**Part** (a section of the chapter)
| Field | Type | Notes |
|---|---|---|
| id | string | |
| title | string | can be Arabic, English or mixed; can be long (wraps) |
| slides | integer[] | slide numbers shown as badges «شريحة ٤» |

**Question**
| Field | Type | Notes |
|---|---|---|
| id | string | |
| partId | string → Part | |
| sourceSlide | integer | [?] not shown in UI; links question to a slide |
| text | string | shown as the 22px title |
| options | string[4] | exactly 4, labelled أ ب ج د |
| correctIndex | integer 0–3 | never shown during the quiz |

**Answer**
| Field | Type | Notes |
|---|---|---|
| questionId | string → Question | |
| selectedIndex | integer 0–3 | |
| isCorrect | boolean | derived |

**Result** (derived, not stored separately [?])
| Field | Type | Notes |
|---|---|---|
| totalParts | integer | «من أصل [٨] أجزاء» |
| weakParts | {partId, wrongCount, questionCount, slides}[] | one card each, «[٢] من [٣] غلط» |
| knownParts | {partId, correctCount, questionCount}[] | collapsed list, «[٣] من [٣] صح» |

---

## 5. Actions (verbs)

Only one actor: the student (no accounts, no roles).

| Action | Screen | Reads | Changes |
|---|---|---|---|
| Choose file | Upload | — | creates Session (fileName), status → `preparing`, starts generation |
| Generate questions | Preparing (system) | uploaded PDF | creates Parts + Questions, status → `ready` |
| Choose another file | Ready | — | clears Session, status → `idle` |
| Start quiz | Ready | questionCount | status → `quiz`, currentIndex = 0 |
| Pick option | Quiz | current Question | sets the pending selectedIndex (can change before «التالي») |
| Next | Quiz | pending selection | saves Answer, currentIndex + 1 |
| See result («شوف النتيجة») | Quiz (last) | all Answers, Parts | saves last Answer, computes Result, status → `done` |
| Close quiz (✕) | Quiz | — | discards Answers and Session, status → `idle` |
| Expand/collapse known parts | Result | knownParts | UI only |
| Start new chapter | Result | — | clears everything, status → `idle` |

---

## 6. Rules

1. One PDF = one chapter per session. Accept `application/pdf` only.
2. Questions are multiple choice with exactly 4 options.
3. «التالي» is disabled until an option is selected. The selection can be changed until «التالي» is tapped.
4. The last question's button label is «شوف النتيجة», not «التالي».
5. Correct/wrong is **not** shown during the quiz. It appears only as counts on the Result screen.
6. No back button inside the quiz. Answers are final once «التالي» is tapped [?] (implied: no back control exists).
7. Every question belongs to exactly one Part, and every Part has at least one slide number.
8. A Part is **weak** if [?]: the rule is not defined. Mock data uses "at least one wrong answer". The wireframe copy «[٣] من [٣] غلط» suggests about 3 questions per part, which conflicts with 10 questions over 8 parts.
9. Weak parts are listed weakest first [?] (order is the only emphasis in the design).
10. Known parts = all Parts that are not weak. Collapsed by default.
11. Leaving the quiz (✕) or starting a new chapter clears all session data.
12. All numbers in the UI use Arabic-Indic digits. File names keep their own script.
13. Only one primary button per screen (DESIGN.md).

---

## 7. States: text per screen

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Upload | Default screen: «ارفع سلايدات الفصل» / «نطلع لك أسئلة منها، ونقول لك وش الأجزاء اللي تحتاج ترجع لها.» / box «اضغط واختر ملف PDF» · «ملف واحد لفصل واحد» | — (moves to Preparing) | **Not designed** [?] (U5–U7) |
| Preparing | — | «نجهّز أسئلتك…» / «نقرأ السلايدات ونطلّع الأسئلة منها.» + file name + progress bar | **Not designed** [?] (U8) |
| Ready | — | — | — |
| Quiz | — | — (questions already loaded) | **Not designed** [?] |
| Result | **Not designed** [?] (U10: no weak parts) | — | — |

---

## 8. Sample data

See **mock.json**. A Computer Engineering chapter on memory hierarchy: 24 slides, 8 parts, 10 questions, 10 answers, and the resulting 3 weak + 5 known parts (matches the counts in the Result screen).
- Long name: part `p7`, «تحويل العناوين الافتراضية إلى عناوين فيزيائية باستخدام جداول الصفحات متعددة المستويات». Use it to test wrapping in the card title.
- English name: part `p6`, «Average Memory Access Time (AMAT)». Use it to test mixed direction.
- File name `CPE380_Ch5_Memory_Hierarchy.pdf` tests LTR truncation.

---

## 9. Open questions for the backend

1. **PDF text extraction:** which library/service, and what happens with image-only slides? (U6)
2. **Part detection:** how is a chapter split into Parts? From slide titles, by an AI model, or by fixed slide ranges? [?]
3. **Question generation:** which model, how many questions (prototype: 10), and how do we check the correct answer is really correct? [?]
4. **Weak-part rule:** how many questions per Part, and how many wrong answers mark it weak? (Rule 8)
5. **Generation time:** target duration for Preparing, and timeout/retry behaviour? (U8)
6. **Limits:** max file size and max slide count? (U7)
7. **Storage:** is the PDF kept on a server at all, and for how long? Is it deleted at session end? [?] (PRD: session only)
8. **Session persistence:** if the student refreshes mid-quiz, is the session lost or restored from local storage? (U9)
9. **Slide numbers:** are badge slides the Part's slides or only the slides behind the wrong questions? [?]
10. **Bad questions:** any reporting or skipping of a wrong/irrelevant question? (U11)
11. **Cost per session:** model usage per upload, and any rate limit since there are no accounts? [?]
