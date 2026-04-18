import React from 'react';
import { Truck, MapPin } from 'lucide-react';

/**
 * AmbulancePanel — "Deployment Status" section of the left sidebar.
 * Renders ambulance list with live status badges and route-plan buttons.
 *
 * Props:
 *   ambulances       — array of ambulance objects
 *   selectedAmbulance — id of the ambulance with an active route plan (or null)
 *   routeLoading     — boolean: route request in-flight
 *   planRoute        — (ambulance) => void
 *   clearRoute       — () => void
 */
export default function AmbulancePanel({
  ambulances, selectedAmbulance, routeLoading, planRoute, clearRoute,
}) {
  return (
    <section className="shrink-0 pt-4 border-t border-slate-800/50">
      <h2 className="text-[10px] uppercase text-slate-500 font-black mb-4 tracking-[0.2em]">
        Deployment Status
      </h2>
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
                  <span className="text-[11px] font-black text-slate-300 uppercase tabular-nums">
                    {amb.id}
                  </span>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                    amb.status.toLowerCase() === 'available'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}
                >
                  {amb.status}
                </span>
              </div>

              {amb.status.toLowerCase() === 'available' && (
                <button
                  onClick={() =>
                    selectedAmbulance === amb.id ? clearRoute() : planRoute(amb)
                  }
                  disabled={routeLoading && selectedAmbulance === amb.id}
                  className={`w-full mt-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all transform active:scale-95 ${
                    selectedAmbulance === amb.id
                      ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400'
                      : 'bg-slate-700/50 hover:bg-slate-600/80 text-slate-200 border border-slate-600/30'
                  }`}
                >
                  {selectedAmbulance === amb.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <MapPin size={12} /> CLEAR MISSION
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 text-blue-400">
                      {routeLoading && selectedAmbulance === amb.id
                        ? 'CALCULATING...'
                        : <><Truck size={12} /> OPTIMIZE ROUTE</>}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
