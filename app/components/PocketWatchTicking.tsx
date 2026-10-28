/** 48px pocket watch whose hands tick (steps) while loading; static under reduced motion. */
export default function PocketWatchTicking({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="24" cy="26" r="17" opacity=".45" />
      <circle cx="24" cy="26" r="13.5" />
      <path d="M24 9V5.5M21 4.5h6" />
      {[0, 90, 180, 270].map((a) => <path key={a} d="M24 14.5v2" transform={`rotate(${a} 24 26)`} opacity=".7" />)}
      <path className="pw-hand pw-hour" d="M24 26v-6" />
      <path className="pw-hand pw-min" d="M24 26v-9.5" stroke="var(--c-primary)" />
      <circle cx="24" cy="26" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
