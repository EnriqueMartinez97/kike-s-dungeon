import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, 
  Upload, 
  User,
  Save,
  Github,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney'
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    display_name: '',
    avatar_url: '',
    timezone: 'UTC'
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFormData({
        display_name: currentUser.display_name || currentUser.full_name || '',
        avatar_url: currentUser.avatar_url || '',
        timezone: currentUser.timezone || 'UTC'
      });
    } catch (e) {
      navigate(createPageUrl('Home'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: formData.display_name,
        avatar_url: formData.avatar_url,
        timezone: formData.timezone
      });
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="bg-slate-900/50 border-slate-800 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">Developer Tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white gap-2"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            <Github className="h-4 w-4" />
            GitHub Repository
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white gap-2"
            onClick={async () => {
              const chars = await base44.entities.Character.list();
              if (!chars.length) return;
              const keys = Object.keys(chars[0]).filter(k => k !== 'edit_history');
              const escape = (v) => {
                const s = v == null ? '' : String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
              };
              const rows = [keys.join(','), ...chars.map(c => keys.map(k => escape(typeof c[k] === 'object' ? JSON.stringify(c[k]) : c[k])).join(','))];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'characters.csv'; a.click();
            }}
          >
            <Download className="h-4 w-4" />
            Export Characters CSV
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="bg-violet-600 text-white text-2xl">
                    {formData.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                  <Upload className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-medium">{user?.email}</p>
                <p className="text-sm text-slate-400">Click avatar to upload new image</p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="display_name" className="text-white">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Enter your display name..."
                className="mt-2 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Timezone */}
            <div>
              <Label htmlFor="timezone" className="text-white">Timezone</Label>
              <Select 
                value={formData.timezone} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-slate-300 focus:bg-slate-800">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <Button 
                type="submit"
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}