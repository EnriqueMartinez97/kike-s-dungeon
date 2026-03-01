import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function AIDMChat({ campaignId, sessionId, isDM, userId, userName, campaign }) {
   const [messages, setMessages] = useState([]);
   const [input, setInput] = useState('');
   const [loading, setLoading] = useState(false);
   const [summoned, setSummoned] = useState(false);
   const [showInterview, setShowInterview] = useState(!campaign?.long_campaign_mode);
   const [interviewAnswers, setInterviewAnswers] = useState({});
   const bottomRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const unsub = base44.entities.SessionLog.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId || event.data?.entry_type !== 'AI_DM_MESSAGE') return;
      if (event.type === 'create') {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [campaignId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const logs = await base44.entities.SessionLog.filter({
        campaign_id: campaignId,
        session_id: sessionId,
        entry_type: 'AI_DM_MESSAGE'
      });
      logs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(logs);
    } catch (e) {
      console.error('Failed to load AI DM messages:', e);
    }
  };

  const handleInterviewSubmit = async () => {
    if (Object.keys(interviewAnswers).some(key => !interviewAnswers[key].trim())) {
      
      return;
    }

    // Log interview answers
    await base44.entities.SessionLog.create({
      campaign_id: campaignId,
      session_id: sessionId,
      entry_type: 'SEREN_MESSAGE',
      user_id: userId,
      user_name: userName || 'DM',
      content: `Interview: ${Object.entries(interviewAnswers).map(([k, v]) => `${k}: ${v}`).join(' | ')}`,
      metadata: {
        is_user_message: true,
        interview: true,
        answers: interviewAnswers
      },
      visibility: 'dm_only'
    });

    setShowInterview(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const userMessage = input.trim();

      // Log user message
      await base44.entities.SessionLog.create({
        campaign_id: campaignId,
        session_id: sessionId,
        entry_type: 'AI_DM_MESSAGE',
        user_id: userId,
        user_name: userName || 'Player',
        content: userMessage,
        metadata: {
          is_user_message: true,
          summoned: true
        },
        visibility: 'public'
      });

      // Generate AI DM response
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Dungeon Master for a D&D 5e campaign. A player has called upon you: "${userMessage}". 
  Respond in character as the DM. Keep your response brief and engaging, suitable for a tabletop RPG session.`,
        add_context_from_internet: false
      });

      // Log AI DM response
      await base44.entities.SessionLog.create({
        campaign_id: campaignId,
        session_id: sessionId,
        entry_type: 'AI_DM_MESSAGE',
        user_id: 'ai-dm',
        user_name: 'AI Dungeon Master',
        content: response,
        metadata: {
          is_user_message: false,
          summoned: true,
          ai_generated: true
        },
        visibility: 'public'
      });

      setInput('');
    } catch (e) {
      console.error('Failed to send message:', e);
      console.error('AI message failed');
    } finally {
      setLoading(false);
    }
  };

  if (showInterview && campaign?.long_campaign_mode) {
    return (
      <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-full">
        <CardHeader className="border-b border-slate-800 flex-shrink-0">
          <CardTitle className="text-white text-lg">
            Seren's Onboarding Interview
          </CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <p className="text-slate-300">Seren, the Scribe, needs to understand your campaign:</p>
          <div className="space-y-3">
            <div>
              <label className="text-white text-sm block mb-1">What is the current location/setting?</label>
              <input
                type="text"
                value={interviewAnswers.location || ''}
                onChange={(e) => setInterviewAnswers(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-1">Who are the key NPCs?</label>
              <input
                type="text"
                value={interviewAnswers.npcs || ''}
                onChange={(e) => setInterviewAnswers(prev => ({ ...prev, npcs: e.target.value }))}
                placeholder="Enter NPC names..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-1">What are the active quests?</label>
              <input
                type="text"
                value={interviewAnswers.quests || ''}
                onChange={(e) => setInterviewAnswers(prev => ({ ...prev, quests: e.target.value }))}
                placeholder="Enter active quests..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="text-white text-sm block mb-1">What is the party's current status?</label>
              <input
                type="text"
                value={interviewAnswers.status || ''}
                onChange={(e) => setInterviewAnswers(prev => ({ ...prev, status: e.target.value }))}
                placeholder="Enter party status..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 p-4 flex-shrink-0">
          <Button
            onClick={handleInterviewSubmit}
            disabled={Object.keys(interviewAnswers).length < 4 || Object.values(interviewAnswers).some(v => !v.trim())}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Begin Session with Seren
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-full">
      <CardHeader className="border-b border-slate-800 flex-shrink-0">
        <CardTitle className="text-white text-lg">
          AI Dungeon Master
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          Interact with the AI DM managing your campaign
        </p>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {messages.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">
              Interact with the AI DM to manage your campaign.
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-md border ${
                msg.metadata?.is_user_message
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-white">
                  {msg.user_name}
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed break-words">
                {msg.content}
              </p>
              <p className="text-xs opacity-60 mt-1">
                {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-slate-800 p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                sendMessage();
              }
            }}
            placeholder="Communicate with the AI DM..."
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] resize-none text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-amber-600 hover:bg-amber-700 flex-shrink-0 h-fit"
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}