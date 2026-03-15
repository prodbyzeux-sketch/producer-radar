import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pagination({ total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-[#71717a]">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 w-7 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button
            key={p}
            variant="ghost" size="sm"
            onClick={() => onPageChange(p)}
            className={`h-7 min-w-[28px] text-xs px-2 ${p === page ? 'bg-[#2563eb] text-white hover:bg-[#3b82f6]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost" size="icon"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 w-7 text-[#a1a1aa] hover:text-white hover:bg-[#27272a] disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}