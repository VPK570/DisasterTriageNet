import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Clock, Users, Truck, AlertTriangle, TrendingUp } from 'lucide-react';
import { createSimulation, SimulationEngine } from '@/lib/liveSimulation';
import LiveSimulationMap from '@/components/simulation/LiveSimulationMap';
import SimulationControls from '@/components/simulation/SimulationControls';
import SimulationStats from '@/components/simulation/SimulationStats';
import EventFeed from '@/components/simulation/EventFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SEVERITY_COLORS = {
  0: '#22c55e',
  1: '#eab308',
  2: '#3b82f6',
  3: '#f43f5e',
};

export default function SimulatePage() {
  const [mode, setMode] = useState('static');
  const [engine, setEngine] = useState(null);
  const [state, setState] = useState(null);
  const [staticResults, setStaticResults] = useState(null);
  const engineRef = useRef(null);

  const [config, setConfig] = useState({
    victimSpawnRate: 2,
    maxVictims: 50,
    enableDeterioration: true,
    enableAutoDispatch: true,
    scenario: 'A',
    ambulanceCount: 1,
  });

  const handleStart = useCallback(() => {
    if (!engineRef.current) {
      const eng = createSimulation(config);
      engineRef.current = eng;
      setEngine(eng);
    }
    engineRef.current.start();
    setState(engineRef.current.getState());
  }, [config]);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      setState(engineRef.current.getState());
    }
  }, []);

  const handleReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      engineRef.current.reset();
      setState(engineRef.current.getState());
    }
  }, []);

  const handleSpeedChange = useCallback((speed) => {
    if (engineRef.current) {
      engineRef.current.setSpeed(speed);
      setState(engineRef.current.getState());
    }
  }, []);

  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
    if (engineRef.current && !state?.running) {
      engineRef.current.pause();
      const newEngine = createSimulation(newConfig);
      engineRef.current = newEngine;
      setEngine(newEngine);
      setState(newEngine.getState());
    }
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    const interval = setInterval(() => {
      if (engineRef.current.getState()?.running) {
        engineRef.current.tick();
        setState({ ...engineRef.current.getState() });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const { runSimulation } = require('@/lib/simulation');
    const results = runSimulation(config);
    setStaticResults(results);
  }, [config]);

  const formatTime = (tick) => {
    const mins = Math.floor(tick / 60);
    const secs = tick % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const staticChartData = staticResults ? [
    { name: 'BASELINE_1', time: staticResults.BASELINE_1.mean_time_to_assignment, color: '#64748b' },
    { name: 'BASELINE_2', time: staticResults.BASELINE_2.mean_time_to_assignment, color: '#3b82f6' },
    { name: 'SYSTEM', time: staticResults.SYSTEM.mean_time_to_assignment, color: '#6366f1' },
  ] : [];

  const victims = state?.victims || new Map();
  const ambulances = state?.ambulances || new Map();
  const events = state?.events || [];
  const metrics = state?.metrics || {
    totalIngested: 0,
    totalAssigned: 0,
    totalDelivered: 0,
    criticalCount: 0,
    avgResponseTime: 0,
    ambulanceUtilization: 0,
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Simulation</h1>
          <p className="text-muted-foreground">Test dispatch algorithms in real-time</p>
        </div>
        <Tabs value={mode} onValueChange={setMode} className="w-[300px]">
          <TabsList className="w-full">
            <TabsTrigger value="static" className="flex-1">
              <TrendingUp className="w-4 h-4 mr-2" />
              Static
            </TabsTrigger>
            <TabsTrigger value="live" className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Live
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'static' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Victims: {config.numVictims}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={config.numVictims}
                  onChange={(e) => setConfig({ ...config, numVictims: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Ambulances: {config.numAmbulances}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.numAmbulances}
                  onChange={(e) => setConfig({ ...config, numAmbulances: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Scenario
                </label>
                <select
                  value={config.scenario}
                  onChange={(e) => setConfig({ ...config, scenario: e.target.value })}
                  className="w-full p-2 rounded-md bg-background border"
                >
                  <option value="A">A - Single Cluster (Stable)</option>
                  <option value="B">B - Single Cluster (Deteriorating)</option>
                  <option value="C">C - Two Clusters</option>
                </select>
              </div>
              {staticResults && (
                <div className="grid grid-cols-3 gap-2 pt-4">
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">BASELINE_1</p>
                    <p className="text-lg font-bold">{staticResults.BASELINE_1.mean_time_to_assignment.toFixed(1)}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">BASELINE_2</p>
                    <p className="text-lg font-bold">{staticResults.BASELINE_2.mean_time_to_assignment.toFixed(1)}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">SYSTEM</p>
                    <p className="text-lg font-bold">{staticResults.SYSTEM.mean_time_to_assignment.toFixed(1)}s</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Static mode - shows aggregate results</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <SimulationControls
            config={config}
            running={state?.running || false}
            speed={state?.speed || 1}
            onConfigChange={handleConfigChange}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
          />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <LiveSimulationMap
                victims={victims}
                ambulances={ambulances}
              />
            </div>
            <div className="space-y-4">
              <SimulationStats
                tick={state?.tick || 0}
                running={state?.running || false}
                speed={state?.speed || 1}
                metrics={metrics}
                victimCount={victims.size}
                ambulanceCount={ambulances.size}
              />
              <EventFeed events={events} maxEvents={30} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}