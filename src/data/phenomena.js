// תופעות לאורך השנה, בקידוד קבוע: חי, צומח, דומם ושמיים.
// months: [מ, עד] (כולל, יכול לעבור את סוף השנה), או 'all'. sections: [מ, עד] של מספרי מקטעים.
// date: תאריך קבוע בשנה (MM-DD) לאירועי שמיים. הצומח נבנה מנתוני iNaturalist (src/lib/phenomena.js).

export const KINDS = {
  chai: { name: 'חי', sub: 'נדידות ובעלי חיים', color: '#b5652b' },
  tzomeach: { name: 'צומח', sub: 'פריחות', color: '#8e5bb5' },
  domem: { name: 'דומם', sub: 'אקלים, מים וגאולוגיה', color: '#4f6d8a' },
  shamayim: { name: 'שמיים', sub: 'מטאורים, ירח ותקופות השנה', color: '#24305e' },
};

export const EVENTS = [
  // חי
  { kind: 'chai', name: 'עגורים חורפים בעמק החולה', months: [11, 3], sections: [2, 3], note: 'עשרות אלפי עגורים מבלים את החורף בעמק. השביל עובר בשולי העמק.' },
  { kind: 'chai', name: 'שקנאים בבריכות הדגים', months: [10, 11], sections: [2, 2], note: 'להקות לבנות עוצרות בעמק החולה בדרך לאפריקה.' },
  { kind: 'chai', name: 'שקנאים במישור החוף', months: [10, 11], sections: [17, 19], note: 'עוצרים במאגרים ובבריכות הדגים של השרון.' },
  { kind: 'chai', name: 'חסידות מעל עמק הירדן, אביב', months: [3, 4], sections: [8, 10], note: 'להקות ענק נודדות צפונה לאורך השבר הסורי־אפריקני.' },
  { kind: 'chai', name: 'חסידות מעל עמק הירדן, סתיו', months: [8, 9], sections: [8, 10], note: 'הנדידה דרומה, בקבוצות גדולות מעל העמק.' },
  { kind: 'chai', name: 'נדידת דורסים מעל אילת', months: [3, 5], sections: [53, 56], note: 'עקבים, דיות ועיטים חוצים את הרי אילת בדרכם צפונה.' },
  { kind: 'chai', name: 'נדידת דורסים מעל המרכז', months: [9, 10], sections: [20, 22], note: 'בסתיו הדורסים נודדים דרומה לאורך שולי הרי השומרון, ממזרח לשביל.' },
  { kind: 'chai', name: 'דבוראים מגיעים לקנן', months: [4, 5], sections: [1, 30], note: 'קולניים וצבעוניים, מקננים בגדות עפר.' },
  { kind: 'chai', name: 'יעלים במצוקי המדבר', months: 'all', sections: [31, 56], note: 'נראים כל השנה, בעיקר בבוקר ובערב, ליד מקורות מים ומצוקים.' },
  // דומם: אקלים ומים
  { kind: 'domem', name: 'שלג בחרמון', months: [12, 3], sections: [1, 1], note: 'לפעמים השלג מגיע גם לתחילת השביל. לבדוק את מצב האתר לפני יציאה.' },
  { kind: 'domem', name: 'הגשם הראשון (היורה)', months: [10, 11], sections: [1, 30], note: 'מבשרי הגשם פורחים, והאבק נשטף מהנוף.' },
  { kind: 'domem', name: 'זרימה בנחלי הגליל', months: [1, 4], sections: [5, 13], note: 'דישון, עמוד וציפורי זורמים אחרי חורף גשום.' },
  { kind: 'domem', name: 'שיטפונות בערוצי המדבר', months: [10, 4], sections: [31, 56], note: 'גשם רחוק יכול להציף ערוץ יבש. לא נכנסים לערוצים כשיש התרעה.' },
  { kind: 'domem', name: 'שרב באביב', months: [4, 5], sections: [1, 56], note: 'ימים חמים ויבשים במיוחד. ללכת מוקדם ולשאת יותר מים.' },
  { kind: 'domem', name: 'שרב בסתיו', months: [9, 10], sections: [1, 56], note: 'גלי חום לפני בוא הגשם.' },
  // דומם: גאולוגיה, כל השנה
  { kind: 'domem', geo: true, name: 'גיר ובזלת במצוק הארבל', months: 'all', sections: [9, 9], note: 'מצוק של כ-400 מטר מעל הכנרת, בשולי בקע הירדן.' },
  { kind: 'domem', geo: true, name: 'רכס הכרמל', months: 'all', sections: [14, 16], note: 'גוש גיר ודולומיט מוגבה, עם מערות פרהיסטוריות בנחל מערות.' },
  { kind: 'domem', geo: true, name: 'רכסי כורכר ודיונות', months: 'all', sections: [17, 19], note: 'חול ים מאובן לאורך החוף, ודיונות נודדות בפולג ובארסוף.' },
  { kind: 'domem', geo: true, name: 'מערות הפעמון', months: 'all', sections: [26, 27], note: 'מחצבות קדומות בקירטון הרך של בית גוברין.' },
  { kind: 'domem', geo: true, name: 'בקע ים המלח', months: 'all', sections: [34, 36], note: 'המקום הנמוך ביותר ביבשה, בשבר הסורי־אפריקני.' },
  { kind: 'domem', geo: true, name: 'המכתש הקטן', months: 'all', sections: [37, 37], note: 'עמק סגור שנוצר בבליה של קמר. תופעה ייחודית לנגב ולסיני.' },
  { kind: 'domem', geo: true, name: 'המכתש הגדול', months: 'all', sections: [38, 39], note: 'חולות צבעוניים, ושכבות סלע נטויות ב"כרבולת".' },
  { kind: 'domem', geo: true, name: 'מכתש רמון', months: 'all', sections: [42, 44], note: 'המכתש הגדול בעולם מסוגו, כ-40 ק"מ אורכו.' },
  { kind: 'domem', geo: true, name: 'תמנע ונחושת קדומה', months: 'all', sections: [52, 53], note: 'מכרות נחושת מהתקופה הכלקוליתית ועמק ססגון הצבעוני.' },
  { kind: 'domem', geo: true, name: 'גרניט ואבן חול בהרי אילת', months: 'all', sections: [54, 56], note: 'הסלעים העתיקים ביותר בארץ, מתחת לשכבות הגיר.' },
  // שמיים
  { kind: 'shamayim', name: 'מטר הקוודרנטידים', date: '01-03', sections: [1, 56] },
  { kind: 'shamayim', name: 'שוויון האביב', date: '03-20', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר הלירידים', date: '04-22', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר האטא אקווארידים', date: '05-06', sections: [1, 56] },
  { kind: 'shamayim', name: 'היום הארוך בשנה', date: '06-21', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר הפרסאידים', date: '08-12', sections: [1, 56] },
  { kind: 'shamayim', name: 'שוויון הסתיו', date: '09-22', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר האוריונידים', date: '10-21', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר הליאונידים', date: '11-17', sections: [1, 56] },
  { kind: 'shamayim', name: 'מטר הגמינידים', date: '12-13', sections: [1, 56] },
  { kind: 'shamayim', name: 'היום הקצר בשנה', date: '12-21', sections: [1, 56] },
  { kind: 'shamayim', name: 'שמיים חשוכים במצפה רמון', months: 'all', sections: [42, 44], note: 'אזור עם זיהום אור נמוך. הכי טוב סביב מולד הירח.' },
];

export const inMonths = (ev, m) => {
  if (ev.months === 'all') return true;
  if (ev.date) return Number(ev.date.slice(0, 2)) === m;
  const [a, b] = ev.months;
  return a <= b ? m >= a && m <= b : m >= a || m <= b;
};
export const inSection = (ev, n) => n >= ev.sections[0] && n <= ev.sections[1];
