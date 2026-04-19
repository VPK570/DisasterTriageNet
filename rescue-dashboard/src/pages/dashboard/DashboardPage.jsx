import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, Hospital, Truck, Filter, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import MapView from '@/components/MapView';
import { API_BASE, SEVERITY_COLORS } from '@/config';

const SEVERITY_LABELS = {
  0: 'Low',
  1: 'Moderate',
  2: 'High',
  3: 'Critical',
};

const CHIP_SEVERITIES = [
  { value: null, label: 'All', color: 'bg-slate-700' },
  { value: 3, label: 'Critical', color: 'bg-[var(--severity-critical)]' },
  { value: 2, label: 'High', color: 'bg-[var(--severity-high)]' },
  { value: 1, label: 'Moderate', color: 'bg-[var(--severity-moderate)]' },
];

export default function DashboardPage({
  victims,
  mapVictims,
  clusters,
  hospitals,
  ambulances,
  selectedAmbulance,
  routeLoading,
  planRoute,
  clearRoute,
  activeRoute,
  severityColors,
  filterSeverity,
  onFilterSeverity,
  onAssign,
  onDischarge,
  token,
}) {
  const [qrData, setQrData] = useState({});
  const [generatingQr, setGeneratingQr] = useState(null);

  const totalVictims = victims.length;
  const criticalCases = victims.filter(v => v.severity === 3).length;
  const totalHospitalBeds = hospitals.reduce((sum, h) => sum + h.available_beds, 0);
  const activeAmbulances = ambulances.filter(a => a.status.toLowerCase() === 'available').length;

  const severityData = [
    { name: 'Low', value: victims.filter((v) => v.severity === 0).length, color: severityColors[0] },
    { name: 'Moderate', value: victims.filter((v) => v.severity === 1).length, color: severityColors[1] },
    { name: 'High', value: victims.filter((v) => v.severity === 2).length, color: severityColors[2] },
    { name: 'Critical', value: victims.filter((v) => v.severity === 3).length, color: severityColors[3] },
  ];

  const clusterData = clusters.map((c) => ({
    name: `Zone ${c.id}`,
    count: c.count,
    fill: c.avg_severity > 2 ? severityColors[3] : severityColors[1],
  }));

  const latestVictims = [...victims]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  const fetchQr = useCallback(async (victimId) => {
    setGeneratingQr(victimId);
    try {
      const res = await fetch(`${API_BASE}/victims/${victimId}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.qr) {
        setQrData(prev => ({ ...prev, [victimId]: data.qr }));
      }
    } catch (error) {
      console.error('QR generation failed:', error);
    } finally {
      setGeneratingQr(null);
    }
  }, [token]);

  const handleAssign = async (victimId) => {
    if (onAssign) {
      onAssign(victimId);
    }
  };

  const handleDischarge = async (victimId, hospitalName) => {
    if (onDischarge) {
      onDischarge(victimId, hospitalName);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-slate-950">
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-100">Command Center</h1>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            {CHIP_SEVERITIES.map((chip) => (
              <button
                key={chip.label}
                onClick={() => onFilterSeverity?.(chip.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  (filterSeverity === chip.value)
                    ? `${chip.color} text-white`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Victims</p>
                <p className="text-2xl font-bold text-slate-100">{totalVictims}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Critical Cases</p>
                <p className="text-2xl font-bold text-red-400">{criticalCases}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Hospital size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Hospital Beds</p>
                <p className="text-2xl font-bold text-slate-100">{totalHospitalBeds}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Truck size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Active Ambulances</p>
                <p className="text-2xl font-bold text-slate-100">{activeAmbulances}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-slate-800">
        <MapView
          mapVictims={mapVictims}
          clusters={clusters}
          hospitals={hospitals}
          activeRoute={activeRoute}
          severityColors={severityColors}
          qrData={qrData}
          fetchQr={fetchQr}
          handleAssign={handleAssign}
        />
      </div>

      <div className="shrink-0 h-56 flex gap-4">
        <div className="flex-1 bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Triage Distribution</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  stroke="none"
                  paddingAngle={3}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-[2] bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Cluster Density</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterData}>
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={9}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={9}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                >
                  {clusterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <RechartsTooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-1 bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Latest Victims</h3>
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {latestVictims.map((victim) => (
                <div
                  key={victim.id}
                  className="flex items-center justify-between p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: severityColors[victim.severity] }}
                    />
                    <span className="text-xs font-medium text-slate-300">{victim.id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0 h-4"
                      style={{ borderColor: severityColors[victim.severity], color: severityColors[victim.severity] }}
                    >
                      {SEVERITY_LABELS[victim.severity]}
                    </Badge>
                    {victim.status === 'assigned' && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-[8px] px-1 py-0 h-4">
                        Assigned
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {latestVictims.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No recent victims</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}