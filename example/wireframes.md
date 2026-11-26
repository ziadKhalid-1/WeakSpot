# Wireframes: كورة الخميس (مثال)

375px, RTL: the start side is the right. Short English labels inside the boxes; the Arabic text is under each screen.

## Screen 1: home

```text
+------------------------------------+
| (bell)           THURSDAY FOOTBALL |
|------------------------------------|
|                         NEXT MATCH |
|               Thu 21:00, Hay pitch |
| 9/14 in         [..........######] |
| [             I'M IN             ] |
|------------------------------------|
|                     PITCHES NEARBY |
| +--------------+  +--------------+ |
| |    [photo]   |  |    [photo]   | |
| | 120 SAR  Hay |  |  90 SAR Nadi | |
| +--------------+  +--------------+ |
|------------------------------------|
| PROFILE       MATCHES       [HOME] |
+------------------------------------+
```
- Main action: I'M IN
- Arabic: THURSDAY FOOTBALL = كورة الخميس، NEXT MATCH = المباراة الجاية، 9/14 in = «٩ من ١٤ أكّدوا»، I'M IN = أنا جاي، PITCHES NEARBY = ملاعب قريبة، HOME / MATCHES / PROFILE = الرئيسية / المباريات / حسابي
- empty: no match booked yet -> the card becomes "ما فيه مباراة هالخميس" + [BOOK A PITCH] (احجز ملعب)
- loading: one skeleton card + two skeleton tiles
- error: "ما قدرنا نجيب المباراة. حاول مرة ثانية" + [RETRY] in place of the card

## Screen 2: match

```text
+------------------------------------+
| [< back]               MATCH - THU |
|------------------------------------|
|                   Hay pitch, 21:00 |
|                9/14   (big numbers)|
|                 SHARE: 13.33 SAR   |
|------------------------------------|
|                           WHO'S IN |
| (ok)          Abdulrahman bin Abd..|
| (ok)                    Faisal Al..|
| (ok)                       Lina M. |
| ...                                |
|------------------------------------|
| [ NOT COMING ]   [     I'M IN    ] |
+------------------------------------+
```
- Main action: I'M IN (NOT COMING is secondary)
- Arabic: WHO'S IN = مين جاي، SHARE = نصيبك، NOT COMING = مو جاي
- empty: nobody confirmed -> "كن أول واحد" + [I'M IN]
- loading: skeleton rows
- error: inline "ما انحفظ ردّك. حاول مرة ثانية" under the buttons

## Screen 3: booking (captain)

```text
+------------------------------------+
| [< back]               BOOK PITCH  |
|------------------------------------|
|                   DAY: Thu 3 Dec   |
|               TIME: [21:00 v]      |
|------------------------------------|
| (o) Hay pitch        120 SAR / hr  |
| ( ) Nadi pitch        90 SAR / hr  |
| ( ) Pitch Seven      200 SAR / hr  |
|------------------------------------|
|                 TOTAL: 120 SAR     |
| [          CONFIRM BOOKING       ] |
+------------------------------------+
```
- Main action: CONFIRM BOOKING
- Arabic: BOOK PITCH = احجز ملعب، DAY = اليوم، TIME = الوقت، TOTAL = المجموع، CONFIRM BOOKING = أكّد الحجز
- empty: no pitches available at that time -> "كل الملاعب محجوزة الساعة ٩:٠٠ م. جرّب وقت ثاني"
- loading: skeleton rows in place of the list
- error: "ما تم الحجز. ما انخصم شي" + [RETRY]

## Flow

```text
[home] --I'M IN--> (count updates on home)
[home] --tap match card--> [match] --I'M IN / NOT COMING--> [match]
[home] --BOOK A PITCH (empty state or captain)--> [booking] --CONFIRM--> [home]
```
