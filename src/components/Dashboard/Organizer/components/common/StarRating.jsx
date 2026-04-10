import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cls } from '../../constants';

/* ══════════════════════════════════════════════════════════
   STAR RATING COMPONENT
══════════════════════════════════════════════════════════ */
export const StarRating = ({ value = 0, onChange, readonly = false, size = 14, className = '' }) => {
  const [hovered, setHovered] = useState(0);
  const display = readonly ? value : (hovered || value);
  return (
    <div className={cls('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i} type="button" disabled={readonly}
          onClick={() => !readonly && onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cls('transition-all', !readonly && 'cursor-pointer hover:scale-110', readonly && 'cursor-default')}
          style={{ lineHeight: 1 }}
        >
          <Star size={size} className={cls('transition-colors',
            i <= display ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700',
            !readonly && i <= (hovered || 0) && 'text-yellow-300 fill-yellow-300',
          )} />
        </button>
      ))}
    </div>
  );
};

export const RatingBadge = ({ avg, count, size = 10 }) => {
  if (!avg) return <span className="text-[9px] text-zinc-600 italic">No ratings</span>;
  return (
    <span className="flex items-center gap-1">
      <Star size={size} className="text-yellow-400 fill-yellow-400 shrink-0" />
      <span className="text-[10px] font-bold text-yellow-300">{avg.toFixed(1)}</span>
      <span className="text-[9px] text-zinc-600">({count})</span>
    </span>
  );
};
