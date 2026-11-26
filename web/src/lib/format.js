// format.js: ONE place for numbers, prices and dates. Never build them by hand.
//
// The numerals decision lives here and in DESIGN.md:
//   'ar-SA-u-ca-gregory'         -> Arabic-Indic digits ١٢٣ and the Gregorian calendar (starter default)
//   'ar-SA'                      -> Arabic-Indic digits ١٢٣ and the Hijri calendar
//   'ar-SA-u-ca-gregory-nu-latn' -> Western digits 0-9 and the Gregorian calendar (only if your users expect 0-9)
// The default follows the camp's rule: Arabic-Indic for every number the user reads in the Arabic UI;
// 0-9 only inside code. Never zero-pad (٥ not ٠٥), and never put a middle dot (U+00B7) next to a number
// (the Arabic zero «٠» is a dot): separate facts with «،» or a thin rule.
// Pick one, write it in DESIGN.md, and change only this line.
export const LOCALE = 'ar-SA-u-ca-gregory';

const number = new Intl.NumberFormat(LOCALE);
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'SAR' });
const day = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const time = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

export const fmtNumber = (n) => number.format(n);
export const fmtMoney = (n) => money.format(n);
export const fmtDay = (iso) => day.format(new Date(iso));
export const fmtTime = (iso) => time.format(new Date(iso));

// Counted phrases with correct Arabic plural forms (Intl.PluralRules), e.g.
//   fmtCount(1, QUESTIONS) -> «سؤال واحد»,  fmtCount(2, QUESTIONS) -> «سؤالين»,  fmtCount(10, QUESTIONS) -> «١٠ أسئلة»
// forms: { zero, one, two, few, many, other }; «{n}» is replaced by the formatted number.
const plural = new Intl.PluralRules(LOCALE);
export const fmtCount = (n, forms) => (forms[plural.select(n)] ?? forms.other).replace('{n}', fmtNumber(n));
