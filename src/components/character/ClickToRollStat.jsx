import React, { useState } from 'react';
import { Dice6 } from 'lucide-react';

/**
 * A clickable stat/modifier that rolls a D20 + modifier and calls onRoll(result, label).
 * Shows a brief pop-up with the result inline.
 */
export default function ClickToRollStat({ label, modifier, bonus = 0, onRoll, className = '' }) {
  const [lastRoll, setLastRoll] = useState(null);
  const [showPop, setShowPop] = useState(false);

  const total = modifier + bonus;
  const formatted = total >= 0 ? `+${total}` : `${total}`;

  const handleClick = () => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const result = d20 + total;
    const isCrit = d20 === 20;
    const isFail = d20 === 1;
    setLastRoll({ d20, result, isCrit, isFail });
    setShowPop(true);
    setTimeout(() => setShowPop(false), 2000);
    if (onRoll) onRoll({ formula: `d20${total >= 0 ? '+' : ''}${total}`, result, d20, label, isCrit, isFail });
  };

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={handleClick}
        className="flex items-center justify-between w-full p-2 rounded cursor-pointer transition-all hover:bg-violet-500/20 hover:border-violet-500/40 border border-transparent"
        title={`Click to roll`}
      >
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white font-semibold text-sm">{formatted}</span>
          <Dice6 className="h-3 w-3 text-slate-600 group-hover:text-violet-400 transition-colors" />
        </div>
      </button>

      {showPop && lastRoll && (
        <div className={`absolute right-0 top-full mt-1 z-50 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg pointer-events-none
          ${lastRoll.isCrit ? 'bg-amber-500 text-black' : lastRoll.isFail ? 'bg-red-600 text-white' : 'bg-violet-700 text-white'}
        `}>
          {lastRoll.isCrit ? '⭐ CRIT! ' : lastRoll.isFail ? '💀 FAIL! ' : ''}
          {lastRoll.d20} {total >= 0 ? '+' : ''}{total} = <span className="text-lg">{lastRoll.result}</span>
        </div>
      )}
    </div>
  );
}