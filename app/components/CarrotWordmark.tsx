/**
 * Display wordmark: reads "C-arrot", the second r a faint gold shadow tucked behind the first.
 * Logo/heading use only (nav, hero, page titles) — never in body copy or metadata; the name stays "C-arot".
 * All offsets are in em so the effect scales with the font size of the parent.
 */
export default function CarrotWordmark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="C-arot"
      className={`wordmark inline-flex items-baseline ${className}`}
    >
      C<span className="text-primary">-</span>a
      <span className="relative z-10">r</span>
      <span
        aria-hidden="true"
        className="relative z-0 -ml-[0.20em] mr-[0.02em] text-gold/30 select-none"
      >
        r
      </span>
      ot
    </span>
  );
}
