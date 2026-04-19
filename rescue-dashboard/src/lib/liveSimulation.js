const DEFAULT_CONFIG = {
  victimSpawnRate: 2,
  maxVictims: 50,
  enableDeterioration: true,
  enableAutoDispatch: true,
  scenario: 'A',
  ambulanceCount: 1,
};

const SCENARIOS = {
  A: { center: { lat: 13.0827, lng: 80.2707 }, spread: 0.008, criticalBias: 0.3 },
  B: [
    { center: { lat: 13.0827, lng: 80.2707 }, spread: 0.006, criticalBias: 0.5 },
    { center: { lat: 13.0650, lng: 80.2500 }, spread: 0.006, criticalBias: 0.2 },
  ],
  C: [
    { center: { lat: 13.0827, lng: 80.2707 }, spread: 0.005, criticalBias: 0.6 },
    { center: { lat: 13.0400, lng: 80.2300 }, spread: 0.007, criticalBias: 0.3 },
    { center: { lat: 13.1000, lng: 80.2900 }, spread: 0.005, criticalBias: 0.4 },
  ],
};

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function randomInCluster(center, radius) {
  const u = Math.random();
  const v = Math.random();
  const w = radius * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const dLat = w * Math.cos(t) / 111320;
  const dLon = w * Math.sin(t) / (111320 * Math.cos(center.lat * Math.PI / 180));
  return {
    lat: center.lat + dLat,
    lng: center.lng + dLon,
  };
}

function generateVictimInScenario(scenario, scenarioKey) {
  const config = SCENARIOS[scenarioKey];
  let cluster;
  if (Array.isArray(config)) {
    cluster = config[Math.floor(Math.random() * config.length)];
  } else {
    cluster = config;
  }
  const pos = randomInCluster(cluster.center, cluster.spread * 1000);
  const triRoll = Math.random();
  let triageLevel;
  if (triRoll < cluster.criticalBias) triageLevel = 3;
  else if (triRoll < cluster.criticalBias + 0.4) triageLevel = 2;
  else if (triRoll < cluster.criticalBias + 0.7) triageLevel = 1;
  else triageLevel = 0;
  return {
    id: '',
    lat: pos.lat,
    lng: pos.lng,
    triageLevel,
    status: 'pending',
    heartRate: Math.floor(Math.random() * 40) + 70,
    spo2: Math.floor(Math.random() * 10) + 90,
    spawnTime: 0,
    assignedAmbulance: null,
    dispatchTime: null,
    deliveryTime: null,
    deteriorates: 0,
  };
}

function generateAmbulancePositions(scenarioKey, count) {
  const config = SCENARIOS[scenarioKey];
  const clusters = Array.isArray(config) ? config : [config];
  const positions = [];
  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];
    const pos = randomInCluster(cluster.center, 500);
    positions.push({ lat: pos.lat, lng: pos.lng });
  }
  return positions;
}

