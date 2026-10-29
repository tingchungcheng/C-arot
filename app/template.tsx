// Re-mounts on every route change (not on ?query changes), so each page fades/slides in.
// Pure CSS: works before hydration (no flash), uses backwards fill so no transform remains afterwards (fixed-position children
// inside pages behave normally). Reduced motion: no animation (see globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
