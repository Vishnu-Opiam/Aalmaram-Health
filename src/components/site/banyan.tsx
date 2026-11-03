/**
 * A line-drawn banyan for "How it works": one aerial root per step. On
 * desktop each root grows as its step scrolls into view (site.css); without
 * scroll timelines or with reduced motion all four roots are simply there.
 */
const ROOTS = [
  "M58 236 C 54 320 62 420 56 520",
  "M128 250 C 132 340 124 440 130 520",
  "M284 250 C 280 340 288 440 282 520",
  "M354 236 C 358 320 350 420 356 520",
];

export function Banyan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 412 560" className={className} aria-hidden="true" focusable="false">
      <g fill="#2a4c3a">
        <ellipse cx="206" cy="170" rx="200" ry="64" opacity="0.9" />
        <ellipse cx="80" cy="196" rx="76" ry="40" />
        <ellipse cx="332" cy="196" rx="76" ry="40" />
        <ellipse cx="206" cy="120" rx="150" ry="58" fill="#3e6b48" />
        <ellipse cx="96" cy="150" rx="84" ry="42" fill="#3e6b48" opacity="0.9" />
        <ellipse cx="318" cy="150" rx="84" ry="42" fill="#3e6b48" opacity="0.9" />
        <ellipse cx="206" cy="84" rx="92" ry="40" fill="#4f7d57" />
      </g>
      <g fill="none" stroke="#1f3b2d" strokeLinecap="round">
        <path d="M206 520 C 202 440 198 330 206 230" strokeWidth="34" />
        <path d="M180 520 C 186 470 190 420 192 380 M232 520 C 226 470 222 420 220 380" strokeWidth="12" />
        <path d="M204 250 C 160 232 100 226 40 232 M208 250 C 252 232 312 226 372 232" strokeWidth="12" />
        <path d="M204 236 C 176 214 140 200 110 196 M208 236 C 236 214 272 200 302 196" strokeWidth="8" />
        {ROOTS.map((d, i) => (
          <path key={d} d={d} strokeWidth="4" className={`site-root site-root-${i + 1}`} stroke="#7a5c1e" />
        ))}
        <path d="M30 522 H 382" strokeWidth="3" stroke="#b08a3e" />
      </g>
    </svg>
  );
}
