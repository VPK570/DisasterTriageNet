// VictimCard.jsx — premium mobile triage card
import { useEffect, useState } from "react";

const LEVEL_META = {
    0: { label: "LOW", color: "#22c55e", bg: "bg-green-500/10", border: "border-green-500/30", grad: "from-green-500/20 to-transparent" },
    1: { label: "MODERATE", color: "#eab308", bg: "bg-yellow-500/10", border: "border-yellow-500/30", grad: "from-yellow-500/20 to-transparent" },
    2: { label: "HIGH", color: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/30", grad: "from-blue-500/20 to-transparent" },
    3: { label: "CRITICAL", color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30", grad: "from-red-500/20 to-transparent" },
};

export default function VictimCard({ victimId }) {
    const [victim, setVictim] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5001/api/victims")
            .then(r => r.json())
            .then(data => {
                const found = data.find(v => v.id === victimId);
                found ? setVictim(found) : setError("Victim ID Not Found");
            })
            .catch(() => setError("Network Interface Error"));
    }, [victimId]);

    if (error) return <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center"><div className="glass-card p-6 rounded-2xl text-red-400 font-bold uppercase tracking-widest text-center border-red-500/50">{error}</div></div>;

    if (!victim) return (
        <div className="min-h-screen bg-slate-950 p-8 flex flex-col gap-6 pt-20">
            <div className="h-32 glass-card rounded-3xl animate-pulse" />
            <div className="h-48 glass-card rounded-3xl animate-pulse" />
        </div>
    );

    const meta = LEVEL_META[victim.triage_level] ?? LEVEL_META[0];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 flex flex-col gap-6 max-w-sm mx-auto pt-12 font-sans selection:bg-blue-500/30">
            {/* Header / Status */}
            <div className={`glass-card rounded-3xl p-8 border-t-4 relative overflow-hidden`} style={{ borderTopColor: meta.color }}>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${meta.grad} blur-3xl -mr-10 -mt-10 opacity-50`} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Triage Protocol</p>
                <p className="text-5xl font-black tracking-tighter mb-1" style={{ color: meta.color }}>
                    {meta.label}
                </p>
                <p className="text-slate-400 text-xs font-bold tabular-nums">Patient ID: {victim.id}</p>
            </div>

            {/* Vitals Grid */}
            <div className="glass-card rounded-3xl p-6 grid grid-cols-2 gap-4">
                {[
                    ["Age", victim.age, "YRS"],
                    ["Pulse", victim.heart_rate, "BPM"],
                    ["Oxygen", victim.spo2, "%"],
                    ["Temp", victim.temperature, "°C"],
                ].map(([label, val, unit]) => (
                    <div key={label} className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/50">
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-slate-100 text-2xl font-black tabular-nums">
                            {val}<span className="text-slate-500 text-[10px] font-bold ml-1">{unit}</span>
                        </p>
                    </div>
                ))}
            </div>

            {/* Care Coordination */}
            <div className="glass-card rounded-3xl p-6 border-l-4 border-l-blue-500/30">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Rescue Routing</p>
                <div className="space-y-1">
                    <p className="text-slate-100 font-black text-lg uppercase leading-tight">
                        {victim.hospital_assigned || "Pending Dispatch"}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${victim.status === 'assigned' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} />
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Status: {victim.status}
                        </p>
                    </div>
                </div>
                <p className="text-slate-600 text-[9px] font-bold mt-4 uppercase tabular-nums">
                    Logged: {new Date(victim.timestamp).toLocaleTimeString()}
                </p>
            </div>

            <button
                onClick={() => window.location.href = '/'}
                className="mt-4 glass-card py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all active:scale-95"
            >
                Return to Command
            </button>
        </div>
    );
}
