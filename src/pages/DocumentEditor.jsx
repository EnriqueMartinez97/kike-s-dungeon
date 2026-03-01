import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Upload,
  Lock,
  Users,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

export default function DocumentEditor() {
  const [user, setUser] = useState(null);
  const [document, setDocument] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [newTag, setNewTag] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const documentId = urlParams.get('id');
  const campaignId = urlParams.get('campaign_id');

  const defaultDocument = {
    campaign_id: campaignId,
    title: '',
    content: '',
    file_url: '',
    file_type: 'markdown',
    tags: [],
    access_level: 'dm_only'
  };

  useEffect(() => {
    loadData();
  }, [documentId, campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (documentId) {
        const docs = await base44.entities.Document.filter({ id: documentId });
        if (docs.length === 0) {
          navigate(createPageUrl('Campaigns'));
          return;
        }
        setDocument(docs[0]);
        
        const camps = await base44.entities.Campaign.filter({ id: docs[0].campaign_id });
        if (camps.length > 0) setCampaign(camps[0]);
      } else if (campaignId) {
        setIsNew(true);
        setDocument({ ...defaultDocument });
        
        const camps = await base44.entities.Campaign.filter({ id: campaignId });
        if (camps.length > 0) setCampaign(camps[0]);
      } else {
        navigate(createPageUrl('Campaigns'));
      }
    } catch (e) {
      navigate(createPageUrl('Campaigns'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocument(prev => ({ 
        ...prev, 
        file_url,
        file_type: file.name.endsWith('.pdf') ? 'pdf' : 'text'
      }));
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (document.tags?.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    setDocument(prev => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()]
    }));
    setNewTag('');
  };

  const removeTag = (tag) => {
    setDocument(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag)
    }));
  };

  const saveDocument = async () => {
    if (!document.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' }); return;
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.Document.create(document);
      } else {
        await base44.entities.Document.update(document.id, document);
      }
      
      navigate(createPageUrl(`Documents?campaign_id=${document.campaign_id}`));
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(createPageUrl(`Documents?campaign_id=${document.campaign_id}`))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Documents
      </Button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isNew ? 'New Document' : 'Edit Document'}
          </h1>
          <p className="text-slate-400 mt-1">{campaign?.name}</p>
        </div>
        <Button 
          onClick={saveDocument}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <Label htmlFor="title" className="text-white">Title *</Label>
            <Input
              id="title"
              value={document.title || ''}
              onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title..."
              className="mt-2 bg-slate-800 border-slate-700 text-white"
            />
          </CardContent>
        </Card>

        {/* Access Level */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Access Level</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RadioGroup 
              value={document.access_level || 'dm_only'} 
              onValueChange={(v) => setDocument(prev => ({ ...prev, access_level: v }))}
              className="grid grid-cols-2 gap-4"
            >
              <Label htmlFor="dm_only" className="cursor-pointer">
                <Card className={`bg-slate-800/50 border-2 transition-all ${
                  document.access_level === 'dm_only' 
                    ? 'border-red-500 bg-red-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <RadioGroupItem value="dm_only" id="dm_only" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-red-400" />
                        <span className="font-medium text-white">DM Only</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Only visible to DMs and Co-DMs
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Label>

              <Label htmlFor="player_visible" className="cursor-pointer">
                <Card className={`bg-slate-800/50 border-2 transition-all ${
                  document.access_level === 'player_visible' 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <RadioGroupItem value="player_visible" id="player_visible" className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-400" />
                        <span className="font-medium text-white">Player Visible</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Visible to all campaign members
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add a tag..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button 
                onClick={addTag}
                variant="outline"
                className="border-slate-700 text-slate-300"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {document.tags && document.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {document.tags.map((tag, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="border-violet-500/30 text-violet-300 pr-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Content</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={document.content || ''}
              onChange={(e) => setDocument(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your document content here... (Markdown supported)"
              className="bg-slate-800 border-slate-700 text-white min-h-[300px] font-mono"
            />
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Attach File (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {document.file_url ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                <a 
                  href={document.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300"
                >
                  View attached file
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocument(prev => ({ ...prev, file_url: '' }))}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm mb-3">
                  Upload a PDF or text file
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="border-slate-700 text-slate-300"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}