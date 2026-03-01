import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Save,
  Upload,
  Heart,
  Shield,
  Zap,
  Swords,
  BookOpen,
  Backpack,
  Scroll,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import DiceRoller from '@/components/dice/DiceRoller';
import { RACES, CLASSES, SUBCLASSES, BACKGROUNDS, ALIGNMENTS as DND_ALIGNMENTS } from '@/components/dnd5eData';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const SKILLS = {
  strength: ['Athletics'],
  dexterity: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  constitution: [],
  intelligence: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  wisdom: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  charisma: ['Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const ALIGNMENTS = DND_ALIGNMENTS;

export default function CharacterSheet() {
  const [user, setUser] = useState(null);
  const [character, setCharacter] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const campaignId = urlParams.get('campaign_id');

  const defaultCharacter = {
    campaign_id: campaignId || null,
    owner_id: '',
    name: '',
    race: '',
    class: '',
    subclass: '',
    background: '',
    alignment: 'N',
    level: 1,
    xp: 0,
    use_milestone: false,
    ability_scores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    saving_throw_proficiencies: [],
    skill_proficiencies: [],
    skill_expertise: [],
    hp_max: 10,
    hp_current: 10,
    hp_temp: 0,
    ac: 10,
    speed: 30,
    initiative_bonus: 0,
    hit_dice_total: '1d8',
    hit_dice_current: '1d8',
    attacks: [],
    spellcasting: {
      ability: '',
      spell_save_dc: 0,
      spell_attack_bonus: 0,
      cantrips: [],
      spells_known: [],
      spell_slots: {}
    },
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    features_traits: [],
    proficiencies: {
      armor: [],
      weapons: [],
      tools: [],
      languages: []
    },
    backstory: '',
    notes: '',
    portrait_url: '',
    edit_history: []
  };

  useEffect(() => {
    loadData();
  }, [characterId, campaignId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (characterId) {
        const chars = await base44.entities.Character.filter({ id: characterId });
        if (chars.length === 0) {
          navigate(createPageUrl('Characters'));
          return;
        }
        setCharacter(chars[0]);
        
        if (chars[0].campaign_id) {
          const camps = await base44.entities.Campaign.filter({ id: chars[0].campaign_id });
          if (camps.length > 0) setCampaign(camps[0]);
        }
      } else {
        // New character — may or may not have a campaign
        setIsNew(true);
        setCharacter({ ...defaultCharacter, campaign_id: campaignId || null, owner_id: currentUser.id });
        
        if (campaignId) {
          const camps = await base44.entities.Campaign.filter({ id: campaignId });
          if (camps.length > 0) setCampaign(camps[0]);
        }
      }
    } catch (e) {
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const getModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const formatModifier = (mod) => {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getProficiencyBonus = (level) => {
    return Math.floor((level - 1) / 4) + 2;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCharacter(prev => ({ ...prev, portrait_url: file_url }));
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const updateAbilityScore = (ability, value) => {
    setCharacter(prev => ({
      ...prev,
      ability_scores: {
        ...prev.ability_scores,
        [ability]: parseInt(value) || 0
      }
    }));
  };

  const toggleProficiency = (type, value) => {
    setCharacter(prev => {
      const current = prev[type] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const addAttack = () => {
    setCharacter(prev => ({
      ...prev,
      attacks: [...(prev.attacks || []), { name: '', attack_bonus: 0, damage: '', damage_type: '', properties: '' }]
    }));
  };

  const updateAttack = (index, field, value) => {
    setCharacter(prev => {
      const attacks = [...(prev.attacks || [])];
      attacks[index] = { ...attacks[index], [field]: value };
      return { ...prev, attacks };
    });
  };

  const removeAttack = (index) => {
    setCharacter(prev => ({
      ...prev,
      attacks: prev.attacks.filter((_, i) => i !== index)
    }));
  };

  const addInventoryItem = () => {
    setCharacter(prev => ({
      ...prev,
      inventory: [...(prev.inventory || []), { name: '', quantity: 1, weight: 0, notes: '' }]
    }));
  };

  const updateInventoryItem = (index, field, value) => {
    setCharacter(prev => {
      const inventory = [...(prev.inventory || [])];
      inventory[index] = { ...inventory[index], [field]: value };
      return { ...prev, inventory };
    });
  };

  const removeInventoryItem = (index) => {
    setCharacter(prev => ({
      ...prev,
      inventory: prev.inventory.filter((_, i) => i !== index)
    }));
  };

  const addFeature = () => {
    setCharacter(prev => ({
      ...prev,
      features_traits: [...(prev.features_traits || []), { name: '', source: '', description: '' }]
    }));
  };

  const updateFeature = (index, field, value) => {
    setCharacter(prev => {
      const features = [...(prev.features_traits || [])];
      features[index] = { ...features[index], [field]: value };
      return { ...prev, features_traits: features };
    });
  };

  const removeFeature = (index) => {
    setCharacter(prev => ({
      ...prev,
      features_traits: prev.features_traits.filter((_, i) => i !== index)
    }));
  };

  const saveCharacter = async () => {
    if (!character.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' }); return;
      return;
    }

    setSaving(true);
    try {
      // Create edit history entry
      const historyEntry = {
        timestamp: new Date().toISOString(),
        changes: 'Manual save',
        snapshot: { ...character }
      };

      const editHistory = [...(character.edit_history || []), historyEntry].slice(-20);

      if (isNew) {
        const newChar = await base44.entities.Character.create({
          ...character,
          edit_history: editHistory
        });
        navigate(createPageUrl(`CharacterSheet?id=${newChar.id}`));
      } else {
        await base44.entities.Character.update(character.id, {
          ...character,
          edit_history: editHistory
        });
      }
      
      toast({ title: 'Character saved' });
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const profBonus = getProficiencyBonus(character.level || 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => campaign ? navigate(createPageUrl(`CampaignDetail?id=${campaign.id}`)) : navigate(createPageUrl('Characters'))}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={saveCharacter}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Character'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - Character Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Portrait & Basic Info */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="relative group mb-4">
                <Avatar className="h-32 w-32 mx-auto">
                  <AvatarImage src={character.portrait_url} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-4xl">
                    {character.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer mx-auto w-32 h-32">
                  <Upload className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Character Name"
                  value={character.name || ''}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white text-center font-semibold"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={character.race || ''}
                    onValueChange={(v) => setCharacter(prev => ({ ...prev, race: v }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm">
                      <SelectValue placeholder="Race" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {RACES.map(r => (
                        <SelectItem key={r} value={r} className="text-slate-300">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={character.class || ''}
                    onValueChange={(v) => setCharacter(prev => ({ ...prev, class: v, subclass: '' }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {CLASSES.map(c => (
                        <SelectItem key={c} value={c} className="text-slate-300">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select
                  value={character.subclass || ''}
                  onValueChange={(v) => setCharacter(prev => ({ ...prev, subclass: v }))}
                  disabled={!character.class || !SUBCLASSES[character.class]}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue placeholder={character.class ? 'Subclass' : 'Select class first'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {(SUBCLASSES[character.class] || []).map(s => (
                      <SelectItem key={s} value={s} className="text-slate-300">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={character.background || ''}
                  onValueChange={(v) => setCharacter(prev => ({ ...prev, background: v }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue placeholder="Background" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {BACKGROUNDS.map(b => (
                      <SelectItem key={b} value={b} className="text-slate-300">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={character.alignment || 'N'} 
                  onValueChange={(v) => setCharacter(prev => ({ ...prev, alignment: v }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {ALIGNMENTS.map(a => (
                      <SelectItem key={a.value} value={a.value} className="text-slate-300">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Level & XP */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-white">Level</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={character.level || 1}
                  onChange={(e) => setCharacter(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  className="w-20 bg-slate-800 border-slate-700 text-white text-center"
                />
              </div>

              <div className="flex items-center justify-between mb-3">
                <Label className="text-slate-400 text-sm">Proficiency Bonus</Label>
                <Badge className="bg-violet-500/20 text-violet-300">+{profBonus}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-sm">Use Milestone</Label>
                <Switch
                  checked={character.use_milestone || false}
                  onCheckedChange={(v) => setCharacter(prev => ({ ...prev, use_milestone: v }))}
                />
              </div>

              {!character.use_milestone && (
                <div className="mt-3">
                  <Label className="text-slate-400 text-sm">Experience Points</Label>
                  <Input
                    type="number"
                    min="0"
                    value={character.xp || 0}
                    onChange={(e) => setCharacter(prev => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Combat Stats */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                Combat Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Label className="text-xs text-red-400">HP</Label>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Input
                      type="number"
                      value={character.hp_current || 0}
                      onChange={(e) => setCharacter(prev => ({ ...prev, hp_current: parseInt(e.target.value) || 0 }))}
                      className="w-12 h-8 bg-transparent border-none text-white text-center p-0 text-lg font-bold"
                    />
                    <span className="text-slate-500">/</span>
                    <Input
                      type="number"
                      value={character.hp_max || 0}
                      onChange={(e) => setCharacter(prev => ({ ...prev, hp_max: parseInt(e.target.value) || 0 }))}
                      className="w-12 h-8 bg-transparent border-none text-white text-center p-0 text-lg font-bold"
                    />
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Label className="text-xs text-blue-400">AC</Label>
                  <Input
                    type="number"
                    value={character.ac || 10}
                    onChange={(e) => setCharacter(prev => ({ ...prev, ac: parseInt(e.target.value) || 10 }))}
                    className="w-full h-8 bg-transparent border-none text-white text-center p-0 text-lg font-bold mt-1"
                  />
                </div>
                
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Label className="text-xs text-amber-400">Speed</Label>
                  <Input
                    type="number"
                    value={character.speed || 30}
                    onChange={(e) => setCharacter(prev => ({ ...prev, speed: parseInt(e.target.value) || 30 }))}
                    className="w-full h-8 bg-transparent border-none text-white text-center p-0 text-lg font-bold mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Temp HP</Label>
                  <Input
                    type="number"
                    value={character.hp_temp || 0}
                    onChange={(e) => setCharacter(prev => ({ ...prev, hp_temp: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Initiative</Label>
                  <Input
                    type="number"
                    value={character.initiative_bonus || 0}
                    onChange={(e) => setCharacter(prev => ({ ...prev, initiative_bonus: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Hit Dice Total</Label>
                  <Input
                    value={character.hit_dice_total || ''}
                    onChange={(e) => setCharacter(prev => ({ ...prev, hit_dice_total: e.target.value }))}
                    placeholder="e.g., 5d10"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Hit Dice Current</Label>
                  <Input
                    value={character.hit_dice_current || ''}
                    onChange={(e) => setCharacter(prev => ({ ...prev, hit_dice_current: e.target.value }))}
                    placeholder="e.g., 3d10"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dice Roller */}
          <DiceRoller userName={character.name || user?.display_name || 'Player'} />
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="abilities" className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-slate-800 flex-wrap">
              <TabsTrigger value="abilities" className="data-[state=active]:bg-violet-600">
                <Zap className="h-4 w-4 mr-2" />
                Abilities
              </TabsTrigger>
              <TabsTrigger value="attacks" className="data-[state=active]:bg-violet-600">
                <Swords className="h-4 w-4 mr-2" />
                Attacks
              </TabsTrigger>
              <TabsTrigger value="spells" className="data-[state=active]:bg-violet-600">
                <BookOpen className="h-4 w-4 mr-2" />
                Spells
              </TabsTrigger>
              <TabsTrigger value="inventory" className="data-[state=active]:bg-violet-600">
                <Backpack className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="features" className="data-[state=active]:bg-violet-600">
                <Scroll className="h-4 w-4 mr-2" />
                Features
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-violet-600">
                <BookOpen className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abilities" className="space-y-6">
              {/* Ability Scores */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Ability Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {ABILITIES.map((ability) => {
                      const score = character.ability_scores?.[ability] || 10;
                      const mod = getModifier(score);
                      return (
                        <div key={ability} className="text-center">
                          <Label className="text-xs text-slate-400 uppercase">{ability.slice(0, 3)}</Label>
                          <div className="mt-1 p-3 rounded-lg bg-slate-800 border border-slate-700">
                            <Input
                              type="number"
                              value={score}
                              onChange={(e) => updateAbilityScore(ability, e.target.value)}
                              className="w-full bg-transparent border-none text-white text-center text-2xl font-bold p-0 h-8"
                            />
                            <div className="text-violet-400 font-medium mt-1">
                              {formatModifier(mod)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Saving Throws & Skills */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Saving Throws */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Saving Throws</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {ABILITIES.map((ability) => {
                      const score = character.ability_scores?.[ability] || 10;
                      const mod = getModifier(score);
                      const isProficient = character.saving_throw_proficiencies?.includes(ability);
                      const total = mod + (isProficient ? profBonus : 0);
                      return (
                        <div 
                          key={ability}
                          onClick={() => toggleProficiency('saving_throw_proficiencies', ability)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            isProficient ? 'bg-violet-500/20' : 'hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border-2 ${
                              isProficient ? 'bg-violet-500 border-violet-500' : 'border-slate-500'
                            }`} />
                            <span className="text-slate-300 capitalize">{ability}</span>
                          </div>
                          <span className="text-white font-medium">{formatModifier(total)}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
                    {Object.entries(SKILLS).flatMap(([ability, skills]) => 
                      skills.map((skill) => {
                        const score = character.ability_scores?.[ability] || 10;
                        const mod = getModifier(score);
                        const isProficient = character.skill_proficiencies?.includes(skill);
                        const hasExpertise = character.skill_expertise?.includes(skill);
                        const bonus = isProficient ? (hasExpertise ? profBonus * 2 : profBonus) : 0;
                        const total = mod + bonus;
                        return (
                          <div 
                            key={skill}
                            onClick={() => toggleProficiency('skill_proficiencies', skill)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                              isProficient ? 'bg-violet-500/20' : 'hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full border-2 ${
                                hasExpertise ? 'bg-amber-500 border-amber-500' :
                                isProficient ? 'bg-violet-500 border-violet-500' : 'border-slate-500'
                              }`} />
                              <span className="text-slate-300">{skill}</span>
                              <span className="text-xs text-slate-500">({ability.slice(0, 3)})</span>
                            </div>
                            <span className="text-white font-medium">{formatModifier(total)}</span>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="attacks">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Attacks & Weapons</CardTitle>
                  <Button size="sm" onClick={addAttack} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attack
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(character.attacks || []).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No attacks added yet</p>
                  ) : (
                    character.attacks.map((attack, index) => (
                      <div key={index} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Attack Name"
                            value={attack.name || ''}
                            onChange={(e) => updateAttack(index, 'name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white flex-1"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeAttack(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs text-slate-400">Attack Bonus</Label>
                            <Input
                              type="number"
                              value={attack.attack_bonus || 0}
                              onChange={(e) => updateAttack(index, 'attack_bonus', parseInt(e.target.value) || 0)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Damage</Label>
                            <Input
                              placeholder="e.g., 1d8+3"
                              value={attack.damage || ''}
                              onChange={(e) => updateAttack(index, 'damage', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Damage Type</Label>
                            <Input
                              placeholder="e.g., Slashing"
                              value={attack.damage_type || ''}
                              onChange={(e) => updateAttack(index, 'damage_type', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Properties</Label>
                            <Input
                              placeholder="e.g., Versatile"
                              value={attack.properties || ''}
                              onChange={(e) => updateAttack(index, 'properties', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spells">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Spellcasting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-400">Spellcasting Ability</Label>
                      <Select 
                        value={character.spellcasting?.ability || ''} 
                        onValueChange={(v) => setCharacter(prev => ({
                          ...prev,
                          spellcasting: { ...prev.spellcasting, ability: v }
                        }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {ABILITIES.map(a => (
                            <SelectItem key={a} value={a} className="text-slate-300 capitalize">
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-400">Spell Save DC</Label>
                      <Input
                        type="number"
                        value={character.spellcasting?.spell_save_dc || 0}
                        onChange={(e) => setCharacter(prev => ({
                          ...prev,
                          spellcasting: { ...prev.spellcasting, spell_save_dc: parseInt(e.target.value) || 0 }
                        }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">Spell Attack Bonus</Label>
                      <Input
                        type="number"
                        value={character.spellcasting?.spell_attack_bonus || 0}
                        onChange={(e) => setCharacter(prev => ({
                          ...prev,
                          spellcasting: { ...prev.spellcasting, spell_attack_bonus: parseInt(e.target.value) || 0 }
                        }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-400">Cantrips (comma-separated)</Label>
                    <Textarea
                      value={(character.spellcasting?.cantrips || []).join(', ')}
                      onChange={(e) => setCharacter(prev => ({
                        ...prev,
                        spellcasting: { 
                          ...prev.spellcasting, 
                          cantrips: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }
                      }))}
                      placeholder="e.g., Fire Bolt, Mage Hand, Prestidigitation"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <p className="text-slate-500 text-sm">
                    Full spell management coming soon. For now, track spells in the Notes section.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Inventory</CardTitle>
                  <Button size="sm" onClick={addInventoryItem} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Currency */}
                  <div className="grid grid-cols-5 gap-2">
                    {['cp', 'sp', 'ep', 'gp', 'pp'].map((coin) => (
                      <div key={coin} className="text-center">
                        <Label className="text-xs text-slate-400 uppercase">{coin}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={character.currency?.[coin] || 0}
                          onChange={(e) => setCharacter(prev => ({
                            ...prev,
                            currency: { ...prev.currency, [coin]: parseInt(e.target.value) || 0 }
                          }))}
                          className="bg-slate-800 border-slate-700 text-white text-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  {(character.inventory || []).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No items in inventory</p>
                  ) : (
                    <div className="space-y-2">
                      {character.inventory.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded bg-slate-800/50">
                          <Input
                            placeholder="Item name"
                            value={item.name || ''}
                            onChange={(e) => updateInventoryItem(index, 'name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white flex-1"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={item.quantity || 1}
                            onChange={(e) => updateInventoryItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="bg-slate-700 border-slate-600 text-white w-16"
                          />
                          <Input
                            placeholder="Notes"
                            value={item.notes || ''}
                            onChange={(e) => updateInventoryItem(index, 'notes', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white w-32"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeInventoryItem(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Features & Traits</CardTitle>
                  <Button size="sm" onClick={addFeature} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Feature
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(character.features_traits || []).length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No features added yet</p>
                  ) : (
                    character.features_traits.map((feature, index) => (
                      <div key={index} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Feature Name"
                            value={feature.name || ''}
                            onChange={(e) => updateFeature(index, 'name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white flex-1"
                          />
                          <Input
                            placeholder="Source (e.g., Racial, Class)"
                            value={feature.source || ''}
                            onChange={(e) => updateFeature(index, 'source', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white w-40"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFeature(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Description..."
                          value={feature.description || ''}
                          onChange={(e) => updateFeature(index, 'description', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Backstory</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={character.backstory || ''}
                    onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                    placeholder="Write your character's backstory..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
                  />
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 mt-6">
                <CardHeader>
                  <CardTitle className="text-white">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={character.notes || ''}
                    onChange={(e) => setCharacter(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes, session highlights, etc..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
                  />
                </CardContent>
              </Card>

              {/* Edit History */}
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-6">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                      <CardTitle className="text-white flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <History className="h-4 w-4 text-violet-400" />
                          Edit History
                        </span>
                        {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {(character.edit_history || []).length === 0 ? (
                        <p className="text-slate-500 text-sm">No edit history yet</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {[...character.edit_history].reverse().map((entry, index) => (
                            <div key={index} className="p-2 rounded bg-slate-800/50 text-sm">
                              <p className="text-slate-300">{entry.changes}</p>
                              <p className="text-slate-500 text-xs">
                                {new Date(entry.timestamp).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}