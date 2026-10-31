import Sign, { SIGN_NAMES } from './Sign.jsx';

/** מקרא הסימנים, בגרסת קו (שקטה), עם שם מלא לכל סימן. */
export default function SignLegend({ names = ['water', 'tent', 'shade', 'sun', 'bus', 'family', 'heat', 'chai', 'tzomeach', 'domem', 'shamayim'], title = 'מקרא הסימנים' }) {
  return (
    <div className="sign-legend" role="list" aria-label={title}>
      <span className="scale-title">{title}</span>
      {names.map((n) => (
        <span key={n} role="listitem" className="sl-item"><Sign name={n} size={18} />{SIGN_NAMES[n]}</span>
      ))}
      <span className="sl-note">סימן שחוזר אומר כמות. מעבר על סימן מציג את המשפט מהמדריך.</span>
    </div>
  );
}
