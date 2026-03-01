import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Sword, 
  Home, 
  User, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Scroll,
  Play,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      // Not logged in
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navItems = [
    { name: 'Home', page: 'Home', icon: Home },
    { name: 'My Campaigns', page: 'Campaigns', icon: Shield },
    { name: 'My Characters', page: 'Characters', icon: Scroll },
    { name: 'My NPCs', page: 'MyNPCs', icon: Sword },
    { name: 'My Library', page: 'MyLibrary', icon: BookOpen },
  ];
  
  // Detect campaign context for Session shortcut in nav
  const navUrlParams = new URLSearchParams(window.location.search);
  const activeCampaignId = navUrlParams.get('campaign_id') || navUrlParams.get('id');
  const isOnCampaignPage = !!(activeCampaignId);
  const sessionUrl = `/Session?campaign_id=${activeCampaignId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        :root {
          --color-primary: #7c3aed;
          --color-primary-dark: #5b21b6;
          --color-accent: #f59e0b;
          --color-surface: #1e293b;
          --color-surface-light: #334155;
        }
      `}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 group">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                <Sword className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                Kike's Dungeon
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {user && navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${currentPageName === item.page 
                      ? 'bg-violet-500/20 text-violet-300' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
              {user && isOnCampaignPage && (
                <Link
                  to={sessionUrl}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${currentPageName === 'Session' 
                      ? 'bg-violet-500/20 text-violet-300' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <Play className="h-4 w-4" />
                  Session
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-violet-600 text-white text-sm">
                          {(user.display_name || user.full_name || user.email)?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm text-white">
                        {user.display_name || user.full_name || 'Adventurer'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
                    <DropdownMenuItem onClick={() => navigate(createPageUrl('Profile'))} className="text-slate-300 focus:bg-slate-800">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-slate-800">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-400"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl">
            <nav className="px-4 py-3 space-y-1">
              {user && navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${currentPageName === item.page 
                      ? 'bg-violet-500/20 text-violet-300' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
              {user && isOnCampaignPage && (
                <Link
                  to={sessionUrl}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${currentPageName === 'Session' 
                      ? 'bg-violet-500/20 text-violet-300' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                >
                  <Play className="h-5 w-5" />
                  Session
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-950/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Sword className="h-4 w-4" />
              <span>Kike's Dungeon • DnD 5e Campaign Manager</span>
            </div>
            <div className="text-slate-600 text-sm">
              Roll for initiative!
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}