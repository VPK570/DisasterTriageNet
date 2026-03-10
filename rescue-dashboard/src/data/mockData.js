export const mockVictims = [
  { id: "V-101", lat: 13.0827, lng: 80.2707, severity: 3, age: 64, hr: 145, spo2: 82, temp: 39.8, status: "unassigned", time: "2 mins ago" },
  { id: "V-102", lat: 13.0850, lng: 80.2750, severity: 2, age: 34, hr: 125, spo2: 88, temp: 38.9, status: "unassigned", time: "5 mins ago" },
  { id: "V-103", lat: 13.0800, lng: 80.2680, severity: 0, age: 22, hr: 75, spo2: 98, temp: 37.1, status: "unassigned", time: "12 mins ago" },
  { id: "V-104", lat: 13.0900, lng: 80.2800, severity: 3, age: 78, hr: 45, spo2: 80, temp: 36.5, status: "unassigned", time: "1 min ago" },
];

export const mockAmbulances = [
  { id: "AMB-01", status: "Available", location: "Adyar", lat: 13.0012, lng: 80.2565 },
  { id: "AMB-02", status: "Busy", location: "T. Nagar", lat: 13.0418, lng: 80.2341 },
];

export const mockClusters = [
  { id: 1, lat: 13.0830, lng: 80.2710, victim_count: 14 }
];