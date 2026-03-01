import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Sword, 
  Shield, 
  Scroll, 
  Users, 
  Sparkles, 
  BookOpen,
  Dice6,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const memberships = await base44.entities.CampaignMembership.filter({ user_id: currentUser.id });
        if (memberships.length > 0) {
          const campaignIds = memberships.map(m => m.campaign_id);
          const allCampaigns = await base44.entities.Campaign.list();
          setCampaigns(allCampaigns.filter(c => campaignIds.includes(c.id)).slice(0, 3));
        }
      }
    } catch (e) {
      // Not logged in
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Campaign Management',
      description: 'Create and manage your DnD 5e campaigns with ease. Track everything in one place.'
    },
    {
      icon: Scroll,
      title: 'Character Sheets',
      description: 'Full 5e character sheets with auto-calculations, level-up guidance, and edit history.'
    },
    {
      icon: Users,
      title: 'Multiplayer Sessions',
      description: 'Real-time session management with presence tracking and shared dice rolling.'
    },
    {
      icon: Sparkles,
      title: 'AI Dungeon Master',
      description: 'When your DM is unavailable, let AI take over with full context awareness.'
    },
    {
      icon: BookOpen,
      title: 'Document Library',
      description: 'Upload lore, maps, and notes. Control visibility between DM and players.'
    },
    {
      icon: Dice6,
      title: 'Dice Roller',
      description: 'Roll any dice with custom formulas. Share rolls with your party in real-time.'
    }
  ];

  const tonePresets = [
    { id: 'grimdark', name: 'Grimdark', color: 'from-slate-600 to-slate-800' },
    { id: 'heroic_fantasy', name: 'Heroic Fantasy', color: 'from-amber-500 to-orange-600' },
    { id: 'mystery', name: 'Mystery', color: 'from-violet-600 to-purple-800' },
    { id: 'political_intrigue', name: 'Political Intrigue', color: 'from-emerald-600 to-teal-800' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
              <Sparkles className="h-4 w-4" />
              <span>Now with AI Dungeon Master</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Kike's Dungeon
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              The ultimate DnD 5e campaign manager. Run epic adventures with your party, 
              manage characters, and let AI take over when your DM needs a break.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Button 
                    size="lg"
                    onClick={() => navigate(createPageUrl('CreateCampaign'))}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-xl shadow-violet-500/25"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Campaign
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => navigate(createPageUrl('Campaigns'))}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg"
                  >
                    View My Campaigns
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg"
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-xl shadow-violet-500/25"
                  >
                    Get Started
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => base44.auth.redirectToLogin()}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recent Campaigns (if logged in) */}
      {user && campaigns.length > 0 && (
        <section className="py-16 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Your Recent Campaigns</h2>
              <Link 
                to={createPageUrl('Campaigns')}
                className="text-violet-400 hover:text-violet-300 text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Link key={campaign.id} to={createPageUrl(`CampaignDetail?id=${campaign.id}`)}>
                  <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-violet-600/20 to-purple-600/20 relative">
                      {campaign.cover_image && (
                        <img src={campaign.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          campaign.mode === 'dm_present' 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {campaign.mode === 'dm_present' ? 'DM Present' : 'AI DM'}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {campaign.description || 'No description'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Your Recent Campaigns</h2>
              <Link 
                to={createPageUrl('Campaigns')}
                className="text-violet-400 hover:text-violet-300 text-sm font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Link key={campaign.id} to={createPageUrl(`CampaignDetail?id=${campaign.id}`)}>
                  <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all group overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-violet-600/20 to-purple-600/20 relative">
                      {campaign.cover_image && (
                        <img src={campaign.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          campaign.mode === 'dm_present' 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {campaign.mode === 'dm_present' ? 'DM Present' : 'AI DM'}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {campaign.description || 'No description'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Run Epic Campaigns
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From character creation to session management, we've got you covered with 
              powerful tools designed for DnD 5e.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full bg-slate-900/30 border-slate-800 hover:border-slate-700 transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tone Presets Section */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Set the Tone for Your Adventure
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Choose a campaign tone that shapes the AI's storytelling style and narrative approach.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {tonePresets.map((tone) => (
              <div
                key={tone.id}
                className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${tone.color} cursor-default group`}
              >
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold text-white mb-1">{tone.name}</h3>
                  <p className="text-white/70 text-sm">
                    {tone.id === 'grimdark' && 'Dark, gritty, and morally complex'}
                    {tone.id === 'heroic_fantasy' && 'Classic heroism and epic quests'}
                    {tone.id === 'mystery' && 'Intrigue, secrets, and investigation'}
                    {tone.id === 'political_intrigue' && 'Power struggles and diplomacy'}
                  </p>
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sword className="h-12 w-12 text-violet-400 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Begin Your Adventure?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Create your first campaign, invite your party, and start rolling for initiative.
          </p>
          <Button 
            size="lg"
            onClick={() => user ? navigate(createPageUrl('CreateCampaign')) : base44.auth.redirectToLogin()}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-xl shadow-violet-500/25"
          >
            {user ? 'Create Your Campaign' : 'Get Started Free'}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}