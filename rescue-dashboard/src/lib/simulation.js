const AMBULANCE_SPEED_KMH = 60;
const SEVERITY_WEIGHT = 2.0;
const EPSILON = 0.1;
const DETERIORATION_ROUNDS = 3;
const REOPT_THRESHOLD = 1;

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function travelTimeSec(distKm) {
  return (distKm / AMBULANCE_SPEED_KMH) * 3600;
}

function makeVictim(id, lat, lng, triageLevel, arrivalTime = 0) {
  return {
    id,
    lat,
    lng,
    triage_level: triageLevel,
    arrival_time: arrivalTime,
    assignment_time: null,
    assigned_ambulance: null,
    initial_triage: triageLevel,
    worsened: false,
    age: Math.floor(Math.random() * 60) + 20,
    heart_rate: Math.floor(Math.random() * 70) + 60,
    spo2: Math.floor(Math.random() * 12) + 88,
    temperature: Math.random() * 3.5 + 36.0,
  };
}

function makeAmbulance(id, lat, lng) {
  return { id, lat, lng, status: 'available', assigned_victim: null };
}

export function generateScenarioA(n = 20) {
  const centre = { lat: 13.0827, lng: 80.2707 };
  const victims = [];
  for (let i = 0; i < n; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;
    const triage = Math.floor(Math.random() * 4) + 1;
    victims.push(makeVictim(
      `V-A${String(i).padStart(3, '0')}`,
      centre.lat + offsetLat,
      centre.lng + offsetLng,
      triage,
      Math.random() * 60
    ));
  }
  const ambulances = [makeAmbulance('AMB-01', centre.lat + 0.01, centre.lng + 0.01)];
  return { victims, ambulances };
}

export function generateScenarioB(n = 20) {
  return generateScenarioA(n);
}

export function generateScenarioC(n = 30) {
  const cluster1 = { lat: 13.0827, lng: 80.2707 };
  const cluster2 = { lat: 13.0400, lng: 80.2300 };
  const victims = [];
  for (let i = 0; i < 15; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;
    const triage = Math.random() > 0.5 ? 4 : 3;
    victims.push(makeVictim(
      `V-C1${String(i).padStart(2, '0')}`,
      cluster1.lat + offsetLat,
      cluster1.lng + offsetLng,
      triage,
      Math.random() * 60
    ));
  }
  for (let i = 0; i < 15; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;
    const triage = Math.random() > 0.5 ? 2 : 1;
    victims.push(makeVictim(
      `V-C2${String(i).padStart(2, '0')}`,
      cluster2.lat + offsetLat,
      cluster2.lng + offsetLng,
      triage,
      Math.random() * 60
    ));
  }
  const ambulances = [
    makeAmbulance('AMB-01', cluster1.lat + 0.01, cluster1.lng + 0.01),
    makeAmbulance('AMB-02', cluster2.lat + 0.01, cluster2.lng + 0.01),
    makeAmbulance('AMB-03', 13.0600, 80.2500),
  ];
  return { victims, ambulances };
}

function simulateRescore(v) {
  let score = 0;
  if (v.spo2 < 80) score += 2;
  else if (v.spo2 < 90) score += 1;
  if (v.heart_rate > 150) score += 2;
  else if (v.heart_rate > 120) score += 1;
  if (v.temperature > 40) score += 1;
  return Math.min(4, Math.max(1, score + 1));
}

function simulateDeterioration(victims, useReopt = false, reoptThreshold = 1) {
  let reoptCount = 0;
  for (let round = 0; round < DETERIORATION_ROUNDS; round++) {
    for (const v of victims) {
      const prevLevel = v.triage_level;
      v.heart_rate = Math.min(180, v.heart_rate + 15);
      v.spo2 = Math.max(70, v.spo2 - 5);
      v.temperature = Math.min(41, v.temperature + 0.5);
      const newLevel = simulateRescore(v);
      const delta = newLevel - prevLevel;
      if (delta !== 0) v.worsened = true;
      if (useReopt && Math.abs(delta) >= reoptThreshold && !v.assigned) {
        v.triage_level = newLevel;
        reoptCount++;
      }
    }
  }
  return reoptCount;
}

export function dispatchBaseline1(victims, ambulances) {
  const victimsCopy = victims.map(v => ({ ...v, assigned: false, assigned_ambulance: null }));
  const ambulancesCopy = ambulances.map(a => ({ ...a, status: 'available', assigned_victim: null }));

  for (const v of victimsCopy) {
    v.assigned = false;
    v.assignment_time = null;
    v.assigned_ambulance = null;
    v.worsened = false;
  }

  const available = ambulancesCopy.filter(a => a.status === 'available');

  for (const v of victimsCopy) {
    if (available.length === 0) break;
    const nearest = available.reduce((min, a) => {
      const dist1 = haversine(v.lat, v.lng, a.lat, a.lng);
      const dist2 = haversine(v.lat, v.lng, min.lat, min.lng);
      return dist1 < dist2 ? a : min;
    }, available[0]);
    const dist = haversine(v.lat, v.lng, nearest.lat, nearest.lng);
    v.assignment_time = v.arrival_time + travelTimeSec(dist) / 3600;
    v.assigned = true;
    v.assigned_ambulance = nearest.id;
    nearest.status = 'busy';
    nearest.assigned_victim = v.id;
    available.splice(available.indexOf(nearest), 1);
  }

  return victimsCopy;
}

