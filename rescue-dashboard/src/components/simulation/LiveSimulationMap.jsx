import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '../ui/badge';

const TRIAGE_COLORS = {
  0: '#22c55e',
  1: '#eab308',
  2: '#3b82f6',
  3: '#f43f5e',
};

const AMBULANCE_COLORS = {
  available: '#22c55e',
  assigned: '#3b82f6',
  returning: '#f97316',
};

const STATUS_LABELS = {
  pending: 'Pending',
  assigned: 'Assigned',
  dispatching: 'Dispatching',
  transporting: 'Transporting',
  delivering: 'Delivered',
  returning: 'Returning',
};

function getVictimStyle(triageLevel, status) {
  const baseColor = TRIAGE_COLORS[triageLevel] || TRIAGE_COLORS[0];
  const baseOpacity = status === 'delivering' ? 0.5 : 1;
  const isPulsing = status === 'assigned';
  const isGlowing = status === 'dispatching';

  return {
    color: baseColor,
    fillColor: baseColor,
    fillOpacity: baseOpacity,
    weight: isGlowing ? 3 : 1,
    opacity: isGlowing ? 1 : baseOpacity,
  };
}

function createVictimIcon(triageLevel, status) {
  const baseColor = TRIAGE_COLORS[triageLevel] || TRIAGE_COLORS[0];
  const isPulsing = status === 'assigned';
  const isGlowing = status === 'dispatching';
  const opacity = status === 'delivering' ? 0.5 : 1;
  
  let shadow = 'none';
  if (isPulsing) {
    shadow = `0 0 0 4px ${baseColor}40, 0 0 8px ${baseColor}`;
  } else if (isGlowing) {
    shadow = `0 0 0 3px ${baseColor}80, 0 0 12px ${baseColor}`;
  }

  return L.divIcon({
    className: 'victim-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      background-color: ${baseColor};
      border: 2px solid white;
      border-radius: 50%;
      opacity: ${opacity};
      box-shadow: ${shadow};
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createAmbulanceIcon(status) {
  const color = AMBULANCE_COLORS[status] || AMBULANCE_COLORS.available;
  const isAnimated = status === 'assigned';
  
  return L.divIcon({
    className: 'ambulance-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      box-shadow: ${isAnimated ? `0 0 8px ${color}` : '0 2px 4px rgba(0,0,0,0.3)'};
      animation: ${isAnimated ? 'pulse 1.5s infinite' : 'none'};
    ">🚑</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function calculateClusters(victims) {
  const DBSCAN_EPS = 0.003;
  const MIN_POINTS = 3;
  const points = Array.from(victims.values()).filter(v => v.status !== 'delivered');
  
  if (points.length < MIN_POINTS) return [];
  
  const clusters = [];
  const visited = new Set();
  
  for (const point of points) {
    if (visited.has(point.id)) continue;
    
    const neighbors = points.filter(p => {
      if (p.id === point.id || visited.has(p.id)) return false;
      const dist = Math.sqrt(
        Math.pow(p.lat - point.lat, 2) + Math.pow(p.lng - point.lng, 2)
      );
      return dist <= DBSCAN_EPS;
    });
    
    if (neighbors.length >= MIN_POINTS - 1) {
      const memberPoints = [point, ...neighbors];
      memberPoints.forEach(p => visited.add(p.id));
      
      const avgLat = memberPoints.reduce((sum, p) => sum + p.lat, 0) / memberPoints.length;
      const avgLng = memberPoints.reduce((sum, p) => sum + p.lng, 0) / memberPoints.length;
      const avgSeverity = memberPoints.reduce((sum, p) => sum + p.triageLevel, 0) / memberPoints.length;
      
      clusters.push({
        id: `C-${clusters.length + 1}`,
        lat: avgLat,
        lng: avgLng,
        count: memberPoints.length,
        avgSeverity,
        radius: 150,
      });
    }
  }
  
  return clusters;
}

function victimPopupContent(victim) {
  const ambulance = victim.assignedAmbulance 
    ? `<p class="text-xs mt-2 text-slate-400">Assigned: <span class="text-blue-400 font-semibold">${victim.assignedAmbulance}</span></p>`
    : '';
  
  return `
    <div style="min-width: 180px; padding: 8px; background: #0f172a; color: #f1f5f9; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 8px;">
        <span style="font-weight: bold; font-size: 14px;">${victim.id}</span>
        <span style="background: ${TRIAGE_COLORS[victim.triageLevel]}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; color: white;">
          ${['Low', 'Moderate', 'High', 'Critical'][victim.triageLevel]}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
        <div style="background: #1e293b; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="color: #94a3b8; font-size: 9px; text-transform: uppercase;">Heart Rate</p>
          <p style="color: #60a5fa; font-weight: bold; font-size: 12px;">${victim.heartRate} <span style="font-size: 9px;">BPM</span></p>
        </div>
        <div style="background: #1e293b; padding: 6px; border-radius: 4px; text-align: center;">
          <p style="color: #94a3b8; font-size: 9px; text-transform: uppercase;">SpO2</p>
          <p style="color: #4ade80; font-weight: bold; font-size: 12px;">${victim.spo2}%</p>
        </div>
      </div>
      <p style="font-size: 11px; color: #fbbf24; font-weight: 500; text-transform: uppercase;">${STATUS_LABELS[victim.status] || victim.status}</p>
      ${ambulance}
    </div>
  `;
}

function ambulancePopupContent(ambulance) {
  const assignedVictim = ambulance.assignedVictim
    ? `<p style="font-size: 11px; margin-top: 6px; color: #f87171;">Assigned: <span style="color: #60a5fa; font-weight: 600;">${ambulance.assignedVictim}</span></p>`
    : '';
  
  return `
    <div style="min-width: 140px; padding: 8px; background: #0f172a; color: #f1f5f9; border-radius: 8px;">
      <div style="font-weight: bold; font-size: 14px; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px;">
        ${ambulance.id}
      </div>
      <p style="font-size: 11px; color: #fbbf24; font-weight: 500; text-transform: uppercase;">
        ${STATUS_LABELS[ambulance.status] || ambulance.status}
      </p>
      ${assignedVictim}
    </div>
  `;
}

const dashOffsetRef = { current: 0 };

export default function LiveSimulationMap({
  victims,
  ambulances,
  onVictimClick,
}) {
  const mapRef = useRef(null);
  const animationsRef = useRef(null);
  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
      }
      @keyframes routeDash {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: -20; }
      }
      .leaflet-popup-content-wrapper {
        background: transparent;
        box-shadow: none;
      }
      .leaflet-popup-content {
        margin: 0;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      dashOffsetRef.current = (dashOffsetRef.current + 1) % 20;
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  const clusters = calculateClusters(victims);
  
  const ambArray = Array.from(ambulances.values()).filter(a => a.route && a.route.length > 1);
  
  const allRoutes = ambArray.map(amb => {
    if (!amb.route || amb.route.length < 2) return null;
    return (
      <Polyline
        key={`route-${amb.id}`}
        positions={amb.route.map(step => [step.lat, step.lng])}
        pathOptions={{
          color: '#3b82f6',
          weight: 3,
          dashArray: '10, 10',
          lineCap: 'round',
        }}
      />
    );
  });
  
  const victimMarkers = Array.from(victims.values()).map(victim => (
    <CircleMarker
      key={victim.id}
      center={[victim.lat, victim.lng]}
      radius={12}
      pathOptions={getVictimStyle(victim.triageLevel, victim.status)}
      eventHandlers={{
        click: () => onVictimClick?.(victim),
      }}
    >
      <Popup>
        <div dangerouslySetInnerHTML={{ __html: victimPopupContent(victim) }} />
      </Popup>
    </CircleMarker>
  ));
  
  const ambulanceMarkers = Array.from(ambulances.values()).map(ambulance => (
    <Marker
      key={ambulance.id}
      position={[ambulance.lat, ambulance.lng]}
      icon={createAmbulanceIcon(ambulance.status)}
    >
      <Popup>
        <div dangerouslySetInnerHTML={{ __html: ambulancePopupContent(ambulance) }} />
      </Popup>
    </Marker>
  ));
  
  const clusterCircles = clusters.map(cluster => (
    <Circle
      key={cluster.id}
      center={[cluster.lat, cluster.lng]}
      radius={cluster.radius}
      pathOptions={{
        color: cluster.avgSeverity > 2 ? '#ef4444' : '#f59e0b',
        fillOpacity: 0.1,
        dashArray: '5, 10',
        weight: 1,
      }}
    />
  ));
  
  return (
    <MapContainer
      ref={mapRef}
      center={[13.0827, 80.2707]}
      zoom={12}
      className="h-full w-full"
      style={{ background: '#0f172a' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      
      {clusterCircles}
      {allRoutes}
      {victimMarkers}
      {ambulanceMarkers}
    </MapContainer>
  );
}