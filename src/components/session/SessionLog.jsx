import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Filter, RotateCcw, Plus, X, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const LOG_COLORS = {
  ROLL: 'bg-blue-500/10 border-blue-500/30 text-white',
  DAMAGE: 'bg-red-500/10 border-red-500/30 text-white',
  HEAL: 'bg-green-500/10 border-green-500/30 text-white',
  STATUS_CHANGE: 'bg-purple-500/10 border-purple-500/30 text-white',
  DM_MESSAGE: 'bg-amber-500/10 border-amber-500/30 text-white',
  PRIVATE_MESSAGE: 'bg-orange-500/10 border-orange-500/30 text-white',
  NOTE: 'bg-slate-500/10 border-slate-500/30 text-white',
  INITIATIVE: 'bg-indigo-500/10 border-indigo-500/30 text-white',
  COMBAT_START: 'bg-red-600/20 border-red-600/40 text-white',
  COMBAT_END: 'bg-emerald-600/20 border-emerald-600/40 text-white',
};

export default function SessionLog({ campaignId, sessionId, isDM, userId, userName }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [newLogOpen, setNewLogOpen] = useState(false);
  const [newLogType, setNewLogType] = useState('DM_MESSAGE');
  const [newLogContent, setNewLogContent] = useState('');
  const [editingLogId, setEditingLogId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [playerMsgInput, setPlayerMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadLogs();
    const unsub = base44.entities.SessionLog.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId) return;
      const log = event.data;
      const isVisible = isDM || log.visibility !== 'dm_only' || (log.visibility === 'private' && log.user_id === userId);
      if (event.type === 'create' && isVisible) {
        setLogs(prev => [...prev, log]);
      }
    });
    return unsub;
  }, [campaignId, isDM, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await base44.entities.SessionLog.filter({
        campaign_id: campaignId,
        session_id: sessionId
      });
      const visible = allLogs.filter(log => {
        if (isDM) return true;
        if (log.visibility === 'dm_only') return false;
        if (log.visibility === 'private' && log.user_id !== userId) return false;
        return true;
      });
      visible.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setLogs(visible);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'combat') return ['DAMAGE', 'HEAL', 'STATUS_CHANGE', 'INITIATIVE', 'COMBAT_START', 'COMBAT_END'].includes(log.entry_type);
    if (filter === 'messages') return ['DM_MESSAGE', 'PRIVATE_MESSAGE'].includes(log.entry_type);
    if (filter === 'dm_only') return log.visibility === 'dm_only';
    return log.entry_type === filter;
  });

  const sendPlayerMessage = async () => {
    if (!playerMsgInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await base44.entities.SessionLog.create({
        campaign_id: campaignId,
        session_id: sessionId,
        entry_type: 'DM_MESSAGE',
        user_id: userId,
        user_name: userName || 'Player',
        content: playerMsgInput.trim(),
        metadata: {},
        visibility: 'public',
      });
      setPlayerMsgInput('');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAddLog = async () => {
    if (!newLogContent.trim() || !isDM) return;
    await base44.entities.SessionLog.create({
      campaign_id: campaignId,
      session_id: sessionId,
      entry_type: newLogType,
      user_id: userId,
      content: newLogContent.trim(),
      visibility: 'public'
    });
    setNewLogContent('');
    setNewLogOpen(false);
  };

  const handleEditLog = async (logId) => {
    if (!editContent.trim() || !isDM) return;
    const log = logs.find(l => l.id === logId);
    if (!log) return;
    await base44.entities.SessionLog.update(logId, {
      content: editContent.trim(),
      metadata: { ...(log.metadata || {}), dm_edited: true, original_content: log.content }
    });
    setEditingLogId(null);
    setEditContent('');
    loadLogs();
  };

  const getLogContent = (log) => {
    const m = log.metadata || {};
    switch (log.entry_type) {
      case 'ROLL': return `${log.user_name} rolled ${m.roll_formula}: **${m.roll_result}**`;
      case 'DAMAGE': return `${log.user_name} dealt ${m.damage_amount} ${m.damage_type} damage to ${m.target_name}`;
      case 'HEAL': return `${log.user_name} healed ${m.target_name} for ${m.damage_amount} HP`;
      case 'STATUS_CHANGE': return `${log.user_name} changed ${m.field_changed} from ${m.before_value} to ${m.after_value}`;
      case 'INITIATIVE': return `${log.user_name} rolled initiative: ${m.initiative_roll}`;
      case 'COMBAT_START': return 'Combat started!';
      case 'COMBAT_END': return 'Combat ended!';
      case 'DM_MESSAGE': return `${log.user_name || 'DM'}: ${log.content}`;
      case 'PRIVATE_MESSAGE': return `Private message to ${m.target_name}: ${log.content}`;
      case 'NOTE': return `Note: ${log.content}`;
      default: return log.content;
    }
  };

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-full">
        <CardHeader className="border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              Session Log
            </CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ROLL">Rolls</SelectItem>
                  <SelectItem value="combat">Combat</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                  {isDM && <SelectItem value="dm_only">DM Only</SelectItem>}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={loadLogs} className="h-8 w-8 text-slate-400 hover:text-white">
                <RotateCcw className="h-4 w-4" />
              </Button>
              {isDM && (
                <Button variant="ghost" size="icon" onClick={() => setNewLogOpen(true)} className="h-8 w-8 text-slate-400 hover:text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {loading && <p className="text-slate-500 text-sm">Loading logs...</p>}
            {!loading && filteredLogs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-6">No log entries yet</p>
            )}
            {filteredLogs.map((log) => (
              <div key={log.id} className={`border rounded-md p-3 text-sm text-white ${LOG_COLORS[log.entry_type] || 'bg-slate-800/50 border-slate-700'}`}>
                {editingLogId === log.id ? (
                  <div className="space-y-2">
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[60px] text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button onClick={() => setEditingLogId(null)} variant="outline" size="sm" className="border-slate-600 text-xs text-white">Cancel</Button>
                      <Button onClick={() => handleEditLog(log.id)} size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs">Save</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="leading-relaxed break-words text-white">{getLogContent(log)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.metadata?.dm_edited && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-200 border-amber-500/20 flex-shrink-0">DM Edited</Badge>
                        )}
                        <Badge variant="outline" className="flex-shrink-0 text-xs">{log.entry_type}</Badge>
                        {isDM && (
                          <Button onClick={() => { setEditingLogId(log.id); setEditContent(log.content); }}
                            variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-white flex-shrink-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-slate-800 p-3 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={playerMsgInput}
              onChange={e => setPlayerMsgInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendPlayerMessage()}
              placeholder={isDM ? 'Post a message to the session feed...' : 'Send a message to the session...'}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
            />
            <Button onClick={sendPlayerMessage} disabled={!playerMsgInput.trim() || sendingMsg}
              size="sm" className="bg-violet-600 hover:bg-violet-700 shrink-0">
              {sendingMsg ? '...' : 'Send'}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={newLogOpen} onOpenChange={setNewLogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Type</label>
              <Select value={newLogType} onValueChange={setNewLogType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="DM_MESSAGE">DM Message</SelectItem>
                  <SelectItem value="COMBAT_START">Combat Start</SelectItem>
                  <SelectItem value="COMBAT_END">Combat End</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="HEAL">Heal</SelectItem>
                  <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                  <SelectItem value="NOTE">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Content</label>
              <Textarea value={newLogContent} onChange={(e) => setNewLogContent(e.target.value)}
                placeholder="Enter log content..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setNewLogOpen(false)} variant="outline" className="border-slate-600 text-white">Cancel</Button>
            <Button onClick={handleAddLog} disabled={!newLogContent.trim()} className="bg-violet-600 hover:bg-violet-700">Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}