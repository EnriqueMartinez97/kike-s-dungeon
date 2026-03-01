import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Upload,
  Crown,
  Sparkles,
  Skull,
  Sword,
  Search,
  MessageSquare,
  Trash2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CampaignSettings() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');

  useEffect(() => {
    if (campaignId) loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [camps, memberships] = await Promise.all([
        base44.entities.Campaign.filter({ id: campaignId }),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId, user_id: currentUser.id })
      ]);

      if (camps.length === 0 || memberships.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }

      const mem = memberships[0];
      if (mem.role !== 'dm' && mem.role !== 'co_dm') {
        navigate(createPageUrl(`CampaignDetail?id=${campaignId}`));
        return;
      }

      setCampaign(camps[0]);
      setMembership(mem);
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
      setCampaign(prev => ({ ...prev, cover_image: file_url }));
    } catch (e) {
      toast({ title: 'Upload failed', description: 'Could not upload image.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const saveCampaign = async () => {
    if (!campaign.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a campaign name.', variant: 'destructive' }); return;
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Campaign.update(campaign.id, campaign);
      toast({ title: 'Campaign saved', description: 'Changes have been saved.' });
    } catch (e) {
      toast({ title: 'Save failed', description: 'Could not save campaign.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async () => {
    setDeleting(true);
    try {
      // Delete all related entities
      const [memberships, characters, episodes, quests, documents, npcs] = await Promise.all([
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId }),
        base44.entities.Character.filter({ campaign_id: campaignId }),
        base44.entities.Episode.filter({ campaign_id: campaignId }),
        base44.entities.Quest.filter({ campaign_id: campaignId }),
        base44.entities.Document.filter({ campaign_id: campaignId }),
        base44.entities.NPC.filter({ campaign_id: campaignId })
      ]);

      // Delete all related records
      await Promise.all([
        ...memberships.map(m => base44.entities.CampaignMembership.delete(m.id)),
        ...characters.map(c => base44.entities.Character.delete(c.id)),
        ...episodes.map(e => base44.entities.Episode.delete(e.id)),
        ...quests.map(q => base44.entities.Quest.delete(q.id)),
        ...documents.map(d => base44.entities.Document.delete(d.id)),
        ...npcs.map(n => base44.entities.NPC.delete(n.id))
      ]);

      // Delete the campaign
      await base44.entities.Campaign.delete(campaignId);

      navigate(createPageUrl('Campaigns'));
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Could not delete campaign.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const tones = [
    {
      id: 'grimdark',
      name: 'Grimdark',
      description: 'Dark, gritty, morally complex stories',
      icon: Skull,
      color: 'from-slate-600 to-slate-800',
      borderColor: 'border-slate-500'
    },
    {
      id: 'heroic_fantasy',
      name: 'Heroic Fantasy',
      description: 'Classic heroism and epic quests',
      icon: Sword,
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500'
    },
    {
      id: 'mystery',
      name: 'Mystery',
      description: 'Intrigue, secrets, and investigation',
      icon: Search,
      color: 'from-violet-600 to-purple-800',
      borderColor: 'border-violet-500'
    },
    {
      id: 'political_intrigue',
      name: 'Political Intrigue',
      description: 'Power struggles and diplomacy',
      icon: MessageSquare,
      color: 'from-emerald-600 to-teal-800',
      borderColor: 'border-emerald-500'
    }
  ];

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
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${campaignId}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaign Settings</h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={saveCampaign}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Cover Image */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Cover Image</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              className={`relative h-48 rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
                campaign.cover_image 
                  ? 'border-violet-500/50' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {campaign.cover_image ? (
                <img 
                  src={campaign.cover_image} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <Upload className="h-8 w-8 mb-2" />
                  <span className="text-sm">Click to upload cover image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {uploading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Name & Description */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Campaign Name *</Label>
              <Input
                id="name"
                value={campaign.name || ''}
                onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name..."
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={campaign.description || ''}
                onChange={(e) => setCampaign(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your campaign setting..."
                className="mt-2 bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaign Mode */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Campaign Mode</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RadioGroup 
              value={campaign.mode || 'dm_present'} 
              onValueChange={(value) => setCampaign(prev => ({ ...prev, mode: value }))}
              className="grid gap-4 md:grid-cols-2"
            >
              <Label htmlFor="dm_present" className="cursor-pointer">
                <Card className={`bg-slate-800/50 border-2 transition-all ${
                  campaign.mode === 'dm_present' 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <RadioGroupItem value="dm_present" id="dm_present" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-emerald-400" />
                        <span className="font-medium text-white">DM is in the house</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Human DM runs sessions
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Label>

              <Label htmlFor="dm_absent" className="cursor-pointer">
                <Card className={`bg-slate-800/50 border-2 transition-all ${
                  campaign.mode === 'dm_absent' 
                    ? 'border-amber-500 bg-amber-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <RadioGroupItem value="dm_absent" id="dm_absent" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        <span className="font-medium text-white">DM is out of office</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        AI DM takes over
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Tone Preset */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Campaign Tone</CardTitle>
            <p className="text-xs text-slate-500">
              This shapes the AI's storytelling style
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <RadioGroup 
              value={campaign.tone || 'heroic_fantasy'} 
              onValueChange={(value) => setCampaign(prev => ({ ...prev, tone: value }))}
              className="grid gap-4 md:grid-cols-2"
            >
              {tones.map((tone) => (
                <Label key={tone.id} htmlFor={tone.id} className="cursor-pointer">
                  <Card className={`bg-slate-800/50 border-2 transition-all overflow-hidden ${
                    campaign.tone === tone.id 
                      ? `${tone.borderColor} bg-opacity-10` 
                      : 'border-slate-700 hover:border-slate-600'
                  }`}>
                    <div className={`h-2 bg-gradient-to-r ${tone.color}`} />
                    <CardContent className="p-4 flex items-start gap-4">
                      <RadioGroupItem value={tone.id} id={tone.id} className="mt-1" />
                      <div>
                        <div className="flex items-center gap-2">
                          <tone.icon className="h-5 w-5 text-slate-300" />
                          <span className="font-medium text-white">{tone.name}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {tone.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Long Campaign Mode — only shown when AI DM is active */}
        {campaign.mode === 'dm_absent' && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-violet-400" />
                Long Campaign Mode
              </CardTitle>
              <p className="text-xs text-slate-500">
                The AI will interview the party before the first session — asking about expected journey, duration, and character details — then weave everything into a rich, deeply narrated story.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Switch
                  id="long_campaign_mode"
                  checked={!!campaign.long_campaign_mode}
                  onCheckedChange={(val) => setCampaign(prev => ({ ...prev, long_campaign_mode: val }))}
                />
                <Label htmlFor="long_campaign_mode" className="text-slate-300 cursor-pointer">
                  {campaign.long_campaign_mode ? 'Enabled — AI will conduct an onboarding interview and narrate with full depth' : 'Disabled — Standard AI DM mode'}
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="bg-red-950/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-slate-400 text-sm mb-4">
              Deleting a campaign will permanently remove all characters, episodes, quests, documents, and NPCs associated with it.
            </p>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Campaign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. All characters, episodes, quests, documents, and NPCs will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteCampaign} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Campaign'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}