export class SimulationEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tickCount = 0;
    this.running = false;
    this.speed = 1;
    this.intervalId = null;
    this.subscribers = [];
    this.victimIdCounter = 0;
    this.ambulanceIdCounter = 0;
    this.victims = new Map();
    this.ambulances = new Map();
    this.events = [];
    this.responseTimes = [];
    this._initScenario();
    this._initAmbulances();
  }

  _initScenario() {
    this.events.push({ tick: 0, type: 'scenario_loaded', data: { scenario: this.config.scenario } });
  }

  _initAmbulances() {
    const positions = generateAmbulancePositions(this.config.scenario, this.config.ambulanceCount);
    positions.forEach((pos, idx) => {
      const id = `AMB-${String(idx + 1).padStart(2, '0')}`;
      this.ambulances.set(id, {
        id,
        lat: pos.lat,
        lng: pos.lng,
        status: 'available',
        assignedVictim: null,
        route: [],
        routeProgress: 0,
        homeLat: pos.lat,
        homeLng: pos.lng,
      });
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    const interval = 1000 / this.speed;
    this.intervalId = setInterval(() => this.tick(), interval);
    this.events.push({ tick: this.tickCount, type: 'started', data: {} });
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.events.push({ tick: this.tickCount, type: 'paused', data: {} });
  }

  reset() {
    this.pause();
    this.tickCount = 0;
    this.victims.clear();
    this.ambulances.clear();
    this.events = [];
    this.responseTimes = [];
    this.victimIdCounter = 0;
    this._initAmbulances();
    this.events.push({ tick: 0, type: 'reset', data: {} });
  }

  setSpeed(n) {
    if (![1, 2, 5, 10].includes(n)) return;
    this.speed = n;
    if (this.running) {
      this.pause();
      this.start();
    }
    this.events.push({ tick: this.tickCount, type: 'speed_changed', data: { speed: n } });
  }

  spawnVictims(n) {
    const toSpawn = Math.min(n, this.config.maxVictims - this.victims.size);
    for (let i = 0; i < toSpawn; i++) {
      this.victimIdCounter++;
      const id = `V-${String(this.victimIdCounter).padStart(3, '0')}`;
      const victim = generateVictimInScenario(this.config.scenario, this.config.scenario);
      victim.id = id;
      victim.spawnTime = this.tickCount;
      this.victims.set(id, victim);
      this.events.push({ tick: this.tickCount, type: 'victim_spawned', data: { id, triage: victim.triageLevel } });
    }
  }

  deteriorate() {
    if (!this.config.enableDeterioration) return;
    const pending = Array.from(this.victims.values()).filter(v => v.status === 'pending');
    for (const victim of pending) {
      if (victim.deteriorates >= 2) continue;
      if (Math.random() < 0.15) {
        if (victim.triageLevel < 3) {
          victim.triageLevel++;
          victim.deteriorates++;
          victim.spo2 = Math.max(70, victim.spo2 - 8);
          victim.heartRate = Math.min(180, victim.heartRate + 12);
          this.events.push({
            tick: this.tickCount,
            type: 'victim_deteriorated',
            data: { id: victim.id, newLevel: victim.triageLevel },
          });
        }
      }
    }
  }

  calculateRoute(origin, dest) {
    const steps = 20;
    const route = [];
    for (let i = 0; i <= steps; i++) {
      route.push({
        lat: origin.lat + (dest.lat - origin.lat) * (i / steps),
        lng: origin.lng + (dest.lng - origin.lng) * (i / steps),
      });
    }
    return route;
  }

  dispatch() {
    if (!this.config.enableAutoDispatch) return;
    const available = Array.from(this.ambulances.values()).filter(a => a.status === 'available');
    if (available.length === 0) return;
    const pending = Array.from(this.victims.values())
      .filter(v => v.status === 'pending')
      .sort((a, b) => b.triageLevel - a.triageLevel);
    for (const victim of pending) {
      if (available.length === 0) break;
      const ambulance = available.reduce((min, amb) => {
        const d1 = haversine(victim.lat, victim.lng, amb.lat, amb.lng);
        const d2 = haversine(victim.lat, victim.lng, min.lat, min.lng);
        return d1 < d2 ? amb : min;
      }, available[0]);
      const route = this.calculateRoute(ambulance, victim);
      ambulance.status = 'assigned';
      ambulance.assignedVictim = victim.id;
      ambulance.route = route;
      ambulance.routeProgress = 0;
      victim.status = 'dispatching';
      victim.assignedAmbulance = ambulance.id;
      victim.dispatchTime = this.tickCount;
      this.events.push({
        tick: this.tickCount,
        type: 'victim_dispatched',
        data: { victimId: victim.id, ambulanceId: ambulance.id },
      });
      available.splice(available.indexOf(ambulance), 1);
    }
  }

  moveAmbulances() {
    const ambValues = Array.from(this.ambulances.values());
    for (const amb of ambValues) {
      if (amb.status === 'available') continue;
      if (amb.route.length < 2) continue;
      const moveAmount = 0.08 * this.speed;
      amb.routeProgress = Math.min(1, amb.routeProgress + moveAmount);
      const idx = Math.min(Math.floor(amb.routeProgress * (amb.route.length - 1)), amb.route.length - 2);
      const nextIdx = idx + 1;
      const progress = (amb.routeProgress * (amb.route.length - 1)) - idx;
      amb.lat = amb.route[idx].lat + (amb.route[nextIdx].lat - amb.route[idx].lat) * progress;
      amb.lng = amb.route[idx].lng + (amb.route[nextIdx].lng - amb.route[idx].lng) * progress;
      if (amb.routeProgress >= 1) {
        const victim = this.victims.get(amb.assignedVictim);
        if (victim && victim.status === 'dispatching') {
          victim.status = 'transporting';
          amb.status = 'returning';
          const returnRoute = this.calculateRoute(amb, { lat: amb.homeLat, lng: amb.homeLng });
          amb.route = returnRoute;
          amb.routeProgress = 0;
          this.events.push({
            tick: this.tickCount,
            type: 'victim_picked_up',
            data: { victimId: victim.id, ambulanceId: amb.id },
          });
        } else if (amb.status === 'returning') {
          victim.status = 'delivered';
          victim.deliveryTime = this.tickCount;
          this.responseTimes.push(this.tickCount - victim.dispatchTime);
          amb.status = 'available';
          amb.assignedVictim = null;
          amb.route = [];
          amb.routeProgress = 0;
          this.events.push({
            tick: this.tickCount,
            type: 'victim_delivered',
            data: { victimId: victim.id, ambulanceId: amb.id },
          });
        }
      }
    }
  }

  _calculateMetrics() {
    const delivered = Array.from(this.victims.values()).filter(v => v.status === 'delivered');
    const totalDelivered = delivered.length;
    const avgResponseTime = totalDelivered > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / totalDelivered
      : 0;
    const criticalPending = Array.from(this.victims.values())
      .filter(v => v.triageLevel === 3 && v.status !== 'delivered').length;
    const busyAmbs = Array.from(this.ambulances.values())
      .filter(a => a.status !== 'available').length;
    const ambulanceUtilization = (busyAmbs / this.ambulances.size) * 100;
    const assigned = Array.from(this.victims.values())
      .filter(v => v.status !== 'pending' && v.status !== 'delivered').length;
    const totalIngested = this.victims.size;
    const totalAssigned = assigned + totalDelivered;
    return {
      totalIngested,
      totalAssigned,
      totalDelivered,
      criticalCount: criticalPending,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      ambulanceUtilization: Math.round(ambulanceUtilization),
    };
  }

  tick() {
    this.spawnVictims(this.config.victimSpawnRate);
    this.deteriorate();
    this.dispatch();
    this.moveAmbulances();
    this.tickCount++;
    const state = this.getState();
    for (const fn of this.subscribers) {
      fn(state);
    }
    return state;
  }

  getState() {
    return {
      tick: this.tickCount,
      running: this.running,
      speed: this.speed,
      config: { ...this.config },
      victims: new Map(this.victims),
      ambulances: new Map(this.ambulances),
      events: [...this.events].slice(-50),
      metrics: this._calculateMetrics(),
    };
  }

  subscribe(fn) {
    this.subscribers.push(fn);
    return () => {
      const idx = this.subscribers.indexOf(fn);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }
}

export function createSimulation(config) {
  return new SimulationEngine(config);
}