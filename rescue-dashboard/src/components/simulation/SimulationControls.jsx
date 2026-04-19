import { Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "src/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select"
import { Slider } from "src/components/ui/slider"
import { Switch } from "src/components/ui/switch"
import { Label } from "src/components/ui/label"

const SPEED_OPTIONS = ["1x", "2x", "5x", "10x"]
const SCENARIO_OPTIONS = ["A", "B", "C"]

export default function SimulationControls({
  config,
  running,
  speed,
  onConfigChange,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
}) {
  const handleConfigUpdate = (key, value) => {
    onConfigChange({ ...config, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onStart}
          disabled={running}
          variant={running ? "secondary" : "default"}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Play
        </Button>
        <Button
          onClick={onPause}
          disabled={!running}
          variant={running ? "default" : "secondary"}
          className="gap-2"
        >
          <Pause className="h-4 w-4" />
          Pause
        </Button>
        <Button onClick={onReset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="speed-select" className="text-muted-foreground">
            Speed
          </Label>
          <Select
            value={speed}
            onValueChange={onSpeedChange}
            disabled={running}
          >
            <SelectTrigger id="speed-select" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="scenario-select" className="text-muted-foreground">
            Scenario
          </Label>
          <Select
            value={config.scenario}
            onValueChange={(v) => handleConfigUpdate("scenario", v)}
            disabled={running}
          >
            <SelectTrigger id="scenario-select" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENARIO_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex w-40 flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="spawn-rate" className="text-muted-foreground">
              Spawn Rate
            </Label>
            <span className="text-sm text-foreground">{config.spawnRate}/sec</span>
          </div>
          <Slider
            id="spawn-rate"
            min={1}
            max={10}
            step={1}
            value={[config.spawnRate]}
            onValueChange={([v]) => handleConfigUpdate("spawnRate", v)}
            disabled={running}
          />
        </div>

        <div className="flex w-40 flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="max-victims" className="text-muted-foreground">
              Max Victims
            </Label>
            <span className="text-sm text-foreground">{config.maxVictims}</span>
          </div>
          <Slider
            id="max-victims"
            min={10}
            max={100}
            step={10}
            value={[config.maxVictims]}
            onValueChange={([v]) => handleConfigUpdate("maxVictims", v)}
            disabled={running}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="deterioration"
            checked={config.deterioration}
            onCheckedChange={(checked) => handleConfigUpdate("deterioration", checked)}
            disabled={running}
          />
          <Label htmlFor="deterioration" className="text-muted-foreground">
            Deterioration
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="auto-dispatch"
            checked={config.autoDispatch}
            onCheckedChange={(checked) => handleConfigUpdate("autoDispatch", checked)}
            disabled={running}
          />
          <Label htmlFor="auto-dispatch" className="text-muted-foreground">
            Auto-Dispatch
          </Label>
        </div>
      </div>
    </div>
  )
}