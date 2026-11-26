# DESIGN.md — اعرف نقاط ضعفك

Single source of truth for every screen. If a value is not in this file, it is not in the design.
Source: the approved "ورق هادي" direction, its style sheet artboard, and the full-app prototype (`Proto-App`).
Platform: phone web app, artboard 390 × 844 px.

> **Status tags.** `[approved]` = drawn in an approved artboard. `[pending]` = not designed yet, do not build until decided. Everything without a tag is approved.

---

## 1. Direction

| | |
|---|---|
| **Name** | ورق هادي (Calm Paper) |
| **Concept** | Revising on a clean sheet of paper: warm off-white ground, ink text, one olive action per screen. |
| **3 adjectives** | سريع (fast) · واضح (clear) · مطمّن (reassuring) |

**This design never:**
1. Uses shadows, gradients, blur or glass effects. Depth comes from 1px borders and the white surface on the paper ground only.
2. Shows more than **one** primary (olive filled) button on a screen.
3. Uses emoji, filled icons, or color alone to carry meaning. Every state also has text or an icon shape.

Also avoided (the two "NOT" words): مدرسي (school-worksheet look), مزحوم (crowded). In practice: max 4 answer options, no decorative illustrations, no more than 3 text sizes on one screen.

---

## 2. Colors

Exactly 7 tokens + 1 pressed variant. **No other hex values anywhere.**

| Token | Hex | Role | Allowed on | Never on |
|---|---|---|---|---|
| `--color-paper` | `#F7F4EE` | Page ground | Screen background only | Cards, buttons, text |
| `--color-surface` | `#FFFFFF` | Raised surface | Cards, answer options, upload box, input, text on olive | Page background |
| `--color-ink` | `#1F2328` | Primary text | Headings, body, answer text, icons | Any background |
| `--color-stone` | `#6B6760` | Secondary text | Small labels, counters (سؤال ٣ من ١٠), helper text, disabled text, upload-box dashed border | Body copy, headings |
| `--color-sand` | `#DDD6CA` | Lines | Borders, dividers, progress track, disabled button fill | Text, icons |
| `--color-olive` | `#2F6F5E` | Action (accent) | Primary button, selected option border + radio, progress fill, links, accent icons, badge text, secondary button border/text | Large backgrounds, more than one filled button per screen |
| `--color-olive-pressed` | `#245849` | Pressed action | Primary button `:active`, link `:hover`/`:active` | Anything else |
| `--color-olive-tint` | `#E6F0EC` | Selected ground | Selected answer, badge (slide chip) fill, success icon circle, active tab | Text |

### Measured contrast (WCAG 2.x)
| Pair | Ratio | Use |
|---|---|---|
| ink on paper | 14.39:1 | body, headings |
| ink on surface | 15.80:1 | answer text |
| ink on olive-tint | 13.57:1 | selected answer text |
| stone on paper | 5.12:1 | labels |
| stone on surface | 5.62:1 | helper text in cards |
| stone on sand | 3.90:1 | disabled button text (exempt: disabled) |
| surface on olive | 5.91:1 | primary button text |
| surface on olive-pressed | 8.18:1 | pressed button text |
| olive on olive-tint | 5.07:1 | badge text |
| olive on paper | 5.38:1 | secondary button, links |

**Known risk:** `sand` borders on `paper` = 1.32:1 and `surface` vs `paper` is also low. Cards and options are identified by their text, not their outline, so this passes text rules, but outlines will be faint in direct sunlight. Do not add a color to fix it without a decision.

---

## 3. Typography

**Fonts** (Google Fonts, one request):
```
https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700&family=Readex+Pro:wght@500;600&display=swap
```
- Display: `'Readex Pro', sans-serif`, headings, buttons, card titles
- Text: `'Noto Sans Arabic', sans-serif`, everything else

**Type scale: 4 sizes only**

| Token | Font | Size | Weight | Line-height | Used for |
|---|---|---|---|---|---|
| `--text-title` | Readex Pro | 22px | 600 | 1.6 | Screen title, question text |
| `--text-action` | Readex Pro | 18px | 600 | 1.4 | Buttons, card titles, app name |
| `--text-body` | Noto Sans Arabic | 16px | 400 (500 when selected) | 1.7 | Body, answers, list rows, file name |
| `--text-label` | Noto Sans Arabic | 14px | 500 | 1.6 | Counters, helper text, badges, tab labels |

