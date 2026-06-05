import React, { useState } from 'react';
import ResourceTracker from './ResourceTracker';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const RESOURCE_COLORS = ['violet', 'red', 'amber', 'emerald', 'blue'];

const PRESETS = {
  'Barbarian': [{ name: 'Rage', total: 2, color: 'red' }],
  'Monk': [{ name: 'Ki Points', total: 2, color: 'amber' }],
  'Sorcerer': [{ name: 'Sorcery Points', total: 2, color: 'violet' }],
  'Paladin': [{ name: 'Lay on Hands (HP)', total: 5, color: 'emerald' }],
  'Fighter': [{ name: 'Action Surge', total: 1, color: 'blue' }, { name: 'Second Wind', total: 1, color: 'emerald' }],
  'Rogue': [{ name: 'Bardic Inspiration', total: 3, color: 'amber' }],
  'Bard': [{ name: 'Bardic Inspiration', total: 3, color: 'violet' }],
  'Druid': [{ name: 'Wild Shape', total: 2, color: 'emerald' }],
  'Warlock': [{ name: 'Eldritch Blast', total: 1, color: 'violet' }],
};

/**
 * Tracks custom class resources (Rage, Ki, Sorcery Points, etc.)
 * Stored in character.notes as JSON under key __resources (non-destructive to actual notes)
 * Actually stored in a dedicated field: character.class_resources = [{ name, total, used, color }]
 */
export default function ClassResourceTracker({ character, onUpdate }) {
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTotal, setNewTotal] = useState(1);
  const [newColor, setNewColor] = useState('violet');

  const resources = character?.class_resources || [];

  const saveResources = async (updated) => {
    const updatedChar = { ...character, class_resources: updated };
    onUpdate(updatedChar);
    await base44.entities.Character.update(character.id, { class_resources: updated });
  };

  const handleToggle = (idx, newUsed) => {
    const updated = resources.map((r, i) => i === idx ? { ...r, used: newUsed } : r);
    saveResources(updated);
  };

  const handleAdd = () => {
    if (!newName.trim() || newTotal < 1) return;
    const updated = [...resources, { name: newName.trim(), total: newTotal, used: 0, color: newColor }];
    saveResources(updated);
    setAddOpen(false);
    setNewName('');
    setNewTotal(1);
    setNewColor('violet');
  };

  const handleRemove = (idx) => {
    saveResources(resources.filter((_, i) => i !== idx));
  };

  const applyPreset = () => {
    const preset = PRESETS[character.class];
    if (!preset) return;
    const level = character.level || 1;
    const withLevel = preset.map(p => ({
      ...p,
      total: p.name === 'Rage' ? (level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : 5) :
             p.name === 'Ki Points' ? level :
             p.name === 'Sorcery Points' ? level :
             p.total,
      used: 0
    }));
    saveResources([...resources, ...withLevel.filter(p => !resources.find(r => r.name === p.name))]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(p => !p)} className="flex items-center gap-1 text-left">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Class Resources</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
        </button>
        {expanded && (
          <div className="flex gap-1">
            {PRESETS[character?.class] && resources.length === 0 && (
              <button onClick={applyPreset} className="text-[10px] text-violet-400 hover:text-violet-300 underline">preset</button>
            )}
            <button onClick={() => setAddOpen(true)} className="text-[10px] text-slate-500 hover:text-slate-300">+ add</button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          {resources.length === 0 && (
            <p className="text-xs text-slate-600 italic">No resources tracked. Click + add to track Rage, Ki, etc.</p>
          )}
          {resources.map((res, idx) => (
            <div key={idx} className="group relative">
              <ResourceTracker
                label={res.name}
                total={res.total}
                used={res.used || 0}
                onToggle={(newUsed) => handleToggle(idx, newUsed)}
                color={res.color || 'violet'}
              />
              <button
                onClick={() => handleRemove(idx)}
                className="absolute -top-0.5 right-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Add Resource Tracker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Resource Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Rage, Ki Points" className="bg-slate-800 border-slate-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Total</label>
              <Input type="number" min={1} max={20} value={newTotal} onChange={e => setNewTotal(parseInt(e.target.value) || 1)} className="bg-slate-800 border-slate-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Color</label>
              <div className="flex gap-2">
                {RESOURCE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      c === 'violet' ? 'bg-violet-500' : c === 'red' ? 'bg-red-500' : c === 'amber' ? 'bg-amber-500' : c === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'
                    } ${newColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="border-slate-600 text-slate-300 text-xs">Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim()} className="bg-violet-600 hover:bg-violet-700 text-xs">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}