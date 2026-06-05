import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, X, Image, FileText, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HandoutPanel({ campaignId, sessionId, isDM, userId, userName }) {
  const [handouts, setHandouts] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [viewHandout, setViewHandout] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    loadHandouts();
    const unsub = base44.entities.Handout.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId) return;
      if (event.type === 'create') setHandouts(prev => [...prev, event.data]);
      if (event.type === 'update') setHandouts(prev => prev.map(h => h.id === event.id ? event.data : h));
      if (event.type === 'delete') setHandouts(prev => prev.filter(h => h.id !== event.id));
    });
    return unsub;
  }, [campaignId, sessionId]);

  const loadHandouts = async () => {
    const all = await base44.entities.Handout.filter({ campaign_id: campaignId, session_id: sessionId });
    all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setHandouts(all);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const sendHandout = async () => {
    if (!title.trim()) return;
    setSending(true);
    await base44.entities.Handout.create({
      campaign_id: campaignId,
      session_id: sessionId,
      dm_id: userId,
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl || null,
      recipient_ids: [],
      dismissed_by: [],
    });
    setTitle(''); setContent(''); setImageUrl('');
    setNewOpen(false);
    setSending(false);
  };

  const dismiss = async (handout) => {
    const dismissed = [...(handout.dismissed_by || [])];
    if (!dismissed.includes(userId)) {
      dismissed.push(userId);
      await base44.entities.Handout.update(handout.id, { dismissed_by: dismissed });
    }
  };

  const deleteHandout = async (id) => {
    await base44.entities.Handout.delete(id);
  };

  // Players see undismissed handouts as notifications
  const activeForMe = handouts.filter(h => !(h.dismissed_by || []).includes(userId));
  const displayList = isDM ? handouts : activeForMe;

  return (
    <>
      {/* Player: floating notification for new handouts */}
      {!isDM && activeForMe.length > 0 && (
        <div className="space-y-2">
          {activeForMe.map(h => (
            <div key={h.id} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3 items-start">
              <FileText className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-amber-200 text-sm font-semibold">{h.title}</p>
                {h.content && <p className="text-amber-100/70 text-xs mt-1 line-clamp-2">{h.content}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setViewHandout(h)} className="h-7 px-2 text-amber-300 hover:text-amber-100">
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(h)} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DM: full panel */}
      {isDM && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                Handouts
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)} className="h-7 text-xs border-slate-600 text-slate-300">
                <Plus className="h-3 w-3 mr-1" /> Send Handout
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="max-h-64">
            <div className="p-3 space-y-2">
              {handouts.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No handouts sent yet</p>}
              {handouts.map(h => (
                <div key={h.id} className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-2 group">
                  {h.image_url ? <Image className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" /> : <FileText className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{h.title}</p>
                    {h.content && <p className="text-slate-400 text-xs truncate">{h.content}</p>}
                    <p className="text-slate-600 text-[10px] mt-0.5">
                      Seen by {(h.dismissed_by || []).length} player(s)
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => setViewHandout(h)} className="h-6 w-6 p-0 text-slate-400"><Eye className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteHandout(h.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Send Handout Dialog (DM) */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Send Handout to Players</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Ancient Map Fragment" className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Description / Text</label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Describe the handout..." className="bg-slate-800 border-slate-700 text-white min-h-[80px] resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Image (optional)</label>
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer flex-1">
                  <div className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors text-center">
                    {uploading ? 'Uploading...' : imageUrl ? '✓ Image uploaded' : 'Click to upload image'}
                  </div>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
                {imageUrl && <Button size="sm" variant="ghost" onClick={() => setImageUrl('')} className="text-red-400 h-8 w-8 p-0"><X className="h-3 w-3" /></Button>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewOpen(false)} variant="outline" className="border-slate-600 text-slate-300">Cancel</Button>
            <Button onClick={sendHandout} disabled={!title.trim() || sending || uploading} className="bg-amber-600 hover:bg-amber-700">
              <Send className="h-3 w-3 mr-1" /> {sending ? 'Sending...' : 'Send to All Players'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Handout Dialog */}
      <Dialog open={!!viewHandout} onOpenChange={() => setViewHandout(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-300 flex items-center gap-2">
              <FileText className="h-5 w-5" /> {viewHandout?.title}
            </DialogTitle>
          </DialogHeader>
          {viewHandout?.image_url && (
            <img src={viewHandout.image_url} alt={viewHandout.title} className="w-full rounded-lg max-h-64 object-contain bg-slate-800" />
          )}
          {viewHandout?.content && <p className="text-slate-200 text-sm leading-relaxed">{viewHandout.content}</p>}
          <DialogFooter>
            {!isDM && (
              <Button onClick={() => { dismiss(viewHandout); setViewHandout(null); }} variant="outline" className="border-slate-600 text-slate-300">
                Dismiss
              </Button>
            )}
            <Button onClick={() => setViewHandout(null)} className="bg-slate-700 hover:bg-slate-600">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}