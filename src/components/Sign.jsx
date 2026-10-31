// שפת הסימנים של שביל ישראל (נבחרה מבין שלוש חלופות, ראו CLAUDE.md):
// צללית מלאה בסגנון איזוטייפ (Otto Neurath, וינה 1925) בצבע המשפחה; מסגרת הסימון של השביל
// (אריח מרובע ופס לבן־כחול־כתום) רק לסימני השביל עצמו; וגרסת קו דקה (variant="line") למקרא ולכותרות.
// חריגה מכוונת מהכלל "בלי אייקונים". סימן לבד רק במפה, בפס ובשורה, ותמיד עם מקרא.

export const SIGN_COLORS = {
  chai: '#b5652b', tzomeach: '#8e5bb5', domem: '#4f6d8a', shamayim: '#24305e',
  water: '#3d7fc1', tent: '#474d55', shade: '#3f7d4e', sun: '#8a6a1f', bus: '#474d55',
  heat: '#b8372a', flood: '#4f6d8a', family: '#474d55', thru: '#c86a17', day: '#474d55',
  nature: '#b5652b', history: '#8a7a2e', sky: '#24305e', station: '#1f2328', audio: '#1f2328',
};

export const SIGN_NAMES = {
  chai: 'חי', tzomeach: 'צומח', domem: 'דומם', shamayim: 'שמיים', water: 'מים', tent: 'לינה',
  shade: 'מוצל', sun: 'חשוף לשמש', bus: 'תחבורה ציבורית', heat: 'עומס חום', flood: 'סכנת שיטפונות',
  family: 'מתאים למשפחות', thru: 'שביליסטים', day: 'מטיילי יום', nature: 'צפרים וחובבי טבע',
  history: 'היסטוריה וארכאולוגיה', sky: 'צילום ושמיים', station: 'תחנה', audio: 'הקראה',
};

const DROP = 'M12 2.5 C9 7.5 5.5 11 5.5 15.5 A6.5 6.5 0 0 0 18.5 15.5 C18.5 11 15 7.5 12 2.5 Z';

