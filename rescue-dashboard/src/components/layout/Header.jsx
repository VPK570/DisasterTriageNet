import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Volume2, VolumeX, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function Header({
  activeIncident,
  incidents,
  onIncidentChange,
  muted,
  onMuteToggle,
  userRole,
  onLogout,
}) {
  return (
    <header className="h-16 glass-panel border-b flex items-center px-4 shrink-0">
      <Link to="/dashboard" className="flex items-center gap-3 mr-8">
        <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
          <AlertTriangle className="text-red-500" size={20} />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wider">Rescue Command</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Disaster Triage Network</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-4">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Active Incident</span>
        <select
          value={activeIncident || ''}
          onChange={(e) => onIncidentChange(e.target.value)}
          className="bg-slate-800 border-none text-blue-400 text-xs font-bold rounded px-3 py-1.5 outline-none ring-1 ring-slate-700"
        >
          {incidents.map((inc) => (
            <option key={inc.id} value={inc.id}>
              {inc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-green-900/50">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          <span className="text-green-400 font-bold uppercase tracking-wider">ML Active</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onMuteToggle}
          className={cn(muted ? 'bg-red-900/40 text-red-400' : 'text-slate-300')}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </Button>

        <Button variant="ghost" size="icon" className="text-slate-300 relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                  <User size={14} />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
            <DropdownMenuLabel className="text-slate-300">
              <div className="flex flex-col">
                <span className="font-bold">{userRole}</span>
                <span className="text-[10px] text-slate-500 font-normal">Command Center</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="text-slate-300">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem onClick={onLogout} className="text-red-400">
              <LogOut size={14} className="mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}