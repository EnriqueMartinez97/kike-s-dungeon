import React, { useState } from 'react';
import { Map, Plus, CheckCircle, Circle, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { logQuestCreation, logQuestUpdate } from './sessionLogHelper';

export default function QuickQuestPanel({ campaignId, quests = [], setQuests = () => {}, isDM, userId, userName }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [newQuest, setNewQuest] = useState({ title: '', description: '', dm_notes: '', objectives: [], status: 'active', rewards: '' });
  const [newObjText, setNewObjText] = useState('');

  const addObjective = () => {
    if (!newObjText.trim()) return;
    setNewQuest(p => ({ ...p, objectives: [...p.objectives, { text: newObjText.trim(), completed: false }] }));
    setNewObjText('');
  };

  const toggleObj = (questId, objIdx) => {
    setQuests(prev => prev.map(q => {
      if (q.id !== questId) return q;
      const objectives = [...(q.objectives || [])];
      const oldCompleted = objectives[objIdx].completed;
      objectives[objIdx] = { ...objectives[objIdx], completed: !objectives[objIdx].completed };
      base44.entities.Quest.update(q.id, { objectives });
      
      // Log objective toggle
      if (isDM && userId) {
        const newStatus = !oldCompleted ? 'completed' : 'uncompleted';
        logQuestUpdate(campaignId, userId, userName || 'DM', q.title, 'objective', `${objectives[objIdx].text} - ${newStatus}`);
      }
      
      return { ...q, objectives };
    }));
  };

  const deleteQuest = async (questId) => {
    const quest = quests.find(q => q.id === questId);
    await base44.entities.Quest.delete(questId);
    setQuests(prev => prev.filter(q => q.id !== questId));
    
    // Log quest deletion
    if (isDM && userId && quest) {
      await logQuestUpdate(campaignId, userId, userName || 'DM', quest.title, 'deleted', '');
    }
  };

  const saveQuest = async () => {
    if (!newQuest.title.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.Quest.create({ ...newQuest, campaign_id: campaignId });
      setQuests(prev => [...prev, created]);
      
      // Log quest creation
      if (isDM && userId) {
        await logQuestCreation(campaignId, userId, userName || 'DM', newQuest.title, created.id);
      }
      
      setShowAdd(false);
      setNewQuest({ title: '', description: '', dm_notes: '', objectives: [], status: 'active', rewards: '' });
    } catch (e) {
      console.error('Failed to create quest');
    } finally {
      setSaving(false);
    }
  };

  const activeQuests = quests.filter(q => q.status === 'active');

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Map className="h-4 w-4 text-amber-400" />
              Active Quests ({activeQuests.length})
            </CardTitle>
            {isDM && (
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-1">
          {activeQuests.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 pb-1">No active quests</p>
          ) : (
            activeQuests.map(quest => {
              const isCollapsed = collapsed[quest.id];
              return (
                <div key={quest.id} className="rounded-lg bg-slate-800/50 overflow-hidden">
                  <div className="flex items-center gap-1 p-2">
                    <button
                      onClick={() => setCollapsed(p => ({ ...p, [quest.id]: !p[quest.id] }))}
                      className="flex items-center gap-1 flex-1 text-left"
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                      <p className="text-xs font-medium text-white truncate">{quest.title}</p>
                    </button>
                    {isDM && (
                      <button onClick={() => deleteQuest(quest.id)} className="ml-1 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {(quest.objectives || []).map((obj, i) => (
                        <div key={i} className="flex items-center gap-1 cursor-pointer group" onClick={() => toggleObj(quest.id, i)}>
                          {obj.completed ? (
                            <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Circle className="h-3 w-3 text-slate-500 flex-shrink-0 group-hover:text-slate-300" />
                          )}
                          <span className={`text-xs ${obj.completed ? 'line-through text-slate-500' : 'text-slate-400'}`}>{obj.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Quick Add Quest</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">Title *</Label>
              <Input value={newQuest.title} onChange={(e) => setNewQuest(p => ({ ...p, title: e.target.value }))} placeholder="Quest title..." className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Player Description</Label>
              <Textarea value={newQuest.description} onChange={(e) => setNewQuest(p => ({ ...p, description: e.target.value }))} placeholder="What the players know..." className="bg-slate-800 border-slate-700 text-white min-h-[60px]" />
            </div>
            <div>
              <Label className="text-slate-300">Add Objectives</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newObjText} onChange={(e) => setNewObjText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addObjective()} placeholder="Objective..." className="bg-slate-800 border-slate-700 text-white" />
                <Button size="sm" onClick={addObjective} variant="outline" className="border-slate-700 text-slate-300"><Plus className="h-4 w-4" /></Button>
              </div>
              {newQuest.objectives.length > 0 && (
                <div className="mt-2 space-y-1">
                  {newQuest.objectives.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                      <Circle className="h-3 w-3" /><span className="flex-1">{obj.text}</span>
                      <button onClick={() => setNewQuest(p => ({ ...p, objectives: p.objectives.filter((_, idx) => idx !== i) }))}><X className="h-3 w-3 text-slate-500 hover:text-red-400" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={saveQuest} disabled={saving || !newQuest.title.trim()} className="bg-violet-600 hover:bg-violet-700">{saving ? 'Saving...' : 'Create Quest'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}