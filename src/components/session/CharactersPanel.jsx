import React, { useState } from 'react';
import { Scroll, ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function CharactersPanel({ characters, setCharacters, isDM, currentUserId }) {
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState({});
  const [editVals, setEditVals] = useState({});

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const startEdit = (char) => {
    setEditing(p => ({ ...p, [char.id]: true }));
    setEditVals(p => ({ ...p, [char.id]: {
      hp_current: char.hp_current ?? '',
      hp_max: char.hp_max ?? '',
      ac: char.ac ?? '',
      level: char.level ?? 1,
    }}));
  };

  const cancelEdit = (id) => {
    setEditing(p => ({ ...p, [id]: false }));
  };

  const saveEdit = async (char) => {
    const vals = editVals[char.id];
    const updated = {
      hp_current: parseInt(vals.hp_current) || 0,
      hp_max: parseInt(vals.hp_max) || 0,
      ac: parseInt(vals.ac) || 10,
      level: parseInt(vals.level) || 1,
    };
    await base44.entities.Character.update(char.id, updated);
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, ...updated } : c));
    setEditing(p => ({ ...p, [char.id]: false }));
  };

  const canEdit = (char) => isDM || char.owner_id === currentUserId;

  return (
    <Card className="bg-slate-900/50 border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Scroll className="h-4 w-4 text-violet-400" />
          Party Characters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-2 overflow-y-auto max-h-[calc(100%-56px)]">
        {characters.length === 0 ? (
          <p className="text-xs text-slate-500 px-2">No characters in campaign.</p>
        ) : (
          characters.map(char => {
            const isExpanded = expanded[char.id];
            const isEditing = editing[char.id];
            const vals = editVals[char.id] || {};
            const hpPct = char.hp_max ? Math.max(0, Math.min(100, ((char.hp_current || 0) / char.hp_max) * 100)) : 0;

            return (
              <div key={char.id} className="rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => toggle(char.id)}>
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={char.portrait_url} />
                    <AvatarFallback className="bg-violet-600 text-white text-xs">{char.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium leading-tight truncate">{char.name}</p>
                    <div className="h-1 bg-slate-700 rounded-full mt-1">
                      <div className={`h-1 rounded-full transition-all ${hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${hpPct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    <span className="text-red-400">{char.hp_current ?? '?'}</span>/<span className="text-slate-500">{char.hp_max ?? '?'}</span>
                  </span>
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                    <div className="text-xs text-slate-500">Lvl {char.level} {char.race} {char.class}</div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-400">HP Current</label>
                            <Input type="number" value={vals.hp_current} onChange={e => setEditVals(p => ({ ...p, [char.id]: { ...p[char.id], hp_current: e.target.value } }))} className="h-7 text-xs bg-slate-700 border-slate-600 text-white" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">HP Max</label>
                            <Input type="number" value={vals.hp_max} onChange={e => setEditVals(p => ({ ...p, [char.id]: { ...p[char.id], hp_max: e.target.value } }))} className="h-7 text-xs bg-slate-700 border-slate-600 text-white" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">AC</label>
                            <Input type="number" value={vals.ac} onChange={e => setEditVals(p => ({ ...p, [char.id]: { ...p[char.id], ac: e.target.value } }))} className="h-7 text-xs bg-slate-700 border-slate-600 text-white" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Level</label>
                            <Input type="number" value={vals.level} onChange={e => setEditVals(p => ({ ...p, [char.id]: { ...p[char.id], level: e.target.value } }))} className="h-7 text-xs bg-slate-700 border-slate-600 text-white" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(char)} className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-700"><Save className="h-3 w-3 mr-1" />Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelEdit(char.id)} className="h-7 text-xs text-slate-400"><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">AC</span><span className="text-white">{char.ac ?? '?'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Speed</span><span className="text-white">{char.speed ?? 30}ft</span>
                        </div>
                        {char.background && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Background</span><span className="text-white">{char.background}</span>
                          </div>
                        )}
                        {canEdit(char) && (
                          <Button size="sm" variant="ghost" onClick={() => startEdit(char)} className="w-full h-7 text-xs text-slate-400 hover:text-white mt-1">
                            <Edit2 className="h-3 w-3 mr-1" />Quick Edit
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}