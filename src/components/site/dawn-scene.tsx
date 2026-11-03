/**
 * Dawn on the backwaters, in depth layers: sky, the Ghats, mist, the word
 * "Kerala", still water, then palms, a kettuvallam and a Chinese fishing net.
 * Each layer is its own full-size SVG on the same viewBox so they stay aligned
 * while `.site-layer` drifts them at different depths (see site.css).
 * Original artwork, decorative only.
 */

const VIEW = "0 0 1440 900";
const FRONDS = [-178, -154, -126, -98, -70, -42, -14, 8];

function Layer({ depth, className, children }: { depth: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`site-layer absolute inset-0 ${className ?? ""}`} style={{ "--depth": `${depth}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}

function Art({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={VIEW} preserveAspectRatio="xMidYMid slice" className="h-full w-full" focusable="false">
      {children}
    </svg>
  );
}

function Palm({ x, y, height, lean, scale = 1 }: { x: number; y: number; height: number; lean: number; scale?: number }) {
  const top = { x: x + lean, y: y - height };
  return (
    <g>
      <path
        d={`M${x} ${y} Q ${x + lean * 0.1} ${y - height * 0.6} ${top.x} ${top.y}`}
        stroke="#1a3327"
        strokeWidth={11 * scale}
        strokeLinecap="round"
        fill="none"
      />
      <g transform={`translate(${top.x} ${top.y}) scale(${scale})`} fill="#16301f">
        {FRONDS.map((angle) => (
          <path key={angle} transform={`rotate(${angle})`} d="M0 0 C 46 -34 104 -22 150 30 C 104 -2 52 -4 0 5 Z" />
        ))}
        <circle r="8" fill="#2e2416" />
      </g>
    </g>
  );
}

export function DawnScene() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Layer depth={140}>
        <Art>
          <defs>
            <linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d3cc" />
              <stop offset="0.45" stopColor="#efd3b4" />
              <stop offset="0.68" stopColor="#f7e5c3" />
            </linearGradient>
            <radialGradient id="ds-sun">
              <stop offset="0" stopColor="#fff4d6" />
              <stop offset="0.35" stopColor="#fbe3ad" stopOpacity="0.9" />
              <stop offset="1" stopColor="#f7e5c3" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#ds-sky)" />
          <circle cx="930" cy="560" r="260" fill="url(#ds-sun)" />
          <circle cx="930" cy="560" r="62" fill="#fff1cf" />
        </Art>
      </Layer>

      <Layer depth={100}>
        <Art>
          <path d="M0 520 C 120 470 210 430 330 455 C 430 476 500 400 620 410 C 760 422 820 470 960 440 C 1100 410 1200 380 1320 420 C 1380 440 1420 450 1440 446 V 620 H 0 Z" fill="#a9b9a9" />
          <path d="M0 560 C 140 520 260 500 400 530 C 520 556 600 500 740 505 C 880 510 960 560 1100 535 C 1240 510 1340 520 1440 540 V 620 H 0 Z" fill="#8aa592" />
        </Art>
      </Layer>

      <Layer depth={80}>
        <div className="site-mist absolute inset-0">
          <Art>
            <defs>
              <filter id="ds-blur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="28" />
              </filter>
            </defs>
            <g filter="url(#ds-blur)" fill="#fbf6ec">
              <ellipse cx="300" cy="575" rx="420" ry="46" opacity="0.75" />
              <ellipse cx="1050" cy="560" rx="480" ry="40" opacity="0.65" />
              <ellipse cx="720" cy="600" rx="600" ry="30" opacity="0.55" />
            </g>
          </Art>
        </div>
      </Layer>

      {/* The word sits behind the water and palms, in front of the hills. */}
      <Layer depth={60} className="hidden items-start justify-center pt-20 sm:flex lg:items-end lg:pb-[26%] lg:pt-0">
        <span className="select-none font-display text-[clamp(96px,21vw,330px)] font-medium leading-none tracking-[-0.03em] text-white/70">
          Kerala
        </span>
      </Layer>

      <Layer depth={24}>
        <Art>
          <defs>
            <linearGradient id="ds-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9d6c2" />
              <stop offset="0.25" stopColor="#8fa596" />
              <stop offset="0.7" stopColor="#355848" />
              <stop offset="1" stopColor="#1f3b2d" />
            </linearGradient>
          </defs>
          <rect y="612" width="1440" height="288" fill="url(#ds-water)" />
          <g stroke="#fff5da" strokeLinecap="round" opacity="0.55">
            <path d="M890 640 H 970" strokeWidth="5" />
            <path d="M870 664 H 990" strokeWidth="4" opacity="0.7" />
            <path d="M900 690 H 960" strokeWidth="3" opacity="0.6" />
            <path d="M880 722 H 980" strokeWidth="2" opacity="0.4" />
          </g>
          <g stroke="#e9efe6" strokeLinecap="round" opacity="0.25" strokeWidth="2">
            <path d="M120 700 H 300" />
            <path d="M420 760 H 640" />
            <path d="M1080 740 H 1280" />
            <path d="M260 820 H 520" />
          </g>
        </Art>
      </Layer>

      <Layer depth={0}>
        <Art>
          {/* Banks */}
          <path d="M0 600 C 80 590 180 596 260 616 C 300 626 330 640 300 652 C 220 680 90 690 0 700 Z" fill="#1d3a2a" />
          <path d="M1440 606 C 1360 596 1260 598 1180 614 C 1140 622 1120 636 1150 646 C 1230 668 1350 676 1440 684 Z" fill="#1d3a2a" />

          {/* Kettuvallam, with its reflection */}
          <g transform="translate(700 650)">
            <path d="M-120 0 Q -136 -22 -100 -18 L 100 -18 Q 136 -22 122 0 Q 0 18 -120 0 Z" fill="#2b2a1f" />
            <path d="M-84 -18 Q 0 -70 84 -18 Z" fill="#5a4630" />
            <path d="M-84 -18 Q 0 -70 84 -18" stroke="#3a2d1e" strokeWidth="3" fill="none" />
            <g opacity="0.22" transform="scale(1 -0.6) translate(0 -14)">
              <path d="M-120 0 Q -136 -22 -100 -18 L 100 -18 Q 136 -22 122 0 Q 0 18 -120 0 Z" fill="#14271e" />
              <path d="M-84 -18 Q 0 -70 84 -18 Z" fill="#14271e" />
            </g>
          </g>

          {/* Chinese fishing net on the right bank: a pivoting boom with the net hung from its tip */}
          <g stroke="#14271e" strokeLinecap="round" fill="none">
            <path d="M1236 612 L 1196 470 M1262 612 L 1196 470" strokeWidth="5" />
            <path d="M1196 470 L 1046 418" strokeWidth="5" />
            <path d="M1196 470 L 1330 560 M1196 470 L 1316 600" strokeWidth="2" />
            <path d="M1046 418 Q 990 470 962 556 M1046 418 Q 1100 470 1130 556" strokeWidth="3" />
            <path d="M962 556 Q 1046 600 1130 556" strokeWidth="3" />
          </g>
          <g stroke="#14271e" strokeWidth="1.2" opacity="0.55" fill="none">
            <path d="M984 520 Q 1046 552 1110 520 M974 540 Q 1046 576 1120 540 M1010 470 L 1000 580 M1046 430 L 1046 590 M1082 470 L 1092 580" />
          </g>

          {/* Palms */}
          <Palm x={60} y={650} height={400} lean={70} scale={0.95} />
          <Palm x={170} y={632} height={300} lean={-30} scale={0.8} />
          <Palm x={240} y={640} height={210} lean={34} scale={0.65} />
          <Palm x={1390} y={660} height={430} lean={-70} scale={1} />
          <Palm x={1318} y={640} height={260} lean={30} scale={0.7} />
        </Art>
      </Layer>
    </div>
  );
}
