import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Users, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SessionHome({ campaignId, isDM, onStartSession, onCloseSession, onRequestClose, activeSession: activeSessionProp }) {
  useEffect(() => {
    if (onRequestClose) onRequestClose(() => setShowCloseDialog(true));
  }, [onRequestClose]);
   const [activeSession, setActiveSession] = useState(null);
   const [campaign, setCampaign] = useState(null);
   const [members, setMembers] = useState([]);
   const [showCloseDialog, setShowCloseDialog] = useState(false);
   const [episodeTitle, setEpisodeTitle] = useState('');
   const [episodeRecap, setEpisodeRecap] = useState('');
   const [interviewAnswers, setInterviewAnswers] = useState({});
   const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadSessionData();
  }, [campaignId]);

  const loadSessionData = async () => {
    const [sessionData, campData, membershipsData] = await Promise.all([
      base44.entities.ActiveSession.filter({ campaign_id: campaignId }),
      base44.entities.Campaign.filter({ id: campaignId }),
      base44.entities.CampaignMembership.filter({ campaign_id: campaignId })
    ]);

    if (sessionData.length > 0) {
      setActiveSession(sessionData[0]);
    }
    if (campData.length > 0) {
      setCampaign(campData[0]);
    }
    setMembers(membershipsData);
  };

  const handleStartSession = async () => {
    if (!isDM) return;
    const session = await base44.entities.ActiveSession.create({
      campaign_id: campaignId,
      dm_id: (await base44.auth.me()).id,
      status: 'active',
      session_start: new Date().toISOString(),
      online_users: [],
      participants: []
    });
    setActiveSession(session);
    onStartSession?.(session);
  };

  const handleCloseSession = async () => {
    if (!isDM || !activeSession) return;
    setClosing(true);
    try {
      const episodes = await base44.entities.Episode.filter({ campaign_id: campaignId });
      const nextEpisodeNum = (episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number || 0)) : 0) + 1;
      const today = new Date().toISOString().split('T')[0];

      // Fetch session logs to build AI summary
      let aiRecap = episodeRecap;
      if (!aiRecap) {
        try {
          const logs = await base44.entities.SessionLog.filter({
            campaign_id: campaignId,
            session_id: activeSession.id
          });
          const logText = logs
            .filter(l => l.entry_type !== 'AI_DM_MESSAGE')
            .map(l => `[${l.entry_type}] ${l.user_name || 'Unknown'}: ${l.content}`)
            .join('\n');

          if (logText.trim()) {
            aiRecap = await base44.integrations.Core.InvokeLLM({
              prompt: `You are a skilled narrator summarizing a D&D 5e session. Based on the following session log, write a concise, engaging episode recap in 2-4 paragraphs, written in past tense as a chronicle entry. Focus on key story beats, character moments, and significant decisions. Campaign: "${campaign?.name}". Session log:\n\n${logText.slice(0, 3000)}`,
              add_context_from_internet: false
            });
          }
        } catch (e) {
          console.error('AI summary failed:', e);
        }
      }

      const episodeData = {
        campaign_id: campaignId,
        episode_number: nextEpisodeNum,
        name: episodeTitle || `Episode ${nextEpisodeNum}`,
        date: today,
        status: 'completed',
        recap: aiRecap || '',
        participant_ids: members.map(m => m.user_id)
      };

      await base44.entities.Episode.create(episodeData);
      await base44.entities.ActiveSession.update(activeSession.id, { status: 'closed' });

      setActiveSession(null);
      setShowCloseDialog(false);
      setEpisodeTitle('');
      setEpisodeRecap('');
      setClosing(false);
      onCloseSession?.();
    } catch (err) {
      console.error('Error closing session:', err);
      setClosing(false);
      console.error('Session close error:', err);
    }
  };

  if (!activeSession) {
    return (
      <div className="space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Play className="h-5 w-5 text-emerald-400" />
              Session Status: Inactive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">No active session. {isDM ? 'Start one below.' : 'Waiting for DM to start.'}</p>
            {isDM && (
              <Button onClick={handleStartSession} className="bg-emerald-600 hover:bg-emerald-700 w-full">
                Start New Session
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const onlineCount = activeSession.online_users?.length || 0;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-300">
            <Play className="h-5 w-5 text-emerald-400" />
            Active Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Campaign</p>
              <p className="font-semibold text-white">{campaign?.name}</p>
            </div>
            <div>
              <p className="text-slate-400">Started</p>
              <p className="font-semibold text-white">
                {new Date(activeSession.session_start).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Online Players</p>
              <p className="font-semibold text-white flex items-center gap-2">
                <Users className="h-4 w-4" /> {onlineCount}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="font-semibold text-white capitalize">
                {activeSession.combat_active ? 'In Combat' : 'Active'}
              </p>
            </div>
          </div>

          {isDM && (
            <Button
              onClick={() => setShowCloseDialog(true)}
              variant="destructive"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Close Session & Create Episode
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Close Session Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Close Session & Create Episode</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will end the current session and create an episode record. The AI will auto-generate a recap from the session log — you can review and edit it in the episode detail page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            <input
              type="text"
              placeholder="Episode Title"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm"
            />
            <textarea
              placeholder="Episode Recap (optional)"
              value={episodeRecap}
              onChange={(e) => setEpisodeRecap(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm h-20 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Keep Open
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseSession}
              disabled={closing}
              className="bg-red-600 hover:bg-red-700"
            >
              {closing ? 'Generating Episode...' : 'Close & Save'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}