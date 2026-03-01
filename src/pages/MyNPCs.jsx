import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Search, Plus, Swords, Tag, MapPin, Users, Trash2, Copy, Pencil, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MyNPCs() {
  const [user, setUser] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignCampaignIds, setAssignCampaignIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [npcList, membs] = await Promise.all([
        base44.entities.NPC.filter({ owner_id: currentUser.id }),
        base44.entities.CampaignMembership.filter({ user_id: currentUser.id })
      ]);

      setNpcs(npcList);

      if (membs.length > 0) {
        const allCamps = await base44.entities.Campaign.list();
        const campIds = membs.map(m => m.campaign_id);
        setCampaigns(allCamps.filter(c => campIds.includes(c.id)));
      }
    } catch (e) {
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const filteredNpcs = npcs.filter(npc =>
    npc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    npc.faction?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    npc.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (npc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getNpcCampaignIds = (npc) => npc.campaign_ids?.length ? npc.campaign_ids : (npc.campaign_id ? [npc.campaign_id] : []);

  const getCampaignName = (campaignId) => campaigns.find(c => c.id === campaignId)?.name || null;

  const handleDelete = async () => {
    if (!deleteId) return;
    await base44.entities.NPC.delete(deleteId);
    setNpcs(prev => prev.filter(n => n.id !== deleteId));
    setDeleteId(null);
  };

  const handleDuplicate = async (npc) => {
    const { id, created_date, updated_date, created_by, ...npcData } = npc;
    const clone = await base44.entities.NPC.create({ ...npcData, name: `${npc.name} (Copy)` });
    setNpcs(prev => [...prev, clone]);
  };

  const handleAssign = async () => {
    if (!assignDialog) return;
    setAssigning(true);
    try {
      await base44.entities.NPC.update(assignDialog.id, { campaign_ids: assignCampaignIds, campaign_id: assignCampaignIds[0] || null });
      setNpcs(prev => prev.map(n => n.id === assignDialog.id ? { ...n, campaign_ids: assignCampaignIds, campaign_id: assignCampaignIds[0] || null } : n));
      setAssignDialog(null);
      setAssignCampaignIds([]);
    } catch (e) {
      console.error('Failed to assign NPC to campaigns');
    } finally {
      setAssigning(false);
    }
  };

  const toggleNpcCampaign = (id) => {
    setAssignCampaignIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My NPCs</h1>
          <p className="text-slate-400 mt-1">Your personal NPC library</p>
        </div>
        <Button onClick={() => navigate(createPageUrl('NPCEditor'))} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          Create NPC
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search NPCs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {filteredNpcs.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <Swords className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">{searchQuery ? 'No NPCs match your search' : 'No NPCs yet. Create your first one!'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNpcs.map((npc) => (
            <Card key={npc.id} className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 flex-shrink-0">
                    <AvatarImage src={npc.portrait_url} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xl">
                      {npc.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">{npc.name}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl(`NPCEditor?id=${npc.id}`))} className="text-slate-500 hover:text-violet-400 h-7 w-7" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(npc)} className="text-slate-500 hover:text-amber-400 h-7 w-7" title="Duplicate">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(npc.id)} className="text-slate-500 hover:text-red-400 h-7 w-7" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {npc.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{npc.description}</p>}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                      {npc.faction && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{npc.faction}</span>}
                      {npc.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{npc.location}</span>}
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {getNpcCampaignIds(npc).length > 0 ? (
                        <>
                          {getNpcCampaignIds(npc).map(cid => (
                            <Badge key={cid} variant="outline" className="border-emerald-500/30 text-emerald-300 text-xs">
                              {getCampaignName(cid)}
                            </Badge>
                          ))}
                          <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-violet-300 h-6 px-2"
                            onClick={() => { setAssignDialog(npc); setAssignCampaignIds(getNpcCampaignIds(npc)); }}>
                            <UserPlus className="h-3 w-3 mr-1" />Edit
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-xs text-amber-400 hover:text-amber-300 h-6 px-2"
                          onClick={() => { setAssignDialog(npc); setAssignCampaignIds([]); }}>
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add to campaign
                        </Button>
                      )}
                      {npc.stat_block?.cr && (
                        <Badge className="bg-red-500/10 text-red-300 border border-red-500/20 text-xs">CR {npc.stat_block.cr}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign to Campaign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add to Campaigns</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Select all campaigns for <strong className="text-white">{assignDialog?.name}</strong>.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {campaigns.length === 0 && <p className="text-slate-500 text-sm">No campaigns found.</p>}
            {campaigns.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={assignCampaignIds.includes(c.id)}
                  onChange={() => toggleNpcCampaign(c.id)}
                  className="accent-violet-500"
                />
                <span className="text-white text-sm">{c.name}</span>
              </label>
            ))}
          </div>
          {assignCampaignIds.length > 0 && (
            <p className="text-xs text-violet-400">{assignCampaignIds.length} campaign(s) selected</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning} className="bg-violet-600 hover:bg-violet-700">
              {assigning ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete NPC?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}