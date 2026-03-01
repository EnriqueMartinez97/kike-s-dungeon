import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Swords, Plus, Trash2, Heart, Shield,
  ArrowRight, RotateCcw, Trophy, SkipForward
} from 'lucide-react';
import InitiativeRollDialog from './InitiativeRollDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

const CONDITIONS = [
  'Blinded','Charmed','Deafened','Exhaustion','Frightened',
  'Grappled','Incapacitated','Invisible','Paralyzed','Petrified',
  'Poisoned','Prone','Restrained','Stunned','Unconscious'
];

async function syncCharacterHP(combatant, newHp) {
  if (!combatant.characterId) return;
  try {
    await base44.entities.Character.update(combatant.characterId, { hp_current: newHp });
  } catch (e) {
    console.warn('HP sync failed for', combatant.name, e);
  }
}

export default function CombatTracker({
  characters = [],
  npcs = [],
  isDM,
  campaignId,
  onCombatStateChange,
  // Lifted state props (from parent to survive tab switches)
  combatActive, setCombatActive,
  round, setRound,
  currentTurnIndex, setCurrentTurnIndex,
  combatants, setCombatants,
  combatLog, setCombatLog,
}) {
  // Fallback to local state if props not provided (backward compat)
  const [localCombatActive, setLocalCombatActive] = useState(false);
  const [localRound, setLocalRound] = useState(1);
  const [localTurnIndex, setLocalTurnIndex] = useState(0);
  const [localCombatants, setLocalCombatants] = useState([]);
  const [localCombatLog, setLocalCombatLog] = useState([]);

  const isLifted = combatActive !== undefined;
  const _combatActive = isLifted ? combatActive : localCombatActive;
  const _setCombatActive = isLifted ? setCombatActive : setLocalCombatActive;
  const _round = isLifted ? round : localRound;
  const _setRound = isLifted ? setRound : setLocalRound;
  const _currentTurnIndex = isLifted ? currentTurnIndex : localTurnIndex;
  const _setCurrentTurnIndex = isLifted ? setCurrentTurnIndex : setLocalTurnIndex;
  const _combatants = isLifted ? combatants : localCombatants;
  const _setCombatants = isLifted ? setCombatants : setLocalCombatants;
  const _combatLog = isLifted ? combatLog : localCombatLog;
  const _setCombatLog = isLifted ? setCombatLog : setLocalCombatLog;
  const [showInitiativeDialog, setShowInitiativeDialog] = useState(false);
  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(null);
  const [newCombatant, setNewCombatant] = useState({ name: '', initiative: '', hp: '', ac: '', type: 'npc' });
  const [actionData, setActionData] = useState({ type: 'damage', amount: '', condition: '', note: '' });

  const notifyStateChange = useCallback((updatedCombatants, isActive, currentRound) => {
    if (onCombatStateChange) {
      onCombatStateChange({ active: isActive, round: currentRound, combatants: updatedCombatants });
    }
  }, [onCombatStateChange]);

  const addLog = (actor, action, details = '') => {
    _setCombatLog(prev => [...prev, {
      id: Date.now(), timestamp: new Date().toISOString(), round: _round, actor, action, details
    }]);
  };

  const sortByInitiative = (list) => [...list].sort((a, b) => b.initiative - a.initiative);

  const startCombatWithCombatants = (initial) => {
    const sorted = sortByInitiative(initial);
    _setCombatants(sorted);
    _setCombatActive(true);
    _setRound(1);
    _setCurrentTurnIndex(0);
    _setCombatLog([]);
    setTimeout(() => addLog('System', `Combat started — ${sorted.map(c => `${c.name}(${c.initiative})`).join(', ')}`), 0);
    notifyStateChange(sorted, true, 1);
  };

  const nextTurn = () => {
    let nextIdx = _currentTurnIndex + 1;
    let nextRound = _round;
    if (nextIdx >= _combatants.length) {
      nextIdx = 0;
      nextRound = _round + 1;
      _setRound(nextRound);
      addLog('System', `Round ${nextRound} begins`);
    }
    _setCurrentTurnIndex(nextIdx);
    addLog('System', `${_combatants[nextIdx]?.name}'s turn`);
  };

  const updateCombatants = (updated) => {
    _setCombatants(updated);
    notifyStateChange(updated, _combatActive, _round);
  };

  const applyAction = async () => {
    const target = _combatants.find(c => c.id === showActionDialog);
    if (!target) return;

    let newHp = target.hp;
    let newTempHp = target.temp_hp || 0;

    if (actionData.type === 'damage') {
      const dmg = parseInt(actionData.amount) || 0;
      if (newTempHp > 0) {
        const absorbed = Math.min(newTempHp, dmg);
        newTempHp -= absorbed;
        newHp = Math.max(0, newHp - (dmg - absorbed));
      } else {
        newHp = Math.max(0, newHp - dmg);
      }
      addLog('DM', `${dmg} damage → ${target.name}`, `HP: ${target.hp} → ${newHp}`);
    } else if (actionData.type === 'heal') {
      const heal = parseInt(actionData.amount) || 0;
      newHp = Math.min(target.max_hp, newHp + heal);
      addLog('DM', `${heal} healing → ${target.name}`, `HP: ${target.hp} → ${newHp}`);
    } else if (actionData.type === 'temp_hp') {
      newTempHp = parseInt(actionData.amount) || 0;
      addLog('DM', `Temp HP: ${newTempHp} → ${target.name}`);
    } else if (actionData.type === 'condition_add' && actionData.condition) {
      const updated = _combatants.map(c => c.id === target.id
        ? { ...c, conditions: [...(c.conditions || []), actionData.condition] } : c);
      updateCombatants(updated);
      addLog('DM', `${actionData.condition} added to ${target.name}`);
      closeAction(); return;
    } else if (actionData.type === 'condition_remove' && actionData.condition) {
      const updated = _combatants.map(c => c.id === target.id
        ? { ...c, conditions: (c.conditions || []).filter(x => x !== actionData.condition) } : c);
      updateCombatants(updated);
      addLog('DM', `${actionData.condition} removed from ${target.name}`);
      closeAction(); return;
    } else if (actionData.type === 'note') {
      const updated = _combatants.map(c => c.id === target.id ? { ...c, notes: actionData.note } : c);
      updateCombatants(updated);
      closeAction(); return;
    }

    const updated = _combatants.map(c => c.id === target.id
      ? { ...c, hp: newHp, temp_hp: newTempHp } : c);
    updateCombatants(updated);

    if (actionData.type === 'damage' || actionData.type === 'heal') {
      await syncCharacterHP(target, newHp);
    }
    closeAction();
  };

  const closeAction = () => {
    setShowActionDialog(null);
    setActionData({ type: 'damage', amount: '', condition: '', note: '' });
  };

  const endCombat = () => {
    const downed = _combatants.filter(c => c.hp === 0).map(c => c.name);
    const summary = [
      downed.length ? `Downed: ${downed.join(', ')}` : null,
      `${_round} rounds`,
    ].filter(Boolean).join(' · ');
    addLog('System', 'Combat ended', summary);
    _setCombatActive(false);
    notifyStateChange([], false, 0);
  };

  const addCombatant = () => {
    if (!newCombatant.name) return;
    const matchedChar = characters.find(c => c.name.toLowerCase() === newCombatant.name.toLowerCase());
    const matchedNpc = npcs.find(n => n.name.toLowerCase() === newCombatant.name.toLowerCase());
    const c = {
      id: `combatant_${Date.now()}`,
      name: newCombatant.name,
      initiative: parseInt(newCombatant.initiative) || 0,
      hp: matchedChar ? (matchedChar.hp_current || matchedChar.hp_max) : parseInt(newCombatant.hp) || 0,
      max_hp: matchedChar ? matchedChar.hp_max : parseInt(newCombatant.hp) || 0,
      temp_hp: 0,
      ac: matchedChar ? matchedChar.ac : (matchedNpc ? matchedNpc.stat_block?.ac : parseInt(newCombatant.ac)) || 10,
      conditions: [],
      type: newCombatant.type,
      characterId: matchedChar?.id || null,
      notes: ''
    };
    const updated = sortByInitiative([..._combatants, c]);
    updateCombatants(updated);
    setNewCombatant({ name: '', initiative: '', hp: '', ac: '', type: 'npc' });
    setShowAddCombatant(false);
    addLog('DM', `Added ${c.name}`, `Init ${c.initiative}, HP ${c.hp}/${c.max_hp}, AC ${c.ac}`);
  };

  const hpColor = (hp, max) => {
    const p = hp / (max || 1);
    if (p === 0) return 'text-red-500';
    if (p < 0.25) return 'text-red-400';
    if (p < 0.5) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const hpBarColor = (hp, max) => {
    const p = hp / (max || 1);
    if (p > 0.5) return 'bg-emerald-500';
    if (p > 0.25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (!_combatActive) {
    return (
      <>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Swords className="h-4 w-4 text-red-400" /> Combat Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowInitiativeDialog(true)}
              className="w-full bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30"
            >
              <Swords className="h-4 w-4 mr-2" /> Engage Combat / Roll Initiative
            </Button>
          </CardContent>
        </Card>
        <InitiativeRollDialog
          open={showInitiativeDialog}
          onClose={() => setShowInitiativeDialog(false)}
          characters={characters}
          npcs={npcs}
          onStartCombat={startCombatWithCombatants}
        />
      </>
    );
  }

  return (
    <>
      <Card className="bg-slate-900/50 border-red-500/30 border">
        <CardHeader className="pb-2 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Swords className="h-4 w-4 text-red-400 animate-pulse" />
              Combat — Round {_round}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setShowAddCombatant(true)} className="text-slate-400 h-7 px-2">
                <Plus className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => updateCombatants(sortByInitiative(_combatants))} className="text-slate-400 h-7 px-2" title="Re-sort">
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-2">
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {combatants.map((c, idx) => {
                const isCurrent = idx === currentTurnIndex;
                const hpPct = Math.max(0, Math.min(100, (c.hp / (c.max_hp || 1)) * 100));
                return (
                  <div key={c.id} className={`p-2 rounded-lg border transition-all ${
                    isCurrent ? 'bg-violet-500/20 border-violet-500/50' : 'bg-slate-800/30 border-slate-700/50'
                  } ${c.hp === 0 ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      {isDM ? (
                        <Input
                          type="number"
                          value={c.initiative}
                          onChange={e => updateCombatants(combatants.map(x => x.id === c.id ? { ...x, initiative: parseInt(e.target.value) || 0 } : x))}
                          className="w-10 h-6 text-xs bg-slate-700 border-slate-600 text-center text-white p-0"
                        />
                      ) : (
                        <div className="w-10 text-center text-xs font-bold text-violet-400">{c.initiative}</div>
                      )}

                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className={`text-xs ${c.type === 'player' ? 'bg-violet-600' : 'bg-red-700'} text-white`}>
                          {c.name[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-medium truncate ${isCurrent ? 'text-violet-300' : 'text-white'}`}>{c.name}</span>
                          {isCurrent && <ArrowRight className="h-3 w-3 text-violet-400 flex-shrink-0" />}
                          {c.characterId && <span className="text-xs text-emerald-400/60" title="Synced to character sheet">⟳</span>}
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full mt-1 w-full">
                          <div className={`h-1 rounded-full transition-all ${hpBarColor(c.hp, c.max_hp)}`} style={{ width: `${hpPct}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs flex-shrink-0">
                        <Heart className="h-3 w-3 text-red-400" />
                        {isDM || c.type === 'player' ? (
                          <>
                            <span className={hpColor(c.hp, c.max_hp)}>{c.hp}</span>
                            <span className="text-slate-500">/{c.max_hp}</span>
                            {c.temp_hp > 0 && <span className="text-blue-400">(+{c.temp_hp})</span>}
                            <span className="text-slate-500 ml-1">AC{c.ac}</span>
                          </>
                        ) : (
                          <span className={hpColor(c.hp, c.max_hp)}>
                            {c.hp / c.max_hp > 0.75 ? 'Healthy' : c.hp / c.max_hp > 0.5 ? 'Wounded' : c.hp / c.max_hp > 0.25 ? 'Bloodied' : c.hp > 0 ? 'Critical' : 'Down'}
                          </span>
                        )}
                      </div>

                      {isDM && (
                        <Button size="sm" variant="ghost" onClick={() => setShowActionDialog(c.id)} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                          <Shield className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {(c.conditions || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 ml-12">
                        {c.conditions.map((cond, i) => (
                          <Badge key={i} className="text-xs py-0 bg-orange-500/20 text-orange-300 border border-orange-500/30">{cond}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={nextTurn} className="flex-1 bg-violet-600 hover:bg-violet-700 h-8">
              <SkipForward className="h-3 w-3 mr-1" /> Next Turn
            </Button>
            {isDM && (
              <Button size="sm" variant="outline" onClick={endCombat} className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8">
                <Trophy className="h-3 w-3 mr-1" /> End
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {combatLog.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-white text-xs">Combat Log</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-1">
                {[...combatLog].reverse().map(entry => (
                  <div key={entry.id} className="text-xs text-slate-400 border-b border-slate-800 pb-1">
                    <span className="text-slate-500">R{entry.round}</span> · <span className="text-white">{entry.actor}</span> · {entry.action}
                    {entry.details && <span className="text-slate-500"> — {entry.details}</span>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddCombatant} onOpenChange={setShowAddCombatant}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader><DialogTitle className="text-white">Add Combatant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300 text-xs">Name</Label>
              <Input value={newCombatant.name} onChange={e => setNewCombatant(p => ({ ...p, name: e.target.value }))}
                placeholder="Character/NPC name (auto-fills from roster)" className="bg-slate-800 border-slate-700 text-white" />
              {newCombatant.name.length > 1 && (
                <div className="mt-1 space-y-1">
                  {[...characters, ...npcs].filter(x => x.name.toLowerCase().startsWith(newCombatant.name.toLowerCase())).slice(0, 3).map(x => (
                    <button key={x.id} onClick={() => setNewCombatant(p => ({ ...p, name: x.name, type: x.class ? 'player' : 'npc' }))}
                      className="text-xs text-violet-400 hover:text-violet-300 block">
                      ↳ {x.name} {x.class ? `(${x.class})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-slate-300 text-xs">Initiative</Label>
                <Input type="number" value={newCombatant.initiative} onChange={e => setNewCombatant(p => ({ ...p, initiative: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300 text-xs">HP</Label>
                <Input type="number" value={newCombatant.hp} onChange={e => setNewCombatant(p => ({ ...p, hp: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" /></div>
              <div><Label className="text-slate-300 text-xs">AC</Label>
                <Input type="number" value={newCombatant.ac} onChange={e => setNewCombatant(p => ({ ...p, ac: e.target.value }))} className="bg-slate-800 border-slate-700 text-white" /></div>
            </div>
            <div className="flex gap-4">
              {['player', 'npc'].map(t => (
                <Label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={newCombatant.type === t} onChange={() => setNewCombatant(p => ({ ...p, type: t }))} />
                  <span className="text-slate-300 capitalize">{t === 'player' ? 'Player Character' : 'NPC/Enemy'}</span>
                </Label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCombatant(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={addCombatant} className="bg-violet-600 hover:bg-violet-700">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showActionDialog && (() => {
        const target = combatants.find(c => c.id === showActionDialog);
        if (!target) return null;
        return (
          <Dialog open={!!showActionDialog} onOpenChange={closeAction}>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader><DialogTitle className="text-white">{target.name} — Actions</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'damage', label: 'Damage', cls: 'border-red-500/50 text-red-300' },
                    { id: 'heal', label: 'Heal', cls: 'border-emerald-500/50 text-emerald-300' },
                    { id: 'temp_hp', label: 'Temp HP', cls: 'border-blue-500/50 text-blue-300' },
                    { id: 'condition_add', label: '+ Condition', cls: 'border-orange-500/50 text-orange-300' },
                    { id: 'condition_remove', label: '− Condition', cls: 'border-slate-500/50 text-slate-300' },
                    { id: 'note', label: 'Note', cls: 'border-violet-500/50 text-violet-300' },
                  ].map(t => (
                    <Button key={t.id} size="sm" variant="outline"
                      onClick={() => setActionData(p => ({ ...p, type: t.id }))}
                      className={actionData.type === t.id ? t.cls + ' bg-slate-800' : 'border-slate-700 text-slate-400'}>
                      {t.label}
                    </Button>
                  ))}
                </div>
                {['damage', 'heal', 'temp_hp'].includes(actionData.type) && (
                  <div>
                    <Label className="text-slate-300">Amount</Label>
                    <Input type="number" value={actionData.amount}
                      onChange={e => setActionData(p => ({ ...p, amount: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && applyAction()}
                      className="bg-slate-800 border-slate-700 text-white" autoFocus />
                  </div>
                )}
                {['condition_add', 'condition_remove'].includes(actionData.type) && (
                  <div className="flex flex-wrap gap-1">
                    {(actionData.type === 'condition_add'
                      ? CONDITIONS.filter(c => !(target.conditions || []).includes(c))
                      : (target.conditions || [])
                    ).map(cond => (
                      <Badge key={cond} onClick={() => setActionData(p => ({ ...p, condition: cond }))}
                        className={`cursor-pointer ${actionData.condition === cond ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {cond}
                      </Badge>
                    ))}
                  </div>
                )}
                {actionData.type === 'note' && (
                  <Textarea value={actionData.note} onChange={e => setActionData(p => ({ ...p, note: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white" />
                )}
              </div>
              <DialogFooter>
                <Button size="sm" variant="ghost"
                  onClick={() => { updateCombatants(combatants.filter(x => x.id !== target.id)); closeAction(); }}
                  className="text-red-400 mr-auto">
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
                <Button variant="outline" onClick={closeAction} className="border-slate-700 text-slate-300">Cancel</Button>
                <Button onClick={applyAction} className="bg-violet-600 hover:bg-violet-700">Apply</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}