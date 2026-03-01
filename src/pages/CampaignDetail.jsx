import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Sparkles, 
  Crown,
  Settings,
  Scroll,
  BookOpen,
  Swords,
  Map,
  Copy,
  Check,
  Plus,
  Play,
  Calendar,
  Trash2,
  Unlink
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignDetail() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [allMemberships, setAllMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [deleteCharId, setDeleteCharId] = useState(null);
  const [removeCharId, setRemoveCharId] = useState(null);
  const [unlinkCharId, setUnlinkCharId] = useState(null);
  const [leaveCampaignOpen, setLeaveCampaignOpen] = useState(false);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');

  useEffect(() => {
    if (campaignId) loadData();
  }, [campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Fetch campaign + current user's own membership (separate query to avoid RLS issues)
      const [campaignData, myMemberships] = await Promise.all([
        base44.entities.Campaign.filter({ id: campaignId }),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId, user_id: currentUser.id })
      ]);

      if (campaignData.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }

      if (myMemberships.length === 0) {
        console.error('You are not a member of this campaign.');
        navigate(createPageUrl('Campaigns'));
        return;
      }

      setCampaign(campaignData[0]);
      setMembership(myMemberships[0]);

      // Load all campaign data in parallel
      const [chars, eps, qsts, allMembershipsForCampaign, allUsers] = await Promise.all([
        base44.entities.Character.filter({ campaign_id: campaignId }),
        base44.entities.Episode.filter({ campaign_id: campaignId }),
        base44.entities.Quest.filter({ campaign_id: campaignId }),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId }),
        base44.entities.User.list()
      ]);

      const memberList = allMembershipsForCampaign.map(m => {
        const userInfo = allUsers.find(u => u.id === m.user_id);
        return { ...m, user: userInfo };
      });

      setAllMemberships(allMembershipsForCampaign);
      setMembers(memberList);
      setCharacters(chars);
      setEpisodes(eps);
      setQuests(qsts);
    } catch (e) {
      console.error('CampaignDetail loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const isDM = membership?.role === 'dm' || membership?.role === 'co_dm';

  const updateMemberRole = async (membershipId, newRole) => {
    setUpdatingRole(membershipId);
    setAllMemberships(prev => prev.map(m => m.id === membershipId ? { ...m, role: newRole } : m));
    setMembers(prev => prev.map(m => m.id === membershipId ? { ...m, role: newRole } : m));
    try {
      await base44.entities.CampaignMembership.update(membershipId, { role: newRole });
    } catch (e) {
      console.error('Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDeleteCharacter = async () => {
    if (!deleteCharId) return;
    await base44.entities.Character.delete(deleteCharId);
    setCharacters(prev => prev.filter(c => c.id !== deleteCharId));
    setDeleteCharId(null);
  };

  // Remove character from campaign (unassign, reset to level 1)
  const handleRemoveCharacterFromCampaign = async () => {
    if (!removeCharId) return;
    await base44.entities.Character.update(removeCharId, {
      campaign_id: null,
      level: 1,
      xp: 0
    });
    setCharacters(prev => prev.filter(c => c.id !== removeCharId));
    setRemoveCharId(null);
  };

  // DM: unlink character from campaign (keeps character intact, just removes from campaign)
  const handleUnlinkCharacter = async () => {
    if (!unlinkCharId) return;
    const char = characters.find(c => c.id === unlinkCharId);
    const newIds = (char.campaign_ids || []).filter(id => id !== campaignId);
    await base44.entities.Character.update(unlinkCharId, {
      campaign_id: char.campaign_id === campaignId ? null : char.campaign_id,
      campaign_ids: newIds
    });
    setCharacters(prev => prev.filter(c => c.id !== unlinkCharId));
    setUnlinkCharId(null);
  };

  // Leave campaign (remove membership + unassign own characters)
  const handleLeaveCampaign = async () => {
    // Unassign all characters belonging to this user in this campaign
    const myChars = characters.filter(c => c.owner_id === user?.id);
    await Promise.all(myChars.map(c =>
      base44.entities.Character.update(c.id, { campaign_id: null, level: 1, xp: 0 })
    ));
    // Delete membership
    await base44.entities.CampaignMembership.delete(membership.id);
    navigate(createPageUrl('Campaigns'));
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(campaign.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toneColors = {
    grimdark: 'bg-slate-600',
    heroic_fantasy: 'bg-amber-500',
    mystery: 'bg-violet-600',
    political_intrigue: 'bg-emerald-600'
  };

  const toneLabels = {
    grimdark: 'Grimdark',
    heroic_fantasy: 'Heroic Fantasy',
    mystery: 'Mystery',
    political_intrigue: 'Political Intrigue'
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(createPageUrl('Campaigns'))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      {/* Campaign Header */}
      <div className="relative rounded-2xl overflow-hidden mb-8">
        <div className="h-48 md:h-64 bg-gradient-to-br from-violet-600/20 to-purple-600/20">
          {campaign.cover_image && (
            <img 
              src={campaign.cover_image} 
              alt="" 
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${toneColors[campaign.tone]} text-white`}>
                  {toneLabels[campaign.tone]}
                </Badge>
                <Badge className={`${
                  campaign.mode === 'dm_present' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                } border`}>
                  {campaign.mode === 'dm_present' ? (
                    <><Crown className="h-3 w-3 mr-1" /> DM Present</>
                  ) : (
                    <><Sparkles className="h-3 w-3 mr-1" /> AI DM</>
                  )}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{campaign.name}</h1>
              <p className="text-slate-400 max-w-2xl">{campaign.description}</p>
            </div>

            <div className="flex gap-3">
              {isDM && (
                <Button 
                  variant="outline"
                  onClick={() => navigate(createPageUrl(`CampaignSettings?id=${campaignId}`))}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              )}
              {!isDM && (
                <Button
                  variant="outline"
                  onClick={() => setLeaveCampaignOpen(true)}
                  className="border-red-700 text-red-400 hover:bg-red-500/10"
                >
                  Leave Campaign
                </Button>
              )}
              <Button 
                onClick={() => navigate(createPageUrl(`Session?campaign_id=${campaignId}`))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-violet-500/10">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{members.length}</p>
              <p className="text-sm text-slate-400">Members</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <Scroll className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{characters.length}</p>
              <p className="text-sm text-slate-400">Characters</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{episodes.length}</p>
              <p className="text-sm text-slate-400">Episodes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-rose-500/10">
              <Map className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{quests.filter(q => q.status === 'active').length}</p>
              <p className="text-sm text-slate-400">Active Quests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Code (DM only) */}
      {isDM && (
        <Card className="bg-slate-900/50 border-slate-800 mb-8">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Invite Code</p>
              <p className="text-xl font-mono font-bold text-white tracking-wider">{campaign.invite_code}</p>
            </div>
            <Button
              variant="outline"
              onClick={copyInviteCode}
              className="border-slate-700 text-slate-300"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="characters" className="space-y-6">
        <TabsList className="bg-slate-900/50 border border-slate-800">
          <TabsTrigger value="characters" className="data-[state=active]:bg-violet-600">
            <Scroll className="h-4 w-4 mr-2" />
            Characters
          </TabsTrigger>
          <TabsTrigger value="episodes" className="data-[state=active]:bg-violet-600">
            <Calendar className="h-4 w-4 mr-2" />
            Episodes
          </TabsTrigger>
          <TabsTrigger value="quests" className="data-[state=active]:bg-violet-600">
            <Map className="h-4 w-4 mr-2" />
            Quests
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-violet-600">
            <BookOpen className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          {isDM && (
            <TabsTrigger value="npcs" className="data-[state=active]:bg-violet-600">
              <Swords className="h-4 w-4 mr-2" />
              NPCs
            </TabsTrigger>
          )}
          <TabsTrigger value="members" className="data-[state=active]:bg-violet-600">
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="characters">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Party Characters</h2>
            <Button 
              onClick={() => navigate(createPageUrl(`CharacterSheet?campaign_id=${campaignId}`))}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Character
            </Button>
          </div>

          {characters.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-8 text-center">
                <Scroll className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No characters yet. Create the first one!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((char) => (
                <div key={char.id} className="relative group">
                  <Link to={createPageUrl(`CharacterSheet?id=${char.id}`)}>
                    <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={char.portrait_url} />
                            <AvatarFallback className="bg-violet-600 text-white">
                              {char.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                              {char.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                              Level {char.level || 1} {char.race} {char.class}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="border-slate-700 text-slate-400">
                            HP {char.hp_current || 0}/{char.hp_max || 0}
                          </Badge>
                          <Badge variant="outline" className="border-slate-700 text-slate-400">
                            AC {char.ac || 10}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {isDM && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10"
                        onClick={(e) => { e.stopPropagation(); setUnlinkCharId(char.id); }}
                        title="Unlink from campaign"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteCharId(char.id); }}
                        title="Delete character"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {!isDM && char.owner_id === user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 z-10"
                      onClick={(e) => { e.stopPropagation(); setRemoveCharId(char.id); }}
                      title="Remove from campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="episodes">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Episodes</h2>
            {isDM && (
              <Button 
                onClick={() => navigate(createPageUrl(`EpisodeEditor?campaign_id=${campaignId}`))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Episode
              </Button>
            )}
          </div>

          {episodes.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No episodes yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {episodes.map((ep) => (
                <Link key={ep.id} to={createPageUrl(`EpisodeDetail?id=${ep.id}`)}>
                  <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <span className="text-violet-400 font-bold">#{ep.episode_number || 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{ep.name}</h3>
                          <p className="text-sm text-slate-400">{ep.date || 'Date TBD'}</p>
                        </div>
                      </div>
                      <Badge className={`${
                        ep.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                        ep.status === 'completed' ? 'bg-slate-500/20 text-slate-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {ep.status || 'planned'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quests">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Quests</h2>
            {isDM && (
              <Button 
                onClick={() => navigate(createPageUrl(`QuestEditor?campaign_id=${campaignId}`))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Quest
              </Button>
            )}
          </div>

          {quests.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-8 text-center">
                <Map className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No quests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quests.map((quest) => (
                <Link key={quest.id} to={createPageUrl(`QuestDetail?id=${quest.id}`)}>
                  <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{quest.title}</h3>
                        <Badge className={`${
                          quest.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                          quest.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {quest.status || 'active'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2">{quest.description}</p>
                      {quest.objectives && (
                        <div className="mt-2 text-sm text-slate-500">
                          {quest.objectives.filter(o => o.completed).length}/{quest.objectives.length} objectives complete
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Documents</h2>
            {isDM && (
              <Button 
                onClick={() => navigate(createPageUrl(`DocumentEditor?campaign_id=${campaignId}`))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            )}
          </div>
          <Link to={createPageUrl(`Documents?campaign_id=${campaignId}`)}>
            <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                <p className="text-white font-medium">Open Document Library</p>
                <p className="text-sm text-slate-400 mt-1">Browse, search, and manage campaign documents</p>
              </CardContent>
            </Card>
          </Link>
        </TabsContent>

        {isDM && (
          <TabsContent value="npcs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">NPCs</h2>
              <Button 
                onClick={() => navigate(createPageUrl(`NPCEditor?campaign_id=${campaignId}`))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create NPC
              </Button>
            </div>
            <Link to={createPageUrl(`NPCs?campaign_id=${campaignId}`)}>
              <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all">
                <CardContent className="p-8 text-center">
                  <Swords className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                  <p className="text-white font-medium">Open NPC Manager</p>
                  <p className="text-sm text-slate-400 mt-1">Create and manage non-player characters</p>
                </CardContent>
              </Card>
            </Link>
          </TabsContent>
        )}

        <TabsContent value="members">
          <h2 className="text-xl font-bold text-white mb-4">Campaign Members</h2>
          <div className="space-y-3">
            {members.map((member) => (
              <Card key={member.id} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user?.avatar_url} />
                      <AvatarFallback className="bg-violet-600 text-white">
                        {member.user?.display_name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white">
                        {member.user?.display_name || member.user?.full_name || member.user?.email}
                      </p>
                      <p className="text-sm text-slate-400">{member.user?.email}</p>
                    </div>
                  </div>
                  {isDM ? (
                    <Select
                      value={member.role}
                      onValueChange={(val) => updateMemberRole(member.id, val)}
                      disabled={updatingRole === member.id}
                    >
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        <SelectItem value="dm" className="text-slate-300">Dungeon Master</SelectItem>
                        <SelectItem value="co_dm" className="text-slate-300">Co-DM</SelectItem>
                        <SelectItem value="player" className="text-slate-300">Player</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${
                      member.role === 'dm' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      member.role === 'co_dm' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
                      'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    } border`}>
                      {member.role === 'dm' ? 'Dungeon Master' :
                       member.role === 'co_dm' ? 'Co-DM' : 'Player'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    {/* Unlink Character from Campaign (DM) */}
      <AlertDialog open={!!unlinkCharId} onOpenChange={() => setUnlinkCharId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Unlink Character?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the character from this campaign but keep them in their owner's library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlinkCharacter} className="bg-amber-600 hover:bg-amber-700">Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    {/* Delete Character Confirmation (DM) */}
      <AlertDialog open={!!deleteCharId} onOpenChange={() => setDeleteCharId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Character?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCharacter} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Character from Campaign (Player) */}
      <AlertDialog open={!!removeCharId} onOpenChange={() => setRemoveCharId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Character from Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will unassign the character from this campaign and reset them to level 1. The character will be kept in your personal library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCharacterFromCampaign} className="bg-amber-600 hover:bg-amber-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Campaign Confirmation */}
      <AlertDialog open={leaveCampaignOpen} onOpenChange={setLeaveCampaignOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You will be removed from this campaign. Your characters in this campaign will be unassigned and reset to level 1, but kept in your personal library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveCampaign} className="bg-red-600 hover:bg-red-700">Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}