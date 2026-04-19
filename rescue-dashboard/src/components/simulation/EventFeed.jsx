"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "src/components/ui/scroll-area"

const EVENT_COLORS = {
  ingest: "text-green-500",
  assign: "text-blue-500",
  deteriorate: "text-red-500",
  dispatch: "text-orange-500",
  deliver: "text-purple-500",
  ambulance_return: "text-cyan-500",
}

const EVENT_MESSAGES = {
  ingest: (data) => `Victim ${data.victimId} ingested (${data.severity})`,
  assign: (data) => `Victim ${data.victimId} assigned to ${data.ambulanceId}`,
  deteriorate: (data) => `Victim ${data.victimId} worsened to ${data.severity}`,
  dispatch: (data) => `${data.ambulanceId} dispatched to ${data.victimId}`,
  deliver: (data) => `Victim ${data.victimId} delivered to hospital`,
  ambulance_return: (data) => `${data.ambulanceId} returned to base`,
}

function formatTime(tick) {
  const totalSeconds = Math.floor(tick / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

export default function EventFeed({ events, maxEvents = 50 }) {
  const viewportRef = useRef(null)
  const displayEvents = events.slice(0, maxEvents)

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0
    }
  }, [events.length])

  return (
    <ScrollArea className="h-[200px] rounded-md border">
      <div className="p-3 space-y-1 font-mono text-xs">
        {displayEvents.map((event, idx) => {
          const colorClass = EVENT_COLORS[event.type] || "text-muted-foreground"
          const message =
            EVENT_MESSAGES[event.type]?.(event.data) || event.type

          return (
            <div
              key={`${event.tick}-${event.type}-${idx}`}
              className="flex gap-2 items-start"
            >
              <span className="text-muted-foreground shrink-0">
                [{formatTime(event.tick)}]
              </span>
              <span className={colorClass}>{message}</span>
            </div>
          )
        })}
        {displayEvents.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            No events yet
          </div>
        )}
      </div>
    </ScrollArea>
  )
}