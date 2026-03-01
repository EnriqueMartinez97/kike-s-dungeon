import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Calendar, Users, Edit, Save, X, BookOpen, Clock, Hash, Trash2
} from 'lucide-react';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EpisodeDetail() {
  const [user, setUser] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const episodeId = urlParams.get('id');

  useEffect(() => {
    if (episodeId) loadData();
  }, [episodeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const eps = await base44.entities.Episode.filter({ id: episodeId });
      if (eps.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }
      const ep = eps[0];
      setEpisode(ep);

      const [camps, memberships] = await Promise.all([
        base44.entities.Campaign.filter({ id: ep.campaign_id }),
        base44.entities.CampaignMembership.filter({ campaign_id: ep.campaign_id, user_id: currentUser.id })
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
      name: episode.name,
      date: episode.date || '',
      status: episode.status || 'planned',
      recap: episode.recap || '',
      dm_notes: episode.dm_notes || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Episode.update(episode.id, editData);
      setEpisode(prev => ({ ...prev, ...editData }));
      setEditing(false);
      toast({ title: 'Episode saved', description: 'Changes have been saved successfully.' });
    } catch (e) {
      toast({ title: 'Save failed', description: 'Could not save changes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    planned: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!episode) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${episode.campaign_id}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1 text-violet-400">
              <Hash className="h-5 w-5" />
              <span className="text-lg font-bold">{episode.episode_number || 1}</span>
            </div>
            <Badge className={`${statusColors[episode.status] || statusColors.planned} border`}>
              {episode.status || 'planned'}
            </Badge>
          </div>
          {editing ? (
            <Input
              value={editData.name}
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
              className="text-2xl font-bold bg-slate-800 border-slate-600 text-white h-12 text-2xl mb-1"
            />
          ) : (
            <h1 className="text-3xl font-bold text-white">{episode.name}</h1>
          )}
          {campaign && (
            <p className="text-slate-400 mt-1">{campaign.name}</p>
          )}
        </div>
        {isDM && (
          <div className="flex gap-2">
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

      {/* Meta info */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-slate-500">Date</p>
              {editing ? (
                <Input
                  type="date"
                  value={editData.date}
                  onChange={e => setEditData(p => ({ ...p, date: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white h-7 text-sm mt-1"
                />
              ) : (
                <p className="text-sm text-white font-medium">{episode.date || 'Not set'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-xs text-slate-500">Status</p>
              {editing ? (
                <Select value={editData.status} onValueChange={v => setEditData(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-7 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-white font-medium capitalize">{episode.status || 'Planned'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-500">Participants</p>
              <p className="text-sm text-white font-medium">
                {episode.participant_ids?.length || 0} players
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recap */}
      <Card className="bg-slate-900/50 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-400" />
            Episode Recap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={editData.recap}
              onChange={e => setEditData(p => ({ ...p, recap: e.target.value }))}
              placeholder="Write the episode recap..."
              className="bg-slate-800 border-slate-700 text-white min-h-[160px]"
            />
          ) : (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {episode.recap || (
                <span className="text-slate-500 italic">No recap written yet.{isDM ? ' Click Edit to add one.' : ''}</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* DM Notes (DM only) */}
      {isDM && (
        <Card className="bg-slate-900/50 border-amber-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              DM Notes <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs ml-1">DM Only</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editData.dm_notes}
                onChange={e => setEditData(p => ({ ...p, dm_notes: e.target.value }))}
                placeholder="Private notes for the DM..."
                className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
              />
            ) : (
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {episode.dm_notes || (
                  <span className="text-slate-500 italic">No DM notes yet.</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Log (if available) */}
      {episode.session_log && episode.session_log.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Session Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {episode.session_log.map((entry, i) => (
                <div key={i} className="text-sm text-slate-400 border-b border-slate-800 pb-2">
                  <span className="text-slate-500 text-xs">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  {' · '}
                  <span className="text-slate-300">{entry.content}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}