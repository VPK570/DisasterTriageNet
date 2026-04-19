import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/victims', icon: Users, label: 'Victims' },
  { to: '/dashboard/hospitals', icon: Building2, label: 'Hospitals' },
  { to: '/dashboard/ambulances', icon: Truck, label: 'Ambulances' },
  { to: '/dashboard/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/dashboard/simulate', icon: Play, label: 'Simulate' },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={cn(
        'h-full glass-panel border-r flex flex-col shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex items-center gap-3 p-4 border-b border-slate-700/50', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="text-red-500" size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate uppercase tracking-wider">Rescue</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Command Center</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-2 border-t border-slate-700/50">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )
          }
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </NavLink>
      </div>

      <div className="p-2 border-t border-slate-700/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn('w-full justify-center', collapsed && 'px-0')}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
    </aside>
  );
}