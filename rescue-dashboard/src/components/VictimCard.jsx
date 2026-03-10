// VictimCard.jsx — minimal mobile triage card
import { useEffect, useState } from "react";

const LEVEL_META = {
    0: { label: "LOW", color: "#22c55e", bg: "bg-green-500/10", border: "border-green-500/30" },
    1: { label: "MODERATE", color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    2: { label: "HIGH", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    3: { label: "CRITICAL", color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30" },
};

export default function VictimCard({ victimId }) {
    const [victim, setVictim] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5001/api/victims")
            .then(r => r.json())
            .then(data => {
                const found = data.find(v => v.id === victimId);
                found ? setVictim(found) : setError("Victim not found");
            })
            .catch(() => setError("Cannot reach server"));
    }, [victimId]);

    if (error) return <div className="min-h-screen bg-slate-950 p-4 pt-20 text-center"><p className="text-red-400 p-4">{error}</p></div>;
    if (!victim) return <div className="min-h-screen bg-slate-950 p-4 pt-20 text-center"><p className="text-slate-400 p-4">Loading...</p></div>;

    const meta = LEVEL_META[victim.triage_level] ?? LEVEL_META[0];

    return (
        <div className="min-h-screen bg-slate-950 p-4 flex flex-col gap-4 max-w-sm mx-auto pt-8">
            <div className={`rounded-2xl p-5 border ${meta.bg} ${meta.border}`}>
                <p className="text-slate-400 text-xs mb-1">TRIAGE LEVEL</p>
                <p className="text-4xl font-black" style={{ color: meta.color }}>
                    {meta.label}
                </p>
                <p className="text-slate-400 text-sm mt-1">Victim ID: {victim.id}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
                {[
                    ["Age", victim.age, "yrs"],
                    ["Heart Rate", victim.heart_rate, "bpm"],
                    ["SpO₂", victim.spo2, "%"],
                    ["Temp", victim.temperature, "°C"],
                ].map(([label, val, unit]) => (
                    <div key={label} className="bg-slate-800 rounded-xl p-3">
                        <p className="text-slate-500 text-xs">{label}</p>
                        <p className="text-slate-100 text-xl font-bold">
                            {val}<span className="text-slate-500 text-xs font-normal ml-0.5">{unit}</span>
                        </p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-slate-500 text-xs mb-1">ASSIGNED HOSPITAL</p>
                <p className="text-slate-100 font-semibold">
                    {victim.hospital_assigned || "Unassigned — awaiting dispatch"}
                </p>
                <p className="text-slate-500 text-xs mt-2">Status: {victim.status}</p>
                <p className="text-slate-600 text-xs mt-0.5">
                    Ingested: {new Date(victim.timestamp).toLocaleTimeString()}
                </p>
            </div>

            <button
                onClick={() => window.location.href = '/'}
                className="mt-4 text-slate-500 text-xs hover:text-slate-300 transition-colors underline"
            >
                Back to Dashboard
            </button>
        </div>
    );
}
