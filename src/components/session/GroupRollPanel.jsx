import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dice6, Plus, CheckCircle2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const QUICK_ROLLS = ['Perception', 'Stealth', 'Investigation', 'Insight', 'Initiative', 'Persuasion', 'Deception', 'Athletics'];

export default function GroupRollPanel({ campaignId, sessionId, isDM, userId, userName, characters = [] }) {
  const [requests, setRequests] = useState([]);
  const [newOpen, setNewOpen] = useState(false);
  const [rollType, setRollType] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState({});

  // Player roll state
  const [activeRequest, setActiveRequest] = useState(null);
  const [myRollResult, setMyRollResult] = useState(null);
  const [rollingFor, setRollingFor] = useState(null);

  useEffect(() => {
    if (!campaignId) return;
    loadRequests();
    const unsub = base44.entities.GroupRollRequest.subscribe((event) => {
      if (event.data?.campaign_id !== campaignId) return;
      if (event.type === 'create') {
        setRequests(prev => [event.data, ...prev]);
        if (!isDM) setActiveRequest(event.data); // auto-open for players
      }
      if (event.type === 'update') setRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      if (event.type === 'delete') setRequests(prev => prev.filter(r => r.id !== event.id));
    });
    return unsub;
  }, [campaignId, sessionId, isDM]);

  const loadRequests = async () => {
    const all = await base44.entities.GroupRollRequest.filter({ campaign_id: campaignId, session_id: sessionId });
    all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setRequests(all);
    // Show most recent open request to players
    if (!isDM) {
      const openReq = all.find(r => r.status === 'open');
      if (openReq) setActiveRequest(openReq);
    }
  };

  const createRequest = async () => {
    if (!rollType.trim()) return;
    await base44.entities.GroupRollRequest.create({
      campaign_id: campaignId,
      session_id: sessionId,
      dm_id: userId,
      roll_type: rollType.trim(),
      description: description.trim(),
      status: 'open',
      responses: [],
    });
    setRollType(''); setDescription('');
    setNewOpen(false);
  };

  const closeRequest = async (req) => {
    await base44.entities.GroupRollRequest.update(req.id, { status: 'closed' });
  };

  const deleteRequest = async (id) => {
    await base44.entities.GroupRollRequest.delete(id);
  };

  const rollAndSubmit = async (request) => {
    setRollingFor(request.id);
    const d20 = Math.floor(Math.random() * 20) + 1;

    // Find modifier from character's ability scores / skills
    const myChar = characters.find(c => c.owner_id === userId);
    const profBonus = Math.floor(((myChar?.level || 1) - 1) / 4) + 2;
    const abilityMod = (score) => Math.floor(((score || 10) - 10) / 2);
    const scores = myChar?.ability_scores || {};

    const SKILL_MAP = {
      perception: { ability: 'wisdom' }, stealth: { ability: 'dexterity' },
      investigation: { ability: 'intelligence' }, insight: { ability: 'wisdom' },
      initiative: { ability: 'dexterity' }, persuasion: { ability: 'charisma' },
      deception: { ability: 'charisma' }, athletics: { ability: 'strength' },
      acrobatics: { ability: 'dexterity' }, intimidation: { ability: 'charisma' },
    };
    const key = request.roll_type.toLowerCase();
    const skillInfo = SKILL_MAP[key];
    let mod = 0;
    if (skillInfo) {
      const base = abilityMod(scores[skillInfo.ability]);
      const hasProf = (myChar?.skill_proficiencies || []).includes(key);
      const hasExpert = (myChar?.skill_expertise || []).includes(key);
      mod = base + (hasExpert ? profBonus * 2 : hasProf ? profBonus : 0);
    }
    const total = d20 + mod;
    const isCrit = d20 === 20;

    const result = { d20, mod, total, isCrit };
    setMyRollResult(result);

    // Submit response
    const existing = request.responses || [];
    const alreadyRolled = existing.find(r => r.user_id === userId);
    if (!alreadyRolled) {
      const newResponses = [...existing, {
        user_id: userId,
        user_name: userName || 'Player',
        character_name: myChar?.name || '',
        roll: d20,
        total,
        formula: `d20(${d20})${mod >= 0 ? '+' : ''}${mod}`,
      }];
      await base44.entities.GroupRollRequest.update(request.id, { responses: newResponses });
    }
    setRollingFor(null);
  };

  const myResponse = (req) => (req.responses || []).find(r => r.user_id === userId);

  // Players: show active roll prompt as a banner
  const openRequests = requests.filter(r => r.status === 'open');

  return (
    <>
      {/* Player: roll prompt banner */}
      {!isDM && openRequests.map(req => {
        const already = myResponse(req);
        return (
          <div key={req.id} className={`rounded-lg border p-3 ${already ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-violet-500/10 border-violet-500/30'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Dice6 className={`h-4 w-4 flex-shrink-0 ${already ? 'text-emerald-400' : 'text-violet-400'}`} />
                <div>
                  <p className="text-white text-sm font-semibold">Roll {req.roll_type}!</p>
                  {req.description && <p className="text-slate-400 text-xs">{req.description}</p>}
                </div>
              </div>
              {already ? (
                <div className="text-right">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> {already.formula} = {already.total}
                    {already.roll === 20 && ' ⭐'}
                  </Badge>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => rollAndSubmit(req)}
                  disabled={rollingFor === req.id}
                  className="bg-violet-600 hover:bg-violet-700 text-xs h-8"
                >
                  <Dice6 className="h-3 w-3 mr-1" />
                  {rollingFor === req.id ? 'Rolling...' : 'Roll Now'}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* DM: full panel */}
      {isDM && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Dice6 className="h-4 w-4 text-violet-400" />
                Group Rolls
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setNewOpen(true)} className="h-7 text-xs border-slate-600 text-slate-300">
                <Plus className="h-3 w-3 mr-1" /> Request Roll
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="max-h-72">
            <div className="p-3 space-y-2">
              {requests.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No roll requests yet</p>}
              {requests.map(req => (
                <div key={req.id} className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-2 text-left"
                    onClick={() => setExpanded(p => ({ ...p, [req.id]: !p[req.id] }))}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={req.status === 'open' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]' : 'bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px]'}>
                        {req.status === 'open' ? <Clock className="h-2.5 w-2.5 mr-0.5 inline" /> : <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 inline" />}
                        {req.status}
                      </Badge>
                      <span className="text-white text-xs font-medium">{req.roll_type}</span>
                      <span className="text-slate-500 text-xs">({(req.responses || []).length} rolled)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {req.status === 'open' && (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); closeRequest(req); }} className="h-5 text-[10px] text-slate-400 hover:text-white px-1.5">
                          Close
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteRequest(req.id); }} className="h-5 w-5 p-0 text-red-400 hover:text-red-300">
                        <X className="h-3 w-3" />
                      </Button>
                      {expanded[req.id] ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
                    </div>
                  </button>
                  {expanded[req.id] && (
                    <div className="border-t border-slate-700/50 p-2 space-y-1">
                      {req.description && <p className="text-slate-400 text-xs mb-2">{req.description}</p>}
                      {(req.responses || []).length === 0 ? (
                        <p className="text-slate-600 text-xs">No responses yet</p>
                      ) : (
                        [...(req.responses || [])].sort((a, b) => b.total - a.total).map((r, i) => (
                          <div key={r.user_id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{r.character_name || r.user_name}</span>
                            <span className={`font-bold ${r.roll === 20 ? 'text-amber-400' : r.roll === 1 ? 'text-red-400' : 'text-violet-300'}`}>
                              {r.formula} = {r.total}{r.roll === 20 ? ' ⭐' : r.roll === 1 ? ' 💀' : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* New Roll Request Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Request Group Roll</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Quick pick:</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ROLLS.map(r => (
                  <button key={r} onClick={() => setRollType(r)}
                    className={`px-2 py-1 rounded text-xs border transition-all ${rollType === r ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Or custom roll type</label>
              <Input value={rollType} onChange={e => setRollType(e.target.value)} placeholder="e.g. Arcana, Survival..." className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Context (optional)</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. You hear rustling in the shadows..." className="bg-slate-800 border-slate-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewOpen(false)} variant="outline" className="border-slate-600 text-slate-300">Cancel</Button>
            <Button onClick={createRequest} disabled={!rollType.trim()} className="bg-violet-600 hover:bg-violet-700">
              <Dice6 className="h-3 w-3 mr-1" /> Request Roll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}