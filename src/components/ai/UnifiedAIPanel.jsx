import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader, ScrollText, ChevronDown, ChevronUp, Trash2, Edit, Check, X, Crown, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';

const ONBOARDING_QUESTIONS = [
  { key: 'location', label: 'Where does the session begin?', placeholder: 'e.g. The tavern in Ravenhold...' },
  { key: 'situation', label: 'What happened last session / current situation?', placeholder: 'e.g. The party just defeated the goblin scouts...' },
  { key: 'mood', label: 'What tone/mood for this session?', placeholder: 'e.g. Tense, mysterious, action-packed...' },
  { key: 'goals', label: "Party's immediate goals this session?", placeholder: 'e.g. Find the missing merchant...' },
];

const REDO_QUESTIONS = [
  { key: 'mood', label: 'What tone/mood for this session?', placeholder: 'e.g. Tense, mysterious, action-packed...' },
  { key: 'goals', label: "Party's immediate goals this session?", placeholder: 'e.g. Find the missing merchant...' },
];

function buildContext({ campaign, documents, npcs, quests, characters, combatState, recentRolls, sessionSummary }) {
  const docs = documents.map(d =>
    `--- DOCUMENT: "${d.title}"${d.category ? ` [${d.category}]` : ''} ---\n${d.content || '(no text)'}`
  ).join('\n\n');

  const npcList = npcs.slice(0, 20).map(n =>
    `${n.name}${n.race ? ` (${n.race})` : ''}${n.faction ? ` — ${n.faction}` : ''}: ${n.description || ''}${n.stat_block?.hp ? ` | HP ${n.stat_block.hp}, AC ${n.stat_block.ac || 10}` : ''}`
  ).join('\n');

  const questList = quests.filter(q => q.status === 'active').map(q =>
    `${q.title}: ${q.description || ''} | Objectives: ${(q.objectives || []).map(o => `[${o.completed ? 'X' : ' '}] ${o.description}`).join(', ')}`
  ).join('\n');

  const charList = characters.map(c =>
    `${c.name} — Lvl ${c.level || 1} ${c.race || ''} ${c.class || ''} | HP ${c.hp_current || 0}/${c.hp_max || 0}, AC ${c.ac || 10}`
  ).join('\n');

  const combatBlock = combatState?.active
    ? `COMBAT ACTIVE — Round ${combatState.round}\nInitiative order:\n${(combatState.combatants || []).map((c, i) =>
        `${i + 1}. ${c.name} [${c.type}] HP ${c.hp}/${c.max_hp} AC ${c.ac}${c.conditions?.length ? ` (${c.conditions.join(', ')})` : ''}${c.hp === 0 ? ' — DOWNED' : ''}`
      ).join('\n')}`
    : 'No active combat.';

  const rollsBlock = recentRolls?.length
    ? `Recent dice rolls:\n${recentRolls.slice(-8).map(r => `${r.user_name || 'Player'}: ${r.formula} = ${r.result}`).join('\n')}`
    : '';

  const historyBlock = sessionSummary ? `Previous session summary:\n${sessionSummary}` : '';

  return { docs, npcList, questList, charList, combatBlock, rollsBlock, historyBlock };
}

