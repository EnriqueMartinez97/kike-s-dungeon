import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Play, Users, Map, Swords, MessageSquare, BookOpen, X,
  Crown, Sparkles, Clock, Dice6, Moon, Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CombatTracker from '@/components/session/CombatTracker';
import QuickQuestPanel from '@/components/session/QuickQuestPanel';
import CharactersPanel from '@/components/session/CharactersPanel';
import NPCsPanel from '@/components/session/NPCsPanel';
import DiceRoller from '@/components/dice/DiceRoller';
import UnifiedAIPanel from '@/components/ai/UnifiedAIPanel';
import NotesPanel from '@/components/session/NotesPanel';
import SessionHome from '@/components/session/SessionHome';
import SessionLog from '@/components/session/SessionLog';
import QuickSheets from '@/components/session/QuickSheets';

export default function Session() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTab, setSessionTab] = useState('home');

  const [combatState, setCombatState] = useState(null);
  const [recentRolls, setRecentRolls] = useState([]);

  const [restDialog, setRestDialog] = useState(null);
  const [restingId, setRestingId] = useState(null);
  const [endSessionDialog, setEndSessionDialog] = useState(false);
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeRecap, setEpisodeRecap] = useState('');
  const [closingSession, setClosingSession] = useState(false);

  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaign_id');

  useEffect(() => { if (campaignId) loadData(); }, [campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [campaignData, myMemberships] = await Promise.all([
        base44.entities.Campaign.filter({ id: campaignId }),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId, user_id: currentUser.id }),
      ]);

      if (!campaignData.length || !myMemberships.length) { navigate(createPageUrl('Campaigns')); return; }

      setCampaign(campaignData[0]);
      setMembership(myMemberships[0]);

      const [chars, npcsData, questsData, episodesData, activeSessions, docs] = await Promise.all([
        base44.entities.Character.filter({ campaign_id: campaignId }),
        base44.entities.NPC.filter({ campaign_id: campaignId }),
        base44.entities.Quest.filter({ campaign_id: campaignId }),
        base44.entities.Episode.filter({ campaign_id: campaignId }),
        base44.entities.ActiveSession.filter({ campaign_id: campaignId, status: 'active' }),
        base44.entities.Document.filter({ campaign_id: campaignId }).catch(() => []),
      ]);

      setCharacters(chars);
      setNpcs(npcsData);
      setQuests(questsData);
      setEpisodes(episodesData);
      setDocuments(docs);

      if (activeSessions.length > 0) {
        setActiveSession(activeSessions[0]);
        setSessionTab(campaignData[0]?.mode === 'dm_absent' ? 'ai-dm' : 'home');
      }
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const isDM = membership?.role === 'dm' || membership?.role === 'co_dm';
  const isAIMode = campaign?.mode === 'dm_absent';

  const handleCombatStateChange = useCallback((state) => setCombatState(state), []);

  const handleDiceRoll = useCallback(async (result) => {
    const rollEntry = { ...result, user_name: user?.full_name || user?.display_name || 'Player' };
    setRecentRolls(prev => [...prev.slice(-19), rollEntry]);

    if (activeSession?.id) {
      try {
        await base44.entities.SessionLog.create({
          campaign_id: campaignId,
          session_id: activeSession.id,
          entry_type: 'ROLL',
          user_id: user?.id,
          user_name: rollEntry.user_name,
          content: `Rolled ${result.formula}: ${result.result}`,
          metadata: { roll_formula: result.formula, roll_result: result.result, is_public: result.is_public },
          visibility: result.is_public ? 'public' : 'private',
        });
      } catch (e) { console.warn('Roll log failed', e); }
    }
  }, [campaignId, activeSession, user]);

  const doShortRest = async () => {
    setRestingId('short');
    try {
      const updates = await Promise.all(characters.map(async (c) => {
        const dieMatch = (c.hit_dice_total || 'd8').match(/d(\d+)/);
        const dieSides = dieMatch ? parseInt(dieMatch[1]) : 8;
        const conMod = Math.floor(((c.ability_scores?.constitution || 10) - 10) / 2);
        const roll = Math.floor(Math.random() * dieSides) + 1;
        const healed = Math.max(0, roll + conMod);
        const newHp = Math.min(c.hp_max || 0, (c.hp_current || 0) + healed);
        await base44.entities.Character.update(c.id, { hp_current: newHp });
        return { ...c, hp_current: newHp };
      }));
      setCharacters(updates);
      if (activeSession?.id) {
        await base44.entities.SessionLog.create({
          campaign_id: campaignId, session_id: activeSession.id,
          entry_type: 'NOTE', user_id: user?.id, user_name: 'DM',
          content: 'The party takes a Short Rest. Characters spend hit dice to recover HP.',
          metadata: {}, visibility: 'public',
        });
      }
    } catch (e) { console.error('Short rest failed', e); }
    finally { setRestingId(null); setRestDialog(null); }
  };

  const doLongRest = async () => {
    setRestingId('long');
    try {
      const updates = await Promise.all(characters.map(async (c) => {
        const upd = { hp_current: c.hp_max || 0, hit_dice_current: c.hit_dice_total };
        await base44.entities.Character.update(c.id, upd);
        return { ...c, ...upd };
      }));
      setCharacters(updates);
      if (activeSession?.id) {
        await base44.entities.SessionLog.create({
          campaign_id: campaignId, session_id: activeSession.id,
          entry_type: 'NOTE', user_id: user?.id, user_name: 'DM',
          content: 'The party takes a Long Rest. All HP restored, hit dice recovered, spell slots refreshed.',
          metadata: {}, visibility: 'public',
        });
      }
    } catch (e) { console.error('Long rest failed', e); }
    finally { setRestingId(null); setRestDialog(null); }
  };

  const sessionSummary = episodes.length > 0
    ? episodes.sort((a, b) => (b.episode_number || 0) - (a.episode_number || 0))[0]?.recap || ''
    : '';

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center"><p className="text-slate-400">Campaign not found</p></CardContent>
        </Card>
      </div>
    );
  }

  const aiProps = {
    campaign, campaignId,
    isDM, userId: user?.id, userName: user?.full_name || user?.display_name,
    documents, npcs, quests, characters,
    combatState, recentRolls, sessionSummary,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <Button variant="ghost" onClick={() => navigate(createPageUrl(`CampaignDetail?id=${campaignId}`))}
          className="text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Campaign
        </Button>

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {activeSession
                ? <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><Play className="h-3 w-3" /> Active Session</Badge>
                : <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1"><Clock className="h-3 w-3" /> No Active Session</Badge>
              }
              {isAIMode
                ? <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI DM</Badge>
                : <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><Crown className="h-3 w-3" /> DM Present</Badge>
              }
              {combatState?.active && <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">⚔ Combat R{combatState.round}</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{campaign.name}</h1>
            <p className="text-slate-400 text-sm">{isDM ? 'Dungeon Master' : 'Player'} · {campaign.tone?.replace('_', ' ')}</p>
          </div>

          {isDM && activeSession && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRestDialog('short')}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <Sun className="h-3 w-3 mr-1" /> Short Rest
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRestDialog('long')}
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Moon className="h-3 w-3 mr-1" /> Long Rest
              </Button>
            </div>
          )}
        </div>

        {!activeSession && (
          <SessionHome
            campaignId={campaignId}
            isDM={isDM}
            onStartSession={session => { setActiveSession(session); setSessionTab(isAIMode ? 'ai-dm' : 'home'); }}
            onCloseSession={() => { setActiveSession(null); loadData(); navigate(createPageUrl(`CampaignDetail?id=${campaignId}`)); }}
          />
        )}
        {/* Hidden mount to allow End Session button to trigger episode creation dialog */}
        {activeSession && (
          <div className="hidden">
            <SessionHome
              campaignId={campaignId}
              isDM={isDM}
              activeSession={activeSession}
              onStartSession={() => {}}
              onCloseSession={() => { setActiveSession(null); loadData(); navigate(createPageUrl(`CampaignDetail?id=${campaignId}`)); }}
              onRequestClose={fn => setTriggerEndSession(() => fn)}
            />
          </div>
        )}

        {activeSession && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                Active since {new Date(activeSession.session_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              {isDM && (
                <Button onClick={() => { if (triggerEndSession) triggerEndSession(); }}
                  variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <X className="h-3 w-3 mr-1" /> End Session
                </Button>
              )}
            </div>

            <Tabs value={sessionTab} onValueChange={setSessionTab}>
              <TabsList className="bg-slate-900/50 border border-slate-800 w-full justify-start flex-wrap">
                {isAIMode && (
                  <TabsTrigger value="ai-dm" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                    <Crown className="h-4 w-4" /> AI Dungeon Master
                  </TabsTrigger>
                )}
                <TabsTrigger value="home" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                  <Play className="h-4 w-4" /> Session
                </TabsTrigger>
                <TabsTrigger value="log" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> Log
                </TabsTrigger>
                <TabsTrigger value="sheets" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Quick Sheets
                </TabsTrigger>
                <TabsTrigger value="dice" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                  <Dice6 className="h-4 w-4" /> Dice
                </TabsTrigger>
                {!isAIMode && (
                  <TabsTrigger value="scribe" className="data-[state=active]:bg-violet-600 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Seren
                  </TabsTrigger>
                )}
              </TabsList>

              {isAIMode && (
                <TabsContent value="ai-dm" className="mt-4">
                  <div className="grid gap-4 lg:grid-cols-3" style={{ height: '600px' }}>
                    <div className="lg:col-span-2 h-full">
                      <UnifiedAIPanel {...aiProps} sessionId={activeSession.id} mode="dm" />
                    </div>
                    <div className="space-y-4 overflow-y-auto">
                      {isDM && (
                        <CombatTracker characters={characters} npcs={npcs} isDM={isDM} campaignId={campaignId} onCombatStateChange={handleCombatStateChange} />
                      )}
                      <QuickQuestPanel campaignId={campaignId} isDM={isDM} userId={user?.id} />
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="home" className="mt-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    {isDM && (
                      <>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Swords className="h-5 w-5 text-red-400" /> Combat Tracker
                        </h2>
                        <CombatTracker characters={characters} npcs={npcs} isDM={isDM} campaignId={campaignId} onCombatStateChange={handleCombatStateChange} />
                      </>
                    )}

                    <Tabs defaultValue="quests" className="space-y-4">
                      <TabsList className="bg-slate-900/50 border border-slate-800">
                        <TabsTrigger value="quests" className="data-[state=active]:bg-violet-600"><Map className="h-4 w-4 mr-1.5" />Quests</TabsTrigger>
                        <TabsTrigger value="characters" className="data-[state=active]:bg-violet-600"><Users className="h-4 w-4 mr-1.5" />Characters</TabsTrigger>
                        {isDM && <TabsTrigger value="npcs" className="data-[state=active]:bg-violet-600"><Swords className="h-4 w-4 mr-1.5" />NPCs</TabsTrigger>}
                        <TabsTrigger value="episodes" className="data-[state=active]:bg-violet-600"><BookOpen className="h-4 w-4 mr-1.5" />Episodes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="quests">
                        <QuickQuestPanel campaignId={campaignId} isDM={isDM} userId={user?.id} userName={user?.full_name} />
                      </TabsContent>
                      <TabsContent value="characters">
                        <CharactersPanel campaignId={campaignId} isDM={isDM} characters={characters} />
                      </TabsContent>
                      {isDM && (
                        <TabsContent value="npcs">
                          <NPCsPanel campaignId={campaignId} npcs={npcs} isDM={isDM} />
                        </TabsContent>
                      )}
                      <TabsContent value="episodes">
                        <Card className="bg-slate-900/50 border-slate-800">
                          <CardContent className="p-4">
                            {episodes.length === 0
                              ? <p className="text-slate-400 text-center text-sm py-4">No episodes yet</p>
                              : <div className="space-y-2">
                                {[...episodes].reverse().slice(0, 5).map(ep => (
                                  <div key={ep.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-white text-sm">#{ep.episode_number} {ep.name}</p>
                                      <p className="text-xs text-slate-500">{ep.date || 'TBD'}</p>
                                    </div>
                                    <Badge className={ep.status === 'completed' ? 'bg-slate-500/20 text-slate-300' : 'bg-amber-500/20 text-amber-300'}>
                                      {ep.status || 'planned'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            }
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-bold text-white mb-3">Session Notes</h2>
                      <NotesPanel campaignId={campaignId} episodeId={activeSession?.id} isDM={isDM} user={user}
                        members={characters.map(c => ({ user_id: c.owner_id, user: { full_name: c.name }, role: isDM ? 'dm' : 'player' }))} />
                    </div>
                    {!isAIMode && (
                      <div>
                        <h2 className="text-sm font-bold text-white mb-3">Seren, the Scribe</h2>
                        <UnifiedAIPanel {...aiProps} isCollapsible mode="scribe" />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="log" className="mt-4">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <SessionLog
                      campaignId={campaignId}
                      sessionId={activeSession?.id}
                      isDM={isDM}
                      userId={user?.id}
                      userName={user?.full_name || user?.display_name}
                    />
                  </div>
                  <div>
                    <UnifiedAIPanel {...aiProps} isCollapsible mode="scribe" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sheets" className="mt-4">
                <QuickSheets campaignId={campaignId} isDM={isDM} userId={user?.id} />
              </TabsContent>

              <TabsContent value="dice" className="mt-4">
                <div className="max-w-lg mx-auto">
                  <DiceRoller
                    campaignId={campaignId}
                    userName={user?.full_name || user?.display_name}
                    onRoll={handleDiceRoll}
                  />
                </div>
              </TabsContent>

              {!isAIMode && (
                <TabsContent value="scribe" className="mt-4">
                  <div className="max-w-2xl mx-auto" style={{ height: '580px' }}>
                    <UnifiedAIPanel {...aiProps} mode="scribe" />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>

      <AlertDialog open={restDialog === 'short'} onOpenChange={() => setRestDialog(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2"><Sun className="h-5 w-5 text-amber-400" /> Short Rest</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Each character will spend one hit die to recover HP (1 hit die + CON modifier). This will be logged to the session feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doShortRest} disabled={!!restingId} className="bg-amber-600 hover:bg-amber-700">
              {restingId === 'short' ? 'Resting...' : 'Take Short Rest'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restDialog === 'long'} onOpenChange={() => setRestDialog(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2"><Moon className="h-5 w-5 text-blue-400" /> Long Rest</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              All characters will be fully restored to max HP. All hit dice and spell slots are recovered. This will be logged to the session feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doLongRest} disabled={!!restingId} className="bg-blue-600 hover:bg-blue-700">
              {restingId === 'long' ? 'Resting...' : 'Take Long Rest'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}