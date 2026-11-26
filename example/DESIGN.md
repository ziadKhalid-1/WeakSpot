# DESIGN.md: كورة الخميس (example, filled)

## 1. Direction

- Name: لوحة الملعب (Scoreboard)
- Concept: the stadium board on a Thursday night: dark pitch, chalk lines, one loud number.
- Adjectives: calm, sporty, confident
- Primary reference: `design/refs/01-primary-booking-app.png`
- Mockup: `design/mockups/home-375.png`

### This design never does

- Gradients, glossy 3D balls, stock photos of players, emoji as icons.
- Centered body text, three identical cards in a row, more than one orange thing per screen.
- No Inter, Roboto, Arial, Space Grotesk. No purple.

## 2. Colors

| Token | Hex | Role | Allowed on |
|---|---|---|---|
| `--color-bg` | `#0E3B2E` | pitch, page background (dominant) | page |
| `--color-surface` | `#154A3A` | turf, cards and sheets | cards, inputs |
| `--color-ink` | `#F4F1E8` | chalk, main text | all text |
| `--color-muted` | `#A9BFB3` | sage, secondary text | captions, meta lines |
| `--color-primary` | `#FF5A1F` | whistle, the main button | one button per screen |
| `--color-on-primary` | `#141414` | text on the whistle button | button labels only |
| `--color-accent` | `#FF5A1F` | the count («٩ من ١٤») | text 24px and bigger only |
| `--color-line` | `#2C5E4D` | chalk-line dividers | borders, dividers |
| `--color-danger` | `#FFA48A` | errors | error text and banners |

Contrast (WCAG): chalk on pitch 11.0, chalk on turf 9.0, sage on turf 5.2, button label on whistle 5.9,
danger on turf 5.3. Whistle as text on turf is 3.25, so it is used only for big numerals (24px+).

## 3. Typography

- Display: Noto Kufi Arabic 700 (titles and the big numerals), Google Fonts
- Body: Noto Sans Arabic 400 / 700, Google Fonts (checked: «حتى» and «على» read right)
- Scale (size / line-height / weight):
  - numeral (the count): 64px / 1 / 700
  - h1: 28px / 1.35 / 700
  - h2: 20px / 1.4 / 700
  - body: 16px / 1.75 / 400
  - caption: 13px / 1.6 / 400
- No letter-spacing, no uppercase on Arabic. Opaque text colours only.

## 4. Spacing and layout

- Spacing scale: 4, 8, 16, 24, 40 (tokens `--space-1` ... `--space-5`)
- Radius: 8px. Border: 1px solid `--color-line`. Shadow: none.
- Max content width: 480px on phones and tablets; 2 columns at 1280px (match card + pitches).
- Breakpoints: 375 / 768 / 1280. Touch targets: 44px minimum, the main button 56px.

## 5. Components

- Button primary: whistle bg, `--color-on-primary` label, 56px tall, full width on phones, radius 8.
  hover: 8% darker; focus: 3px chalk outline, 2px offset; disabled: 40% opacity; loading: label
  becomes "لحظة..." and the button keeps its width; error: message under it in `--color-danger`.
- Button secondary: transparent, 1px chalk border, chalk label. Same sizes and states.
- Input / select: turf bg, 1px line border, chalk text, 44px tall, `dir="auto"` on text inputs.
- Card: turf bg, 1px line border, radius 8, padding 16. No shadow.
- Navigation: bottom bar, 3 tabs (الرئيسية / المباريات / حسابي), active tab in chalk + 2px whistle line on top.
- List item (player): check mark (never mirrored) + name in `<bdi>`, truncated with an ellipsis.
- Empty: one short line + one primary button. Loading: skeleton blocks in `--color-line`.
- Error: plain Arabic + a secondary "حاول مرة ثانية" button.

## 6. Arabic and RTL

- `<html lang="ar" dir="rtl">`. Logical properties only. Flex rows follow `dir`.
- Mirror: back arrow, chevrons, the progress bar (fills from the right).
- Never mirror: the logo, check marks, the clock icon, numbers.
- Player names in `<bdi>`; booking codes in `<span dir="ltr">`; inputs `dir="auto"`.
- Numerals: Arabic-Indic ١٢٣ in the Arabic UI (counts, prices, times, dates); 0-9 only in code.
  Never zero-pad (٥ not ٠٥); no middle dot (U+00B7) next to a number (the Arabic zero is a dot), use «،».
  Calendar: Gregorian. Locale: `ar-SA-u-ca-gregory` (in `web/src/lib/format.js`).
- Prices: «١٢٠ ر.س.» through `fmtMoney`. Count: «٩ من ١٤». Time: «٩:٠٠ م» through `fmtTime`.
  A count still at 0 is said in words («ما أحد أكّد للحين»), never a lone «٠».

## 7. Motion

- Durations: 150ms (hover, press), 320ms (page load). Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- The one page-load animation: the count ticks up from ١ to ٩, then the button fades in. Nothing else moves.
- `prefers-reduced-motion`: the count appears at its value, no tick.

## 8. The one bold place

- The count «٩ من ١٤» on the home screen, in whistle orange, 64px, Noto Kufi Arabic 700 (the Arabic-Indic
  digits are the bold moment). Everything else is calm.
