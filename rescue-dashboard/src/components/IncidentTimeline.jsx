import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip as RechartsTooltip, Cell, ResponsiveContainer,
} from 'recharts';

/**
 * IncidentTimeline — scatter plot of victim arrivals over time, coloured
 * by triage severity.
 *
 * Props:
 *   victims  — array of victim objects (must have `timestamp` and `severity`)
 *   colors   — SEVERITY_COLORS map: { 0: '#...', 1: '...', 2: '...', 3: '...' }
 */
export default function IncidentTimeline({ victims, colors }) {
  if (victims.length === 0) return null;

  const sorted = [...victims].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  const earliest = new Date(sorted[0].timestamp).getTime();
  const latest   = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const duration = latest - earliest || 1;

  const data = sorted.map(v => ({
    time: (new Date(v.timestamp).getTime() - earliest) / 60000,
    severity: v.severity,
    id: v.id,
    displayTime: new Date(v.timestamp).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    }),
  }));

  return (
    <div className="flex-1 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex flex-col">
      <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
        Incident Timeline (Arrivals)
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <XAxis type="number" dataKey="time"     hide />
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
}
