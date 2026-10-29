/**
 * Dawn on the backwaters: the Ghats, coconut palms, a kettuvallam and a
 * Chinese fishing net. Original artwork, so it needs no licence or remote
 * host; decorative only (aria-hidden). Real provider photography can replace
 * it later.
 */

const FRONDS = [-168, -140, -112, -84, -56, -28, 0, 26];

function Palm({ x, y, height, lean, scale = 1 }: { x: number; y: number; height: number; lean: number; scale?: number }) {
  const top = { x: x + lean, y: y - height };
  return (
    <g>
      <path
        d={`M${x} ${y} Q ${x + lean * 0.15} ${y - height * 0.55} ${top.x} ${top.y}`}
        stroke="#29473c"
        strokeWidth={9 * scale}
        strokeLinecap="round"
        fill="none"
      />
      <g transform={`translate(${top.x} ${top.y}) scale(${scale})`} fill="#1f3c32">
        {FRONDS.map((angle) => (
          <path key={angle} transform={`rotate(${angle})`} d="M0 0 C 30 -22 70 -16 104 14 C 66 -2 34 -2 0 4 Z" />
        ))}
        <circle r="7" fill="#3a2a1a" />
      </g>
    </g>
  );
}

export function KeralaScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ks-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2cfae" />
          <stop offset="0.55" stopColor="#f8e7cd" />
          <stop offset="1" stopColor="#eaf0e3" />
        </linearGradient>
        <linearGradient id="ks-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" />
          <stop offset="1" stopColor="#8fbaad" />
        </linearGradient>
        <radialGradient id="ks-glow">
          <stop offset="0" stopColor="#fbd28e" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fbd28e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="520" fill="url(#ks-sky)" />
      <circle cx="820" cy="250" r="170" fill="url(#ks-glow)" />
      <circle cx="820" cy="250" r="62" fill="#f5b25a" opacity="0.9" />

      {/* Birds */}
      <g stroke="#5b5a4c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6">
        <path d="M560 120 q 9 -8 18 0 q 9 -8 18 0" />
        <path d="M610 150 q 7 -6 14 0 q 7 -6 14 0" />
        <path d="M660 108 q 6 -5 12 0 q 6 -5 12 0" />
      </g>

      {/* The Ghats, far to near */}
      <path d="M0 300 L120 250 L230 280 L360 220 L470 268 L600 236 L720 276 L860 226 L990 270 L1100 238 L1200 262 V380 H0 Z" fill="#c3d6c6" />
      <path d="M0 330 L150 290 L280 318 L420 280 L560 322 L700 292 L840 326 L980 296 L1120 324 L1200 306 V380 H0 Z" fill="#9dbba8" />
      <path d="M0 360 C 160 336 300 352 460 344 C 640 336 780 356 960 346 C 1060 340 1140 348 1200 344 V380 H0 Z" fill="#6f9784" />

      {/* Water and the sun's reflection */}
      <rect y="372" width="1200" height="148" fill="url(#ks-water)" />
      <g fill="#f7c785" opacity="0.7">
        <rect x="770" y="388" width="100" height="5" rx="2.5" />
        <rect x="790" y="404" width="64" height="4" rx="2" />
        <rect x="755" y="420" width="128" height="4" rx="2" />
        <rect x="800" y="438" width="44" height="3" rx="1.5" />
      </g>
      <g fill="#ffffff" opacity="0.35">
        <rect x="140" y="414" width="120" height="3" rx="1.5" />
        <rect x="420" y="456" width="160" height="3" rx="1.5" />
        <rect x="980" y="430" width="110" height="3" rx="1.5" />
      </g>

      {/* Kettuvallam (houseboat) and its reflection */}
      <g transform="translate(430 360)">
        <path d="M0 22 C 40 40 200 40 250 18 L238 30 C 190 52 50 52 12 32 Z" fill="#5a3b22" />
        <path d="M34 22 C 50 -14 196 -14 214 20 Z" fill="#c99a5c" />
        <path d="M60 22 C 72 2 172 2 186 22" stroke="#a87a42" strokeWidth="3" fill="none" />
        <rect x="96" y="10" width="14" height="12" rx="2" fill="#5a3b22" opacity="0.7" />
        <rect x="132" y="10" width="14" height="12" rx="2" fill="#5a3b22" opacity="0.7" />
      </g>
      <path d="M445 404 C 490 420 640 420 676 400" stroke="#5a3b22" strokeWidth="6" opacity="0.18" fill="none" strokeLinecap="round" />

      {/* Chinese fishing net on the right bank */}
      <g stroke="#2f4a3f" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M1110 372 L 980 250" />
        <path d="M1130 372 L 1010 258" />
        <path d="M980 250 L 930 300 M980 250 L 1040 300" strokeWidth="3" />
      </g>
      <path d="M930 300 Q 985 352 1040 300" fill="#2f4a3f" opacity="0.18" stroke="#2f4a3f" strokeWidth="2" />
      <path d="M1080 372 h 120 v 10 h -120 z" fill="#4f6f5f" />

      {/* Near bank with palms */}
      <path d="M0 400 C 80 376 210 372 320 404 C 260 430 120 446 0 450 Z" fill="#3e6a55" />
      <Palm x={70} y={410} height={250} lean={40} />
      <Palm x={150} y={404} height={200} lean={-34} scale={0.85} />
      <Palm x={250} y={402} height={150} lean={26} scale={0.7} />
      <path d="M1040 384 C 1100 372 1160 372 1200 378 V400 H1030 Z" fill="#3e6a55" />
      <Palm x={1150} y={384} height={190} lean={-40} scale={0.8} />
    </svg>
  );
}
