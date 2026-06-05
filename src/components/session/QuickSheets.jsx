import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, Heart, Shield, Backpack, TrendingUp, Settings, Trash2, X, Dice6, Pencil, Check } from 'lucide-react';
import SpellSlotTracker from '@/components/character/SpellSlotTracker';
import ClassResourceTracker from '@/components/character/ClassResourceTracker';
import { logDamage, logHeal, logStatusChange } from './sessionLogHelper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function QuickSheets({ campaignId, isDM, userId, initialSelectedCharId = null }) {
   const [characters, setCharacters] = useState([]);
   const [npcs, setNpcs] = useState([]);
   const [members, setMembers] = useState([]);
   const [loading, setLoading] = useState(true);
   const [selectedCharId, setSelectedCharId] = useState(initialSelectedCharId);
   const [levelUpDialogOpen, setLevelUpDialogOpen] = useState(false);
   const [levelUpMode, setLevelUpMode] = useState('auto');
   const [newInventoryOpen, setNewInventoryOpen] = useState(false);
   const [newItemName, setNewItemName] = useState('');
   const [newItemQty, setNewItemQty] = useState(1);
   const [editingItemIdx, setEditingItemIdx] = useState(null);
   const [quickAddOpen, setQuickAddOpen] = useState(false);
   const [quickAddType, setQuickAddType] = useState('character');
   const [quickAddName, setQuickAddName] = useState('');
   const [quickAddLinkedPlayer, setQuickAddLinkedPlayer] = useState('');

  useEffect(() => {
    loadData();

    // Real-time subscriptions
    const unsubChar = base44.entities.Character.subscribe((event) => {
      if (!event.data?.campaign_ids?.includes(campaignId) && event.data?.campaign_id !== campaignId) return;
      if (event.type === 'update') {
        setCharacters(prev => prev.map(c => c.id === event.id ? { ...c, ...event.data } : c));
      } else if (event.type === 'create') {
        setCharacters(prev => prev.find(c => c.id === event.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'delete') {
        setCharacters(prev => prev.filter(c => c.id !== event.id));
      }
    });

    const unsubNPC = isDM ? base44.entities.NPC.subscribe((event) => {
      if (!event.data?.campaign_ids?.includes(campaignId) && event.data?.campaign_id !== campaignId) return;
      if (event.type === 'update') {
        setNpcs(prev => prev.map(n => n.id === event.id ? { ...n, ...event.data } : n));
      } else if (event.type === 'create') {
        setNpcs(prev => prev.find(n => n.id === event.id) ? prev : [...prev, event.data]);
      } else if (event.type === 'delete') {
        setNpcs(prev => prev.filter(n => n.id !== event.id));
      }
    }) : null;

    return () => {
      unsubChar();
      if (unsubNPC) unsubNPC();
    };
  }, [campaignId, isDM]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [charsData, npcsData, membershipsData] = await Promise.all([
        base44.entities.Character.filter({ campaign_id: campaignId }),
        isDM ? base44.entities.NPC.filter({ campaign_id: campaignId }) : Promise.resolve([]),
        base44.entities.CampaignMembership.filter({ campaign_id: campaignId })
      ]);

      // Fetch user data for members
      const userIds = membershipsData.map(m => m.user_id);
      const usersData = userIds.length > 0 ? await base44.entities.User.filter({ id: { $in: userIds } }) : [];
      const usersMap = {};
      usersData.forEach(u => { usersMap[u.id] = u; });

      const membersWithUsers = membershipsData.map(m => ({
        ...m,
        user: usersMap[m.user_id] || { full_name: 'Unknown', email: m.user_id }
      }));

      setCharacters(charsData);
      setNpcs(npcsData);
      setMembers(membersWithUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !quickAddLinkedPlayer) return;

    if (quickAddType === 'character') {
      const newChar = await base44.entities.Character.create({
        name: quickAddName.trim(),
        owner_id: quickAddLinkedPlayer,
        campaign_ids: [campaignId],
        level: 1,
        hp_max: 10,
        hp_current: 10,
        ac: 10
      });
      setCharacters(prev => [...prev, newChar]);
    } else {
      const newNpc = await base44.entities.NPC.create({
        name: quickAddName.trim(),
        owner_id: userId,
        campaign_ids: [campaignId],
        stat_block: { hp: 10, ac: 10 }
      });
      setNpcs(prev => [...prev, newNpc]);
    }

    setQuickAddOpen(false);
    setQuickAddName('');
    setQuickAddLinkedPlayer('');
    setQuickAddType('character');
  };

  const handleHPChange = async (characterId, newHP) => {
    const char = characters.find(c => c.id === characterId);
    if (!char) return;
    
    const maxHP = char.hp_max || 1;
    const clamped = Math.max(0, Math.min(maxHP, newHP));
    
    await base44.entities.Character.update(characterId, {
      hp_current: clamped
    });
    
    setCharacters(prev => prev.map(c => 
      c.id === characterId ? { ...c, hp_current: clamped } : c
    ));

    // Log to session
    if (clamped !== char.hp_current) {
      const diff = clamped - char.hp_current;
      if (diff > 0) {
        await logHeal(campaignId, userId, 'DM', characterId, char.name, characterId, char.name, diff);
      } else if (diff < 0) {
        await logDamage(campaignId, userId, 'DM', characterId, char.name, characterId, char.name, Math.abs(diff), 'DM Adjustment');
      }
    }
  };

  const handleNPCHPChange = async (npcId, newHP) => {
    const npc = npcs.find(n => n.id === npcId);
    if (!npc) return;
    
    const maxHP = npc.stat_block?.hp || 1;
    const clamped = Math.max(0, Math.min(maxHP, newHP));
    
    await base44.entities.NPC.update(npcId, {
      stat_block: { ...npc.stat_block, hp: clamped }
    });
    
    setNpcs(prev => prev.map(n => 
      n.id === npcId ? { ...n, stat_block: { ...n.stat_block, hp: clamped } } : n
    ));
  };

  const handleLevelUp = async (charId) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    const newLevel = (char.level || 1) + 1;
    const updates = { level: newLevel };

    if (levelUpMode === 'auto') {
      // Auto-assign: +2 to random ability score
      const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      const randAbility = abilities[Math.floor(Math.random() * abilities.length)];
      const scores = char.ability_scores || {};
      updates.ability_scores = { ...scores, [randAbility]: (scores[randAbility] || 10) + 2 };
    }

    await base44.entities.Character.update(charId, updates);
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, ...updates } : c));
    setLevelUpDialogOpen(false);
    setLevelUpMode('auto');
  };

  const handleAddInventoryItem = async (charId) => {
    const char = characters.find(c => c.id === charId);
    if (!char || !newItemName.trim()) return;

    const inventory = char.inventory || [];
    inventory.push({
      name: newItemName.trim(),
      quantity: parseInt(newItemQty) || 1,
      weight: 0,
      notes: ''
    });

    await base44.entities.Character.update(charId, { inventory });
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, inventory } : c));
    setNewItemName('');
    setNewItemQty(1);
    setNewInventoryOpen(false);
  };

  const handleRemoveInventoryItem = async (charId, index) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    const inventory = [...(char.inventory || [])];
    inventory.splice(index, 1);

    await base44.entities.Character.update(charId, { inventory });
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, inventory } : c));
  };

  const CharacterQuickSheet = ({ character, readonly = false }) => {
    const hp = character.hp_current || 0;
    const maxHP = character.hp_max || 0;
    const ac = character.ac || 10;
    const hpPercent = maxHP > 0 ? (hp / maxHP) * 100 : 0;

    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">{character.name}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Level {character.level || 1}</span>
              <Badge variant="outline" className="text-xs">{character.class}</Badge>
            </div>
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-red-300">
                <Heart className="h-4 w-4" />
                HP
              </span>
              <span className={hp > 0 ? 'text-slate-300' : 'text-red-500'}>
                {hp}/{maxHP}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  hp <= maxHP * 0.25 ? 'bg-red-600' :
                  hp <= maxHP * 0.5 ? 'bg-orange-600' : 'bg-green-600'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            {!readonly && (
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleHPChange(character.id, hp - 1)}
                  className="h-7 w-7 p-0 text-red-400 border-slate-600 hover:bg-slate-700"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleHPChange(character.id, hp + 1)}
                  className="h-7 w-7 p-0 text-green-400 border-slate-600 hover:bg-slate-700"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <input
                  type="number"
                  value={hp}
                  onChange={(e) => handleHPChange(character.id, parseInt(e.target.value) || 0)}
                  className="flex-1 px-2 h-7 bg-slate-900 border border-slate-600 rounded text-xs text-white"
                />
              </div>
            )}
          </div>

          {/* AC */}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-blue-300">
              <Shield className="h-4 w-4" />
              AC
            </span>
            <span className="font-semibold text-slate-300">{ac}</span>
          </div>

          {/* View Details Button */}
          {!readonly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCharId(character.id)}
              className="w-full h-8 text-xs text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              View Full Sheet
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleResourceUpdate = (updatedChar) => {
    setCharacters(prev => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
  };

  const [lastRoll, setLastRoll] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValsDetail, setEditValsDetail] = useState({});

  const saveDetailEdit = async (character) => {
    const updates = {};
    if (editValsDetail.ability_scores) updates.ability_scores = editValsDetail.ability_scores;
    if (editValsDetail.ac !== undefined) updates.ac = parseInt(editValsDetail.ac) || character.ac;
    if (editValsDetail.speed !== undefined) updates.speed = parseInt(editValsDetail.speed) || character.speed;
    if (editValsDetail.hp_max !== undefined) updates.hp_max = parseInt(editValsDetail.hp_max) || character.hp_max;
    if (editValsDetail.hp_current !== undefined) updates.hp_current = parseInt(editValsDetail.hp_current) || character.hp_current;
    if (editValsDetail.skill_proficiencies !== undefined) updates.skill_proficiencies = editValsDetail.skill_proficiencies;
    await base44.entities.Character.update(character.id, updates);
    setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, ...updates } : c));
    setEditMode(false);
    setEditValsDetail({});
  };

  const startDetailEdit = (character) => {
    setEditValsDetail({
      ability_scores: { ...(character.ability_scores || {}) },
      ac: character.ac ?? 10,
      speed: character.speed ?? 30,
      hp_max: character.hp_max ?? 0,
      hp_current: character.hp_current ?? 0,
      skill_proficiencies: [...(character.skill_proficiencies || [])],
    });
    setEditMode(true);
  };

  const CharacterDetailView = ({ character, onClose }) => {
    if (!character) return null;
    const abilities = editMode && editValsDetail.ability_scores ? editValsDetail.ability_scores : (character.ability_scores || {});
    const inventory = character.inventory || [];
    const profBonus = Math.floor(((character.level || 1) - 1) / 4) + 2;

    const roll = (label, mod) => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const total = d20 + mod;
      const isCrit = d20 === 20;
      const isFumble = d20 === 1;
      setLastRoll({ label, d20, mod, total, isCrit, isFumble });
    };

    const abilityMod = (score) => Math.floor(((score || 10) - 10) / 2);

    const SKILLS = [
      { name: 'Acrobatics', ability: 'dexterity' },
      { name: 'Animal Handling', ability: 'wisdom' },
      { name: 'Arcana', ability: 'intelligence' },
      { name: 'Athletics', ability: 'strength' },
      { name: 'Deception', ability: 'charisma' },
      { name: 'History', ability: 'intelligence' },
      { name: 'Insight', ability: 'wisdom' },
      { name: 'Intimidation', ability: 'charisma' },
      { name: 'Investigation', ability: 'intelligence' },
      { name: 'Medicine', ability: 'wisdom' },
      { name: 'Nature', ability: 'intelligence' },
      { name: 'Perception', ability: 'wisdom' },
      { name: 'Performance', ability: 'charisma' },
      { name: 'Persuasion', ability: 'charisma' },
      { name: 'Religion', ability: 'intelligence' },
      { name: 'Sleight of Hand', ability: 'dexterity' },
      { name: 'Stealth', ability: 'dexterity' },
      { name: 'Survival', ability: 'wisdom' },
    ];

    const skillMod = (skill) => {
      const base = abilityMod(abilities[skill.ability]);
      const proficiencies = character.skill_proficiencies || [];
      const expertise = character.skill_expertise || [];
      const skillKey = skill.name.toLowerCase().replace(/ /g, '_');
      if (expertise.includes(skillKey)) return base + profBonus * 2;
      if (proficiencies.includes(skillKey)) return base + profBonus;
      return base;
    };

    return (
      <Dialog open={!!character} onOpenChange={() => { setEditMode(false); setEditValsDetail({}); onClose(); }}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-white">{character.name} — Lvl {character.level || 1} {character.race || ''} {character.class || ''}</DialogTitle>
              {(isDM || character.owner_id === userId) && (
                editMode ? (
                  <Button size="sm" onClick={() => saveDetailEdit(character)} className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1">
                    <Check className="h-3 w-3" /> Save
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => startDetailEdit(character)} className="h-7 px-2 text-slate-400 hover:text-white text-xs flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                )
              )}
            </div>
          </DialogHeader>

          {/* Roll result banner */}
          {lastRoll && (
            <div className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm font-semibold mx-1 ${lastRoll.isCrit ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : lastRoll.isFumble ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-violet-500/20 text-violet-200 border border-violet-500/30'}`}>
              <span>{lastRoll.label}</span>
              <span>
                d20({lastRoll.d20}) {lastRoll.mod >= 0 ? '+' : ''}{lastRoll.mod} = <span className="text-white text-base">{lastRoll.total}</span>
                {lastRoll.isCrit && ' ⭐ CRIT!'}
                {lastRoll.isFumble && ' 💀 FUMBLE'}
              </span>
              <button onClick={() => setLastRoll(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
          )}

          <Tabs defaultValue="stats" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="bg-slate-800 border border-slate-700 w-full justify-start flex-wrap flex-shrink-0">
              <TabsTrigger value="stats" className="text-xs">Abilities</TabsTrigger>
              <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
              <TabsTrigger value="attacks" className="text-xs">Attacks</TabsTrigger>
              <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
              {isDM && <TabsTrigger value="level" className="text-xs">Level Up</TabsTrigger>}
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4">
                {/* Abilities Tab */}
                <TabsContent value="stats" className="space-y-3 mt-0">
                  <div className="grid grid-cols-3 gap-2">
                    {['strength','dexterity','constitution','intelligence','wisdom','charisma'].map(ab => {
                      const score = abilities[ab] || 10;
                      const mod = abilityMod(score);
                      const hasSave = (character.saving_throw_proficiencies || []).includes(ab);
                      const saveTotal = mod + (hasSave ? profBonus : 0);
                      return editMode ? (
                        <div key={ab} className="bg-slate-800 border border-violet-500/30 p-3 rounded-lg text-center">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{ab.slice(0,3)}</p>
                          <input
                            type="number"
                            value={editValsDetail.ability_scores?.[ab] ?? score}
                            onChange={e => setEditValsDetail(prev => ({ ...prev, ability_scores: { ...prev.ability_scores, [ab]: parseInt(e.target.value) || 10 } }))}
                            className="w-full text-center text-xl font-bold bg-slate-900 border border-slate-600 rounded text-white"
                            min="1" max="30"
                          />
                          <p className="text-xs text-violet-300 mt-1">{mod >= 0 ? '+' : ''}{mod}</p>
                        </div>
                      ) : (
                        <button
                          key={ab}
                          onClick={() => roll(ab.slice(0,3).toUpperCase() + ' Save', saveTotal)}
                          className="bg-slate-800 hover:bg-violet-500/20 hover:border-violet-500/40 border border-transparent p-3 rounded-lg text-center transition-all group"
                          title={`Click to roll ${ab} saving throw`}
                        >
                          <p className="text-xs text-slate-400 uppercase tracking-wide">{ab.slice(0,3)}</p>
                          <p className="text-2xl font-bold text-white">{score}</p>
                          <p className="text-sm font-semibold text-violet-300">{mod >= 0 ? '+' : ''}{mod}</p>
                          {hasSave && <p className="text-xs text-amber-400 mt-1">Save {saveTotal >= 0 ? '+' : ''}{saveTotal}</p>}
                          <p className="text-[10px] text-slate-600 group-hover:text-violet-400 transition-colors mt-1">click to save</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {editMode ? (
                      <>
                        <div className="bg-slate-800 border border-violet-500/30 p-2 rounded text-center">
                          <p className="text-slate-400 mb-1">AC</p>
                          <input type="number" value={editValsDetail.ac ?? character.ac ?? 10} onChange={e => setEditValsDetail(p => ({ ...p, ac: e.target.value }))} className="w-full text-center font-bold text-lg bg-slate-900 border border-slate-600 rounded text-white" />
                        </div>
                        <div className="bg-slate-800 border border-violet-500/30 p-2 rounded text-center">
                          <p className="text-slate-400 mb-1">Speed</p>
                          <input type="number" value={editValsDetail.speed ?? character.speed ?? 30} onChange={e => setEditValsDetail(p => ({ ...p, speed: e.target.value }))} className="w-full text-center font-bold text-lg bg-slate-900 border border-slate-600 rounded text-white" />
                        </div>
                        <div className="bg-slate-800 border border-violet-500/30 p-2 rounded text-center">
                          <p className="text-slate-400 mb-1">HP Max</p>
                          <input type="number" value={editValsDetail.hp_max ?? character.hp_max ?? 0} onChange={e => setEditValsDetail(p => ({ ...p, hp_max: e.target.value }))} className="w-full text-center font-bold text-lg bg-slate-900 border border-slate-600 rounded text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-slate-400">AC</p>
                          <p className="text-white font-bold text-lg">{character.ac || 10}</p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-slate-400">Speed</p>
                          <p className="text-white font-bold text-lg">{character.speed || 30}ft</p>
                        </div>
                        <button
                          onClick={() => roll('Initiative', abilityMod(abilities.dexterity) + (character.initiative_bonus || 0))}
                          className="bg-slate-800 hover:bg-violet-500/20 border border-transparent hover:border-violet-500/40 p-2 rounded text-center transition-all"
                        >
                          <p className="text-slate-400">Initiative</p>
                          <p className="text-white font-bold text-lg">{abilityMod(abilities.dexterity) + (character.initiative_bonus || 0) >= 0 ? '+' : ''}{abilityMod(abilities.dexterity) + (character.initiative_bonus || 0)}</p>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="bg-slate-800 p-2 rounded text-xs flex justify-between">
                    <span className="text-slate-400">Hit Dice</span>
                    <span className="text-white">{character.hit_dice_current || character.hit_dice_total || 'd8'}</span>
                  </div>
                  {editMode && <p className="text-[10px] text-violet-400 text-center">✏ Edit mode — click Save when done</p>}
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="mt-0">
                  {editMode && <p className="text-[10px] text-violet-400 text-center mb-2">✏ Click dot to toggle proficiency</p>}
                  <div className="space-y-0.5">
                    {SKILLS.map(skill => {
                      const skillKey = skill.name.toLowerCase().replace(/ /g, '_');
                      const currentProfs = editMode ? (editValsDetail.skill_proficiencies || []) : (character.skill_proficiencies || []);
                      const expertise = character.skill_expertise || [];
                      const hasProf = currentProfs.includes(skillKey);
                      const hasExpert = expertise.includes(skillKey);
                      const base = abilityMod(abilities[skill.ability]);
                      const mod = hasExpert ? base + profBonus * 2 : hasProf ? base + profBonus : base;
                      return (
                        <div
                          key={skill.name}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded border border-transparent text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => {
                                if (editMode) {
                                  const profs = editValsDetail.skill_proficiencies || [];
                                  setEditValsDetail(p => ({ ...p, skill_proficiencies: hasProf ? profs.filter(k => k !== skillKey) : [...profs, skillKey] }));
                                }
                              }}
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border transition-all ${editMode ? 'cursor-pointer hover:scale-150' : 'cursor-default'} ${hasExpert ? 'bg-amber-400 border-amber-400' : hasProf ? 'bg-violet-400 border-violet-400' : 'bg-transparent border-slate-600'}`}
                              title={editMode ? (hasProf ? 'Remove proficiency' : 'Add proficiency') : undefined}
                            />
                            <span className="text-slate-300">{skill.name}</span>
                            <span className="text-slate-500 text-[10px]">{skill.ability.slice(0,3).toUpperCase()}</span>
                          </div>
                          <button
                            onClick={() => !editMode && roll(skill.name, mod)}
                            disabled={editMode}
                            className={`font-semibold text-violet-300 px-2 py-0.5 rounded transition-all ${!editMode ? 'hover:bg-violet-500/20 cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            {mod >= 0 ? '+' : ''}{mod}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {!editMode && <p className="text-[10px] text-slate-600 text-center mt-2">Click modifier to roll</p>}
                </TabsContent>

                {/* Attacks Tab */}
                <TabsContent value="attacks" className="mt-0 space-y-2">
                  {(character.attacks || []).length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-6">No attacks configured</p>
                  ) : (
                    character.attacks.map((atk, i) => {
                      const bonus = atk.attack_bonus || 0;
                      return (
                        <button
                          key={i}
                          onClick={() => roll(atk.name + ' Attack', bonus)}
                          className="w-full flex items-center justify-between px-3 py-3 rounded-lg bg-slate-800 hover:bg-violet-500/20 border border-transparent hover:border-violet-500/30 transition-all"
                        >
                          <div className="text-left">
                            <p className="text-sm text-white font-medium">{atk.name}</p>
                            <p className="text-xs text-slate-400">{atk.damage} {atk.damage_type}</p>
                            {atk.properties && <p className="text-xs text-slate-500">{atk.properties}</p>}
                          </div>
                          <span className="flex items-center gap-1 text-violet-300 font-bold text-sm">
                            {bonus >= 0 ? `+${bonus}` : bonus} <Dice6 className="h-4 w-4" />
                          </span>
                        </button>
                      );
                    })
                  )}
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4 p-1 mt-0">
                  <ClassResourceTracker character={character} onUpdate={handleResourceUpdate} />
                  <div className="border-t border-slate-800 pt-3">
                    <SpellSlotTracker character={character} onUpdate={handleResourceUpdate} />
                  </div>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-2">
                  {inventory.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4">No items</p>
                  ) : (
                    inventory.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded text-xs group">
                        <div className="flex-1 min-w-0">
                          {editingItemIdx === idx && selectedCharId === character.id ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const newInv = inventory.map((i, i_idx) => 
                                    i_idx === idx ? { ...i, name: e.target.value } : i
                                  );
                                  setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, inventory: newInv } : c));
                                }}
                                onBlur={() => {
                                  base44.entities.Character.update(character.id, { inventory });
                                  setEditingItemIdx(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    base44.entities.Character.update(character.id, { inventory });
                                    setEditingItemIdx(null);
                                  }
                                }}
                                className="flex-1 px-1 bg-slate-900 border border-slate-600 rounded text-white text-xs"
                                autoFocus
                              />
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newInv = inventory.map((i, i_idx) => 
                                    i_idx === idx ? { ...i, quantity: Math.max(1, parseInt(e.target.value) || 1) } : i
                                  );
                                  setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, inventory: newInv } : c));
                                }}
                                onBlur={() => {
                                  base44.entities.Character.update(character.id, { inventory });
                                  setEditingItemIdx(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    base44.entities.Character.update(character.id, { inventory });
                                    setEditingItemIdx(null);
                                  }
                                }}
                                className="w-12 px-1 bg-slate-900 border border-slate-600 rounded text-white text-xs"
                                min="1"
                              />
                            </div>
                          ) : (
                            <>
                              <p className="text-white font-medium">{item.name}</p>
                              <p className="text-slate-400">x{item.quantity}</p>
                            </>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItemIdx(editingItemIdx === idx ? null : idx)}
                            className="h-6 w-6 p-0 text-slate-400 hover:bg-slate-700"
                          >
                            ✎
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveInventoryItem(character.id, idx)}
                            className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {isDM && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedCharId(character.id); setNewInventoryOpen(true); }}
                      className="w-full text-xs h-8 border-slate-600 text-slate-300"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  )}
                </TabsContent>

                {/* Level Up Tab */}
                {isDM && (
                  <TabsContent value="level" className="space-y-3">
                    <div className="bg-slate-800 p-4 rounded space-y-3">
                      <p className="text-sm text-slate-300">Current Level: <span className="font-bold text-white">{character.level || 1}</span></p>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">Leveling Mode</label>
                        <Select value={levelUpMode} onValueChange={setLevelUpMode}>
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="auto">Auto-assign (+2 random ability)</SelectItem>
                            <SelectItem value="manual">Manual (no auto changes)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={() => { setLevelUpDialogOpen(true); }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm h-8"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Level Up to {(character.level || 1) + 1}
                      </Button>
                    </div>
                  </TabsContent>
                )}
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter>
            <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="bg-slate-900/50 border border-slate-800 w-full justify-start">
          <TabsTrigger value="characters" className="data-[state=active]:bg-violet-600 text-xs">
            Characters
          </TabsTrigger>
          {isDM && (
            <TabsTrigger value="npcs" className="data-[state=active]:bg-violet-600 text-xs">
              NPCs
            </TabsTrigger>
          )}
          {isDM && (
            <Button
              onClick={() => setQuickAddOpen(true)}
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs border-slate-600 text-slate-300"
            >
              <Plus className="h-3 w-3 mr-1" />
              Quick Add
            </Button>
          )}
        </TabsList>

        <TabsContent value="characters">
          <ScrollArea className="h-96">
            <div className="space-y-3 p-4">
              {characters.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">No characters loaded</p>
              )}
              {characters.map(char => (
                <CharacterQuickSheet key={char.id} character={char} readonly={!isDM && char.owner_id !== userId} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {isDM && (
          <TabsContent value="npcs">
            <ScrollArea className="h-96">
              <div className="space-y-3 p-4">
                {npcs.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">No NPCs loaded</p>
                )}
                {npcs.map(npc => {
                  const hp = npc.stat_block?.hp || 0;
                  const ac = npc.stat_block?.ac || 10;
                  const hpPercent = hp > 0 ? (hp / npc.stat_block?.hp || 1) * 100 : 0;
                  
                  return (
                    <Card key={npc.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 space-y-3">
                        <p className="font-semibold text-slate-300">{npc.name}</p>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-red-300">HP</span>
                            <span>{hp}</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded h-2">
                            <div className="bg-orange-600 h-full rounded" style={{width: `${hpPercent}%`}} />
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300">AC</span>
                          <span>{ac}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>

      {/* Character Detail Dialog */}
      {selectedCharId && (
        <CharacterDetailView 
          character={characters.find(c => c.id === selectedCharId)}
          onClose={() => setSelectedCharId(null)}
        />
      )}

      {/* Level Up Confirmation */}
      <Dialog open={levelUpDialogOpen} onOpenChange={setLevelUpDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Level Up</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">
            {levelUpMode === 'auto' 
              ? 'Character will level up with a random +2 ability increase.'
              : 'Character will level up without automatic changes. You can manually adjust stats.'}
          </p>
          <DialogFooter className="gap-2">
            <Button onClick={() => setLevelUpDialogOpen(false)} variant="outline" className="border-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={() => handleLevelUp(selectedCharId)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirm Level Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Item */}
      <Dialog open={newInventoryOpen} onOpenChange={setNewInventoryOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Item Name</label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Longsword"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
              <Input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                min="1"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setNewInventoryOpen(false)} variant="outline" className="border-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={() => handleAddInventoryItem(selectedCharId)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Character/NPC */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Quick Add Character/NPC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Type</label>
              <Select value={quickAddType} onValueChange={setQuickAddType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="character">Character</SelectItem>
                  <SelectItem value="npc">NPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Name</label>
              <Input
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                placeholder="Character/NPC name"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            {quickAddType === 'character' && (
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Link to Player</label>
                <Select value={quickAddLinkedPlayer} onValueChange={setQuickAddLinkedPlayer}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select player..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {members.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.user?.full_name || m.user?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setQuickAddOpen(false)} variant="outline" className="border-slate-600">
              Cancel
            </Button>
            <Button 
              onClick={handleQuickAdd}
              disabled={!quickAddName.trim() || (quickAddType === 'character' && !quickAddLinkedPlayer)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Add {quickAddType === 'character' ? 'Character' : 'NPC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}