<!--
  الصق هذا القسم في آخر CLAUDE.md حقك (أو AGENTS.md لو أداتك Codex أو Cursor).
  لا تستبدل الملف: ملفك فيه قرارات أمس (الـPRD والـstack). هذا قسم يُضاف تحت.
  ما عندك CLAUDE.md أصلًا (ماشي على مثال كورة الخميس)؟ غيّر اسم هذا الملف إلى CLAUDE.md.
-->

## UI rules (Day 2: design first)

- Read `DESIGN.md` before any UI work. Use only its tokens. If something you need is not in
  DESIGN.md, ask me first. Never invent a colour, a font size or a font.
- The frontend lives in `web/` (Vite + React). Tokens live ONLY in `web/src/tokens.css` and mirror
  DESIGN.md. No hex colours and no px font sizes anywhere else.
- When you fill `web/src/tokens.css` from DESIGN.md, delete the `--starter-banner` line.
- Arabic UI, RTL. `dir="rtl"` is set once on `<html>`. Logical CSS properties only
  (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`); never left/right.
  Do not hand-reverse flex rows. No `letter-spacing` and no uppercase on Arabic text.
- English names go in `<bdi>`. Codes with dashes and long numbers go in `<span dir="ltr">`.
  Inputs that take user text get `dir="auto"`.
- Numbers, prices and dates go only through `web/src/lib/format.js` (Intl). The numeral system is
  written in DESIGN.md (default: Arabic-Indic ١٢٣ in the UI, 0-9 only in code; never zero-pad;
  no middle dot (U+00B7) next to a number, use «،»).
- Mock data only, from `web/src/data/mock.json`, until Day 3. No backend, no real API calls.
  Mock data is Arabic and keeps one very long name, one English name and one number-heavy line.
- One screen per task. Do not touch other screens, routing or tokens unless I ask.
- Design files live in `design/`: `refs/` (references + notes.md), `wireframes.md`, `mockups/`, `shots/`.
- Never tell me a UI task is done without a viewport screenshot at 375px wide (and 1280px when I ask),
  compared with the mockup in `design/mockups/`. Save the screenshots in `design/shots/`.
- If the stack in this file is not Vite + React, keep these rules, port them to that stack,
  and ask me before replacing `web/`.