Rules: `letter-spacing: 0` everywhere. No italics. No ALL-CAPS. No text below 14px.

---

## 4. Spacing, radius, borders, shadows

**Spacing scale:** `4 · 8 · 12 · 16 · 24 · 32` px

| Where | Value |
|---|---|
| Screen padding | block-start 24, inline 20, block-end 32 |
| Gap between screen sections | 24 |
| Gap between answer options | 10 ⚠️ off-scale, documented exception from the approved style sheet |
| Card padding | 16 |
| Gap inside card (title row → badges) | 10 ⚠️ off-scale exception |
| Gap between badges | 8 |
| Badge padding | block 4, inline 10 ⚠️ off-scale exception |
| Icon ↔ label gap | 12 |
| Gap between stacked buttons | 10 ⚠️ off-scale exception |

**Sizes**
| Element | Height |
|---|---|
| Primary / secondary / disabled button | 56 |
| Answer option | min 56 |
| List row, collapsible toggle | min 48 |
| Icon button (close ✕) | 44 × 44 |
| Progress bar | 6 |
| Touch target minimum | 44 × 44 |

**Radius**
| Token | Value | Used for |
|---|---|---|
| `--radius-md` | 14px | Buttons, answer options, cards, upload box, input, tab bar |
| `--radius-sm` | 8px | Badges |
| `--radius-full` | 9999px | Progress bar, radio dot, success icon circle |

**Borders**
| Use | Value |
|---|---|
| Default (cards, options, input, dividers) | `1px solid var(--color-sand)` |
| Selected option, secondary button | `1.5px solid var(--color-olive)` |
| Upload box | `1.5px dashed var(--color-stone)` |

**Shadows:** none. `box-shadow: none` on every element.

**Motion** (from the approved prototype)
| Event | Animation |
|---|---|
| Screen enters | 320ms `cubic-bezier(.2,.7,.2,1)`, opacity 0→1 + translate 28px from the inline-end side (left in RTL) |
| Next question | old fades out + moves 20px toward inline-end in 180ms, then the new one appears |
| Result cards | fade 300ms ease-out, staggered: 120ms, 200ms, 280ms |
| Option select | background + border color 150ms ease |
| Progress bar | width 300ms ease |
| `prefers-reduced-motion: reduce` | all of the above off |

---

## 5. Components

`—` = state does not apply. `[pending]` = needed but not designed yet (states step).

### Primary button: one per screen
| State | Spec |
|---|---|
| Default | bg `olive`, text `surface`, `--text-action`, h56, radius 14, no border |
| Pressed | bg `olive-pressed` |
| Disabled | bg `sand`, text `stone`, not focusable as action. Used for «التالي» until an answer is picked `[approved]` |
| Loading | `[pending]` |
| Error | — |

Labels in use: «اختر ملف الفصل» · «ابدأ الأسئلة» · «التالي» · «شوف النتيجة» (last question) · «ابدأ فصل جديد»

### Secondary button
| State | Spec |
|---|---|
| Default | bg transparent, `1.5px solid olive`, text `olive`, `--text-action`, h56, radius 14 |
| Pressed | `[pending]` |
| Disabled | `[pending]` |
| Loading / Error | — |

Label in use: «اختر ملف ثاني»

### Answer option (radio)
| State | Spec |
|---|---|
| Default | bg `surface`, `1px sand`, text `ink` 16/400, radio 20px ring `1.5px stone` |
| Selected | bg `olive-tint`, `1.5px olive`, text 16/500, radio 20px with 6px `olive` ring |
| Pressed | `[pending]` |
| Disabled | `[pending]` |
| Correct / wrong feedback | `[pending]`: not shown during the quiz in the current design |

Markup: `role="radiogroup"` on the list, `role="radio"` + `aria-checked` on each option. 4 options, letters أ ب ج د.

### Card: weak part
| State | Spec |
|---|---|
| Default | bg `surface`, `1px sand`, radius 14, padding 16. Row 1: part name (`--text-action`) at inline-start, score «[٢] من [٣] غلط» (`--text-label`, `stone`) at inline-end. Row 2: badges |
| Weakest part emphasis | `[pending]`: currently shown only by order (first card). Weak-part color not decided |

