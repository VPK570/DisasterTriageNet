export const mockVictims = [
  { id: "V-101", lat: 34.0522, lng: -118.2437, severity: 3, age: 64, hr: 145, spo2: 82, temp: 39.8, status: "unassigned", time: "2 mins ago" },
  { id: "V-102", lat: 34.0542, lng: -118.2457, severity: 2, age: 34, hr: 125, spo2: 88, temp: 38.9, status: "unassigned", time: "5 mins ago" },
  { id: "V-103", lat: 34.0502, lng: -118.2417, severity: 0, age: 22, hr: 75,  spo2: 98, temp: 37.1, status: "unassigned", time: "12 mins ago" },
  { id: "V-104", lat: 34.0582, lng: -118.2337, severity: 3, age: 78, hr: 45,  spo2: 80, temp: 36.5, status: "unassigned", time: "1 min ago" },
];

export const mockAmbulances = [
  { id: "AMB-01", lat: 34.0532, lng: -118.2427, status: "available" },
  { id: "AMB-02", lat: 34.0492, lng: -118.2487, status: "busy" },
];

export const mockClusters = [
  { id: 1, lat: 34.0530, lng: -118.2430, victim_count: 14 }
];