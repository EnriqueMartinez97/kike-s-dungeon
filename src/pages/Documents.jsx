import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Search,
  Plus,
  FileText,
  Lock,
  Users,
  Tag,
  ExternalLink,
  Trash2,
  Filter,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import AIAssistantPanel from '@/components/ai/AIAssistantPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function Documents() {
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [membership, setMembership] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [characters, setCharacters] = useState([]);
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

      const [camps, memberships, docs, npcList, qsts, chars] = await Promise.all([
        base44.entities.Campaign.filter({ id: campaignId }),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId, user_id: currentUser.id }),
        base44.entities.Document.filter({ campaign_id: campaignId }),
        base44.entities.NPC.filter({ campaign_id: campaignId }),
        base44.entities.Quest.filter({ campaign_id: campaignId }),
        base44.entities.Character.filter({ campaign_id: campaignId })
      ]);

      if (camps.length === 0 || memberships.length === 0) {
        navigate(createPageUrl('Campaigns'));
        return;
      }

      setCampaign(camps[0]);
      setMembership(memberships[0]);

      const isDM = memberships[0].role === 'dm' || memberships[0].role === 'co_dm';
      const visibleDocs = isDM ? docs : docs.filter(d => d.access_level === 'player_visible');
      setDocuments(visibleDocs);
      setNpcs(isDM ? npcList : []);
      setQuests(qsts);
      setCharacters(chars);
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const isDM = membership?.role === 'dm' || membership?.role === 'co_dm';

  const getAllTags = () => {
    const tags = new Set();
    documents.forEach(doc => {
      (doc.tags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = tagFilter === 'all' || (doc.tags || []).includes(tagFilter);
    
    const matchesAccess = accessFilter === 'all' || doc.access_level === accessFilter;

    return matchesSearch && matchesTag && matchesAccess;
  });

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    setAiSearching(true);
    try {
      const visibleDocs = documents.map(d => ({
        title: d.title,
        content: d.content?.substring(0, 500),
        tags: d.tags
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful assistant searching through campaign documents.

Search Query: "${searchQuery}"

Documents available:
${JSON.stringify(visibleDocs, null, 2)}

Find the most relevant documents and summarize what you found related to the query. If nothing is found, say so.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            relevant_titles: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setAiResults(result);
    } catch (e) {
      console.error('AI search failed');
    } finally {
      setAiSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await base44.entities.Document.delete(deleteId);
      setDocuments(prev => prev.filter(d => d.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      console.error('Failed to delete document');
    }
  };

  const handleUnlink = async () => {
    if (!unlinkId) return;
    try {
      const doc = documents.find(d => d.id === unlinkId);
      const newIds = (doc.campaign_ids || []).filter(id => id !== campaignId);
      await base44.entities.Document.update(unlinkId, {
        campaign_id: doc.campaign_id === campaignId ? null : doc.campaign_id,
        campaign_ids: newIds
      });
      setDocuments(prev => prev.filter(d => d.id !== unlinkId));
      setUnlinkId(null);
    } catch (e) {
      console.error('Failed to unlink document');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
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

      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={handleAISearch}
            disabled={aiSearching || !searchQuery.trim()}
            variant="outline"
            className="border-slate-700 text-slate-300"
          >
            <Sparkles className={`h-4 w-4 mr-2 ${aiSearching ? 'animate-spin' : ''}`} />
            AI Search
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-40 bg-slate-900/50 border-slate-700 text-white">
              <Tag className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-slate-300">All Tags</SelectItem>
              {getAllTags().map(tag => (
                <SelectItem key={tag} value={tag} className="text-slate-300">{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isDM && (
            <Select value={accessFilter} onValueChange={setAccessFilter}>
              <SelectTrigger className="w-40 bg-slate-900/50 border-slate-700 text-white">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all" className="text-slate-300">All Access</SelectItem>
                <SelectItem value="dm_only" className="text-slate-300">DM Only</SelectItem>
                <SelectItem value="player_visible" className="text-slate-300">Player Visible</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* AI Search Results */}
      {aiResults && (
        <Card className="bg-violet-500/10 border-violet-500/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-violet-400 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-2">AI Search Results</p>
                <p className="text-slate-300 text-sm">{aiResults.summary}</p>
                {aiResults.relevant_titles?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {aiResults.relevant_titles.map((title, i) => (
                      <Badge key={i} variant="outline" className="border-violet-500/30 text-violet-300">
                        {title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setAiResults(null)}
              className="mt-2 text-slate-400"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery || tagFilter !== 'all' || accessFilter !== 'all'
                ? 'No documents match your filters'
                : 'No documents yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <Card 
              key={doc.id} 
              className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{doc.title}</h3>
                      <Badge className={`${
                        doc.access_level === 'dm_only' 
                          ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      } border`}>
                        {doc.access_level === 'dm_only' ? (
                          <><Lock className="h-3 w-3 mr-1" /> DM Only</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" /> Players</>
                        )}
                      </Badge>
                    </div>
                    
                    {doc.content && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                        {doc.content.substring(0, 200)}...
                      </p>
                    )}

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {doc.tags.map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="border-slate-700 text-slate-400 text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {doc.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="text-slate-400 hover:text-white"
                      >
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    {isDM && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(createPageUrl(`DocumentEditor?id=${doc.id}`))}
                          className="text-slate-400 hover:text-white"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnlinkId(doc.id)}
                          className="text-amber-400 hover:text-amber-300"
                          title="Unlink from campaign"
                        >
                          Unlink
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(doc.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Assistant */}
      <div className="fixed bottom-6 right-6 w-96 z-40 shadow-2xl">
        <AIAssistantPanel
          campaign={campaign}
          documents={documents}
          npcs={npcs}
          quests={quests}
          characters={characters}
          isCollapsible={true}
        />
      </div>

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Unlink Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the document from this campaign. The document will still exist in your library.
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
            <AlertDialogTitle className="text-white">Delete Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The document will be permanently deleted.
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