import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Lock, Globe, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NotesPanel({ campaignId, episodeId, user = {}, isDM, members = [] }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [selectedRecipients, setSelectedRecipients] = useState([]); // array of user_ids
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const bottomRef = useRef(null);

  const loadNotes = async () => {
    const allNotes = await base44.entities.Note.filter({ campaign_id: campaignId });
    const visible = allNotes.filter(n => {
      if (n.visibility === 'public') return true;
      if (isDM) return true;
      if (n.author_id === user.id) return true;
      // support both old recipient_id and new recipient_ids
      if (n.recipient_ids?.includes(user.id)) return true;
      if (n.recipient_id === user.id) return true;
      return false;
    });
    visible.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setNotes(visible);
  };

  useEffect(() => {
    if (!campaignId || !user?.id) return;
    loadNotes();
    const unsub = base44.entities.Note.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId) return;
      const n = event.data;
      const isVisible = n.visibility === 'public' || isDM || n.author_id === user.id
        || n.recipient_ids?.includes(user.id) || n.recipient_id === user.id;
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

  const otherMembers = (members || []).filter(m => m.user_id !== user.id);

  const toggleRecipient = (userId) => {
    setSelectedRecipients(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const sendNote = async () => {
    if (!content.trim() || sending || !user.id) return;
    if (visibility === 'private' && selectedRecipients.length === 0) return;
    setSending(true);

    const recipientNames = selectedRecipients.map(id => {
      const m = members.find(m => m.user_id === id);
      return m?.user?.full_name || m?.user?.email || id;
    });

    await base44.entities.Note.create({
      campaign_id: campaignId,
      episode_id: episodeId || null,
      author_id: user.id,
      author_name: user.full_name || user.email,
      content: content.trim(),
      visibility,
      recipient_ids: visibility === 'private' ? selectedRecipients : [],
      recipient_names: visibility === 'private' ? recipientNames : [],
      // legacy fields for backward compat
      recipient_id: visibility === 'private' && selectedRecipients.length === 1 ? selectedRecipients[0] : null,
      recipient_name: visibility === 'private' && recipientNames.length === 1 ? recipientNames[0] : null,
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

  const getRecipientLabel = (note) => {
    if (note.recipient_names?.length) return note.recipient_names.join(', ');
    if (note.recipient_name) return note.recipient_name;
    return 'recipient';
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 flex flex-col" style={{ height: '100%' }}>
      <CardHeader className="border-b border-slate-800 py-3 flex-shrink-0">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-teal-400" />
          Party Messages
          {isDM && <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs ml-1">DM sees all</Badge>}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3 pb-2">
          {notes.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-6">No messages yet. Share something with the party!</p>
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
                <div className="max-w-[85%]">
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
                            ? `Private → ${getRecipientLabel(note)}`
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
                          <button onClick={() => updateNote(note.id, editingContent)} className="text-xs text-green-400 hover:text-green-300">Save</button>
                          <button onClick={() => { setEditingId(null); setEditingContent(''); }} className="text-xs text-slate-400 hover:text-slate-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="leading-relaxed">{note.content}</p>
                        {(isOwn || isDM) && (
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isOwn && (
                              <button onClick={() => { setEditingId(note.id); setEditingContent(note.content); }} className="text-xs text-amber-400 hover:text-amber-300">✎</button>
                            )}
                            <button onClick={() => base44.entities.Note.delete(note.id)} className="text-xs text-red-400 hover:text-red-300">✕</button>
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
        {/* Visibility toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setVisibility('public'); setSelectedRecipients([]); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              visibility === 'public'
                ? 'bg-teal-600/20 border-teal-500/40 text-teal-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Globe className="h-3 w-3" /> Party
          </button>
          <button
            onClick={() => setVisibility('private')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              visibility === 'private'
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Lock className="h-3 w-3" /> Private
          </button>
        </div>

        {/* Multi-recipient selector */}
        {visibility === 'private' && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500">Send to (select multiple):</p>
            <div className="flex flex-wrap gap-1.5">
              {otherMembers.map(m => {
                const name = m.user?.full_name || m.user?.email || m.user_id;
                const isSelected = selectedRecipients.includes(m.user_id);
                return (
                  <button
                    key={m.user_id}
                    onClick={() => toggleRecipient(m.user_id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {name}
                    {m.role === 'dm' || m.role === 'co_dm' ? ' (DM)' : ''}
                    {isSelected && <X className="h-2.5 w-2.5 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendNote())}
            placeholder={visibility === 'private' ? 'Send a private message...' : 'Share with the party...'}
            disabled={sending || (visibility === 'private' && selectedRecipients.length === 0)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[60px] resize-none"
          />
          <Button
            onClick={sendNote}
            disabled={sending || !content.trim() || (visibility === 'private' && selectedRecipients.length === 0)}
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