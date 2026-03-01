import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Plus,
  Trash2,
  CheckCircle,
  Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

export default function QuestEditor() {
  const [user, setUser] = useState(null);
  const [quest, setQuest] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const questId = urlParams.get('id');
  const campaignId = urlParams.get('campaign_id');

  const defaultQuest = {
    campaign_id: campaignId,
    title: '',
    description: '',
    dm_notes: '',
    objectives: [],
    rewards: '',
    status: 'active'
  };

  useEffect(() => {
    loadData();
  }, [questId, campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (questId) {
        const quests = await base44.entities.Quest.filter({ id: questId });
        if (quests.length === 0) {
          navigate(createPageUrl('Campaigns'));
          return;
        }
        setQuest(quests[0]);
        
        const camps = await base44.entities.Campaign.filter({ id: quests[0].campaign_id });
        if (camps.length > 0) setCampaign(camps[0]);
      } else if (campaignId) {
        setIsNew(true);
        setQuest({ ...defaultQuest });
        
        const camps = await base44.entities.Campaign.filter({ id: campaignId });
        if (camps.length > 0) setCampaign(camps[0]);
      } else {
        navigate(createPageUrl('Campaigns'));
      }
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const addObjective = () => {
    setQuest(prev => ({
      ...prev,
      objectives: [...(prev.objectives || []), { text: '', completed: false }]
    }));
  };

  const updateObjective = (index, field, value) => {
    setQuest(prev => {
      const objectives = [...(prev.objectives || [])];
      objectives[index] = { ...objectives[index], [field]: value };
      return { ...prev, objectives };
    });
  };

  const removeObjective = (index) => {
    setQuest(prev => ({
      ...prev,
      objectives: (prev.objectives || []).filter((_, i) => i !== index)
    }));
  };

  const toggleObjective = (index) => {
    setQuest(prev => {
      const objectives = [...(prev.objectives || [])];
      objectives[index] = { ...objectives[index], completed: !objectives[index].completed };
      return { ...prev, objectives };
    });
  };

  const saveQuest = async () => {
    if (!quest.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' }); return;
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.Quest.create(quest);
      } else {
        await base44.entities.Quest.update(quest.id, quest);
      }
      
      navigate(createPageUrl(`CampaignDetail?id=${quest.campaign_id}`));
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${quest.campaign_id}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isNew ? 'New Quest' : 'Edit Quest'}
          </h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={saveQuest}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Title & Status */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Title *</Label>
              <Input
                id="title"
                value={quest.title || ''}
                onChange={(e) => setQuest(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Quest title..."
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Status</Label>
              <Select 
                value={quest.status || 'active'} 
                onValueChange={(v) => setQuest(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="active" className="text-slate-300">Active</SelectItem>
                  <SelectItem value="completed" className="text-slate-300">Completed</SelectItem>
                  <SelectItem value="failed" className="text-slate-300">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Description (Player Visible) */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Description (Player Visible)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={quest.description || ''}
              onChange={(e) => setQuest(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What the players know about this quest..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* DM Notes */}
        <Card className="bg-slate-900/50 border-slate-800 border-l-4 border-l-red-500/50">
          <CardHeader>
            <CardTitle className="text-white text-sm">DM Notes (Hidden from Players)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={quest.dm_notes || ''}
              onChange={(e) => setQuest(prev => ({ ...prev, dm_notes: e.target.value }))}
              placeholder="Secret information, plot twists, NPC motivations..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Objectives */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-sm">Objectives</CardTitle>
            <Button 
              size="sm" 
              onClick={addObjective}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Objective
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {(quest.objectives || []).length === 0 ? (
              <p className="text-slate-500 text-sm">No objectives added yet</p>
            ) : (
              quest.objectives.map((obj, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleObjective(index)}
                    className="flex-shrink-0 text-slate-400 hover:text-white"
                  >
                    {obj.completed ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <Input
                    value={obj.text || ''}
                    onChange={(e) => updateObjective(index, 'text', e.target.value)}
                    placeholder="Objective description..."
                    className={`bg-slate-800 border-slate-700 text-white flex-1 ${
                      obj.completed ? 'line-through text-slate-500' : ''
                    }`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeObjective(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Rewards */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Rewards</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={quest.rewards || ''}
              onChange={(e) => setQuest(prev => ({ ...prev, rewards: e.target.value }))}
              placeholder="Gold, items, experience, reputation..."
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}