import { AlertTriangle, Clock, Activity } from "lucide-react"
import { Card } from "src/components/ui/card"
import { Badge } from "src/components/ui/badge"

function ProgressBar({ value, max, colorClass, label }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-medium">{value}</span>
    </div>
  )
}

function formatTime(tick) {
  const totalSeconds = Math.floor(tick / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export default function SimulationStats({
  tick,
  running,
  speed,
  metrics,
  victimCount,
  ambulanceCount,
}) {
  const pending = victimCount - metrics.totalAssigned - metrics.totalDelivered

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium">CRITICAL</span>
        </div>
        <Badge variant="destructive" className="text-lg px-3 py-1">
          {metrics.criticalCount}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">TIME</span>
        </div>
        <span className="text-xl font-mono font-bold">{formatTime(tick)}</span>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <ProgressBar
          value={metrics.totalIngested}
          max={victimCount || 1}
          colorClass="bg-purple-500"
          label="INGESTED"
        />
        <ProgressBar
          value={pending}
          max={victimCount || 1}
          colorClass="bg-yellow-500"
          label="PENDING"
        />
        <ProgressBar
          value={metrics.totalAssigned}
          max={victimCount || 1}
          colorClass="bg-blue-500"
          label="ASSIGNED"
        />
        <ProgressBar
          value={metrics.totalDelivered}
          max={victimCount || 1}
          colorClass="bg-green-500"
          label="DELIVERED"
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm text-muted-foreground">AMBULANCE</span>
          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${metrics.ambulanceUtilization || 0}%` }}
            />
          </div>
          <span className="w-10 text-right text-sm font-medium">
            {Math.round(metrics.ambulanceUtilization || 0)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">AVG RESPONSE</span>
          </div>
          <span className="text-sm font-medium">
            {Math.round(metrics.avgResponseTime || 0)}s
          </span>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>Victims: {victimCount}</span>
        <span>Ambulances: {ambulanceCount}</span>
      </div>
    </Card>
  )
}
