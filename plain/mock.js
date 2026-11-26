// Same data as web/src/data/mock.json, wrapped so a double-clicked page can read it.
// Keep the three troublemakers: one very long Arabic name, one English name, one number-heavy line.
window.MOCK = {
  user: { name: 'عبدالرحمن بن عبدالله بن محمد العبدالكريم', city: 'الرياض' },
  items: [
    {
      id: '1',
      title: 'عنصر عنوانه طويل مره عشان نشوف وش يصير لما السطر ينكسر في شاشة الجوال',
      subtitle: 'اسم طويل: هل ينقطع بنقاط ولا يدف اللي جنبه؟',
      price: 1250.5,
      count: 14,
      date: '2026-12-03T21:00:00',
    },
    {
      id: '2',
      title: 'Coffee Lab',
      subtitle: 'اسم إنجليزي وسط واجهة عربية، لاحظ الترتيب',
      price: 18,
      count: 3,
      date: '2026-12-04T08:15:00',
    },
    {
      id: '3',
      title: 'طلب رقم',
      code: '4471-22-0098',
      subtitle: 'سطر كله أرقام: 3 من 12 · 87% · 2026/12/05',
      price: 0,
      count: 120,
      date: '2026-12-05T17:45:00',
    },
  ],
};
