import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

const SEREN_GREETING = "Blessed day! My name is Seren, one of the imperial scribes at the archive.";

export default function AIAssistantPanel({ campaign, documents = [], npcs = [], quests = [], characters = [], isCollapsible = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const isFirstMessage = messages.length === 0 && !hasGreeted;
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.slice(-10).map(m =>
      m.role === 'user' ? `User: ${m.content}` : `Seren: ${m.content}`
    ).join('\n');

    // Build full document context — include ALL content, not truncated
    const docsContext = documents.map(d =>
      `--- DOCUMENT: "${d.title}"${d.category ? ` [${d.category}]` : ''}${d.access_level ? ` (${d.access_level})` : ''} ---\n${d.content || '(no text content)'}${d.file_url ? `\n[Attached file: ${d.file_url}]` : ''}`
    ).join('\n\n');

    const npcsContext = npcs.slice(0, 15).map(n => `${n.name}: ${n.description || ''}${n.faction ? ` | Faction: ${n.faction}` : ''}`).join('\n');
    const questsContext = quests.filter(q => q.status === 'active').map(q => `${q.title}: ${q.description || ''}`).join('\n');

    const greetingInstruction = isFirstMessage
      ? `IMPORTANT: Begin your response with exactly this greeting: "${SEREN_GREETING}" — then on a new line, provide your answer. Only do this greeting once ever.`
      : '';

    const prompt = `You are Seren, an imperial scribe at the archive in a DnD 5e campaign called "${campaign?.name || 'Unknown'}".
You speak with a warm, scholarly, slightly formal tone — like a knowledgeable librarian who delights in sharing information.
Campaign tone: ${campaign?.tone || 'heroic_fantasy'}
${campaign?.description ? `Campaign description: ${campaign.description}` : ''}

${greetingInstruction}

YOUR ROLE:
- Answer questions about the campaign lore, rules, documents, NPCs, and quests
- You have access to ALL archive documents — read them carefully and cite them by name when answering
- For DnD 5e rules questions, provide accurate PHB information
- Always reference the specific document title when drawing from it
- If a question is not covered by available documents, say so honestly

ARCHIVE DOCUMENTS (read these carefully):
${docsContext || 'The archive is empty.'}

ACTIVE QUESTS:
${questsContext || 'None recorded.'}

KEY FIGURES (NPCs):
${npcsContext || 'None on record.'}

ADVENTURING PARTY:
${characters.map(c => `${c.name} (Lvl ${c.level} ${c.race} ${c.class})`).join(', ') || 'None listed.'}

---
CONVERSATION:
${history}

Respond as Seren the Scribe. Be helpful, precise, and cite sources from the archive when relevant.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      if (isFirstMessage) setHasGreeted(true);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Forgive me, it seems the archive is temporarily inaccessible. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (isCollapsible && collapsed) {
    return (
      <Card className="bg-slate-900/50 border-violet-500/30">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Seren, the Scribe</span>
            {messages.length > 0 && <span className="text-xs text-slate-500">({messages.length} messages)</span>}
          </div>
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </button>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-amber-500/20 flex flex-col" style={{ height: isCollapsible ? '380px' : '100%' }}>
      <CardHeader className="pb-2 flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-amber-400" />
            Seren, the Scribe
          </CardTitle>
          <div className="flex gap-1">
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => { setMessages([]); setHasGreeted(false); }} className="text-slate-500 h-7 px-2 text-xs">
                Clear
              </Button>
            )}
            {isCollapsible && (
              <Button size="sm" variant="ghost" onClick={() => setCollapsed(true)} className="text-slate-400 h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <ScrollText className="h-8 w-8 text-amber-500/40 mb-2" />
            <p className="text-slate-500 text-xs">Consult the imperial scribe about lore, rules, or campaign documents.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-amber-700 text-white text-xs">S</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-amber-50 border border-amber-500/10'
                }`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-amber-700 text-white text-xs">S</AvatarFallback>
                </Avatar>
                <div className="bg-slate-800 border border-amber-500/10 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, j) => (
                      <div key={j} className="w-1.5 h-1.5 bg-amber-500/50 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-slate-800 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Seren about lore, rules, documents..."
            disabled={loading}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs h-8"
          />
          <Button size="sm" onClick={send} disabled={loading || !input.trim()} className="bg-amber-600 hover:bg-amber-700 h-8 w-8 p-0">
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}