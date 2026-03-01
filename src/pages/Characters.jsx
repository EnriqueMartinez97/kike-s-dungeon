import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Scroll, 
  Plus,
  Search,
  Shield,
  UserPlus,
  Trash2,
  Copy
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

export default function Characters() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignDialog, setAssignDialog] = useState(null);
  const [assignCampaignIds, setAssignCampaignIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [chars, membs] = await Promise.all([
        base44.entities.Character.filter({ owner_id: currentUser.id }),
        base44.entities.CampaignMembership.filter({ user_id: currentUser.id })
      ]);

      setCharacters(chars);
      setMemberships(membs);

      if (membs.length > 0) {
        const campIds = membs.map(m => m.campaign_id);
        const allCamps = await base44.entities.Campaign.list();
        setCampaigns(allCamps.filter(c => campIds.includes(c.id)));
      }
    } catch (e) {
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const getCharCampaignIds = (char) => char.campaign_ids?.length ? char.campaign_ids : (char.campaign_id ? [char.campaign_id] : []);

  const getCampaignName = (campaignId) => campaigns.find(c => c.id === campaignId)?.name || null;

  const handleAssignToCampaign = async () => {
    if (!assignDialog) return;
    setAssigning(true);
    try {
      await base44.entities.Character.update(assignDialog.id, { campaign_ids: assignCampaignIds, campaign_id: assignCampaignIds[0] || null });
      setCharacters(prev => prev.map(c => c.id === assignDialog.id ? { ...c, campaign_ids: assignCampaignIds, campaign_id: assignCampaignIds[0] || null } : c));
      setAssignDialog(null);
      setAssignCampaignIds([]);
    } catch (e) {
      console.error('Failed to assign character to campaigns');
    } finally {
      setAssigning(false);
    }
  };

  const toggleCharCampaign = (id) => {
    setAssignCampaignIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDuplicate = async (char) => {
    const { id, created_date, updated_date, created_by, ...charData } = char;
    const clone = await base44.entities.Character.create({ ...charData, name: `${char.name} (Copy)` });
    setCharacters(prev => [...prev, clone]);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await base44.entities.Character.delete(deleteId);
    setCharacters(prev => prev.filter(c => c.id !== deleteId));
    setDeleteId(null);
  };

  const filteredCharacters = characters.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.class?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.race?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Characters</h1>
          <p className="text-slate-400 mt-1">All your adventurers across campaigns</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl('CharacterSheet'))}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Character
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Characters Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="text-center py-16">
          <Scroll className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No characters found' : 'No characters yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery 
              ? 'Try a different search term' 
              : 'Create your first character!'
            }
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => navigate(createPageUrl('CharacterSheet'))}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Character
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCharacters.map((char) => (
            <div key={char.id} className="relative group">
              <Link to={createPageUrl(`CharacterSheet?id=${char.id}`)}>
              <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={char.portrait_url} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xl">
                        {char.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-white group-hover:text-violet-300 transition-colors truncate">
                        {char.name}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Level {char.level || 1} {char.race} {char.class}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {getCharCampaignIds(char).map(id => getCampaignName(id)).filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-500">HP</p>
                      <p className="font-bold text-white">
                        {char.hp_current || 0}/{char.hp_max || 0}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-500">AC</p>
                      <p className="font-bold text-white">{char.ac || 10}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-800/50">
                      <p className="text-xs text-slate-500">Level</p>
                      <p className="font-bold text-white">{char.level || 1}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    {char.class && (
                      <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                        {char.class}
                        {char.subclass && ` (${char.subclass})`}
                      </Badge>
                    )}
                    {getCharCampaignIds(char).length > 0 ? (
                      <div className="flex flex-wrap gap-1 items-center">
                        {getCharCampaignIds(char).map(id => getCampaignName(id)).filter(Boolean).map((name, i) => (
                          <Badge key={i} variant="outline" className="border-emerald-500/30 text-emerald-300 text-xs">{name}</Badge>
                        ))}
                        <Button size="sm" variant="ghost" className="text-xs text-slate-400 hover:text-violet-300 h-6 px-2"
                          onClick={(e) => { e.preventDefault(); setAssignDialog(char); setAssignCampaignIds(getCharCampaignIds(char)); }}>
                          <UserPlus className="h-3 w-3 mr-1" />Edit
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-amber-400 hover:text-amber-300 h-6 px-2"
                        onClick={(e) => { e.preventDefault(); setAssignDialog(char); setAssignCampaignIds([]); }}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Assign to campaign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              </Link>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10"
                  onClick={(e) => { e.preventDefault(); handleDuplicate(char); }}
                  title="Duplicate character"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={(e) => { e.preventDefault(); setDeleteId(char.id); }}
                  title="Delete character"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Character?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign to Campaign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Assign to Campaigns</DialogTitle>
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
                  onChange={() => toggleCharCampaign(c.id)}
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
            <Button onClick={handleAssignToCampaign} disabled={assigning} className="bg-violet-600 hover:bg-violet-700">
              {assigning ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}