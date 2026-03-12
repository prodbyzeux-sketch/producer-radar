import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StarRating({ value = 0, onChange, max = 5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i + 1)}
          className={cn(
            "transition-colors",
            onChange ? "cursor-pointer hover:text-amber-300" : "cursor-default"
          )}
        >
          <Star
            size={size}
            className={cn(
              i < value ? "fill-amber-400 text-amber-400" : "text-[#3f3f46]"
            )}
          />
        </button>
      ))}
    </div>
  );
}