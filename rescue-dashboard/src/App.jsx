import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Activity, MapPin, Truck, Hospital } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { mockAmbulances } from './data/mockData';
import 'leaflet/dist/leaflet.css';

// --- CONFIGURATION & ICONS ---
const API_BASE_URL = 'http://localhost:5001/api';

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

export default function App() {
  const [victims, setVictims] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch everything in parallel
        const [vRes, cRes, hRes] = await Promise.all([
          fetch(`${API_BASE_URL}/victims`),
          fetch(`${API_BASE_URL}/clusters`),
          fetch(`${API_BASE_URL}/hospitals`)
        ]);

        const vData = await vRes.json();
        setVictims(vData.map(v => ({ ...v, severity: v.triage_level })));

        if (cRes.ok) setClusters(await cRes.json());
        if (hRes.ok) setHospitals(await hRes.json());
        
        setLoading(false);
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5001); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async (victimId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assign/${victimId}`, { method: 'POST' });
      if (response.ok) {
        setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'assigned' } : v));
      }
    } catch (error) {
      console.error("Assignment failed:", error);
    }
  };

  // --- CHART DATA PREP ---
  const severityData = [
    { name: 'Low', value: victims.filter(v => v.severity === 0).length, color: severityColors[0] },
    { name: 'Moderate', value: victims.filter(v => v.severity === 1).length, color: severityColors[1] },
    { name: 'High', value: victims.filter(v => v.severity === 2).length, color: severityColors[2] },
    { name: 'Critical', value: victims.filter(v => v.severity === 3).length, color: severityColors[3] },
  ];

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* HEADER */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0 shadow-md z-20">
        <AlertTriangle className="text-red-500 mr-3" size={24} />
        <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">Chennai AI Triage Command</h1>
        <div className="ml-auto flex gap-4">
          <span className="flex items-center text-sm bg-slate-800 px-3 py-1 rounded-full border border-green-900/50">
            <Activity size={16} className="mr-2 text-green-400 animate-pulse"/> 
            ML ENGINE ACTIVE
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - METRICS */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-6 shrink-0 z-10">
          <section>
            <h2 className="text-xs uppercase text-slate-500 font-semibold mb-3 tracking-widest">Live Stats</h2>
            <div className="grid gap-3">
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <p className="text-3xl font-bold text-white">{victims.length}</p>
                <p className="text-xs text-slate-400 uppercase">Total Victims</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-red-900/30">
                <p className="text-3xl font-bold text-red-400">{victims.filter(v => v.severity === 3).length}</p>
                <p className="text-xs text-slate-400 uppercase">Critical (Red)</p>
              </div>
            </div>
          </section>

          <section className="flex-1 overflow-hidden">
            <h2 className="text-xs uppercase text-slate-500 font-semibold mb-3 tracking-widest">Responders</h2>
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {mockAmbulances.map(amb => (
                <div key={amb.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded border border-slate-700/50">
                  <span className="text-xs flex items-center"><Truck size={14} className="mr-2 text-blue-400"/> {amb.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${amb.status === 'available' ? 'text-green-400' : 'text-orange-400'}`}>
                    {amb.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* CENTER CONTENT */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* MAP SECTION */}
          <div className="flex-1 relative bg-slate-950">
            <MapContainer center={[13.0827, 80.2707]} zoom={12} className="h-full w-full">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

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
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded">AGE: {v.age}</span>
                      </div>
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
                        className={`w-full py-2 rounded text-[10px] font-bold transition-all ${
                          v.status === 'assigned' ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
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
                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px'}} />
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
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '10px'}} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR - PRIORITY LIST */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col shrink-0 z-10">
          <h2 className="text-xs uppercase text-slate-500 font-semibold mb-4 tracking-widest">High Priority Queue</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {victims
              .filter(v => v.status !== 'assigned')
              .sort((a, b) => b.severity - a.severity)
              .map(v => (
                <div key={v.id} className={`p-3 rounded-lg border bg-slate-800/80 transition-all hover:bg-slate-800 ${
                  v.severity === 3 ? 'border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-slate-700'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-100 text-sm">{v.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      v.severity === 3 ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {v.severity === 3 ? 'Critical' : v.severity === 2 ? 'High' : 'Stable'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-400 mb-3">
                    <p>Age: <span className="text-slate-200">{v.age}</span></p>
                    <p>SpO2: <span className={v.spo2 < 90 ? 'text-red-400 font-bold' : 'text-slate-200'}>{v.spo2}%</span></p>
                    <p>HR: <span className="text-slate-200">{v.heart_rate}</span></p>
                    <p>Temp: <span className="text-slate-200">{v.temperature}°C</span></p>
                  </div>
                  <button 
                    onClick={() => handleAssign(v.id)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-[10px] font-bold flex items-center justify-center transition-colors"
                  >
                    <MapPin size={12} className="mr-2"/> DISPATCH NOW
                  </button>
                </div>
            ))}
            {victims.filter(v => v.status !== 'assigned').length === 0 && (
              <div className="text-center py-10 text-slate-600 text-xs italic">
                No pending emergencies
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}