/** צורות: כל אחת מקבלת צבע (c) ומחזירה את תוכן ה-SVG (רשת של 24). */
const SOLID = {
  chai: (c) => <path d="M2 12 L9 10 L11 7 L13 10 L22 9 L15 13 L13 16 L11 13 Z" fill={c} />,
  tzomeach: (c) => (
    <g fill={c}>
      <circle cx="12" cy="6" r="3" /><circle cx="8" cy="9.5" r="3" /><circle cx="16" cy="9.5" r="3" />
      <circle cx="9.5" cy="13" r="3" /><circle cx="14.5" cy="13" r="3" /><rect x="11.2" y="14" width="1.6" height="8" />
      <circle cx="12" cy="10.5" r="1.6" fill="#fff" />
    </g>
  ),
  domem: (c) => (<g><path d="M1.5 21 L9 7 L13 14 L16 10 L22.5 21 Z" fill={c} /><path d="M5 17 H19 M7.5 13.5 H11" stroke="#fff" strokeWidth="1.2" /></g>),
  shamayim: (c) => (<g fill={c}><path d="M14 3 A9 9 0 1 0 21 16 A7 7 0 0 1 14 3 Z" /><path d="M19 3 L19.8 5.2 L22 6 L19.8 6.8 L19 9 L18.2 6.8 L16 6 L18.2 5.2 Z" /></g>),
  water: (c) => <path d={DROP} fill={c} />,
  tent: (c) => (<g><path d="M2 20 L12 4 L22 20 Z" fill={c} /><path d="M12 11 L15 20 H9 Z" fill="#fff" /></g>),
  shade: (c) => (<g fill={c}><circle cx="12" cy="9.5" r="7" /><rect x="10.5" y="14" width="3" height="8" /></g>),
  sun: (c) => (<g fill={c}><circle cx="12" cy="12" r="5" /><rect x="11" y="1.5" width="2" height="3.5" /><rect x="11" y="19" width="2" height="3.5" /><rect x="1.5" y="11" width="3.5" height="2" /><rect x="19" y="11" width="3.5" height="2" /></g>),
  bus: (c) => (<g><path d="M4 3 H20 V19 H4 Z" fill={c} /><rect x="6" y="5.5" width="12" height="5.5" fill="#fff" /><rect x="5.5" y="19" width="3.5" height="2.5" fill={c} /><rect x="15" y="19" width="3.5" height="2.5" fill={c} /></g>),
  heat: (c) => (<g fill={c}><circle cx="12" cy="12" r="5.5" /><rect x="11" y="1" width="2" height="3.5" /><rect x="11" y="19.5" width="2" height="3.5" /><rect x="1" y="11" width="3.5" height="2" /><rect x="19.5" y="11" width="3.5" height="2" /></g>),
  flood: (c) => (<g fill={c}><path d="M2 5 L9 20 H15 L22 5 H18 L13.5 15 H10.5 L6 5 Z" /><path d="M7 11.5 C9 10 10.5 13 12 11.5 C13.5 10 15 13 17 11.5 V13.5 C15 15 13.5 12 12 13.5 C10.5 15 9 12 7 13.5 Z" /></g>),
  family: (c) => (<g fill={c}><circle cx="7" cy="5" r="2.5" /><rect x="4.5" y="8.5" width="5" height="12" /><circle cx="14" cy="5" r="2.5" /><rect x="11.5" y="8.5" width="5" height="12" /><circle cx="20" cy="11" r="2" /><rect x="18" y="14" width="4" height="6.5" /></g>),
  thru: (c) => (<g fill={c}><circle cx="11" cy="4" r="2.5" /><path d="M8.5 7.5 H13 L13.5 14 L15 22 H12.5 L11 16 L9 22 H6.5 L8.5 14 Z" /><rect x="13.5" y="8" width="4.5" height="7" /></g>),
  day: (c) => (<g><g fill={c}><circle cx="9" cy="4" r="2.5" /><path d="M6.5 7.5 H11 L11.5 14 L13 22 H10.5 L9 16 L7 22 H4.5 L6.5 14 Z" /></g><circle cx="18.5" cy="6" r="3.5" fill="#e5b443" /></g>),
  nature: (c) => (<g fill={c}><circle cx="7" cy="15" r="5" /><circle cx="17" cy="15" r="5" /><rect x="9" y="7" width="6" height="5" /><circle cx="7" cy="15" r="2" fill="#fff" /><circle cx="17" cy="15" r="2" fill="#fff" /></g>),
  history: (c) => (<g fill={c}><rect x="3" y="3" width="18" height="3" /><rect x="5" y="6" width="14" height="2" /><rect x="7" y="8" width="3" height="11" /><rect x="14" y="8" width="3" height="11" /><rect x="4" y="19" width="16" height="2.5" /></g>),
  sky: (c) => (<g fill={c}><path d="M3 8 H8 L9.5 5.5 H14.5 L16 8 H21 V19 H3 Z" /><circle cx="12" cy="13" r="3.5" fill="#fff" /></g>),
  audio: (c) => (<g fill={c}><path d="M3 8.5 H7.5 L13 4 V20 L7.5 15.5 H3 Z" /><rect x="15" y="9" width="2" height="6" /><rect x="18.5" y="6.5" width="2" height="11" /></g>),
};