function buildPrompt({ isAIDM, campaign, ctx, onboardingContext }) {
  const base = `Campaign: "${campaign?.name}" | Tone: ${campaign?.tone || 'heroic_fantasy'}${campaign?.description ? `\n${campaign.description}` : ''}`;

  if (isAIDM) {
    const hasDocuments = ctx.docs && ctx.docs.trim().length > 0;
    const worldGrounding = hasDocuments
      ? `WORLD GROUNDING — CRITICAL RULES:
- The campaign documents below are your BIBLE. Every location, NPC, faction, piece of lore, and history described in them is CANON.
- Always draw from these documents first. Place the story in the world they describe.
- You may invent new details (new NPCs, sub-locations, events) ONLY if they are consistent with the established world and do not contradict any document.
- When you invent something, make it feel like it naturally belongs in this world — same naming conventions, factions, tone, and themes as the documents.
- Never introduce elements that clash with or contradict what is written in the documents.`
      : `WORLD GROUNDING:
- No documents have been provided. You are free to build a world from scratch.
- Base everything on the campaign's tone (${campaign?.tone || 'heroic_fantasy'}) and description.
- Be internally consistent — once you establish a location, NPC, or fact, stick to it throughout.`;

    return `You are the Dungeon Master for a D&D 5e campaign.

${base}
Mode: AI Dungeon Master (no human DM present)
Long Campaign: ${campaign?.long_campaign_mode ? 'YES — deep narrative continuity' : 'No'}

${worldGrounding}

YOUR ROLE:
- Master storyteller. Narrate vividly, voice NPCs distinctly, describe with sensory detail.
- Narrate key moments automatically; respond appropriately to player actions.
- Know and apply D&D 5e rules correctly.
- Use second person ("You see...", "Before you...") for narration.
- Be concise. Keep responses compact and punchy — 2 to 4 short paragraphs max. Never over-explain.
- Save longer narration only for major dramatic moments (combat starts, big reveals, scene openers).
- For simple player actions or questions, respond in 1-3 sentences.

${onboardingContext ? `SESSION SETUP:\n${onboardingContext}\n` : ''}
${ctx.historyBlock ? `${ctx.historyBlock}\n` : ''}
${hasDocuments ? `WORLD DOCUMENTS (your source of truth — always reference these):\n${ctx.docs}` : 'WORLD DOCUMENTS: None provided — build freely from tone and description.'}

ACTIVE QUESTS:
${ctx.questList || 'None.'}

KEY NPCS (these are established canon characters — use them):
${ctx.npcList || 'None established yet.'}

PARTY:
${ctx.charList || 'Unknown.'}

COMBAT STATE:
${ctx.combatBlock}
${ctx.rollsBlock ? `\n${ctx.rollsBlock}` : ''}`;
  } else {
    return `You are Seren, an imperial scribe and lore-keeper. Warm, scholarly, slightly formal — a knowledgeable librarian.
When greeting or introducing yourself, always refer to yourself as "Seren" by name.

${base}

YOUR ROLE:
- Always identify yourself as Seren when asked who or what you are.
- Answer questions about lore, rules, NPCs, quests, and documents.
- Cite documents by name. Be precise. Say so if something isn't documented.
- For D&D 5e rules, give accurate PHB answers.

${ctx.historyBlock ? `${ctx.historyBlock}\n` : ''}
DOCUMENTS:
${ctx.docs || 'Archive is empty.'}

ACTIVE QUESTS:
${ctx.questList || 'None.'}

NPCS:
${ctx.npcList || 'None.'}

PARTY:
${ctx.charList || 'None.'}

COMBAT:
${ctx.combatBlock}
${ctx.rollsBlock ? `\n${ctx.rollsBlock}` : ''}`;
  }
}