export function dispatchBaseline2(victims, ambulances) {
  const victimsCopy = victims.map(v => ({ ...v, assigned: false, assigned_ambulance: null }));
  const ambulancesCopy = ambulances.map(a => ({ ...a, status: 'available', assigned_victim: null }));

  for (const v of victimsCopy) {
    v.assigned = false;
    v.assignment_time = null;
    v.assigned_ambulance = null;
    v.worsened = false;
  }

  const sortedVictims = [...victimsCopy].sort((a, b) => b.triage_level - a.triage_level);
  const available = ambulancesCopy.filter(a => a.status === 'available');

  for (const v of sortedVictims) {
    if (available.length === 0) break;
    const nearest = available.reduce((min, a) => {
      const dist1 = haversine(v.lat, v.lng, a.lat, a.lng);
      const dist2 = haversine(v.lat, v.lng, min.lat, min.lng);
      return dist1 < dist2 ? a : min;
    }, available[0]);
    const dist = haversine(v.lat, v.lng, nearest.lat, nearest.lng);
    v.assignment_time = v.arrival_time + travelTimeSec(dist) / 3600;
    v.assigned = true;
    v.assigned_ambulance = nearest.id;
    nearest.status = 'busy';
    nearest.assigned_victim = v.id;
    available.splice(available.indexOf(nearest), 1);
  }

  return victimsCopy;
}

export function dispatchSystem(victims, ambulances, useSeverityWeight = true, useReopt = true, useDeterioration = false) {
  const victimsCopy = victims.map(v => ({ ...v, assigned: false, assigned_ambulance: null }));
  const ambulancesCopy = ambulances.map(a => ({ ...a, status: 'available', assigned_victim: null }));

  for (const v of victimsCopy) {
    v.assigned = false;
    v.assignment_time = null;
    v.assigned_ambulance = null;
    v.worsened = false;
  }

  const scoreFn = (v, a) => {
    const dist = haversine(v.lat, v.lng, a.lat, a.lng);
    return (v.triage_level * SEVERITY_WEIGHT) / (dist + EPSILON);
  };

  const sortedVictims = [...victimsCopy].sort((a, b) => b.triage_level - a.triage_level);
  const available = ambulancesCopy.filter(a => a.status === 'available');

  for (const v of sortedVictims) {
    if (available.length === 0) break;
    const best = useSeverityWeight
      ? available.reduce((max, a) => scoreFn(v, a) > scoreFn(v, max) ? a : max, available[0])
      : available.reduce((min, a) => {
        const dist1 = haversine(v.lat, v.lng, a.lat, a.lng);
        const dist2 = haversine(v.lat, v.lng, min.lat, min.lng);
        return dist1 < dist2 ? a : min;
      }, available[0]);
    const dist = haversine(v.lat, v.lng, best.lat, best.lng);
    v.assignment_time = v.arrival_time + travelTimeSec(dist) / 3600;
    v.assigned = true;
    v.assigned_ambulance = best.id;
    best.status = 'busy';
    best.assigned_victim = v.id;
    available.splice(available.indexOf(best), 1);
  }

  if (useDeterioration) {
    simulateDeterioration(victimsCopy, useReopt, REOPT_THRESHOLD);
  }

  return victimsCopy;
}

export function runSimulation(config) {
  const { numVictims = 20, numAmbulances = 1, scenario = 'A', includeDeterioration = false } = config;

  let scenarioFn;
  switch (scenario) {
    case 'A': scenarioFn = generateScenarioA; break;
    case 'B': scenarioFn = generateScenarioB; break;
    case 'C': scenarioFn = generateScenarioC; break;
    default: scenarioFn = generateScenarioA;
  }

  const { victims, ambulances } = scenarioFn(numVictims);
  const limitedAmbulances = ambulances.slice(0, numAmbulances);

  const b1Result = dispatchBaseline1(victims, limitedAmbulances);
  const b2Result = dispatchBaseline2(victims, limitedAmbulances);
  const sysResult = dispatchSystem(victims, limitedAmbulances, true, true, includeDeterioration && scenario === 'B');

  function calcMetrics(result, ambCount) {
    const assigned = result.filter(v => v.assignment_time !== null);
    const meanTime = assigned.length > 0
      ? assigned.reduce((sum, v) => sum + (v.assignment_time - v.arrival_time) * 3600, 0) / assigned.length
      : 0;
    const critical = assigned.filter(v => v.initial_triage >= 3);
    const criticalMeanWait = critical.length > 0
      ? critical.reduce((sum, v) => sum + (v.assignment_time - v.arrival_time) * 3600, 0) / critical.length
      : null;
    const criticalResponse = critical.length > 0
      ? critical.filter(v => (v.assignment_time - v.arrival_time) * 3600 <= 120).length / critical.length
      : null;
    const worsened = result.filter(v => v.worsened).length;
    const busy = ambCount;
    const util = (busy / ambCount) * 100;
    const score = assigned.length > 0
      ? assigned.reduce((sum, v) => sum + v.initial_triage * (v.assignment_time - v.arrival_time) * 3600, 0) / assigned.length
      : 0;

    return {
      mean_time_to_assignment: meanTime,
      critical_mean_wait: criticalMeanWait,
      critical_response_rate: criticalResponse,
      ambulance_utilization: util,
      victims_worsened: worsened,
      severity_weighted_score: score,
      assigned_count: assigned.length,
    };
  }

  return {
    BASELINE_1: calcMetrics(b1Result, numAmbulances),
    BASELINE_2: calcMetrics(b2Result, numAmbulances),
    SYSTEM: calcMetrics(sysResult, numAmbulances),
  };
}