/** גרסת קו (מקרא, כותרות): אותה צורה, קו דק בלי מילוי. */
const LINE = {
  chai: <path d="M3 12 C6 9 9 9 12 12 C15 9 18 9 21 12" />,
  tzomeach: <path d="M12 21 V12 M12 12 C8 12 7 8 7 5 C9 6 11 7 12 9 C13 7 15 6 17 5 C17 8 16 12 12 12" />,
  domem: <path d="M3 18 L9 8 L13 13 L16 10 L21 18 Z" />,
  shamayim: <path d="M14 4 A8 8 0 1 0 20 15 A6.5 6.5 0 0 1 14 4 Z" />,
  water: <path d="M12 3.5 C9 8 6 11 6 15 A6 6 0 0 0 18 15 C18 11 15 8 12 3.5 Z" />,
  tent: <path d="M3 19 L12 5 L21 19 Z M9 19 L12 13 L15 19" />,
  shade: <path d="M12 21 V14 M6 11 A6 6 0 1 1 18 11 A3 3 0 0 1 15 14 H9 A3 3 0 0 1 6 11 Z" />,
  sun: <g><circle cx="12" cy="12" r="4" /><path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5" /></g>,
  bus: <path d="M5 4 H19 V18 H5 Z M5 11 H19" />,
  heat: <g><circle cx="12" cy="12" r="4" /><path d="M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5" /></g>,
  flood: <path d="M3 6 L9 19 H15 L21 6" />,
  family: <path d="M7 5 V20 M14 5 V20 M19 10 V20" />,
  thru: <path d="M11 3 V13 L7 20 M11 13 L14 20 M11 8 H15 V14 H11" />,
  day: <path d="M9 3 V13 L6 20 M9 13 L12 20" />,
  nature: <g><circle cx="7" cy="15" r="4.5" /><circle cx="17" cy="15" r="4.5" /><path d="M9 8 H15 V12" /></g>,
  history: <path d="M3 4.5 H21 M7 8 V19 M17 8 V19 M4 20 H20" />,
  sky: <g><path d="M3 8 H8 L9.5 5.5 H14.5 L16 8 H21 V19 H3 Z" /><circle cx="12" cy="13" r="3.5" /></g>,
  audio: <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M16 9 C17.5 10.5 17.5 13.5 16 15" />,
};

/**
 * סימן. name: מפתח מהרשימה. variant: 'solid' (ברירת מחדל), 'line', או 'blaze' (אריח השביל עם מספר).
 * label: נגיש לקוראי מסך; בלי label הסימן דקורטיבי (הטקסט שלידו נושא את המשמעות).
 */
export default function Sign({ name, size = 22, variant = 'solid', color, label, n, className = '' }) {
  const c = color || SIGN_COLORS[name] || '#1f2328';
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  if (variant === 'blaze') {
    return (
      <svg className={`sign sign-blaze ${className}`} width={size} height={size} viewBox="0 0 24 24" {...a11y}>
        <rect width="24" height="24" fill={c} />
        <rect x="16" y="1.6" width="6" height="1.2" fill="#fff" /><rect x="16" y="2.9" width="6" height="1.2" fill="#3d7fc1" /><rect x="16" y="4.2" width="6" height="1.2" fill="#f08a24" />
        <text x="12" y="17" textAnchor="middle" fontSize={String(n).length > 1 ? 10 : 12} fontWeight="700" fill="#fff" fontFamily="IBM Plex Mono, monospace">{n}</text>
      </svg>
    );
  }
  if (variant === 'line') {
    return (
      <svg className={`sign sign-line ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" {...a11y}>
        {LINE[name]}
      </svg>
    );
  }
  const draw = SOLID[name];
  if (!draw) return null;
  return <svg className={`sign ${className}`} width={size} height={size} viewBox="0 0 24 24" {...a11y}>{draw(c)}</svg>;
}

/** חזרה על סימן כדי להראות כמות (עד max). */
export function Count({ name, n, max = 3, size = 18 }) {
  const k = Math.min(n, max);
  return (
    <span className="sign-count" role="img" aria-label={`${SIGN_NAMES[name]}: ${n}`}>
      {Array.from({ length: k }, (_, i) => <Sign key={i} name={name} size={size} />)}
      {n > max && <b className="mono">+{n - max}</b>}
    </span>
  );
}
