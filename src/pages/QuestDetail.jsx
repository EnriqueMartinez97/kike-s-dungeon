import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Map, Edit, Save, X, CheckCircle, Circle, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function QuestDetail() {
  const [user, setUser] = useState(null);
  const [quest, setQuest] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const questId = urlParams.get('id');

  useEffect(() => {
    if (questId) loadData();
  }, [questId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const quests = await base44.entities.Quest.filter({ id: questId });
      if (quests.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }
      const q = quests[0];
      setQuest(q);

      const [camps, memberships] = await Promise.all([
        base44.entities.Campaign.filter({ id: q.campaign_id }),
        base44.entities.CampaignMembership.filter({ campaign_id: q.campaign_id, user_id: currentUser.id })
      ]);

      if (camps.length > 0) setCampaign(camps[0]);
      if (memberships.length > 0) setMembership(memberships[0]);
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const isDM = membership?.role === 'dm' || membership?.role === 'co_dm';

  const startEditing = () => {
    setEditData({
      title: quest.title,
      description: quest.description || '',
      dm_notes: quest.dm_notes || '',
      rewards: quest.rewards || '',
      status: quest.status || 'active',
      objectives: JSON.parse(JSON.stringify(quest.objectives || []))
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Quest.update(quest.id, editData);
      setQuest(prev => ({ ...prev, ...editData }));
      setEditing(false);
      toast({ title: 'Quest saved', description: 'Changes saved successfully.' });
    } catch (e) {
      toast({ title: 'Save failed', description: 'Could not save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleObjective = async (idx) => {
    if (!quest) return;
    const newObjs = quest.objectives.map((o, i) =>
      i === idx ? { ...o, completed: !o.completed } : o
    );
    await base44.entities.Quest.update(quest.id, { objectives: newObjs });
    setQuest(prev => ({ ...prev, objectives: newObjs }));
  };

  const addObjective = () => {
    setEditData(p => ({
      ...p,
      objectives: [...(p.objectives || []), { description: '', completed: false }]
    }));
  };

  const removeObjective = (idx) => {
    setEditData(p => ({
      ...p,
      objectives: p.objectives.filter((_, i) => i !== idx)
    }));
  };

  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30'
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!quest) return null;

  const objectives = editing ? editData.objectives : (quest.objectives || []);
  const completed = objectives.filter(o => o.completed).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${quest.campaign_id}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Map className="h-5 w-5 text-rose-400" />
            <Badge className={`${statusColors[quest.status] || statusColors.active} border`}>
              {quest.status || 'active'}
            </Badge>
            {objectives.length > 0 && (
              <span className="text-xs text-slate-500">{completed}/{objectives.length} objectives</span>
            )}
          </div>
          {editing ? (
            <Input
              value={editData.title}
              onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white text-2xl font-bold h-12 mb-1"
            />
          ) : (
            <h1 className="text-3xl font-bold text-white">{quest.title}</h1>
          )}
          {campaign && <p className="text-slate-400 mt-1">{campaign.name}</p>}
        </div>
        {isDM && (
          <div className="flex gap-2 ml-4">
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => setEditing(false)} className="text-slate-400">
                  <X className="h-4 w-4 mr-2" />Cancel
                </Button>
                <Button onClick={saveEdit} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button onClick={startEditing} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Edit className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Status selector when editing */}
      {editing && (
        <Card className="bg-slate-900/50 border-slate-800 mb-6">
          <CardContent className="p-4">
            <label className="text-xs text-slate-400 block mb-2">Status</label>
            <Select value={editData.status} onValueChange={v => setEditData(p => ({ ...p, status: v }))}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editData.description}
              onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the quest..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
          ) : (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {quest.description || <span className="text-slate-500 italic">No description.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm">Objectives</CardTitle>
            {editing && (
              <Button size="sm" onClick={addObjective} variant="ghost" className="text-slate-400 h-7">
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {objectives.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No objectives set.</p>
          ) : (
            <div className="space-y-2">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {!editing && (
                    <button onClick={() => toggleObjective(idx)} className="mt-0.5 flex-shrink-0">
                      {obj.completed
                        ? <CheckCircle className="h-5 w-5 text-emerald-400" />
                        : <Circle className="h-5 w-5 text-slate-500" />
                      }
                    </button>
                  )}
                  {editing ? (
                    <div className="flex gap-2 flex-1">
                      <Input
                        value={obj.description}
                        onChange={e => {
                          const newObjs = editData.objectives.map((o, i) =>
                            i === idx ? { ...o, description: e.target.value } : o
                          );
                          setEditData(p => ({ ...p, objectives: newObjs }));
                        }}
                        placeholder="Objective description..."
                        className="bg-slate-800 border-slate-700 text-white flex-1"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeObjective(idx)} className="text-red-400 h-9 w-9 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className={`text-sm ${obj.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {obj.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-sm">Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editData.rewards}
              onChange={e => setEditData(p => ({ ...p, rewards: e.target.value }))}
              placeholder="Quest rewards..."
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          ) : (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {quest.rewards || <span className="text-slate-500 italic">No rewards specified.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* DM Notes (DM only) */}
      {isDM && (
        <Card className="bg-slate-900/50 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              DM Notes
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">DM Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editData.dm_notes}
                onChange={e => setEditData(p => ({ ...p, dm_notes: e.target.value }))}
                placeholder="Private notes..."
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
            ) : (
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {quest.dm_notes || <span className="text-slate-500 italic">No DM notes.</span>}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}