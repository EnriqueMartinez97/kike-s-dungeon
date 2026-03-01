import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  Plus, Search, FileText, Upload, Edit, Trash2, Copy, Tag, Lock, Users,
  Link, Unlink, ExternalLink, Sparkles, BookOpen, Filter, X, Save, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const CATEGORIES = [
  { value: 'lore', label: 'Lore', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { value: 'rules', label: 'Rules', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'maps', label: 'Maps', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'characters', label: 'Characters', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'quests', label: 'Quests', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'handouts', label: 'Handouts', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { value: 'notes', label: 'Notes', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'other', label: 'Other', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
];

const getCategoryStyle = (cat) => CATEGORIES.find(c => c.value === cat)?.color || CATEGORIES[7].color;
const getCategoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || 'Other';

const emptyDoc = (userId) => ({
  owner_id: userId,
  title: '',
  content: '',
  file_url: '',
  file_type: 'markdown',
  category: 'other',
  tags: [],
  access_level: 'dm_only',
  campaign_id: null,
});

export default function MyLibrary() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  // Editor dialog
  const [editDoc, setEditDoc] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Attach dialog
  const [attachDoc, setAttachDoc] = useState(null);
  const [attachCampaignIds, setAttachCampaignIds] = useState([]);

  // Delete
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [docs, memberships] = await Promise.all([
        base44.entities.Document.filter({ owner_id: u.id }),
        base44.entities.CampaignMembership.filter({ user_id: u.id }),
      ]);
      setDocuments(docs);

      if (memberships.length > 0) {
        const campIds = [...new Set(memberships.map(m => m.campaign_id))];
        const camps = await Promise.all(campIds.map(id => base44.entities.Campaign.filter({ id })));
        setCampaigns(camps.flat());
      }
    } finally {
      setLoading(false);
    }
  };

  const getDocCampaignIds = (doc) => doc.campaign_ids?.length ? doc.campaign_ids : (doc.campaign_id ? [doc.campaign_id] : []);

  const filtered = documents.filter(doc => {
    const matchSearch = !search ||
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.content?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || doc.category === catFilter;
    const ids = getDocCampaignIds(doc);
    const matchCamp = campaignFilter === 'all'
      ? true
      : campaignFilter === 'none'
        ? ids.length === 0
        : ids.includes(campaignFilter);
    return matchSearch && matchCat && matchCamp;
  });

  const openNew = () => {
    setIsNew(true);
    setEditDoc(emptyDoc(user.id));
  };

  const openEdit = (doc) => {
    setIsNew(false);
    setEditDoc({ ...doc });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditDoc(prev => ({ ...prev, file_url, file_type: file.name.endsWith('.pdf') ? 'pdf' : 'text' }));
    setUploading(false);
  };

  const addTag = () => {
    if (!newTag.trim() || editDoc.tags?.includes(newTag.trim())) { setNewTag(''); return; }
    setEditDoc(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.trim()] }));
    setNewTag('');
  };

  const saveDoc = async () => {
    if (!editDoc.title.trim()) return;
    setSaving(true);
    if (isNew) {
      const created = await base44.entities.Document.create(editDoc);
      setDocuments(prev => [created, ...prev]);
    } else {
      const updated = await base44.entities.Document.update(editDoc.id, editDoc);
      setDocuments(prev => prev.map(d => d.id === editDoc.id ? updated : d));
    }
    setSaving(false);
    setEditDoc(null);
  };

  const duplicateDoc = async (doc) => {
    const copy = { ...doc, title: doc.title + ' (Copy)', id: undefined, created_date: undefined, updated_date: undefined };
    delete copy.id;
    const created = await base44.entities.Document.create(copy);
    setDocuments(prev => [created, ...prev]);
  };

  const deleteDoc = async () => {
    await base44.entities.Document.delete(deleteId);
    setDocuments(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
  };

  const saveAttachCampaigns = async () => {
    const updated = await base44.entities.Document.update(attachDoc.id, { campaign_ids: attachCampaignIds, campaign_id: attachCampaignIds[0] || null });
    setDocuments(prev => prev.map(d => d.id === attachDoc.id ? updated : d));
    setAttachDoc(null);
    setAttachCampaignIds([]);
  };

  const getCampaignName = (id) => campaigns.find(c => c.id === id)?.name || id;

  const toggleCampaign = (id) => {
    setAttachCampaignIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-violet-400" />
            My Library
          </h1>
          <p className="text-slate-400 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40 bg-slate-900/50 border-slate-700 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All Categories</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value} className="text-slate-300">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-48 bg-slate-900/50 border-slate-700 text-white">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="all" className="text-slate-300">All Campaigns</SelectItem>
            <SelectItem value="none" className="text-slate-300">No Campaign</SelectItem>
            {campaigns.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-slate-300">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      {filtered.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              {search || catFilter !== 'all' ? 'No documents match your filters' : 'Your library is empty'}
            </p>
            {!search && catFilter === 'all' && (
              <Button onClick={openNew} className="mt-4 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4 mr-2" /> Create your first document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <Card key={doc.id} className="bg-slate-900/50 border-slate-800 hover:border-violet-500/40 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-white truncate">{doc.title}</h3>
                      <Badge className={`border text-xs ${getCategoryStyle(doc.category)}`}>
                        {getCategoryLabel(doc.category)}
                      </Badge>
                      <Badge className={`border text-xs ${doc.access_level === 'dm_only' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                        {doc.access_level === 'dm_only' ? <><Lock className="h-3 w-3 mr-1" />DM Only</> : <><Users className="h-3 w-3 mr-1" />Players</>}
                      </Badge>
                      {getDocCampaignIds(doc).map(cid => (
                        <Badge key={cid} className="border text-xs bg-violet-500/20 text-violet-300 border-violet-500/30">
                          <Link className="h-3 w-3 mr-1" />{getCampaignName(cid)}
                        </Badge>
                      ))}
                    </div>
                    {doc.content && (
                      <p className="text-sm text-slate-400 line-clamp-2 mt-1">{doc.content.substring(0, 200)}</p>
                    )}
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {doc.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="border-slate-700 text-slate-400 text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.file_url && (
                      <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white h-8 w-8">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} className="text-slate-400 hover:text-white h-8 w-8">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicateDoc(doc)} className="text-slate-400 hover:text-white h-8 w-8">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { setAttachDoc(doc); setAttachCampaignIds(getDocCampaignIds(doc)); }}
                      className="text-slate-400 hover:text-violet-400 h-8 w-8"
                      title="Manage campaigns"
                    >
                      <Link className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(doc.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{isNew ? 'New Document' : 'Edit Document'}</DialogTitle>
          </DialogHeader>
          {editDoc && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm">Title *</Label>
                <Input
                  value={editDoc.title}
                  onChange={e => setEditDoc(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title..."
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm">Category</Label>
                  <Select value={editDoc.category} onValueChange={v => setEditDoc(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value} className="text-slate-300">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Access Level</Label>
                  <Select value={editDoc.access_level} onValueChange={v => setEditDoc(prev => ({ ...prev, access_level: v }))}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="dm_only" className="text-slate-300">DM Only</SelectItem>
                      <SelectItem value="player_visible" className="text-slate-300">Player Visible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Button onClick={addTag} variant="outline" size="sm" className="border-slate-700 text-slate-300">Add</Button>
                </div>
                {editDoc.tags?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {editDoc.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="border-violet-500/30 text-violet-300 pr-1">
                        {tag}
                        <button onClick={() => setEditDoc(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="ml-1 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Content (Markdown supported)</Label>
                <Textarea
                  value={editDoc.content || ''}
                  onChange={e => setEditDoc(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your document content here..."
                  className="mt-1 bg-slate-800 border-slate-700 text-white min-h-[200px] font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm">File Attachment</Label>
                {editDoc.file_url ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 mt-1">
                    <a href={editDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-sm">
                      View attached file
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setEditDoc(prev => ({ ...prev, file_url: '' }))} className="text-red-400 hover:text-red-300">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="block mt-1">
                    <input type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-violet-500/50 transition-colors">
                      <Upload className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">{uploading ? 'Uploading...' : 'Click to upload a file'}</p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDoc(null)} className="text-slate-400">Cancel</Button>
            <Button onClick={saveDoc} disabled={saving || !editDoc?.title?.trim()} className="bg-violet-600 hover:bg-violet-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach to Campaign Dialog */}
      <Dialog open={!!attachDoc} onOpenChange={() => setAttachDoc(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Attach to Campaigns</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Select all campaigns to attach "<strong className="text-white">{attachDoc?.title}</strong>" to.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {campaigns.length === 0 && <p className="text-slate-500 text-sm">No campaigns found.</p>}
              {campaigns.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={attachCampaignIds.includes(c.id)}
                    onChange={() => toggleCampaign(c.id)}
                    className="accent-violet-500"
                  />
                  <span className="text-white text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            {attachCampaignIds.length > 0 && (
              <p className="text-xs text-violet-400">Attached to {attachCampaignIds.length} campaign(s)</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAttachDoc(null)} className="text-slate-400">Cancel</Button>
            <Button onClick={saveAttachCampaigns} className="bg-violet-600 hover:bg-violet-700">
              <Link className="h-4 w-4 mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDoc} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}