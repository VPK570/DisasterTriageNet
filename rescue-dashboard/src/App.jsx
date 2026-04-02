import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import VictimCard from './components/VictimCard';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Activity, MapPin, Truck, Hospital, QrCode,
  Users,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lock
} from "lucide-react";

// --- CONFIGURATION & ICONS ---
const API_BASE_URL = "http://127.0.0.1:5001/api";

const severityColors = {
  0: '#22c55e', // Low - Green
  1: '#eab308', // Moderate - Yellow
  2: '#3b82f6', // High - Blue
  3: '#ef4444'  // Critical - Red
};

const createIcon = (color) => L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// --- COMPONENTS ---
const IncidentTimeline = ({ victims, colors }) => {
  if (victims.length === 0) return null;
  const sorted = [...victims].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const earliest = new Date(sorted[0].timestamp).getTime();
  const latest = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const duration = latest - earliest || 1;

  const data = sorted.map(v => ({
    time: (new Date(v.timestamp).getTime() - earliest) / 60000, // minutes
    severity: v.severity,
    id: v.id,
    displayTime: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }));

  return (
    <div className="flex-1 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex flex-col">
      <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Incident Timeline (Arrivals)</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <XAxis type="number" dataKey="time" hide />
            <YAxis type="number" dataKey="severity" hide domain={[0, 4]} />
            <ZAxis range={[50, 400]} />
            <RechartsTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl">
                      <p className="text-[10px] font-bold text-white">{d.id}</p>
                      <p className="text-[9px] text-slate-400">{d.displayTime}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Victims" data={data}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[entry.severity]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-[8px] text-slate-600 mt-1 uppercase font-bold px-2">
        <span>T=0:00</span>
        <span>{Math.round(duration / 60000)} mins elapsed</span>
      </div>
    </div>
  );
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userRole, setUserRole] = useState(localStorage.getItem("userRole") || 'admin');

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      }
    });

    if (res.status === 401) {
      alert(`API 401 Unauthorized on: ${url}. Logging out.`);
      setToken(null);
      setUserRole(null);
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
    }

    return res;
  };

  const [victims, setVictims] = useState([]);
  const [mapVictims, setMapVictims] = useState([]);
  const [victimsMeta, setVictimsMeta] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [qrData, setQrData] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const prevVictimIdsRef = useRef(new Set());

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState("responder");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        setUserRole(data.role);
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userRole", data.role);
        alert("Login success! Dashboard loading...");
      } else {
        setLoginError(data.error || "Login failed");
        alert(`Login Failed: ${data.error}`);
      }
    } catch (err) {
      setLoginError("Connection refused");
      alert("Login Connection Refused");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName,
          email: loginEmail,
          password: loginPassword,
          role: registerRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Automatically log them in by triggering the login flow
        await handleLogin(e);
      } else {
        setLoginError(data.error || "Registration failed");
      }
    } catch (err) {
      setLoginError("Connection refused");
    }
  };

  const playAlertTone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.2);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.25);
      });
    } catch (err) {
      console.warn("Audio alert failed:", err);
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const severityParam = filterSeverity !== null ? `&severity=${filterSeverity}` : "";

      const [vRes, mapVRes, cRes, hRes, aRes, incRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/victims?page=${currentPage}&limit=${victimsMeta.limit}${severityParam}&incident_id=${activeIncident}`),
        apiFetch(`${API_BASE_URL}/victims?limit=200&incident_id=${activeIncident}`),
        apiFetch(`${API_BASE_URL}/clusters?incident_id=${activeIncident}`),
        apiFetch(`${API_BASE_URL}/hospitals`),
        apiFetch(`${API_BASE_URL}/ambulances`),
        apiFetch(`${API_BASE_URL}/incidents`)
      ]);

      if (vRes.ok && mapVRes.ok && cRes.ok && hRes.ok && aRes.ok && incRes.ok) {
        const [vData, mapVData, cData, hData, aData, incData] = await Promise.all([
          vRes.json(),
          mapVRes.json(),
          cRes.json(),
          hRes.json(),
          aRes.json(),
          incRes.json()
        ]);

        setVictims(vData.victims.map(v => ({ ...v, severity: v.triage_level })));
        setVictimsMeta({
          total: vData.total,
          page: vData.page,
          pages: vData.pages,
          limit: vData.limit
        });
        setMapVictims(mapVData.victims.map(v => ({ ...v, severity: v.triage_level })));
        setClusters(cData);
        setHospitals(hData);
        setAmbulances(aData);
        setIncidents(incData);
      }
    } catch (error) {
      console.error("Fetch all failed:", error);
    } finally {
      setLoading(false);
    }
  }, [activeIncident, currentPage, filterSeverity, victimsMeta.limit, apiFetch]);

  // Feature 2: WebSocket Real-Time Push
  useEffect(() => {
    if (!token || !activeIncident) return; // Do not fetch or connect sockets without a token and an incident

    fetchAll(); // Initial load

    const socket = io(API_BASE_URL.replace('/api', ''));

    socket.on("victim_ingested", (victim) => {
      // Prepend to sidebar if filters match
      if (victim.incident_id === activeIncident) {
        const enrichedVictim = { ...victim, severity: victim.triage_level };
        const matchesSeverity = filterSeverity === null || enrichedVictim.triage_level === parseInt(filterSeverity);
        if (matchesSeverity) {
          setVictims(prev => [enrichedVictim, ...prev].slice(0, victimsMeta.limit));
          setVictimsMeta(prev => ({ ...prev, total: prev.total + 1 }));
        }

        // Always add to map
        setMapVictims(prev => [enrichedVictim, ...prev].slice(0, 200));

        if (!muted) playAlertTone();

        if (victim.triage_level === 3) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🚨 CRITICAL VICTIM ARRIVING", {
              body: `Victim ${victim.id} — assigned to ${victim.hospital_assigned || "unassigned"}`,
              icon: "/vite.svg",
              tag: victim.id,
              requireInteraction: true,
            });
          }
        }
      }
    });

    socket.on("clusters_updated", (data) => {
      if (data.incident_id === activeIncident) {
        // No full fetchAll needed, clusters will be updated on next poll or specific handler
      }
    });

    // Immediately remove dispatched victims from the feed without a full refresh
    socket.on("victim_assigned", ({ victim_id, ambulance_id }) => {
      setVictims(prev => prev.map(v => v.id === victim_id ? { ...v, status: 'assigned' } : v));
      setMapVictims(prev => prev.map(v => v.id === victim_id ? { ...v, status: 'assigned' } : v));
    });

    // Update ambulance status in real-time without a full refresh
    socket.on("ambulance_updated", ({ amb_id, status, assigned_victim }) => {
      setAmbulances(prev => prev.map(a =>
        a.id === amb_id ? { ...a, status, assigned_victim } : a
      ));
    });

    socket.on("victim_discharged", ({ victim_id, hospital }) => {
      setVictims(prev => prev.map(v =>
        v.id === victim_id ? { ...v, status: 'discharged' } : v
      ));
      if (hospital) {
        setHospitals(prev => prev.map(h =>
          h.id === hospital.id ? { ...h, available_beds: hospital.available_beds } : h
        ));
      }
    });

    socket.on("hospital_replenished", ({ hospital_id, available_beds }) => {
      setHospitals(prev => prev.map(h =>
        h.id === hospital_id ? { ...h, available_beds } : h
      ));
    });

    return () => socket.disconnect();
  }, [muted, activeIncident, token]);

  // Fallback 30-second poll
  useEffect(() => {
    if (!token || !activeIncident) return;
    const fallback = setInterval(fetchAll, 30000);
    return () => clearInterval(fallback);
  }, [token, activeIncident]);

  // Fetch Incidents on mount and login
  useEffect(() => {
    if (!token) return;
    apiFetch(`${API_BASE_URL}/incidents`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setIncidents(data);
        if (data && data.length > 0 && !activeIncident) {
          setActiveIncident(data[0].id);
        }
      })
      .catch(console.error);
  }, [token, activeIncident]); // Added activeIncident to dependencies to avoid warnings

  // Feature 3: On mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleAssign = async (victimId) => {
    try {
      // Optimistic update
      setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'assigned' } : v));

      const res = await apiFetch(`${API_BASE_URL}/assign/${victimId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        // Rollback
        setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'unassigned' } : v));
        alert(data.error || "Dispatch failed");
      }
    } catch (error) {
      console.error("Assign failed:", error);
    }
  };

  const handleDischarge = async (victimId, hospitalName) => {
    const originalVictims = [...victims];
    const originalHospitals = [...hospitals];

    try {
      // Optimistic update
      setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'discharged' } : v));
      if (hospitalName && hospitalName !== 'Waitlisted') {
        setHospitals(prev => prev.map(h => {
          if (h.name === hospitalName) {
            return { ...h, available_beds: Math.min(h.available_beds + 1, h.total_beds) };
          }
          return h;
        }));
      }

      const res = await apiFetch(`${API_BASE_URL}/victims/${victimId}/discharge`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json();
        // Rollback
        setVictims(originalVictims);
        setHospitals(originalHospitals);
        alert(data.error || "Discharge failed");
      }
    } catch (error) {
      console.error("Discharge failed:", error);
      setVictims(originalVictims);
      setHospitals(originalHospitals);
    }
  };

  const handleReplenish = async (hospitalId, beds) => {
    const originalHospitals = [...hospitals];
    try {
      // Optimistic update
      setHospitals(prev => prev.map(h => {
        if (h.id === hospitalId) {
          return { ...h, available_beds: Math.min(h.available_beds + parseInt(beds), h.total_beds) };
        }
        return h;
      }));

      const res = await apiFetch(`${API_BASE_URL}/hospitals/${hospitalId}/replenish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beds })
      });

      if (!res.ok) {
        const data = await res.json();
        setHospitals(originalHospitals);
        alert(data.error || "Replenish failed");
      }
    } catch (error) {
      console.error("Replenish failed:", error);
      setHospitals(originalHospitals);
    }
  };

  const planRoute = async (ambulance) => {
    setRouteLoading(true);
    setSelectedAmbulance(ambulance.id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/responder/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambulance_id: ambulance.id,
          lat: ambulance.lat,
          lng: ambulance.lng,
          radius_km: 15,
          incident_id: activeIncident,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRoute(data.route);
      } else {
        alert(data.error || "Could not plan route");
      }
    } catch (error) {
      console.error("Route planning failed:", error);
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setActiveRoute(null);
    setSelectedAmbulance(null);
  };

  const fetchQr = async (victimId) => {
    if (qrData[victimId]) {
      setQrData(d => {
        const next = { ...d };
        delete next[victimId];
        return next;
      });
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/victims/${victimId}/qr`);
      if (res.ok) {
        const data = await res.json();
        if (data.qr_base64) {
          setQrData(d => ({ ...d, [victimId]: data.qr_base64 }));
        } else {
          console.error("QR generation failed:", data.error);
        }
      } else {
        const errorData = await res.json();
        console.error("QR Fetch failed:", errorData.error || res.statusText);
      }
    } catch (err) {
      console.error("QR Fetch Error:", err);
    }
  };

  // --- ROUTING ---
  const path = window.location.pathname;
  const victimMatch = path.match(/^\/victim\/(V-[a-zA-Z0-9]+)$/);
  if (victimMatch) {
    return <VictimCard victimId={victimMatch[1]} />;
  }
  // --- CHART DATA PREP ---
  const severityData = [
    { name: 'Low', value: victims.filter(v => v.severity === 0).length, color: severityColors[0] },
    { name: 'Moderate', value: victims.filter(v => v.severity === 1).length, color: severityColors[1] },
    { name: 'High', value: victims.filter(v => v.severity === 2).length, color: severityColors[2] },
    { name: 'Critical', value: victims.filter(v => v.severity === 3).length, color: severityColors[3] },
  ];

  if (!token) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-panel p-8 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
              <Lock className="text-blue-400" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-100 tracking-wider">SECURE ACCESS</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Disaster Triage Network</p>
          </div>

          <div className="flex bg-slate-900 border border-slate-700/50 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setIsRegistering(false); setLoginError(""); }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded-md transition-all ${!isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsRegistering(true); setLoginError(""); }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded-md transition-all ${isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email / Responder ID</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder={isRegistering ? "john@disaster.net" : "admin@disaster.net"}
                required
              />
            </div>
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role Assignment</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                >
                  <option value="responder">Field Responder</option>
                  <option value="admin">Command Admin</option>
                  <option value="victim">Civilian Victim</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Passcode</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center py-2">{loginError}</p>
            )}

            <button
              type="submit"
              className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest mt-4 ${isRegistering ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
            >
              {isRegistering ? "Create Clearance" : "Authenticate & Enter"}
            </button>

            {!isRegistering && (
              <div className="mt-6 text-center">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Default Credentials:</p>
                <p className="text-[10px] text-slate-500 mt-1">Admin: admin@disaster.net / admin123</p>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden bg-radial-at-tl from-slate-900 via-slate-950 to-slate-950">
      {/* HEADER */}
      <header className="h-16 glass-panel border-b flex items-center px-8 shrink-0 shadow-2xl z-20 sticky top-0">
        <AlertTriangle className="text-red-500 mr-3" size={24} />
        <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">Chennai AI Triage Command</h1>

        <div className="ml-8 border-l border-slate-700 pl-8 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Active Episode</span>
          <select
            value={activeIncident}
            onChange={(e) => setActiveIncident(e.target.value)}
            className="bg-slate-800 border-none text-blue-400 text-xs font-bold rounded px-3 py-1 outline-none ring-1 ring-slate-700"
          >
            {incidents.map(inc => (
              <option key={inc.id} value={inc.id}>{inc.name} ({inc.id})</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-4">
          <span className="flex items-center text-sm bg-slate-800 px-3 py-1 rounded-full border border-green-900/50">
            <Activity size={16} className="mr-2 text-green-400 animate-pulse" />
            ML ENGINE ACTIVE
          </span>

          <button
            onClick={() => setMuted(!muted)}
            className={`p-2 rounded-full transition-colors ${muted ? 'bg-red-900/40 text-red-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            title={muted ? "Unmute Alerts" : "Mute Alerts"}
          >
            {muted ? <Activity size={18} className="rotate-45" /> : <Activity size={18} />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - METRICS */}
        <aside className="w-72 glass-panel border-r p-6 flex flex-col gap-8 shrink-0 z-10 overflow-y-auto custom-scrollbar">
          <section>
            <h2 className="text-[10px] uppercase text-slate-500 font-black mb-4 tracking-[0.2em]">Live Status Overview</h2>
            <div className="grid gap-4">
              <div className="glass-card p-5 rounded-2xl group cursor-default">
                <p className="text-4xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tabular-nums">{victims.length}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Ingested</p>
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl border-red-500/20 group cursor-default">
                <p className="text-4xl font-black text-red-500 group-hover:scale-110 transition-transform origin-left tabular-nums">
                  {victims.filter(v => v.severity === 3).length}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Critical Cases</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex-1 overflow-hidden flex flex-col min-h-0">
            <h2 className="text-[10px] uppercase text-slate-500 font-black mb-4 tracking-[0.2em]">Hospital Load</h2>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {hospitals.length === 0 ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-20 glass-card rounded-xl animate-pulse" />
                ))
              ) : (
                hospitals.map(h => (
                  <div key={h.id} className="glass-card p-4 rounded-xl border-l-4 border-l-blue-500/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-200 truncate pr-2 uppercase">{h.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-bold uppercase tracking-tight">{h.specialty}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tabular-nums ${h.eta_minutes < 15 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {h.eta_minutes ? `${h.eta_minutes}m` : '--'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900/50 h-2 rounded-full overflow-hidden border border-slate-700/30">
                      <div
                        className={`h-full transition-all duration-1000 ${h.available_beds / h.total_beds < 0.2 ? 'premium-gradient-red' : 'premium-gradient-blue'}`}
                        style={{ width: `${(h.available_beds / h.total_beds) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-black tracking-widest">
                      <span className="text-slate-500 uppercase">{h.available_beds} FREE</span>
                      <span className="text-blue-400">{Math.round((h.available_beds / h.total_beds) * 100)}%</span>
                    </div>

                    {userRole === 'admin' && h.available_beds === 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/30 flex gap-2">
                        <input
                          type="number"
                          placeholder="Beds"
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] w-16 text-white focus:outline-none focus:border-blue-500"
                          id={`replenish-input-${h.id}`}
                          defaultValue="5"
                        />
                        <button
                          onClick={() => {
                            const val = document.getElementById(`replenish-input-${h.id}`).value;
                            handleReplenish(h.id, val);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-3 py-1 rounded font-black uppercase tracking-tighter transition-all"
                        >
                          Replenish
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="shrink-0 pt-4 border-t border-slate-800/50">
            <h2 className="text-[10px] uppercase text-slate-500 font-black mb-4 tracking-[0.2em]">Deployment Status</h2>
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {ambulances.length === 0 ? (
                [1, 2].map(i => (
                  <div key={i} className="h-16 glass-card rounded-xl animate-pulse" />
                ))
              ) : (
                ambulances.map(amb => (
                  <div key={amb.id} className="glass-card p-3 rounded-xl border border-slate-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-blue-400" />
                        <span className="text-[11px] font-black text-slate-300 uppercase tabular-nums">{amb.id}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${amb.status.toLowerCase() === 'available' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {amb.status}
                      </span>
                    </div>
                    {amb.status.toLowerCase() === 'available' && (
                      <button
                        onClick={() => selectedAmbulance === amb.id ? clearRoute() : planRoute(amb)}
                        disabled={routeLoading && selectedAmbulance === amb.id}
                        className={`w-full mt-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all transform active:scale-95 ${selectedAmbulance === amb.id
                          ? "bg-orange-500/20 border border-orange-500/50 text-orange-400"
                          : "bg-slate-700/50 hover:bg-slate-600/80 text-slate-200 border border-slate-600/30"
                          }`}
                      >
                        {selectedAmbulance === amb.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <MapPin size={12} /> CLEAR MISSION
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2 text-blue-400">
                            {routeLoading && selectedAmbulance === amb.id ? "CALCULATING..." : <><Truck size={12} /> OPTIMIZE ROUTE</>}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* CENTER CONTENT */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* MAP SECTION */}
          <div className="flex-1 relative bg-slate-950">
            <MapContainer center={[13.0827, 80.2707]} zoom={12} className="h-full w-full">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

              {/* Active Route Rendering */}
              {activeRoute && (
                <>
                  <Polyline
                    positions={activeRoute.map(step => [step.lat, step.lng])}
                    pathOptions={{ color: '#fb923c', weight: 4, opacity: 0.8, dashArray: '10, 10' }}
                  />
                  {activeRoute.map((step, idx) => (
                    <CircleMarker
                      key={`step-${step.id}-${idx}`}
                      center={[step.lat, step.lng]}
                      radius={6}
                      pathOptions={{
                        fillColor: severityColors[step.triage_level],
                        color: 'white',
                        weight: 2,
                        fillOpacity: 1
                      }}
                    >
                      <Tooltip permanent direction="right">
                        <span className="text-[10px] font-bold">LEG {idx + 1}: {step.id}</span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </>
              )}

              {/* Heatmap for unassigned victims */}
              {victims.length > 0 && (
                <HeatmapLayer
                  points={victims.filter(v => v.status !== 'assigned')}
                  longitudeExtractor={(v) => v.lng}
                  latitudeExtractor={(v) => v.lat}
                  intensityExtractor={(v) => v.severity + 1}
                  radius={25} blur={15} max={4}
                />
              )}

              {/* DBSCAN Dynamic Clusters */}
              {clusters.map((c) => (
                <Circle
                  key={`cluster-${c.id}`}
                  center={[c.lat, c.lng]}
                  radius={c.radius || 200} // Fallback to 200m if radius is NaN
                  pathOptions={{
                    color: c.avg_severity > 2 ? '#ef4444' : '#f59e0b',
                    fillOpacity: 0.15,
                    dashArray: '5, 10',
                    weight: 1
                  }}
                >
                  <Tooltip direction="top" opacity={0.9}>
                    <div className="text-xs font-bold">ZONE {c.id}: {c.count} Victims</div>
                  </Tooltip>
                </Circle>
              ))}

              {/* Individual Victim Markers */}
              {victims.map((v) => (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={createIcon(severityColors[v.severity])} opacity={v.status === 'assigned' ? 0.3 : 1}>
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px] bg-slate-900 text-slate-100 rounded">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                        <span className="font-bold">{v.id}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchQr(v.id)}
                            className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"
                            title="Generate QR"
                          >
                            <QrCode size={14} />
                          </button>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded">AGE: {v.age}</span>
                        </div>
                      </div>

                      {qrData[v.id] && (
                        <div className="bg-white p-2 mb-3 rounded flex flex-col items-center">
                          <img src={`data:image/png;base64,${qrData[v.id]}`} alt="Victim QR" className="w-24 h-24" />
                          <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Field Access Code</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-slate-400 text-[10px] uppercase">Heart Rate</p>
                          <p className="font-bold text-blue-400">{v.heart_rate} <span className="text-[8px]">BPM</span></p>
                        </div>
                        <div className="bg-slate-800 p-2 rounded text-center">
                          <p className="text-slate-400 text-[10px] uppercase">SpO2</p>
                          <p className="font-bold text-green-400">{v.spo2}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssign(v.id)}
                        disabled={v.status === 'assigned'}
                        className={`w-full py-2 rounded text-[10px] font-bold transition-all ${v.status === 'assigned' ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                      >
                        {v.status === 'assigned' ? '✓ DISPATCHED' : 'DISPATCH AMBULANCE'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Hospital Markers */}
              {hospitals.map((h) => (
                <Marker key={`hosp-${h.id}`} position={[h.lat, h.lng]} icon={hospitalIcon}>
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <h4 className="font-bold text-sm border-b mb-1">{h.name}</h4>
                      <p className="text-xs">Beds Available: <strong>{h.available_beds}</strong></p>
                      <p className="text-[10px] text-blue-600 uppercase font-bold mt-1">{h.specialty}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* CHARTS FOOTER */}
          <div className="h-60 bg-slate-900 p-4 flex gap-4 border-t border-slate-800 shrink-0">
            <div className="flex-1 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex flex-col">
              <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Triage Distribution</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} stroke="none" paddingAngle={5}>
                      {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex-[2] bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex flex-col">
              <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Cluster Density</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusters.map(c => ({ name: `Zone ${c.id}`, count: c.count }))}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <IncidentTimeline victims={victims} colors={severityColors} />
          </div>
        </main>

        {/* RIGHT SIDEBAR - PRIORITY LIST */}
        <aside className="w-80 glass-panel border-l p-6 flex flex-col shrink-0 z-10 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase text-slate-500 font-black tracking-[0.2em]">Incident Response Feed</h2>
            <Filter size={14} className="text-slate-500" />
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar shrink-0">
            <button
              onClick={() => { setFilterSeverity(null); setCurrentPage(1); }}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${filterSeverity === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              All
            </button>
            <button
              onClick={() => { setFilterSeverity(3); setCurrentPage(1); }}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${filterSeverity === 3 ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Critical
            </button>
            <button
              onClick={() => { setFilterSeverity(2); setCurrentPage(1); }}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${filterSeverity === 2 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              High
            </button>
            <button
              onClick={() => { setFilterSeverity(1); setCurrentPage(1); }}
              className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${filterSeverity === 1 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Mod
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 glass-card rounded-2xl animate-pulse" />
              ))
            ) : (
              victims
                .filter(v => v.status !== 'discharged')
                .sort((a, b) => b.severity - a.severity)
                .map(v => (
                  <div key={v.id} className={`p-4 rounded-2xl glass-card relative overflow-hidden group ${v.severity === 3 ? 'border-red-500/30' : ''} ${v.status === 'assigned' ? 'opacity-75' : ''}`}>
                    {v.severity === 3 && <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-100 text-xs tabular-nums tracking-wider uppercase">{v.id}</span>
                        <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Reported Vitals</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.status === 'assigned' && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-bold uppercase">Dispatched</span>
                        )}
                        <button onClick={() => fetchQr(v.id)} className="p-1 px-1.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300 transition-colors" title="Mobile Triage Card">
                          <QrCode size={12} />
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${v.severity === 3 ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-300'}`}>
                          {v.severity === 3 ? 'Critical' : v.severity === 2 ? 'High' : 'Stable'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] tabular-nums font-bold">
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/20">
                        <p className="text-slate-500 text-[8px] uppercase mb-0.5 tracking-tighter">Heart Rate</p>
                        <p className="text-blue-400">{v.heart_rate} <span className="text-slate-600 text-[8px]">BPM</span></p>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/20">
                        <p className="text-slate-500 text-[8px] uppercase mb-0.5 tracking-tighter">Oxygen</p>
                        <p className={v.spo2 < 90 ? 'text-red-400' : 'text-green-400'}>{v.spo2}<span className="text-[8px]">%</span></p>
                      </div>
                    </div>

                    {qrData[v.id] && (
                      <div className="bg-slate-800 rounded-xl p-2 flex flex-col items-center gap-1 mt-2 mb-3">
                        <img src={`data:image/png;base64,${qrData[v.id]}`} className="w-28 h-28 shrink-0 relative z-10" alt="Victim QR Code" />
                        <p className="text-slate-500 text-[10px]">Scan to open on mobile</p>
                        <input readOnly value={`http://localhost:5173/victim/${v.id}`} className="text-[10px] bg-slate-700 text-slate-400 rounded px-2 py-1 w-full text-center outline-none selection:bg-blue-500/30" onClick={(e) => e.target.select()} />
                      </div>
                    )}

                    {v.status === 'assigned' ? (
                      <button
                        onClick={() => handleDischarge(v.id, v.hospital_assigned)}
                        className="w-full glass-card bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl text-[10px] font-black tracking-[0.1em] flex items-center justify-center transition-all relative z-10"
                      >
                        <Activity size={12} className="mr-2" /> DISCHARGE PATIENT
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAssign(v.id)}
                        className="w-full glass-card bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-[10px] font-black tracking-[0.1em] flex items-center justify-center transition-all group-hover:shadow-lg group-hover:shadow-blue-500/20"
                      >
                        <MapPin size={12} className="mr-2" /> DISPATCH MISSION
                      </button>
                    )}
                  </div>
                ))
            )}
            {!loading && victims.filter(v => v.status !== 'discharged').length === 0 && (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Activity size={24} className="text-slate-700" />
                </div>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">No Active Emergencies</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center shrink-0">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="p-1.5 bg-slate-800 rounded text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Pg {currentPage} OF {Math.max(1, victimsMeta.pages)} <span className="text-slate-600 mx-1">|</span> {victimsMeta.total} TOTAL
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(victimsMeta.pages, prev + 1))}
              disabled={currentPage >= victimsMeta.pages || loading}
              className="p-1.5 bg-slate-800 rounded text-slate-300 disabled:opacity-50 hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
