import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Lock, Globe, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NotesPanel({ campaignId, episodeId, user = {}, isDM, members = [] }) {
   const [notes, setNotes] = useState([]);
   const [content, setContent] = useState('');
   const [visibility, setVisibility] = useState('public');
   const [recipientId, setRecipientId] = useState('');
   const [sending, setSending] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [editingContent, setEditingContent] = useState('');
   const bottomRef = useRef(null);

  // Load notes visible to this user
  const loadNotes = async () => {
    const allNotes = await base44.entities.Note.filter({ campaign_id: campaignId });
    // Filter: show public notes + private notes where user is author, recipient, or DM
    const visible = allNotes.filter(n => {
      if (n.visibility === 'public') return true;
      if (isDM) return true; // DM sees all
      return n.author_id === user.id || n.recipient_id === user.id;
    });
    // Sort oldest first
    visible.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setNotes(visible);
  };

  useEffect(() => {
    if (!campaignId || !user?.id) return;
    loadNotes();
    const unsub = base44.entities.Note.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId) return;
      const n = event.data;
      const isVisible = n.visibility === 'public' || isDM || n.author_id === user.id || n.recipient_id === user.id;
      if (event.type === 'create' && isVisible) {
        setNotes(prev => [...prev, n]);
      } else if (event.type === 'delete') {
        setNotes(prev => prev.filter(x => x.id !== event.id));
      }
    });
    return unsub;
  }, [campaignId, user?.id, isDM]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [notes]);

  const sendNote = async () => {
    if (!content.trim() || sending || !user.id) return;
    setSending(true);
    const recipient = visibility === 'private' ? members.find(m => m.user_id === recipientId) : null;
    await base44.entities.Note.create({
      campaign_id: campaignId,
      episode_id: episodeId || null,
      author_id: user.id,
      author_name: user.full_name || user.email,
      content: content.trim(),
      visibility,
      recipient_id: visibility === 'private' ? recipientId : null,
      recipient_name: visibility === 'private' ? (recipient?.user?.full_name || recipientId) : null
    });
    setContent('');
    setSending(false);
  };

  const updateNote = async (noteId, newContent) => {
    if (!newContent.trim()) return;
    await base44.entities.Note.update(noteId, { content: newContent.trim() });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: newContent.trim() } : n));
    setEditingId(null);
    setEditingContent('');
  };

  const otherMembers = (members || []).filter(m => m.user_id !== user.id);

  return (
    <Card className="bg-slate-900/50 border-slate-800 flex flex-col" style={{ height: '100%' }}>
      <CardHeader className="border-b border-slate-800 py-3 flex-shrink-0">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-teal-400" />
          Party Notes
          {isDM && <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs ml-1">DM sees all</Badge>}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3 pb-2">
          {notes.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-6">No notes yet. Share something with the party!</p>
          )}
          {notes.map((note) => {
            const isOwn = note.author_id === user?.id;
            const isPrivate = note.visibility === 'private';
            return (
              <div key={note.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && (
                  <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-teal-700 text-white text-xs">{(note.author_name || '?')[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[85%]`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm group relative ${
                      isPrivate
                        ? isOwn
                          ? 'bg-amber-600/30 border border-amber-500/30 text-amber-100'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                        : isOwn
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-800 text-slate-100'
                    }`}>
                      {isPrivate && (
                        <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
                          <Lock className="h-3 w-3" />
                          <span>
                            {isOwn
                              ? `Private → ${note.recipient_name || 'recipient'}`
                              : `Private from ${note.author_name}`}
                          </span>
                        </div>
                      )}
                      {editingId === note.id ? (
                        <div className="flex gap-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="flex-1 px-2 py-1 bg-slate-900/50 border border-slate-600 rounded text-xs text-white min-h-[50px] resize-none"
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => updateNote(note.id, editingContent)}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditingContent(''); }}
                              className="text-xs text-slate-400 hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="leading-relaxed">{note.content}</p>
                          {(isOwn || isDM) && (
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isOwn && (
                                <button
                                  onClick={() => { setEditingId(note.id); setEditingContent(note.content); }}
                                  className="text-xs text-amber-400 hover:text-amber-300"
                                >
                                  ✎
                                </button>
                              )}
                              <button
                                onClick={() => base44.entities.Note.delete(note.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  <p className="text-xs text-slate-600 mt-0.5 px-1">
                    {!isOwn && <span className="text-slate-500">{note.author_name} · </span>}
                    {new Date(note.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isOwn && (
                  <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-emerald-700 text-white text-xs">{(user.full_name || user.email || '?')[0]}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-800 flex-shrink-0 space-y-2">
        {/* Visibility + recipient */}
        <div className="flex gap-2">
          <Select value={visibility} onValueChange={v => { setVisibility(v); if (v === 'public') setRecipientId(''); }}>
            <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="public" className="text-slate-300 text-xs">
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Party</span>
              </SelectItem>
              <SelectItem value="private" className="text-slate-300 text-xs">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {visibility === 'private' && (
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger className="flex-1 h-8 bg-slate-800 border-slate-700 text-white text-xs">
                <SelectValue placeholder="Send to..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {otherMembers.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-slate-300 text-xs">
                    {m.user?.full_name || m.user?.email || m.user_id}
                    {m.role === 'dm' || m.role === 'co_dm' ? ' (DM)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendNote())}
            placeholder={visibility === 'private' ? 'Send a private note...' : 'Share with the party...'}
            disabled={sending || (visibility === 'private' && !recipientId)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[60px] resize-none"
          />
          <Button
            onClick={sendNote}
            disabled={sending || !content.trim() || (visibility === 'private' && !recipientId)}
            className="bg-teal-600 hover:bg-teal-700 self-end"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}