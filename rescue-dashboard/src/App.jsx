import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Activity, MapPin, Truck } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import { mockAmbulances } from './data/mockData';

// Custom Leaflet icons
const createIcon = (color) => L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const severityColors = { 0: '#22c55e', 1: '#eab308', 2: '#3b82f6', 3: '#ef4444' };
const ambulanceIcon = L.divIcon({
  className: 'amb-icon',
  html: `<div style="background-color: white; width: 16px; height: 16px; border-radius: 4px; border: 2px solid black; display: flex; align-items: center; justify-content: center; font-size: 10px;">🚑</div>`,
  iconSize: [16, 16],
});

export default function App() {
  const [victims, setVictims] = useState([]);
  const [clusters, setClusters] = useState([]); // Added missing state

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Victims
        const vRes = await fetch('http://localhost:5000/api/victims');
        const vData = await vRes.json();
        setVictims(vData.map(v => ({ ...v, severity: v.triage_level })));

        // Fetch Clusters
        const cRes = await fetch('http://localhost:5000/api/clusters');
        if (cRes.ok) {
          const cData = await cRes.json();
          setClusters(cData);
        }
      } catch (err) {
        console.error("API Fetch error:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async (victimId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/assign/${victimId}`, {
        method: 'POST',
      });
      if (response.ok) {
        setVictims(prev => prev.map(v => v.id === victimId ? { ...v, status: 'assigned' } : v));
      }
    } catch (error) {
      console.error("Assignment failed:", error);
    }
  };

  const severityData = [
    { name: 'Low', value: victims.filter(v => v.severity === 0).length, color: severityColors[0] },
    { name: 'Moderate', value: victims.filter(v => v.severity === 1).length, color: severityColors[1] },
    { name: 'High', value: victims.filter(v => v.severity === 2).length, color: severityColors[2] },
    { name: 'Critical', value: victims.filter(v => v.severity === 3).length, color: severityColors[3] },
  ];

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 shrink-0 shadow-md z-20">
        <AlertTriangle className="text-red-500 mr-3" size={24} />
        <h1 className="text-xl font-bold tracking-wider text-slate-100">CHENNAI AI COMMAND CENTER</h1>
        <div className="ml-auto flex gap-4">
          <span className="flex items-center text-sm bg-slate-800 px-3 py-1 rounded-full"><Activity size={16} className="mr-2 text-green-400"/> System Online</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-6 shrink-0 z-10">
          <div>
            <h2 className="text-xs uppercase text-slate-500 font-semibold mb-3">Live Metrics</h2>
            <div className="bg-slate-800 p-4 rounded-lg mb-3 border border-slate-700">
              <p className="text-3xl font-bold text-white">{victims.length}</p>
              <p className="text-sm text-slate-400">Total Victims</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg border border-red-900 border-opacity-50">
              <p className="text-3xl font-bold text-red-400">{victims.filter(v => v.severity === 3).length}</p>
              <p className="text-sm text-slate-400">Critical Status</p>
            </div>
          </div>
          <div>
            <h2 className="text-xs uppercase text-slate-500 font-semibold mb-3">Team Status</h2>
            {mockAmbulances.map(amb => (
              <div key={amb.id} className="flex items-center justify-between bg-slate-800 p-3 rounded mb-2 text-sm">
                <span className="flex items-center"><Truck size={14} className="mr-2 text-blue-400"/> {amb.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${amb.status === 'available' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>
                  {amb.status}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-slate-900">
            <MapContainer center={[13.0827, 80.2707]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

              {victims.length > 0 && (
                <HeatmapLayer
                  points={victims.filter(v => v.status !== 'assigned')}
                  longitudeExtractor={(v) => v.lng}
                  latitudeExtractor={(v) => v.lat}
                  intensityExtractor={(v) => v.severity}
                  radius={30} blur={20} max={3}
                />
              )}

              {clusters.map((c) => (
                <Circle key={`cluster-${c.id}`} center={[c.lat, c.lng]} 
                  pathOptions={{ color: c.avg_severity > 2 ? '#ef4444' : '#f59e0b', fillOpacity: 0.15, dashArray: '10, 10', weight: 1 }} 
                  radius={c.count * 50} 
                >
                  <Tooltip permanent direction="top" className="bg-transparent border-none text-white shadow-none">
                    <span className="bg-slate-900/80 px-2 py-1 rounded text-[10px] border border-slate-700">ZONE {c.id}: {c.count}</span>
                  </Tooltip>
                </Circle>
              ))}

              {victims.map((v) => (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={createIcon(severityColors[v.severity])} opacity={v.status === 'assigned' ? 0.4 : 1}>
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[180px] bg-slate-900 text-slate-100">
                      <h3 className="font-bold border-b border-slate-700 pb-1 mb-2">Victim {v.id}</h3>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div><p className="text-slate-400">HR</p><p className="font-bold text-blue-400">{v.heart_rate} BPM</p></div>
                        <div><p className="text-slate-400">SpO2</p><p className="font-bold text-green-400">{v.spo2}%</p></div>
                      </div>
                      <button onClick={() => handleAssign(v.id)} disabled={v.status === 'assigned'}
                        className={`w-full py-2 rounded text-xs font-bold ${v.status === 'assigned' ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white'}`}>
                        {v.status === 'assigned' ? '✓ DISPATCHED' : 'ASSIGN AMBULANCE'}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="h-64 bg-slate-900 p-4 flex gap-4 border-t border-slate-800">
            <div className="flex-1 bg-slate-800 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Severity Distribution</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} stroke="none">
                    {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 bg-slate-800 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase">Victims per Cluster</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clusters.map(c => ({ name: `Z${c.id}`, count: c.count }))}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>

        <aside className="w-96 bg-slate-900 border-l border-slate-800 p-4 flex flex-col shrink-0 z-10">
          <h2 className="text-sm uppercase text-slate-400 font-semibold mb-4">Live Priority List</h2>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {victims.sort((a, b) => b.severity - a.severity).map(v => (
              <div key={v.id} className={`p-3 rounded-lg border bg-slate-800 ${v.severity === 3 ? 'border-red-500/50' : 'border-slate-700'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-200">{v.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${v.status === 'assigned' ? 'bg-blue-900 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                    {v.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mb-3">
                  <div>Severity: <span className="text-slate-200 font-semibold">{v.severity}</span></div>
                  <div>Age: <span className="text-slate-200">{v.age}</span></div>
                  <div>HR: <span className="text-slate-200">{v.heart_rate}</span></div>
                  <div>SpO2: <span className="text-slate-200">{v.spo2}%</span></div>
                </div>
                <button 
                  onClick={() => handleAssign(v.id)}
                  disabled={v.status === 'assigned'}
                  className="w-full bg-slate-700 hover:bg-blue-600 disabled:opacity-50 text-white py-1.5 rounded text-[10px] font-semibold flex items-center justify-center transition-colors"
                >
                  <MapPin size={12} className="mr-2"/> {v.status === 'assigned' ? 'DISPATCHED' : 'ASSIGN AMBULANCE'}
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}