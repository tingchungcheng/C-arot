import { ICONS, type IconName } from './icons-data';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
  strokeWidth?: number;
}

/** Inline SVG icon from the design handoff (24x24, stroke = currentColor). */
export default function Icon({ name, size = 24, className, title, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['inline-block shrink-0', className].filter(Boolean).join(' ')}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + ICONS[name] }}
    />
  );
}
