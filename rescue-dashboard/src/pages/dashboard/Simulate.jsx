import { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Play, RotateCcw, Activity, Truck, Users, Clock, AlertTriangle } from 'lucide-react';
import { runSimulation } from '@/lib/simulation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const SYSTEM_COLORS = {
  BASELINE_1: '#64748b',
  BASELINE_2: '#3b82f6',
  SYSTEM: '#6366f1',
};

export default function SimulatePage() {
  const [config, setConfig] = useState({
    numVictims: 20,
    numAmbulances: 1,
    scenario: 'A',
    includeDeterioration: false,
  });
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const simResults = runSimulation(config);
      setResults(simResults);
      setRunning(false);
    }, 500);
  }, [config]);

  const handleReset = () => {
    setConfig({
      numVictims: 20,
      numAmbulances: 1,
      scenario: 'A',
      includeDeterioration: false,
    });
    setResults(null);
  };

  const chartData = results ? [
    { name: 'BASELINE_1', time: results.BASELINE_1.mean_time_to_assignment, color: SYSTEM_COLORS.BASELINE_1 },
    { name: 'BASELINE_2', time: results.BASELINE_2.mean_time_to_assignment, color: SYSTEM_COLORS.BASELINE_2 },
    { name: 'SYSTEM', time: results.SYSTEM.mean_time_to_assignment, color: SYSTEM_COLORS.SYSTEM },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Simulation Playground</h1>
          <p className="text-muted-foreground">Run dispatch scenarios and compare algorithms</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>Set simulation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Victims
                </Label>
                <Badge variant="secondary">{config.numVictims}</Badge>
              </div>
              <Slider
                value={[config.numVictims]}
                onValueChange={([v]) => setConfig(c => ({ ...c, numVictims: v }))}
                min={1}
                max={50}
                step={1}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Ambulances
                </Label>
                <Badge variant="secondary">{config.numAmbulances}</Badge>
              </div>
              <Slider
                value={[config.numAmbulances]}
                onValueChange={([v]) => setConfig(c => ({ ...c, numAmbulances: v }))}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Scenario
              </Label>
              <Select
                value={config.scenario}
                onValueChange={(v) => setConfig(c => ({ ...c, scenario: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - Single Cluster (Stable)</SelectItem>
                  <SelectItem value="B">B - Single Cluster (Deteriorating)</SelectItem>
                  <SelectItem value="C">C - Two Clusters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleRun}
              disabled={running}
              size="lg"
            >
              {running ? (
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Simulation
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Mean time to dispatch (seconds)</CardDescription>
          </CardHeader>
          <CardContent>
            {!results ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure and run simulation to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" domain={[0, 300]} tickFormatter={(v) => `${v}s`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip
                        formatter={(value) => [`${value.toFixed(1)}s`, 'Mean Time']}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase mb-1">BASELINE_1</p>
                    <p className="text-2xl font-bold">{results.BASELINE_1.mean_time_to_assignment.toFixed(1)}s</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.BASELINE_1.assigned_count} assigned
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase mb-1">BASELINE_2</p>
                    <p className="text-2xl font-bold">{results.BASELINE_2.mean_time_to_assignment.toFixed(1)}s</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.BASELINE_2.assigned_count} assigned
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase mb-1">SYSTEM</p>
                    <p className="text-2xl font-bold">{results.SYSTEM.mean_time_to_assignment.toFixed(1)}s</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.SYSTEM.assigned_count} assigned
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Utilization</p>
                    <p className="text-xl font-semibold">{results.SYSTEM.ambulance_utilization.toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Worsened</p>
                    <p className="text-xl font-semibold">{results.SYSTEM.victims_worsened}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Critical Wait</p>
                    <p className="text-xl font-semibold">
                      {results.SYSTEM.critical_mean_wait
                        ? `${results.SYSTEM.critical_mean_wait.toFixed(1)}s`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Critical Response</p>
                    <p className="text-xl font-semibold">
                      {results.SYSTEM.critical_response_rate
                        ? `${(results.SYSTEM.critical_response_rate * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}