### Badge: slide number
Default: bg `olive-tint`, text `olive` `--text-label`, radius 8, padding 4/10. Text «شريحة ٤». Static, not tappable.

### Progress bar
Track `sand` 6px, fill `olive`, radius full. Fill grows from inline-start (right in RTL). Has `role="progressbar"` with `aria-valuenow`.
Used in the quiz (question n of total) and on «نجهّز أسئلتك…».

### Upload box
| State | Spec |
|---|---|
| Default | bg `surface`, `1.5px dashed stone`, radius 14, fills the remaining height. 56px upload icon `olive`, «اضغط واختر ملف PDF» (`--text-action`), «ملف واحد لفصل واحد» (`--text-label`, `stone`). Tapping opens the file picker (`accept="application/pdf"`) |
| Loading | Screen «نجهّز أسئلتك…»: title, helper line, card with file icon + file name + progress bar `[approved]` |
| Success | Screen «أسئلتك جاهزة»: 56px `olive-tint` circle with `olive` check, title, «[١٠] أسئلة من الفصل.», file card, primary + secondary button `[approved]` |
| Error (no text / too big / not PDF) | `[pending]` |

### List row: known part
Default: min-h 48, `1px sand` bottom border, name (`--text-body`) at inline-start, «[٣] من [٣] صح» (`--text-label`, `stone`) at inline-end.

### Collapsible toggle: «أجزاء تعرفها»
Default: min-h 48, top border `1px sand`, chevron-down 20px. Open: chevron-up, rows fade in 300ms. `aria-expanded` true/false.

### Icon button: close ✕
44 × 44, no background, 22px ✕ in `ink`, stroke 1.75. `aria-label="إنهاء الأسئلة"`. Returns to upload (no confirm dialog in current design).

### Input
Default: h56, bg `surface`, `1px sand`, radius 14, padding-inline 16, `--text-body`. Label above in `--text-label` `stone`. Other states `[pending]`. *Not used on any current screen.*

### Tab bar
bg `surface`, radius 14, 3 equal items, min-h 56. Active: bg `olive-tint`, icon + label `olive`. Inactive: `stone`. *Not used on any current screen. The app is a single linear flow.*

### Icons
Outline only, stroke width 1.75, round caps and joins. Sizes: 56 (hero), 28 (file card), 22 (close, tabs), 20 (chevrons). Color `ink` by default, `olive` when accent.

---

## 6. Arabic and RTL

- `<html lang="ar" dir="rtl">`. Never set `dir="ltr"` on layout containers.
- **Logical properties only:** `margin-inline-start/end`, `padding-inline`, `padding-block`, `inset-inline-start/end`, `border-inline-start`, `text-align: start/end`. No `left`/`right` in CSS, except the motion `translateX` values, which must be flipped by direction (or written with a `--dir` multiplier).
- Flex rows follow the reading direction automatically. Do not use `row-reverse` to fake RTL.
- `letter-spacing: 0` on all Arabic text.
- **Numerals:** Arabic-Indic `٠١٢٣٤٥٦٧٨٩` in all UI copy (counters, scores, slide numbers, question count). Format with `Intl.NumberFormat('ar-SA')` or a digit map. Never mix digit systems on one screen.
- **File names** keep their own script and direction: wrap in `<bdi>` or `dir="ltr"`, truncate with ellipsis on one line.
- **Mirror in RTL:** back/forward chevrons and arrows, the progress fill (starts at the right), the screen-enter and next-question slide direction.
- **Do not mirror:** ✕ close, ✓ check, document/PDF and upload icons, chevron up/down, the radio dot.
- Copy tone: friendly Saudi (e.g. «نطلع لك أسئلة منها»، «شوف النتيجة»).

---

## Open decisions (do not guess in code)
1. Weak-part color, or keep emphasis by order only.
2. Error color and copy for upload errors (no text in PDF, file too big, not a PDF).
3. Loading state for buttons; pressed/disabled for secondary button and options.
4. Number of questions per session (prototype uses 10).
5. After «نجهّز أسئلتك…»: go straight to the quiz, or show «أسئلتك جاهزة» (prototype shows it).
6. Confirm before leaving mid-quiz (✕), or exit directly (current).
7. When the student opens the app: after studying a chapter, or during pre-exam review.
