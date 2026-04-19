import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Activity, MapPin, Lock } from 'lucide-react';
import { API_BASE, SEVERITY_COLORS } from './config';
import { socket } from './socket';
import VictimCard from './components/VictimCard';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/login/LoginPage';
import VictimCardPage from './pages/login/VictimCardPage';

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const VictimsPage = lazy(() => import('./pages/dashboard/Victims'));
const HospitalsPage = lazy(() => import('./pages/dashboard/Hospitals'));
const AmbulancesPage = lazy(() => import('./pages/dashboard/Ambulances'));
const IncidentsPage = lazy(() => import('./pages/dashboard/Incidents'));
const SettingsPage = lazy(() => import('./pages/dashboard/Settings'));
const SimulatePage = lazy(() => import('./pages/dashboard/Simulate'));

function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'admin');
  const [userEmail, setUserEmail] = useState('');
  const [muted, setMuted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);

  const [victims, setVictims] = useState([]);
  const [mapVictims, setMapVictims] = useState([]);
  const [victimsMeta, setVictimsMeta] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [filterSeverity, setFilterSeverity] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIncident, setActiveIncident] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const apiFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (res.status === 401) {
      setToken(null);
      setUserRole(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    }
    return res;
  }, [token]);

  const handleLogin = async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        setUserRole(data.role);
        setUserEmail(email);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userRole', data.role);
        navigate('/dashboard');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch {
      alert('Connection refused');
    }
  };

  const handleRegister = async ({ name, email, password, role }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (res.ok) {
        await handleLogin({ email, password });
      } else {
        const data = await res.json();
        alert(data.error || 'Registration failed');
      }
    } catch {
      alert('Connection refused');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const fetchAll = useCallback(async () => {
    if (!activeIncident) return;
    try {
      setLoading(true);
      const severityParam = filterSeverity !== null ? `&severity=${filterSeverity}` : '';
      const [vRes, mapVRes, cRes, hRes, aRes] = await Promise.all([
        apiFetch(`${API_BASE}/victims?page=1&limit=${victimsMeta.limit}${severityParam}&incident_id=${activeIncident}`),
        apiFetch(`${API_BASE}/victims?limit=200&incident_id=${activeIncident}`),
        apiFetch(`${API_BASE}/clusters?incident_id=${activeIncident}`),
        apiFetch(`${API_BASE}/hospitals`),
        apiFetch(`${API_BASE}/ambulances`),
      ]);
      if (vRes.ok && mapVRes.ok && cRes.ok && hRes.ok && aRes.ok) {
        const [vData, mapVData, cData, hData, aData] = await Promise.all([
          vRes.json(), mapVRes.json(), cRes.json(), hRes.json(), aRes.json(),
        ]);
        setVictims(vData.victims.map(v => ({ ...v, severity: v.triage_level })));
        setVictimsMeta({ total: vData.total, page: vData.page, pages: vData.pages, limit: vData.limit });
        setMapVictims(mapVData.victims.map(v => ({ ...v, severity: v.triage_level })));
        setClusters(cData);
        setHospitals(hData);
        setAmbulances(aData);
      }
    } catch (error) {
      console.error('Fetch all failed:', error);
    } finally {
      setLoading(false);
    }
  }, [activeIncident, filterSeverity, victimsMeta.limit, apiFetch]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_BASE}/incidents`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setIncidents(data);
        if (data && data.length > 0 && !activeIncident) setActiveIncident(data[0].id);
      });
  }, [token, apiFetch]);

  useEffect(() => {
    if (!token || !activeIncident) return;
    fetchAll();

    socket.connect();

    socket.on('victim_ingested', (victim) => {
      if (victim.incident_id !== activeIncident) return;
      const enriched = { ...victim, severity: victim.triage_level };
      if (filterSeverity === null || enriched.triage_level === parseInt(filterSeverity)) {
        setVictims(prev => [enriched, ...prev].slice(0, victimsMeta.limit));
      }
      setMapVictims(prev => [enriched, ...prev].slice(0, 200));
    });

    socket.on('victim_assigned', ({ victim_id }) => {
      setVictims(prev => prev.map(v => v.id === victim_id ? { ...v, status: 'assigned' } : v));
    });

    socket.on('ambulance_updated', ({ amb_id, status, assigned_victim }) => {
      setAmbulances(prev => prev.map(a => a.id === amb_id ? { ...a, status, assigned_victim } : a));
    });

    socket.on('hospital_replenished', ({ hospital_id, available_beds }) => {
      setHospitals(prev => prev.map(h => h.id === hospital_id ? { ...h, available_beds } : h));
    });

    return () => { socket.off(); socket.disconnect(); };
  }, [token, activeIncident, fetchAll, filterSeverity, victimsMeta.limit]);

  useEffect(() => {
    if (!token || !activeIncident) return;
    const fallback = setInterval(fetchAll, 30000);
    return () => clearInterval(fallback);
  }, [token, activeIncident, fetchAll]);

  const handleAssign = async (victimId) => {
    setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'assigned' } : v));
    const res = await apiFetch(`${API_BASE}/assign/${victimId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'unassigned' } : v));
      alert(data.error || 'Dispatch failed');
    }
  };

  const handleDischarge = async (victimId, hospitalName) => {
    const origVictims = [...victims];
    const origHospitals = [...hospitals];
    setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'discharged' } : v));
    if (hospitalName && hospitalName !== 'Waitlisted') {
      setHospitals(prev => prev.map(h =>
        h.name === hospitalName ? { ...h, available_beds: Math.min(h.available_beds + 1, h.total_beds) } : h
      ));
    }
    const res = await apiFetch(`${API_BASE}/victims/${victimId}/discharge`, { method: 'PATCH' });
    if (!res.ok) {
      const data = await res.json();
      setVictims(origVictims);
      setHospitals(origHospitals);
      alert(data.error || 'Discharge failed');
    }
  };

  const handleReplenish = async (hospitalId, beds) => {
    const origHospitals = [...hospitals];
    setHospitals(prev => prev.map(h =>
      h.id === hospitalId ? { ...h, available_beds: Math.min(h.available_beds + parseInt(beds), h.total_beds) } : h
    ));
    const res = await apiFetch(`${API_BASE}/hospitals/${hospitalId}/replenish`, {
      method: 'POST',
      body: JSON.stringify({ beds }),
    });
    if (!res.ok) {
      const data = await res.json();
      setHospitals(origHospitals);
      alert(data.error || 'Replenish failed');
    }
  };

  const planRoute = async (ambulance) => {
    setRouteLoading(true);
    setSelectedAmbulance(ambulance.id);
    try {
      const res = await apiFetch(`${API_BASE}/responder/route`, {
        method: 'POST',
        body: JSON.stringify({ ambulance_id: ambulance.id, lat: ambulance.lat, lng: ambulance.lng, radius_km: 15, incident_id: activeIncident }),
      });
      const data = await res.json();
      if (res.ok) setActiveRoute(data.route);
      else alert(data.error || 'Could not plan route');
    } catch (error) {
      console.error('Route planning failed:', error);
    } finally {
      setRouteLoading(false);
    }
  };

  if (!token && location.pathname !== '/victim/:id') {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} isRegistering={false} setIsRegistering={() => {}} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
        <Route path="/victim/:id" element={<VictimCardPage />} />
        <Route path="/dashboard" element={
          <MainLayout
            activeIncident={activeIncident}
            incidents={incidents}
            onIncidentChange={setActiveIncident}
            muted={muted}
            onMuteToggle={() => setMuted(!muted)}
            userRole={userRole}
            onLogout={handleLogout}
          />
        }>
          <Route index element={
            <DashboardPage
              victims={victims}
              mapVictims={mapVictims}
              clusters={clusters}
              hospitals={hospitals}
              ambulances={ambulances}
              selectedAmbulance={selectedAmbulance}
              routeLoading={routeLoading}
              planRoute={planRoute}
              clearRoute={() => { setActiveRoute(null); setSelectedAmbulance(null); }}
              activeRoute={activeRoute}
              severityColors={SEVERITY_COLORS}
              filterSeverity={filterSeverity}
              onFilterSeverity={setFilterSeverity}
              onAssign={handleAssign}
              onDischarge={handleDischarge}
              token={token}
            />
          } />
          <Route path="victims" element={
            <VictimsPage 
              token={token}
              activeIncident={activeIncident}
              onAssign={handleAssign}
              onDischarge={handleDischarge}
            />
          } />
          <Route path="hospitals" element={
            <HospitalsPage 
              token={token}
              onReplenish={handleReplenish}
              userRole={userRole}
            />
          } />
          <Route path="ambulances" element={
            <AmbulancesPage 
              token={token}
              onRoutePlan={planRoute}
              activeIncident={activeIncident}
            />
          } />
          <Route path="incidents" element={
            <IncidentsPage 
              token={token}
              activeIncident={activeIncident}
              onIncidentChange={setActiveIncident}
              userRole={userRole}
            />
          } />
          <Route path="settings" element={
            <SettingsPage
              token={token}
              notificationsEnabled={notificationsEnabled}
              onNotificationsToggle={() => setNotificationsEnabled(!notificationsEnabled)}
              soundAlertsEnabled={soundAlertsEnabled}
              onSoundAlertsToggle={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
              userRole={userRole}
              userEmail={userEmail}
              onLogout={handleLogout}
            />
          } />
          <Route path="simulate" element={<SimulatePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export { App };