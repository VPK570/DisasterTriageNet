import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, Polyline, CircleMarker } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { QrCode } from 'lucide-react';

// --- Map-internal constants (not needed outside MapView) ---
const createIcon = (color) => L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/**
 * MapView — Leaflet map with all layers: route, heatmap, clusters,
 * victim markers, and hospital markers.
 *
 * Props:
 *   mapVictims    — full victim list for heatmap and pins (up to 200)
 *   clusters      — DBSCAN cluster objects
 *   hospitals     — hospital objects
 *   activeRoute   — array of route steps (or null)
 *   severityColors — { 0: '#...', ... }
 *   qrData        — { [victimId]: base64String }
 *   fetchQr       — (victimId) => void
 *   handleAssign  — (victimId) => void
 */
export default function MapView({
  mapVictims, clusters, hospitals,
  activeRoute, severityColors,
  qrData, fetchQr, handleAssign,
}) {
  return (
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
                fillOpacity: 1,
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
      {mapVictims.length > 0 && (
        <HeatmapLayer
          points={mapVictims.filter(v => v.status !== 'assigned')}
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
          radius={c.radius || 200}
          pathOptions={{
            color: c.avg_severity > 2 ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.15,
            dashArray: '5, 10',
            weight: 1,
          }}
        >
          <Tooltip direction="top" opacity={0.9}>
            <div className="text-xs font-bold">ZONE {c.id}: {c.count} Victims</div>
          </Tooltip>
        </Circle>
      ))}

      {/* Individual Victim Markers */}
      {mapVictims.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={createIcon(severityColors[v.severity])}
          opacity={v.status === 'assigned' ? 0.3 : 1}
        >
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
                className={`w-full py-2 rounded text-[10px] font-bold transition-all ${
                  v.status === 'assigned'
                    ? 'bg-slate-800 text-slate-500'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
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
  );
}
