import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Plus, 
  Shield, 
  Users, 
  Sparkles, 
  Search,
  Crown,
  UserCircle,
  MoreVertical,
  Settings,
  LogIn,
  Copy,
  Trash2,
  Play
} from 'lucide-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';

export default function Campaigns() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const userMemberships = await base44.entities.CampaignMembership.filter({ user_id: currentUser.id });
      setMemberships(userMemberships);
      
      if (userMemberships.length > 0) {
        const campaignIds = userMemberships.map(m => m.campaign_id);
        const allCampaigns = await base44.entities.Campaign.list();
        setCampaigns(allCampaigns.filter(c => campaignIds.includes(c.id)));
      }
    } catch (e) {
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const getMembershipRole = (campaignId) => {
    const membership = memberships.find(m => m.campaign_id === campaignId);
    return membership?.role || 'player';
  };

  const handleJoinCampaign = async () => {
    if (!inviteCode.trim()) return;
    
    setJoining(true);
    try {
      const allCampaigns = await base44.entities.Campaign.filter({ invite_code: inviteCode.trim() });
      if (allCampaigns.length === 0) {
        toast({ title: 'Invalid invite code', description: 'No campaign found with that code.', variant: 'destructive' });
        return;
      }
      
      const campaign = allCampaigns[0];
      
      // Check if already a member
      const existingMembership = memberships.find(m => m.campaign_id === campaign.id);
      if (existingMembership) {
        toast({ title: 'Already a member', description: 'You are already in this campaign.' });
        return;
      }
      
      // Create membership (single source of truth: CampaignMembership)
      await base44.entities.CampaignMembership.create({
        campaign_id: campaign.id,
        user_id: user.id,
        role: 'player',
        joined_at: new Date().toISOString()
      });
      
      setJoinDialogOpen(false);
      setInviteCode('');
      loadData();
    } catch (e) {
      toast({ title: 'Failed to join', description: 'Could not join campaign.', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const duplicateCampaign = async (campaign) => {
    try {
      const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await base44.entities.Campaign.create({
        ...campaign,
        id: undefined,
        name: `${campaign.name} (Copy)`,
        invite_code: newInviteCode,
        dm_id: user.id,
      });
      loadData();
    } catch (e) {
      toast({ title: 'Duplicate failed', description: 'Could not duplicate campaign.', variant: 'destructive' });
    }
  };

  const deleteCampaign = async (campaignId) => {
    
    try {
      // Call backend function to unlink documents/npcs/characters from campaign
      await base44.functions.invoke('onCampaignDelete', { campaign_id: campaignId });
      
      // Delete campaign membership records
      const memberships = await base44.entities.CampaignMembership.filter({ campaign_id: campaignId });
      await Promise.all(memberships.map(m => base44.entities.CampaignMembership.delete(m.id)));
      
      // Delete campaign-specific data (episodes, quests)
      const [eps, qsts] = await Promise.all([
        base44.entities.Episode.filter({ campaign_id: campaignId }),
        base44.entities.Quest.filter({ campaign_id: campaignId }),
      ]);
      await Promise.all([
        ...eps.map(e => base44.entities.Episode.delete(e.id)),
        ...qsts.map(q => base44.entities.Quest.delete(q.id)),
      ]);
      
      // Finally, delete the campaign itself
      await base44.entities.Campaign.delete(campaignId);
      loadData();
    } catch (e) {
      toast({ title: 'Delete failed', description: 'Could not delete campaign.', variant: 'destructive' });
    }
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Campaigns</h1>
          <p className="text-slate-400 mt-1">Manage your DnD 5e adventures</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setJoinDialogOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Join Campaign
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('CreateCampaign'))}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800">
              <Skeleton className="h-40 rounded-t-lg" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery 
              ? 'Try a different search term' 
              : 'Create your first campaign or join one with an invite code'
            }
          </p>
          {!searchQuery && (
            <div className="flex justify-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setJoinDialogOpen(true)}
                className="border-slate-700 text-slate-300"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Join Campaign
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl('CreateCampaign'))}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const role = getMembershipRole(campaign.id);
            const isDM = role === 'dm' || role === 'co_dm';
            
            return (
              <Card 
                key={campaign.id} 
                className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group overflow-hidden"
              >
                <Link to={createPageUrl(`CampaignDetail?id=${campaign.id}`)}>
                  <div className="h-40 bg-gradient-to-br from-violet-600/20 to-purple-600/20 relative">
                    {campaign.cover_image && (
                      <img 
                        src={campaign.cover_image} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className={`${toneColors[campaign.tone]} text-white text-xs`}>
                        {toneLabels[campaign.tone]}
                      </Badge>
                    </div>
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
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
                      
                      <Badge className={`${
                        isDM 
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                          : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                      } border`}>
                        {isDM ? (
                          <><Crown className="h-3 w-3 mr-1" /> {role === 'dm' ? 'DM' : 'Co-DM'}</>
                        ) : (
                          <><UserCircle className="h-3 w-3 mr-1" /> Player</>
                        )}
                      </Badge>
                    </div>
                  </div>
                </Link>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <Link to={createPageUrl(`CampaignDetail?id=${campaign.id}`)} className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {campaign.description || 'No description'}
                      </p>
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                        <DropdownMenuItem
                          onClick={() => navigate(createPageUrl(`Session?campaign_id=${campaign.id}`))}
                          className="text-slate-300 focus:bg-slate-800"
                        >
                          <Play className="h-4 w-4 mr-2" />Join Session
                        </DropdownMenuItem>
                        {isDM && (
                          <>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              onClick={() => navigate(createPageUrl(`CampaignSettings?id=${campaign.id}`))}
                              className="text-slate-300 focus:bg-slate-800"
                            >
                              <Settings className="h-4 w-4 mr-2" />Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateCampaign(campaign)}
                              className="text-slate-300 focus:bg-slate-800"
                            >
                              <Copy className="h-4 w-4 mr-2" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmId(campaign.id)}
                              className="text-red-400 focus:bg-slate-800"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{memberships.filter(m => m.campaign_id === campaign.id).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Join Campaign Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Join a Campaign</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the invite code shared by your DM to join their campaign.
            </DialogDescription>
          </DialogHeader>
          
          <Input
            placeholder="Enter invite code..."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setJoinDialogOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinCampaign}
              disabled={joining || !inviteCode.trim()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {joining ? 'Joining...' : 'Join Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campaign Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete the campaign and all its data — members, characters, episodes, and quests. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteCampaign(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}