export default function UnifiedAIPanel({
  campaign, campaignId, sessionId,
  isDM, userId, userName,
  documents = [], npcs = [], quests = [], characters = [],
  combatState = null,
  recentRolls = [],
  sessionSummary = '',
  isCollapsible = false,
  mode = 'scribe',
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState({});
  const [isRedoOnboarding, setIsRedoOnboarding] = useState(false);
  const [aiDecideMode, setAiDecideMode] = useState(false);
  const [aiDecideInput, setAiDecideInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef(null);

  // Persist onboarding completion across tab switches using sessionStorage
  const onboardingKey = `ai_dm_onboarded_${campaignId}_${sessionId}`;
  const onboardingDone = !!sessionStorage.getItem(onboardingKey);
  const setOnboardingDone = (val) => {
    if (val) sessionStorage.setItem(onboardingKey, '1');
    else sessionStorage.removeItem(onboardingKey);
  };

  const isAIDM = mode === 'dm';
  const aiLabel = isAIDM ? 'Dungeon Master' : 'Seren, the Scribe';
  const aiInitial = isAIDM ? 'DM' : 'S';
  const aiAvatarBg = isAIDM ? 'bg-violet-700' : 'bg-amber-700';
  const borderCls = isAIDM ? 'border-violet-500/20' : 'border-amber-500/20';

  const entryType = isAIDM ? 'AI_DM_MESSAGE' : 'SEREN_SCRIBE_MESSAGE';

  useEffect(() => {
    if (sessionId) {
      loadPersistedMessages();
    }
  }, [campaignId, sessionId, isAIDM]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  // Check if any previous AI DM messages exist for this campaign (not just this session)
  const [checkedPriorHistory, setCheckedPriorHistory] = useState(false);
  useEffect(() => {
    if (!isAIDM || !campaignId || checkedPriorHistory) return;
    setCheckedPriorHistory(true);
    base44.entities.SessionLog.filter({ campaign_id: campaignId, entry_type: 'AI_DM_MESSAGE' })
      .then(logs => {
        if (logs.length > 0) {
          // Prior sessions exist — skip onboarding forever for this campaign
          setOnboardingDone(true);
        } else if (campaign?.long_campaign_mode && messages.length === 0 && !onboardingDone) {
          setOnboardingMode(true);
        }
      })
      .catch(() => {
        if (campaign?.long_campaign_mode && messages.length === 0 && !onboardingDone) {
          setOnboardingMode(true);
        }
      });
  }, [isAIDM, campaign, campaignId, checkedPriorHistory]);

  async function loadPersistedMessages() {
    try {
      const logs = await base44.entities.SessionLog.filter({ campaign_id: campaignId, session_id: sessionId, entry_type: entryType });
      logs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(logs.map(l => ({
        id: l.id, role: l.metadata?.is_user_message ? 'user' : 'assistant',
        content: l.content, timestamp: l.created_date, user_name: l.user_name,
      })));
      if (logs.length > 0 && isAIDM) setOnboardingDone(true);
    } catch (e) { console.error('Failed to load AI messages', e); }
  }

  function getSystemPrompt(onboardingContext = '') {
    const ctx = buildContext({ campaign, documents, npcs, quests, characters, combatState, recentRolls, sessionSummary });
    return buildPrompt({ isAIDM, campaign, ctx, onboardingContext });
  }

  async function persistMessage(content, isUser) {
    if (!sessionId) return;
    await base44.entities.SessionLog.create({
      campaign_id: campaignId, session_id: sessionId,
      entry_type: entryType,
      user_id: isUser ? userId : (isAIDM ? 'ai-dm' : 'seren'),
      user_name: isUser ? (userName || 'Player') : aiLabel,
      content,
      metadata: { is_user_message: isUser, ai_generated: !isUser },
      visibility: 'public',
    });
  }

  async function launchOpeningNarration(prompt) {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      const msg = { id: Date.now(), role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setMessages([msg]);
      await persistMessage(response, false);
    } catch (e) { console.error('Opening narration failed', e); }
    finally { setLoading(false); }
  }

  async function completeOnboarding() {
    if (!ONBOARDING_QUESTIONS.every(q => onboardingAnswers[q.key]?.trim())) return;
    const context = ONBOARDING_QUESTIONS.map(q => `${q.label}: ${onboardingAnswers[q.key]}`).join('\n');
    setOnboardingMode(false);
    setOnboardingDone(true);
    const prompt = `${getSystemPrompt(context)}\n\nOpen the session with an atmospheric, immersive scene based on the setup context. Use second-person narration. End with an invitation for player action.`;
    await launchOpeningNarration(prompt);
  }

  async function completeAiDecide() {
    if (!aiDecideInput.trim()) return;
    setOnboardingMode(false);
    setAiDecideMode(false);
    setOnboardingDone(true);
    const prompt = `${getSystemPrompt()}\n\nThe players have expressed what they want for this session: "${aiDecideInput}"\n\nAs the AI DM, choose the perfect session setup based on their wishes and the campaign context. Then open the session with an atmospheric, immersive scene. Use second-person narration. End with an invitation for player action.`;
    await launchOpeningNarration(prompt);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const userMsg = { id: Date.now(), role: 'user', content: text, user_name: userName || (isDM ? 'DM' : 'Player'), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    await persistMessage(text, true);

    try {
      const history = [...messages, userMsg].slice(-14).map(m =>
        m.role === 'user' ? `${m.user_name || 'Player'}: ${m.content}` : `${aiLabel}: ${m.content}`
      ).join('\n\n');
      const prompt = `${getSystemPrompt()}\n\n--- CONVERSATION ---\n${history}\n\nRespond as ${aiLabel}:`;
      const response = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: false });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
      await persistMessage(response, false);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: 'The mists obscure my vision. Please try again.', timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  }

  if (isCollapsible && collapsed) {
    return (
      <Card className={`bg-slate-900/50 ${borderCls}`}>
        <button onClick={() => setCollapsed(false)} className="w-full p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-2">
            {isAIDM ? <Crown className="h-4 w-4 text-violet-400" /> : <ScrollText className="h-4 w-4 text-amber-400" />}
            <span className="text-sm font-medium text-white">{aiLabel}</span>
            {messages.length > 0 && <span className="text-xs text-slate-500">({messages.length})</span>}
          </div>
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </button>
      </Card>
    );
  }

  if (onboardingMode && isAIDM) {
    return (
      <Card className={`bg-slate-900/50 ${borderCls} flex flex-col`} style={{ height: aiDecideMode ? '400px' : '520px' }}>
        <CardHeader className="border-b border-slate-800 flex-shrink-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-violet-400" />
            {aiDecideMode ? 'What do you want?' : 'Session Setup'}
          </CardTitle>
          <p className="text-xs text-slate-400">
            {aiDecideMode ? 'Tell the AI DM what you\'re in the mood for and it will craft the session.' : 'Help the AI DM prepare for your session'}
          </p>
        </CardHeader>

        {aiDecideMode ? (
          <>
            <div className="flex-1 overflow-auto p-4">
              <Textarea
                value={aiDecideInput}
                onChange={e => setAiDecideInput(e.target.value)}
                placeholder="e.g. Something intense with the thieves guild, or a relaxed social session in the city..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[120px] resize-none w-full"
                autoFocus
              />
            </div>
            <div className="border-t border-slate-800 p-4 flex-shrink-0 flex gap-2">
              <Button variant="outline" onClick={() => setAiDecideMode(false)} className="border-slate-600 text-slate-300 flex-1">
                Back
              </Button>
              <Button
                onClick={completeAiDecide}
                disabled={loading || !aiDecideInput.trim()}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Let AI Decide
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {ONBOARDING_QUESTIONS.map(q => (
                <div key={q.key}>
                  <label className="text-sm text-slate-300 block mb-1 font-medium">{q.label}</label>
                  <Textarea
                    value={onboardingAnswers[q.key] || ''}
                    onChange={e => setOnboardingAnswers(p => ({ ...p, [q.key]: e.target.value }))}
                    placeholder={q.placeholder}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[56px] resize-none"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-slate-800 p-4 flex-shrink-0 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAiDecideMode(true)}
                className="flex-1 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
              >
                <Sparkles className="h-4 w-4 mr-2" /> Let AI Decide
              </Button>
              <Button
                onClick={completeOnboarding}
                disabled={loading || !ONBOARDING_QUESTIONS.every(q => onboardingAnswers[q.key]?.trim())}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                Begin Session
              </Button>
            </div>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-900/50 ${borderCls} flex flex-col`} style={{ height: isCollapsible ? '420px' : '100%', minHeight: '360px' }}>
      <CardHeader className="pb-2 flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            {isAIDM ? <Crown className="h-4 w-4 text-violet-400" /> : <ScrollText className="h-4 w-4 text-amber-400" />}
            {aiLabel}
            {isAIDM && <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs">AI DM</Badge>}
            {combatState?.active && <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">⚔ Combat R{combatState.round}</Badge>}
          </CardTitle>
          <div className="flex gap-1">
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={async () => {
                setMessages([]);
                if (isAIDM) { setOnboardingDone(false); setOnboardingMode(true); }
              }} className="text-slate-500 h-7 px-2 text-xs">Clear</Button>
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
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            {isAIDM ? <Crown className="h-10 w-10 text-violet-500/30 mb-3" /> : <ScrollText className="h-10 w-10 text-amber-500/30 mb-3" />}
            <p className="text-slate-500 text-sm">
              {isAIDM ? 'The Dungeon Master awaits. Describe your action or ask anything.' : 'Greetings. I am Seren, keeper of lore and scribe of the realm. Ask me about lore, rules, or documents.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                    <AvatarFallback className={`${aiAvatarBg} text-white text-xs`}>{aiInitial}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`relative max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === 'user' ? 'bg-violet-600 text-white'
                  : isAIDM ? 'bg-slate-800 text-slate-100 border border-violet-500/10'
                  : 'bg-slate-800 text-amber-50 border border-amber-500/10'
                }`}>
                  {msg.role === 'user' && msg.user_name && <p className="text-xs text-violet-200 font-medium mb-1">{msg.user_name}</p>}
                  {editingId === msg.id ? (
                    <div className="space-y-2">
                      <Textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white text-xs min-h-[60px] resize-none" />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => { setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editContent } : m)); setEditingId(null); }}
                          className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700"><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 px-2 text-slate-400"><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-xs">{msg.content}</ReactMarkdown>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  {isDM && editingId !== msg.id && (
                    <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                      <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                        className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600">
                        <Edit className="h-2.5 w-2.5 text-slate-300" />
                      </button>
                      <button onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                        className="w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-600">
                        <Trash2 className="h-2.5 w-2.5 text-slate-300" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <Avatar className="h-6 w-6"><AvatarFallback className={`${aiAvatarBg} text-white text-xs`}>{aiInitial}</AvatarFallback></Avatar>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, j) => (
                      <div key={j} className={`w-1.5 h-1.5 rounded-full animate-bounce ${isAIDM ? 'bg-violet-500/50' : 'bg-amber-500/50'}`} style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-slate-800 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isAIDM ? 'Describe your action... (Enter to send)' : 'Ask about lore, rules, documents... (Enter to send)'}
            disabled={loading}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs min-h-[52px] resize-none"
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}
            className={`flex-shrink-0 self-end ${isAIDM ? 'bg-violet-600 hover:bg-violet-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1">Shift+Enter for new line</p>
      </div>
    </Card>
  );
}