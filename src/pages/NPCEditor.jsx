import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Upload,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function NPCEditor() {
  const [user, setUser] = useState(null);
  const [npc, setNpc] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [newTag, setNewTag] = useState('');
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const npcId = urlParams.get('id');
  const campaignId = urlParams.get('campaign_id');

  const defaultNpc = {
    campaign_id: campaignId,
    name: '',
    description: '',
    faction: '',
    location: '',
    stat_block: {
      ac: 10,
      hp: 10,
      speed: '30 ft.',
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
      skills: '',
      senses: '',
      languages: 'Common',
      cr: '0'
    },
    notes: '',
    tags: [],
    portrait_url: ''
  };

  useEffect(() => {
    loadData();
  }, [npcId, campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (npcId) {
        const npcs = await base44.entities.NPC.filter({ id: npcId });
        if (npcs.length === 0) {
          navigate(createPageUrl('NPCs'));
          return;
        }
        setNpc(npcs[0]);
        
        if (npcs[0].campaign_id) {
          const camps = await base44.entities.Campaign.filter({ id: npcs[0].campaign_id });
          if (camps.length > 0) setCampaign(camps[0]);
        }
      } else {
        setIsNew(true);
        setNpc({ ...defaultNpc, owner_id: currentUser.id });
        
        if (campaignId) {
          const camps = await base44.entities.Campaign.filter({ id: campaignId });
          if (camps.length > 0) setCampaign(camps[0]);
        }
      }
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNpc(prev => ({ ...prev, portrait_url: file_url }));
    } catch (e) {
      console.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (npc.tags?.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    setNpc(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (tag) => {
    setNpc(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag)
    }));
  };

  const updateStatBlock = (field, value) => {
    setNpc(prev => ({
      ...prev,
      stat_block: { ...prev.stat_block, [field]: value }
    }));
  };

  const saveNpc = async () => {
    if (!npc.name.trim()) {
      console.error('Please enter an NPC name');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.NPC.create(npc);
      } else {
        await base44.entities.NPC.update(npc.id, npc);
      }
      
      if (npc.campaign_id) {
        navigate(createPageUrl(`NPCs?campaign_id=${npc.campaign_id}`));
      } else {
        navigate(createPageUrl('MyNPCs'));
      }
    } catch (e) {
      console.error('Failed to save NPC');
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
        onClick={() => npc.campaign_id ? navigate(createPageUrl(`NPCs?campaign_id=${npc.campaign_id}`)) : navigate(createPageUrl('MyNPCs'))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to NPCs
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isNew ? 'New NPC' : 'Edit NPC'}
          </h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={saveNpc}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex gap-6">
              {/* Portrait */}
              <div className="relative group flex-shrink-0">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={npc.portrait_url} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-2xl">
                    {npc.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                  <Upload className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Name & Basic Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-white">Name *</Label>
                  <Input
                    value={npc.name || ''}
                    onChange={(e) => setNpc(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="NPC name..."
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Faction</Label>
                    <Input
                      value={npc.faction || ''}
                      onChange={(e) => setNpc(prev => ({ ...prev, faction: e.target.value }))}
                      placeholder="e.g., The Crown, Thieves Guild"
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Location</Label>
                    <Input
                      value={npc.location || ''}
                      onChange={(e) => setNpc(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Tavern, Castle"
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={npc.description || ''}
              onChange={(e) => setNpc(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Physical appearance, personality, mannerisms..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add a tag..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button 
                onClick={addTag}
                variant="outline"
                className="border-slate-700 text-slate-300"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {npc.tags && npc.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {npc.tags.map((tag, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="border-violet-500/30 text-violet-300 pr-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stat Block */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Stat Block</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-400 text-xs">AC</Label>
                <Input
                  type="number"
                  value={npc.stat_block?.ac || 10}
                  onChange={(e) => updateStatBlock('ac', parseInt(e.target.value) || 10)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">HP</Label>
                <Input
                  type="number"
                  value={npc.stat_block?.hp || 10}
                  onChange={(e) => updateStatBlock('hp', parseInt(e.target.value) || 10)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Speed</Label>
                <Input
                  value={npc.stat_block?.speed || '30 ft.'}
                  onChange={(e) => updateStatBlock('speed', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => (
                <div key={stat} className="text-center">
                  <Label className="text-slate-400 text-xs uppercase">{stat}</Label>
                  <Input
                    type="number"
                    value={npc.stat_block?.[stat] || 10}
                    onChange={(e) => updateStatBlock(stat, parseInt(e.target.value) || 10)}
                    className="bg-slate-800 border-slate-700 text-white text-center"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs">Skills</Label>
                <Input
                  value={npc.stat_block?.skills || ''}
                  onChange={(e) => updateStatBlock('skills', e.target.value)}
                  placeholder="e.g., Perception +5, Stealth +4"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Senses</Label>
                <Input
                  value={npc.stat_block?.senses || ''}
                  onChange={(e) => updateStatBlock('senses', e.target.value)}
                  placeholder="e.g., Darkvision 60 ft."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs">Languages</Label>
                <Input
                  value={npc.stat_block?.languages || 'Common'}
                  onChange={(e) => updateStatBlock('languages', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Challenge Rating</Label>
                <Input
                  value={npc.stat_block?.cr || '0'}
                  onChange={(e) => updateStatBlock('cr', e.target.value)}
                  placeholder="e.g., 1/4, 5, 10"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">DM Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={npc.notes || ''}
              onChange={(e) => setNpc(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Secret motivations, plot hooks, relationships..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}