import React, { useState } from 'react';
import ResourceTracker from './ResourceTracker';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Shows spell slots per level with bubble trackers.
 * character.spellcasting.spell_slots = { "1": { total: 4, used: 1 }, "2": { total: 3, used: 0 }, ... }
 */
export default function SpellSlotTracker({ character, onUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const slots = character?.spellcasting?.spell_slots || {};

  const hasAnySlots = SPELL_SLOT_LEVELS.some(lvl => (slots[String(lvl)]?.total || 0) > 0);
  if (!hasAnySlots) {
    return (
      <p className="text-xs text-slate-600 italic">No spell slots configured. Edit the character sheet to add them.</p>
    );
  }

  const handleToggle = async (level, newUsed) => {
    const updated = {
      ...slots,
      [String(level)]: { ...(slots[String(level)] || {}), used: newUsed }
    };
    const updatedChar = {
      ...character,
      spellcasting: { ...character.spellcasting, spell_slots: updated }
    };
    onUpdate(updatedChar);
    await base44.entities.Character.update(character.id, {
      spellcasting: { ...character.spellcasting, spell_slots: updated }
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Spell Slots</span>
        {expanded ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
      </button>

      {expanded && (
        <div className="space-y-2">
          {SPELL_SLOT_LEVELS.map(lvl => {
            const slot = slots[String(lvl)] || {};
            if (!slot.total) return null;
            return (
              <ResourceTracker
                key={lvl}
                label={`Level ${lvl}`}
                total={slot.total || 0}
                used={slot.used || 0}
                onToggle={(newUsed) => handleToggle(lvl, newUsed)}
                color="blue"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}