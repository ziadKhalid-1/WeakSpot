# HANDOFF.md: كورة الخميس (worked example)

Example output of Day 2 prompt 13, for the كورة الخميس demo (direction A, لوحة الملعب). Every item is grounded in the
screens and in `mock.json` next to this file. Anything assumed is marked [?]. Day 3 starts here: the nouns become
tables, the verbs become actions, and the rules come from the error, empty and full states.

## 1. Who and why
- **Primary persona:** سعود, a player. Opens the app in the car the day before the match, one hand, about 10 seconds.
  Second role: the captain (الكابتن), who books the pitch and collects the money.
- **Core task:** see Thursday's match and say "I'm in" or "I'm out" in one tap.
- **Not for:** league organisers, in-app payment, chat, statistics.

## 2. Screens
1. **Home (الرئيسية):** the next match card (pitch, time, "9 of 14" confirmed, share per player) and the "أنا جاي" button.
2. **Match (المباراة):** who is in, who is out, the count, the share per player.
3. **Booking (الحجز), captain only:** pick a pitch and a time from nearby pitches with prices, then confirm.
4. **Success (تم):** shown after "أنا جاي": you are on the list, with the updated count.

## 3. Flows
**Happy path (player):** Home → tap "أنا جاي" → Success ("انضفت للقائمة، صرنا ١٠ من ١٤") → back to Home with the new count.
**Happy path (captain):** Home → Booking → pick ملعب الحي, Thursday 9 pm → confirm → Home shows the new match.

**Unhappy paths:**
- No internet when tapping "أنا جاي" → the button shows an error and keeps the tap to retry; the count does not change.
- Match is full (14 of 14) → "أنا جاي" is replaced by "اكتملت. تبغى نحطك احتياط؟" [?] (waitlist assumed).
- No match this week (`emptyMatch: null`) → Home shows the empty state and, for the captain only, "احجز ملعب".
- Player changes their mind → "مو جاي" moves them to out; the count drops by one.
- Chosen pitch is taken at that time (`free: false`) → Booking shows it greyed out with "محجوز في هالوقت".
- Not the captain opens Booking → the entry is hidden; a direct link shows "الحجز للكابتن بس".

## 4. Data (nouns)
- **User:** id (text), name (text, can be long or English), isCaptain (boolean).
- **Match:** id (text), code (text, e.g. KH-4471-22), pitchId (→ Pitch), date (date-time), capacity (number), price
  (number, total in SAR).
- **Attendance** (a player on a match): matchId (→ Match), userId (→ User), status ("in" | "out"), updatedAt [?].
- **Pitch:** id (text), name (text), area (text), pricePerHour (number, SAR), free (boolean for the chosen time).

## 5. Actions (verbs)
| Action | Screen | Who | Reads | Changes |
|---|---|---|---|---|
| See next match | Home | everyone | Match, Attendance, Pitch | nothing |
| Say I'm in | Home, Match | any player | Match.capacity, count of "in" | Attendance → "in" |
| Say I'm out | Match | any player | Attendance | Attendance → "out" |
| See who is in | Match | everyone | Attendance, User | nothing |
| List nearby pitches | Booking | captain | Pitch | nothing |
| Book a match | Booking | captain | Pitch.free | creates Match |

## 6. Rules
- A player can be "in" at most once per match.
- "in" count can never go above `capacity` (the full state).
- Only a captain can create or change a match.
- A pitch that is not free at the chosen time cannot be booked.
- Share per player = `price` ÷ number of "in" players, rounded up to the nearest riyal [?].
- A match in the past cannot be joined [?].

## 7. States (per screen)
- **Home:** empty «ما فيه مباراة هالأسبوع. الكابتن يقدر يحجز ملعب.»; loading: the match card skeleton; error
  «ما قدرنا نجيب المباراة. اسحب لتحت عشان تحاول مرة ثانية.»
- **Match:** empty list «لسا ما أحد أكّد. كن أول واحد.»; full «اكتملت: ١٤ من ١٤»; error «ما قدرنا نحفظ ردك. جرّب مرة ثانية.»
- **Booking:** loading: the pitch list skeleton; empty «ما فيه ملاعب فاضية في هالوقت. جرّب وقت ثاني.»; error
  «ما قدرنا نأكد الحجز. ما انخصم شي.»

## 8. Sample data
See `mock.json` next to this file: one long Arabic name (عبدالرحمن بن عبدالله بن محمد العبدالكريم), English names
(Lina M., Omar, Pitch Seven), 9 of 14 in, one out, three pitches with one taken, and `emptyMatch: null` for the empty state.

## 9. Open questions for the backend
- Do we need accounts, or is a name plus a shared match link enough for the MVP? [?]
- Waitlist when the match is full: yes or no? [?]
- Who can become captain, and can there be two? [?]
- Should "price" be per hour (from the pitch) times the match length, or a fixed total? [?]
- Do we keep past matches, or only the next one? [?]
