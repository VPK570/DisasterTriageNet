import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({
  activeIncident,
  incidents,
  onIncidentChange,
  muted,
  onMuteToggle,
  userRole,
  onLogout,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden bg-radial-at-tl from-slate-900 via-slate-950 to-slate-950">
      <Header
        activeIncident={activeIncident}
        incidents={incidents}
        onIncidentChange={onIncidentChange}
        muted={muted}
        onMuteToggle={onMuteToggle}
        userRole={userRole}
        onLogout={onLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}