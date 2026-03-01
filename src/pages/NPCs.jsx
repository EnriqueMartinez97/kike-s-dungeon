import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Search,
  Plus,
  Swords,
  Tag,
  MapPin,
  Users,
  Trash2,
  Copy,
  Pencil,
  Unlink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function NPCs() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [unlinkId, setUnlinkId] = useState(null);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('campaign_id');

  useEffect(() => {
    if (campaignId) loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [camps, npcList] = await Promise.all([
        base44.entities.Campaign.filter({ id: campaignId }),
        base44.entities.NPC.filter({ campaign_id: campaignId })
      ]);

      if (camps.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }

      setCampaign(camps[0]);
      setNpcs(npcList);
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await base44.entities.NPC.delete(deleteId);
      setNpcs(prev => prev.filter(n => n.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      console.error('Failed to delete NPC');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkId) return;
    try {
      const npc = npcs.find(n => n.id === unlinkId);
      const newIds = (npc.campaign_ids || []).filter(id => id !== campaignId);
      await base44.entities.NPC.update(unlinkId, {
        campaign_id: npc.campaign_id === campaignId ? null : npc.campaign_id,
        campaign_ids: newIds
      });
      setNpcs(prev => prev.filter(n => n.id !== unlinkId));
      setUnlinkId(null);
    } catch (e) {
      console.error('Failed to unlink NPC');
    }
  };

  const handleDuplicate = async (npc) => {
    try {
      const { id, created_date, updated_date, created_by, ...npcData } = npc;
      const clone = await base44.entities.NPC.create({
        ...npcData,
        name: `${npc.name} (Copy)`
      });
      setNpcs(prev => [...prev, clone]);
    } catch (e) {
      console.error('Failed to duplicate NPC');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(createPageUrl(`CampaignDetail?id=${campaignId}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaign
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">NPCs</h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl(`NPCEditor?campaign_id=${campaignId}`))}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create NPC
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search NPCs by name, faction, location, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* NPCs Grid */}
      {filteredNpcs.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <Swords className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery ? 'No NPCs match your search' : 'No NPCs yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNpcs.map((npc) => (
            <Card 
              key={npc.id} 
              className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Link to={createPageUrl(`NPCEditor?id=${npc.id}`)}>
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={npc.portrait_url} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xl">
                        {npc.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <Link to={createPageUrl(`NPCEditor?id=${npc.id}`)}>
                        <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                          {npc.name}
                        </h3>
                      </Link>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(createPageUrl(`NPCEditor?id=${npc.id}`))}
                          className="text-slate-500 hover:text-violet-400 h-7 w-7"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(npc)}
                          className="text-slate-500 hover:text-amber-400 h-7 w-7"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUnlinkId(npc.id)}
                          className="text-slate-500 hover:text-amber-400 h-7 w-7"
                          title="Unlink from campaign"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(npc.id)}
                          className="text-slate-500 hover:text-red-400 h-7 w-7"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {npc.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {npc.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {npc.faction && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {npc.faction}
                        </div>
                      )}
                      {npc.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {npc.location}
                        </div>
                      )}
                    </div>

                    {npc.tags && npc.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {npc.tags.slice(0, 3).map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="border-slate-700 text-slate-400 text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {npc.tags.length > 3 && (
                          <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                            +{npc.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {npc.stat_block?.cr && (
                      <Badge className="mt-2 bg-red-500/10 text-red-300 border border-red-500/20">
                        CR {npc.stat_block.cr}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Unlink NPC?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the NPC from this campaign. The NPC will still exist in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-amber-600 hover:bg-amber-700">Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete NPC?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The NPC will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}