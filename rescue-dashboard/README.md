# Rescue Dashboard

React frontend for DisasterTriageNet. For project overview and setup instructions, see the root [README.md](../README.md).

---

## 🧩 Components

| Component | Description |
|-----------|-------------|
| `MapView.jsx` | Leaflet-based interactive map with victim markers and cluster visualizations |
| `AmbulancePanel.jsx` | Real-time ambulance fleet management panel with live status updates |
| `IncidentTimeline.jsx` | Chronological timeline of victim status changes during an incident |
| `VictimCard.jsx` | Mobile-optimized victim info card with vitals and triage status |

---

## ⚙️ Configuration

- `config.js` - API base URL and environment settings
- `socket.js` - WebSocket client for real-time updates