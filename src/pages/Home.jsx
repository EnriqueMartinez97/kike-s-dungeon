import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Sparkles, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
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
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
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

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.2]">
              Welcome to
              <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent overflow-visible pb-2">
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