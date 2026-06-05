import React from 'react';

/**
 * Visual bubble-based resource tracker (spell slots, rage charges, ki points, etc.)
 * Props:
 *   label: string
 *   total: number
 *   used: number
 *   onToggle: (newUsed: number) => void
 *   color: 'violet' | 'blue' | 'amber' | 'red' | 'emerald'
 */
const colorMap = {
  violet: { filled: 'bg-violet-500 border-violet-400', empty: 'border-violet-500/40 hover:bg-violet-500/30' },
  blue:   { filled: 'bg-blue-500 border-blue-400',   empty: 'border-blue-500/40 hover:bg-blue-500/30' },
  amber:  { filled: 'bg-amber-500 border-amber-400',  empty: 'border-amber-500/40 hover:bg-amber-500/30' },
  red:    { filled: 'bg-red-500 border-red-400',    empty: 'border-red-500/40 hover:bg-red-500/30' },
  emerald:{ filled: 'bg-emerald-500 border-emerald-400', empty: 'border-emerald-500/40 hover:bg-emerald-500/30' },
};

export default function ResourceTracker({ label, total = 0, used = 0, onToggle, color = 'violet' }) {
  if (total <= 0) return null;
  const colors = colorMap[color] || colorMap.violet;

  const handleClick = (idx) => {
    // clicking a filled slot unfills from that slot onwards (mark as used)
    // clicking an empty slot fills up to and including that slot
    if (idx < used) {
      onToggle(idx); // reduce used count
    } else {
      onToggle(idx + 1); // increase used count
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs text-slate-500">{total - used}/{total}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: total }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            title={idx < used ? `Recover slot ${idx + 1}` : `Use slot ${idx + 1}`}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              idx < used ? colors.filled : colors.empty + ' bg-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );
}