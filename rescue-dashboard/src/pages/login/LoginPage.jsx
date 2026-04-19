import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage({ onLogin, onRegister, error, isRegistering, setIsRegistering }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('responder');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegistering) {
      onRegister({ name, email, password, role });
    } else {
      onLogin({ email, password });
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
            <Lock className="text-blue-400" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-wider">SECURE ACCESS</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Disaster Triage Network</p>
        </div>

        <div className="flex bg-slate-900 border border-slate-700/50 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); }}
            className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded-md transition-all ${
              !isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); }}
            className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded-md transition-all ${
              isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Email / Responder ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder={isRegistering ? 'john@disaster.net' : 'admin@disaster.net'}
              required
            />
          </div>
          {isRegistering && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Role Assignment
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="responder">Field Responder</option>
                <option value="admin">Command Admin</option>
                <option value="victim">Civilian Victim</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center py-2">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest mt-4 ${
              isRegistering
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            {isRegistering ? 'Create Clearance' : 'Authenticate & Enter'}
          </Button>
          {!isRegistering && (
            <div className="mt-6 text-center">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Default Credentials:</p>
              <p className="text-[10px] text-slate-500 mt-1">Admin: admin@disaster.net / admin123</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}