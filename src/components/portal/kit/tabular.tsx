/**
 * Digits in equal-width cells. General Sans as shipped has no tabular figures
 * (`tnum` is ignored), and "0" is its widest digit, so each digit gets a 1ch
 * cell: times in a column line up and a ticking countdown doesn't wobble.
 */
export function Tabular({ children }: { children: string | number }) {
  return (
    <>
      {[...String(children)].map((ch, i) =>
        ch >= "0" && ch <= "9" ? (
          <span key={i} className="inline-block w-[1ch] text-center">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </>
  );
}
