import React, { useState } from 'react';
import { Swords, Dice6, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function InitiativeRollDialog({ open, onClose, characters = [], npcs = [], onStartCombat }) {
  const [playerInitiatives, setPlayerInitiatives] = useState(
    (characters || []).map(c => ({ ...c, initiative: '', rolled: false }))
  );
  const [selectedNPCs, setSelectedNPCs] = useState([]);
  const [npcInitiatives, setNpcInitiatives] = useState({});
  const [customNPCs, setCustomNPCs] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customHp, setCustomHp] = useState('');
  const [customAc, setCustomAc] = useState('10');

  const dexMod = (score) => Math.floor(((score || 10) - 10) / 2);

  const rollForPlayer = (idx) => {
    const char = playerInitiatives[idx];
    const bonus = char.initiative_bonus ?? dexMod(char.ability_scores?.dexterity);
    const roll = Math.floor(Math.random() * 20) + 1 + bonus;
    setPlayerInitiatives(prev => prev.map((p, i) => i === idx ? { ...p, initiative: roll, rolled: true } : p));
  };

  const rollForNPC = (id) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    setNpcInitiatives(prev => ({ ...prev, [id]: roll }));
  };

  const toggleNPC = (npc) => {
    setSelectedNPCs(prev => {
      const exists = prev.find(n => n.id === npc.id);
      if (exists) return prev.filter(n => n.id !== npc.id);
      return [...prev, npc];
    });
  };

  const addCustomNPC = () => {
    if (!customName.trim()) return;
    const id = `custom_${Date.now()}`;
    const npc = { id, name: customName, stat_block: { hp: parseInt(customHp) || 10, ac: parseInt(customAc) || 10 } };
    setCustomNPCs(prev => [...prev, npc]);
    setSelectedNPCs(prev => [...prev, npc]);
    setCustomName(''); setCustomHp(''); setCustomAc('10');
  };

  const handleStart = () => {
    const combatants = [
      ...playerInitiatives.map(c => ({
        id: `player_${c.id}`,
        name: c.name,
        initiative: parseInt(c.initiative) || 0,
        hp: c.hp_current || 0,
        max_hp: c.hp_max || 0,
        temp_hp: c.hp_temp || 0,
        ac: c.ac || 10,
        conditions: [],
        type: 'player',
        character_id: c.id
      })),
      ...selectedNPCs.map(n => ({
        id: `npc_${n.id}`,
        name: n.name,
        initiative: parseInt(npcInitiatives[n.id]) || 0,
        hp: n.stat_block?.hp || 10,
        max_hp: n.stat_block?.hp || 10,
        temp_hp: 0,
        ac: n.stat_block?.ac || 10,
        conditions: [],
        type: 'npc'
      }))
    ];
    onStartCombat(combatants);
    onClose();
  };

  const allNPCsForSelection = [...(npcs || []), ...customNPCs.filter(c => !(npcs || []).find(n => n.id === c.id))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Swords className="h-5 w-5 text-red-400" />
            Roll for Initiative!
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Roll or enter initiatives for all participants before combat begins.
          </DialogDescription>
        </DialogHeader>

        {/* Players */}
        <div>
          <h3 className="text-sm font-semibold text-violet-300 mb-2">Party Members</h3>
          <div className="space-y-2">
            {playerInitiatives.map((char, idx) => {
              const bonus = char.initiative_bonus ?? dexMod(char.ability_scores?.dexterity);
              return (
                <div key={char.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={char.portrait_url} />
                    <AvatarFallback className="bg-violet-600 text-white text-xs">{char.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{char.name}</p>
                    <p className="text-xs text-slate-500">Initiative modifier: {bonus >= 0 ? `+${bonus}` : bonus}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={char.initiative}
                      onChange={(e) => setPlayerInitiatives(prev => prev.map((p, i) => i === idx ? { ...p, initiative: e.target.value } : p))}
                      placeholder="Roll"
                      className={`w-16 h-8 bg-slate-700 border-slate-600 text-white text-center ${char.rolled ? 'border-violet-500' : ''}`}
                    />
                    <Button size="sm" variant="ghost" onClick={() => rollForPlayer(idx)} className="text-amber-400 hover:text-amber-300 h-8 w-8 p-0" title="Auto-roll">
                      <Dice6 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NPC Selection */}
        <div>
          <h3 className="text-sm font-semibold text-red-300 mb-2">Select NPCs / Enemies</h3>
          {allNPCsForSelection.length === 0 ? (
            <p className="text-slate-500 text-sm">No NPCs in campaign. Add custom enemies below.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allNPCsForSelection.map((npc) => {
                const isSelected = selectedNPCs.some(n => n.id === npc.id);
                return (
                  <div key={npc.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isSelected ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/30 border-slate-700'}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleNPC(npc)}
                      className="border-slate-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{npc.name}</p>
                      {npc.stat_block && (
                        <p className="text-xs text-slate-500">HP: {npc.stat_block.hp || '?'} | AC: {npc.stat_block.ac || '?'} {npc.stat_block.cr ? `| CR ${npc.stat_block.cr}` : ''}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={npcInitiatives[npc.id] || ''}
                          onChange={(e) => setNpcInitiatives(prev => ({ ...prev, [npc.id]: e.target.value }))}
                          placeholder="Init"
                          className="w-16 h-8 bg-slate-700 border-slate-600 text-white text-center"
                        />
                        <Button size="sm" variant="ghost" onClick={() => rollForNPC(npc.id)} className="text-amber-400 h-8 w-8 p-0" title="Roll initiative">
                          <Dice6 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Enemy */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Add Custom Enemy</h3>
          <div className="flex gap-2">
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Name..." className="bg-slate-800 border-slate-700 text-white flex-1" />
            <Input type="number" value={customHp} onChange={(e) => setCustomHp(e.target.value)} placeholder="HP" className="bg-slate-800 border-slate-700 text-white w-16" />
            <Input type="number" value={customAc} onChange={(e) => setCustomAc(e.target.value)} placeholder="AC" className="bg-slate-800 border-slate-700 text-white w-16" />
            <Button size="sm" onClick={addCustomNPC} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">Cancel</Button>
          <Button onClick={handleStart} className="bg-red-600 hover:bg-red-700">
            <Swords className="h-4 w-4 mr-2" />
            Begin Combat!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}