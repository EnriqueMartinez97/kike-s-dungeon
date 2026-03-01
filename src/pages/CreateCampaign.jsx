import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Upload, 
  Crown, 
  Sparkles,
  Skull,
  Sword,
  Search,
  MessageSquare,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';

export default function CreateCampaign() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cover_image: '',
    mode: 'dm_present',
    tone: 'heroic_fantasy',
    tone_description: '',
    long_campaign_mode: false
  });
  const [customTone, setCustomTone] = useState(false);
  const [resolvingTone, setResolvingTone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      navigate(createPageUrl('Home'));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, cover_image: file_url }));
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleResolveCustomTone = async () => {
    if (!formData.tone_description.trim()) return;
    setResolvingTone(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A Dungeon Master describes their campaign tone as: "${formData.tone_description}"\n\nChoose the single best matching tone from these options: grimdark, heroic_fantasy, mystery, political_intrigue.\n\nRespond with only the tone key, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: { tone: { type: "string" } }
        }
      });
      const resolved = result?.tone?.trim().toLowerCase();
      if (['grimdark', 'heroic_fantasy', 'mystery', 'political_intrigue'].includes(resolved)) {
        setFormData(prev => ({ ...prev, tone: resolved }));
        setCustomTone(false);
      }
    } finally {
      setResolvingTone(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.tone) return;

    setLoading(true);
    try {
      const campaign = await base44.entities.Campaign.create({
        ...formData,
        system: 'DnD 5e',
        dm_id: user.id,
        player_ids: [],
        co_dm_ids: [],
        invite_code: generateInviteCode(),
        campaign_state: {
          location: '',
          active_quests: [],
          npc_present: [],
          unresolved_threads: [],
          timeline_notes: [],
          party_status_summary: ''
        }
      });

      // Create DM membership
      await base44.entities.CampaignMembership.create({
        campaign_id: campaign.id,
        user_id: user.id,
        role: 'dm',
        joined_at: new Date().toISOString()
      });

      navigate(createPageUrl(`CampaignDetail?id=${campaign.id}`));
    } catch (e) {
      toast({ title: 'Failed to create', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tones = [
    {
      id: 'custom',
      name: 'Custom',
      description: 'Describe your own tone and let the AI decide what fits best',
      icon: Wand2,
      color: 'from-pink-500 to-rose-600',
      borderColor: 'border-pink-500'
    },
    {
      id: 'grimdark',
      name: 'Grimdark',
      description: 'Dark, gritty, morally complex stories where hope is scarce',
      icon: Skull,
      color: 'from-slate-600 to-slate-800',
      borderColor: 'border-slate-500'
    },
    {
      id: 'heroic_fantasy',
      name: 'Heroic Fantasy',
      description: 'Classic heroism, epic quests, and triumph over evil',
      icon: Sword,
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500'
    },
    {
      id: 'mystery',
      name: 'Mystery',
      description: 'Intrigue, secrets, investigation, and hidden truths',
      icon: Search,
      color: 'from-violet-600 to-purple-800',
      borderColor: 'border-violet-500'
    },
    {
      id: 'political_intrigue',
      name: 'Political Intrigue',
      description: 'Power struggles, diplomacy, and courtly machinations',
      icon: MessageSquare,
      color: 'from-emerald-600 to-teal-800',
      borderColor: 'border-emerald-500'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(createPageUrl('Campaigns'))}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Create New Campaign</h1>
        <p className="text-slate-400 mt-1">Set up your DnD 5e adventure</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Cover Image */}
        <div>
          <Label className="text-white mb-2 block">Cover Image</Label>
          <div 
            className={`relative h-48 rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
              formData.cover_image 
                ? 'border-violet-500/50' 
                : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            {formData.cover_image ? (
              <img 
                src={formData.cover_image} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <Upload className="h-8 w-8 mb-2" />
                <span className="text-sm">Click to upload cover image</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {uploading && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
              </div>
            )}
          </div>
        </div>

        {/* Name & Description */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name..."
              className="mt-2 bg-slate-900/50 border-slate-700 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your campaign setting..."
              className="mt-2 bg-slate-900/50 border-slate-700 text-white min-h-[100px]"
            />
          </div>
        </div>

        {/* Campaign Mode */}
        <div>
          <Label className="text-white mb-4 block">Campaign Mode</Label>
          <RadioGroup 
            value={formData.mode} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value }))}
            className="grid gap-4 md:grid-cols-2"
          >
            <Label htmlFor="dm_present" className="cursor-pointer">
              <Card className={`bg-slate-900/50 border-2 transition-all ${
                formData.mode === 'dm_present' 
                  ? 'border-emerald-500 bg-emerald-500/5' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <RadioGroupItem value="dm_present" id="dm_present" className="mt-1" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-emerald-400" />
                      <span className="font-medium text-white">DM is in the house</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Human DM runs sessions with full control over the narrative
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Label>

            <Label htmlFor="dm_absent" className="cursor-pointer">
              <Card className={`bg-slate-900/50 border-2 transition-all ${
                formData.mode === 'dm_absent' 
                  ? 'border-amber-500 bg-amber-500/5' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <RadioGroupItem value="dm_absent" id="dm_absent" className="mt-1" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      <span className="font-medium text-white">DM is out of office</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      AI DM takes over using campaign context and documents
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </RadioGroup>
          </div>

          {/* Long Campaign Mode */}
          {formData.mode === 'dm_absent' && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.long_campaign_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, long_campaign_mode: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <p className="text-white font-medium">Long Campaign Mode</p>
                <p className="text-sm text-slate-400">Seren conducts an onboarding interview and narrates with rich detail for extended sessions</p>
              </div>
            </label>
          </div>
          )}

          {/* Tone Preset */}
        <div>
          <Label className="text-white mb-4 block">Campaign Tone *</Label>
          <p className="text-sm text-slate-400 mb-4">
            This shapes the AI's storytelling style and cannot be changed easily after creation.
          </p>
          <RadioGroup 
            value={customTone ? 'custom' : formData.tone} 
            onValueChange={(value) => {
              if (value === 'custom') {
                setCustomTone(true);
              } else {
                setCustomTone(false);
                setFormData(prev => ({ ...prev, tone: value, tone_description: '' }));
              }
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            {tones.map((tone) => (
              <Label key={tone.id} htmlFor={tone.id} className="cursor-pointer">
                <Card className={`bg-slate-900/50 border-2 transition-all overflow-hidden ${
                  (tone.id === 'custom' ? customTone : (!customTone && formData.tone === tone.id))
                    ? `${tone.borderColor} bg-opacity-10` 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <div className={`h-2 bg-gradient-to-r ${tone.color}`} />
                  <CardContent className="p-4 flex items-start gap-4">
                    <RadioGroupItem value={tone.id} id={tone.id} className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <tone.icon className="h-5 w-5 text-slate-300" />
                        <span className="font-medium text-white">{tone.name}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {tone.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>

          {customTone && (
            <div className="mt-4 p-4 rounded-xl border border-pink-500/30 bg-pink-500/5 space-y-3">
              <Label className="text-white text-sm">Describe your campaign's tone</Label>
              <Textarea
                value={formData.tone_description}
                onChange={(e) => setFormData(prev => ({ ...prev, tone_description: e.target.value }))}
                placeholder="e.g. A swashbuckling pirate adventure with dark humor and morally grey heroes..."
                className="bg-slate-900/50 border-slate-700 text-white min-h-[80px]"
              />
              <Button
                type="button"
                onClick={handleResolveCustomTone}
                disabled={resolvingTone || !formData.tone_description.trim()}
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                {resolvingTone ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Analyzing...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" />Let AI decide</>
                )}
              </Button>
              {resolvingTone === false && formData.tone_description && !customTone && (
                <p className="text-xs text-emerald-400">Tone resolved!</p>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => navigate(createPageUrl('Campaigns'))}
            className="border-slate-700 text-slate-300"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.tone || customTone}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}