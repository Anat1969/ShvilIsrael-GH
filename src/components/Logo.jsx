/** לוגו: שלושת צבעי סימון השביל (לבן לחרמון, כחול לים, כתום למדבר) כשביל שעולה בין הרים. */
export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2e34" />
          <stop offset="1" stopColor="#15171a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#lg-sky)" />
      <path d="M0 40 L14 26 L24 34 L38 16 L52 30 L64 22 V64 H0Z" fill="#3a3f46" />
      <path d="M38 16 L44 22 L40 22 L36 19Z" fill="#f2f1ee" />
      <path d="M0 52 C14 44 26 50 38 44 S56 40 64 42 V64 H0Z" fill="#555c65" />
      <g transform="rotate(-28 32 46)">
        <rect x="12" y="40" width="40" height="4.2" rx="2.1" fill="#f2f1ee" />
        <rect x="12" y="45.4" width="40" height="4.2" rx="2.1" fill="#3d7fc1" />
        <rect x="12" y="50.8" width="40" height="4.2" rx="2.1" fill="#f08a24" />
      </g>
    </svg>
  );
}
