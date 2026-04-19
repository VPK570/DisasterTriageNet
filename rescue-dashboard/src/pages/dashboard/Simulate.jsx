import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Users, Truck, AlertTriangle, TrendingUp } from 'lucide-react';
import { createSimulation } from '@/lib/liveSimulation';
import LiveSimulationMap from '@/components/simulation/LiveSimulationMap';
import SimulationControls from '@/components/simulation/SimulationControls';
import SimulationStats from '@/components/simulation/SimulationStats';
import EventFeed from '@/components/simulation/EventFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SimulatePage() {
  const [mode, setMode] = useState('live');
  const [state, setState] = useState(null);
  const [staticResults, setStaticResults] = useState(null);
  const engineRef = useRef(null);

  const [config, setConfig] = useState({
    scenario: 'A',
    ambulanceCount: 1,
    victimSpawnRate: 2,
    maxVictims: 50,
    enableDeterioration: true,
    enableAutoDispatch: true,
  });

  useEffect(() => {
    const { runSimulation } = require('@/lib/simulation');
    try {
      const results = runSimulation({
        numVictims: config.maxVictims,
        numAmbulances: config.ambulanceCount,
        scenario: config.scenario,
        includeDeterioration: config.enableDeterioration,
      });
      setStaticResults(results);
    } catch (e) {
      console.error('Static simulation error:', e);
    }
  }, [config]);

  useEffect(() => {
    const eng = createSimulation(config);
    engineRef.current = eng;
    setState(eng.getState());
  }, []);

  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
      setState({ ...engineRef.current.getState(), running: true });
    }
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
      setState({ ...engineRef.current.getState(), running: false });
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
    if (engineRef.current) {
      engineRef.current.pause();
      const newEng = createSimulation(newConfig);
      engineRef.current = newEng;
      setState(newEng.getState());
    }
  }, []);

  useEffect(() => {
    if (!state?.running || !engineRef.current) return;
    
    const interval = setInterval(() => {
      if (engineRef.current && engineRef.current.getState().running) {
        engineRef.current.tick();
        setState({ ...engineRef.current.getState() });
      }
    }, 1000 / (state.speed || 1));
    
    return () => clearInterval(interval);
  }, [state?.running, state?.speed]);

  const formatTime = (tick) => {
    const mins = Math.floor(tick / 60);
    const secs = tick % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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
                  Victims: {config.maxVictims}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={config.maxVictims}
                  onChange={(e) => setConfig({ ...config, maxVictims: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Ambulances: {config.ambulanceCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.ambulanceCount}
                  onChange={(e) => setConfig({ ...config, ambulanceCount: parseInt(e.target.value) })}
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
            <div className="lg:col-span-3 h-[600px]">
              <LiveSimulationMap
                victims={victims}
                ambulances={ambulances}
              />
            </div>
            <div className="space-y-4">
              <SimulationStats
                tick={state?.tickCount || 0}
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