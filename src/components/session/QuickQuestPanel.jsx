import React, { useState, useEffect } from 'react';
import { Map, Plus, CheckCircle, Circle, X, ChevronDown, ChevronRight, Trash2, Gift, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { logQuestCreation, logQuestUpdate } from './sessionLogHelper';

export default function QuickQuestPanel({ campaignId, quests = [], setQuests = () => {}, isDM, userId, userName }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [newQuest, setNewQuest] = useState({ title: '', description: '', dm_notes: '', objectives: [], status: 'active', rewards: '' });
  const [newObjText, setNewObjText] = useState('');
  const [rewardDialog, setRewardDialog] = useState(null); // { quest }
  const [characters, setCharacters] = useState([]);
  const [rewardSelections, setRewardSelections] = useState({}); // { characterId: { selected, note } }
  const [awardingSaving, setAwardingSaving] = useState(false);

  useEffect(() => {
    if (campaignId) {
      base44.entities.Character.filter({ campaign_id: campaignId }).then(setCharacters).catch(() => {});
    }
  }, [campaignId]);

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
    if (isDM && userId && quest) {
      await logQuestUpdate(campaignId, userId, userName || 'DM', quest.title, 'deleted', '');
    }
  };

  const openRewardDialog = (quest) => {
    const initial = {};
    characters.forEach(c => { initial[c.id] = { selected: false, note: '' }; });
    setRewardSelections(initial);
    setRewardDialog(quest);
  };

  const awardRewards = async () => {
    if (!rewardDialog) return;
    setAwardingSaving(true);
    const awarded = characters.filter(c => rewardSelections[c.id]?.selected);
    try {
      for (const char of awarded) {
        const note = rewardSelections[char.id]?.note?.trim();
        const content = `Quest "${rewardDialog.title}" completed — ${char.name} received: ${rewardDialog.rewards || 'reward'}${note ? ` (${note})` : ''}`;
        await base44.entities.SessionLog.create({
          campaign_id: campaignId,
          entry_type: 'QUEST_UPDATE',
          user_id: userId,
          user_name: userName || 'DM',
          character_id: char.id,
          character_name: char.name,
          content,
          metadata: { is_public: true },
          visibility: 'public',
        });
      }
      // Mark quest completed
      await base44.entities.Quest.update(rewardDialog.id, { status: 'completed' });
      setQuests(prev => prev.map(q => q.id === rewardDialog.id ? { ...q, status: 'completed' } : q));
      setRewardDialog(null);
    } catch (e) {
      console.error('Award failed', e);
    } finally {
      setAwardingSaving(false);
    }
  };

  const saveQuest = async () => {
    if (!newQuest.title.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.Quest.create({ ...newQuest, campaign_id: campaignId });
      setQuests(prev => [...prev, created]);
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
                      className="flex items-center gap-1 flex-1 text-left min-w-0"
                    >
                      {isCollapsed ? <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                      <p className="text-xs font-medium text-white truncate">{quest.title}</p>
                    </button>
                    {isDM && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {quest.rewards && (
                          <button onClick={() => openRewardDialog(quest)} title="Award Rewards"
                            className="text-amber-600 hover:text-amber-400 transition-colors">
                            <Gift className="h-3 w-3" />
                          </button>
                        )}
                        <button onClick={() => deleteQuest(quest.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="px-2 pb-2 space-y-1">
                      {quest.rewards && (
                        <p className="text-xs text-amber-400/70 flex items-center gap-1 mb-1">
                          <Coins className="h-2.5 w-2.5" />{quest.rewards}
                        </p>
                      )}
                      {(quest.objectives || []).map((obj, i) => (
                        <div key={i} className="flex items-center gap-1 cursor-pointer group" onClick={() => isDM && toggleObj(quest.id, i)}>
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

      {/* Add Quest Dialog */}
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
              <Label className="text-slate-300">Rewards</Label>
              <Input value={newQuest.rewards} onChange={(e) => setNewQuest(p => ({ ...p, rewards: e.target.value }))} placeholder="e.g. 500gp, magic sword..." className="bg-slate-800 border-slate-700 text-white" />
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

      {/* Award Rewards Dialog */}
      <Dialog open={!!rewardDialog} onOpenChange={() => setRewardDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-400" /> Award Rewards
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-1">"{rewardDialog?.title}"</p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-300 font-medium mb-1">Rewards</p>
              <p className="text-sm text-amber-100">{rewardDialog?.rewards}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Select characters to receive rewards:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {characters.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No characters found in this campaign.</p>
                )}
                {characters.map(char => (
                  <div key={char.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`char-${char.id}`}
                        checked={!!rewardSelections[char.id]?.selected}
                        onCheckedChange={checked =>
                          setRewardSelections(p => ({ ...p, [char.id]: { ...p[char.id], selected: !!checked } }))
                        }
                        className="border-slate-600"
                      />
                      <Label htmlFor={`char-${char.id}`} className="text-slate-300 text-sm font-normal cursor-pointer">
                        {char.name}
                        <span className="text-slate-500 ml-1 text-xs">Lvl {char.level || 1} {char.class || ''}</span>
                      </Label>
                    </div>
                    {rewardSelections[char.id]?.selected && (
                      <Input
                        value={rewardSelections[char.id]?.note || ''}
                        onChange={e => setRewardSelections(p => ({ ...p, [char.id]: { ...p[char.id], note: e.target.value } }))}
                        placeholder="Partial/custom note (optional)..."
                        className="ml-6 bg-slate-800 border-slate-700 text-white text-xs h-7"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">Awarding will mark the quest as completed and log each award to the session.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button
              onClick={awardRewards}
              disabled={awardingSaving || !Object.values(rewardSelections).some(s => s.selected)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {awardingSaving ? 'Awarding...' : 'Award & Complete Quest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}