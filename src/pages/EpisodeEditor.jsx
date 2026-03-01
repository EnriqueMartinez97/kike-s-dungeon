import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

export default function EpisodeEditor() {
  const [user, setUser] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get('id');
  const campaignId = urlParams.get('campaign_id');

  useEffect(() => {
    loadData();
  }, [episodeId, campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (episodeId) {
        const eps = await base44.entities.Episode.filter({ id: episodeId });
        if (eps.length === 0) {
          navigate(createPageUrl('Campaigns'));
          return;
        }
        setEpisode(eps[0]);
        
        const camps = await base44.entities.Campaign.filter({ id: eps[0].campaign_id });
        if (camps.length > 0) setCampaign(camps[0]);
      } else if (campaignId) {
        const allEpisodes = await base44.entities.Episode.filter({ campaign_id: campaignId });
        setEpisodes(allEpisodes);
        
        setIsNew(true);
        setEpisode({
          campaign_id: campaignId,
          episode_number: allEpisodes.length + 1,
          name: `Episode ${allEpisodes.length + 1}`,
          date: new Date().toISOString().split('T')[0],
          status: 'planned',
          recap: '',
          session_log: [],
          ai_history: [],
          dice_rolls: []
        });
        
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

  const saveEpisode = async () => {
    if (!episode.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' }); return;
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const newEp = await base44.entities.Episode.create(episode);
        navigate(createPageUrl(`EpisodeDetail?id=${newEp.id}`));
      } else {
        await base44.entities.Episode.update(episode.id, episode);
        navigate(createPageUrl(`CampaignDetail?id=${episode.campaign_id}`));
      }
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
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${episode.campaign_id}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isNew ? 'New Episode' : 'Edit Episode'}
          </h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={saveEpisode}
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
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Episode Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={episode.episode_number || 1}
                  onChange={(e) => setEpisode(prev => ({ ...prev, episode_number: parseInt(e.target.value) || 1 }))}
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Status</Label>
                <Select 
                  value={episode.status || 'planned'} 
                  onValueChange={(v) => setEpisode(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="planned" className="text-slate-300">Planned</SelectItem>
                    <SelectItem value="active" className="text-slate-300">Active</SelectItem>
                    <SelectItem value="completed" className="text-slate-300">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Episode Name *</Label>
              <Input
                value={episode.name || ''}
                onChange={(e) => setEpisode(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Episode name..."
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="date"
                  value={episode.date || ''}
                  onChange={(e) => setEpisode(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recap */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Recap</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={episode.recap || ''}
              onChange={(e) => setEpisode(prev => ({ ...prev, recap: e.target.value }))}
              placeholder="Write or paste the session recap here..."
              className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Tip: You can auto-generate a recap during a session from the Session page
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}