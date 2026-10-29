import { t as tx } from '../i18n';
import TarotCardBack from './TarotCardBack';

import { MAJOR } from './tarot-art-data';

export const artSrc = (id?: string) => {
  const slug = id?.replace(/_/g, '-');
  return slug && MAJOR.has(slug) ? `/cards/${slug}.webp` : null;
};

/** Face-up illustrated card: 2:3.5, 12px radius, 1px ob-border. Name is printed on the art, so no overlay. */
export default function TarotArt({ src, alt, reversed = false, className = '' }: { src: string; alt: string; reversed?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} draggable={false} decoding="async"
      className={`block w-full h-full aspect-[2/3.5] rounded-[12px] border border-ob-border object-cover bg-bg ${reversed ? 'rotate-180' : ''} ${className}`} />
  );
}

/** Face-up fallback for cards without art (Minor Arcana): the card back with the name on a plate. */
export function TarotNamedBack({ nameZh, nameEn, reversed = false, className = '', showName = true }: { nameZh: string; nameEn?: string; reversed?: boolean; className?: string; showName?: boolean }) {
  return (
    <div className={`relative w-full h-full aspect-[2/3.5] rounded-[12px] overflow-hidden ${className}`}>
      <TarotCardBack className="absolute inset-0" />
      {showName && <div className="absolute inset-x-[8%] bottom-[8%] rounded-[8px] border border-gold/60 bg-bg/85 px-1.5 py-2 text-center">
        <span className="block font-[family-name:var(--font-display-zh)] font-bold text-[14px] md:text-[17px] text-text leading-tight">{nameZh}</span>
        {nameEn && <span className="block font-display italic text-[11px] md:text-[13px] text-text-2 leading-tight">{nameEn}</span>}
        <span className="block mt-0.5 text-[11px] md:text-[13px] text-text-2">{reversed ? tx('逆位') : tx('正位')}</span>
      </div>}
    </div>
  );
}
