/** Card back art (public/cards/card-back.webp, 780×1398 @2x, rounded corners baked in with alpha).
 *  Ratio 2:3.5; the 12px clip matches the baked corners, and no border is added so nothing doubles up. */
import { CARD_BACK_SRC } from './tarot-art-data';
export { CARD_BACK_SRC };

export default function TarotCardBack({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CARD_BACK_SRC}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`block w-full h-full aspect-[2/3.5] rounded-[12px] object-cover ${className}`}
    />
  );
}
