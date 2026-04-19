import React from 'react';
import { Bell, Volume2, User, Shield, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_BASE } from '@/config';

export default function Settings({
  token,
  notificationsEnabled,
  onNotificationsToggle,
  soundAlertsEnabled,
  onSoundAlertsToggle,
  userRole,
  userEmail,
  onLogout,
}) {
  const [refreshInterval, setRefreshInterval] = React.useState(30);
  const [saving, setSaving] = React.useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('refreshInterval', refreshInterval.toString());
      localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
      localStorage.setItem('soundAlertsEnabled', soundAlertsEnabled.toString());
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplay = () => {
    switch (userRole) {
      case 'admin':
        return 'Command Admin';
      case 'responder':
        return 'Field Responder';
      default:
        return 'User';
    }
  };

  const getInitials = () => {
    if (userEmail) {
      return userEmail.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <h2 className="text-xl font-bold text-slate-100 mb-6">Settings</h2>

      <div className="max-w-2xl space-y-6">
        <div className="glass-panel p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Push Notifications</p>
                  <p className="text-xs text-slate-500">
                    Receive browser notifications for critical events
                  </p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={onNotificationsToggle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 size={20} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Sound Alerts</p>
                  <p className="text-xs text-slate-500">
                    Play audio alerts for new critical victims
                  </p>
                </div>
              </div>
              <Switch
                checked={soundAlertsEnabled}
                onCheckedChange={onSoundAlertsToggle}
              />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">User Information</h3>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-slate-700 text-slate-300 text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium text-slate-200">
                  {getRoleDisplay()}
                </p>
                <Shield size={16} className="text-blue-400" />
              </div>
              <p className="text-sm text-slate-400">{userEmail || 'Not logged in'}</p>
              <p className="text-xs text-slate-500">Role: {userRole || 'unknown'}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Display Settings</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-400 mb-2 block">Dashboard Refresh Interval</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={10}
                  max={300}
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                  className="w-24 bg-slate-800 border-slate-700"
                />
                <span className="text-sm text-slate-400">seconds</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                How often to refresh dashboard data (10-300 seconds)
              </p>
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Account</h3>
          <div className="space-y-4">
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}