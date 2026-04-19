import React, { useState, useEffect, useCallback } from 'react';
import { Building2, MapPin, Plus, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { API_BASE } from '@/config';

export default function Hospitals({ token, onReplenish, userRole, onViewOnMap }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replenishOpen, setReplenishOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [replenishAmount, setReplenishAmount] = useState(5);

  const apiFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    return res;
  }, [token]);

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiFetch(`${API_BASE}/hospitals`);
      
      if (res.ok) {
        const data = await res.json();
        setHospitals(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch hospitals');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const handleReplenishClick = (hospital) => {
    setSelectedHospital(hospital);
    setReplenishAmount(5);
    setReplenishOpen(true);
  };

  const handleReplenishConfirm = async () => {
    if (!selectedHospital || !replenishAmount) return;
    
    if (onReplenish) {
      onReplenish(selectedHospital.id, replenishAmount);
    }
    setReplenishOpen(false);
  };

  const handleViewOnMap = (hospital) => {
    if (onViewOnMap) {
      onViewOnMap(hospital);
    }
  };

  const getOccupancyColor = (percent) => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getBedColor = (available, total) => {
    if (available === 0) return 'text-red-400';
    if (available < 5) return 'text-orange-400';
    return 'text-green-400';
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100">Hospital Management</h2>
        <div className="text-sm text-slate-500">
          {hospitals.length} hospitals
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow>
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Specialty</TableHead>
              <TableHead className="text-slate-400">Available Beds</TableHead>
              <TableHead className="text-slate-400">Total Beds</TableHead>
              <TableHead className="text-slate-400">Occupancy %</TableHead>
              <TableHead className="text-slate-400">ETA</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-red-400 py-8">
                  {error}
                </TableCell>
              </TableRow>
            ) : hospitals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  No hospitals available
                </TableCell>
              </TableRow>
            ) : (
              hospitals.map((hospital) => {
                const occupancyPercent = hospital.total_beds > 0
                  ? Math.round(((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100)
                  : 0;
                
                return (
                  <TableRow key={hospital.id} className="hover:bg-slate-800/30">
                    <TableCell className="font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-500" />
                        {hospital.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {hospital.specialty || 'General'}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono ${getBedColor(hospital.available_beds, hospital.total_beds)}`}>
                        {hospital.available_beds}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {hospital.total_beds}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getOccupancyColor(occupancyPercent)}`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8">
                          {occupancyPercent}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {hospital.eta_minutes ? `${hospital.eta_minutes}m` : '--'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {userRole === 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplenishClick(hospital)}
                            disabled={hospital.available_beds === hospital.total_beds}
                            className="text-blue-400 border-blue-500/50 hover:bg-blue-500/20"
                          >
                            <Plus size={14} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewOnMap(hospital)}
                          className="text-slate-400 hover:text-slate-200"
                          title="Show on Map"
                        >
                          <Navigation size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={replenishOpen} onOpenChange={setReplenishOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Replenish Beds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-400">Hospital</Label>
              <p className="text-slate-200 font-medium">{selectedHospital?.name}</p>
            </div>
            <div>
              <Label className="text-slate-400">Current Available Beds</Label>
              <p className="text-slate-200">{selectedHospital?.available_beds} / {selectedHospital?.total_beds}</p>
            </div>
            <div>
              <Label className="text-slate-400">Number of Beds to Add</Label>
              <Input
                type="number"
                min={1}
                max={selectedHospital?.total_beds - selectedHospital?.available_beds + 1 || 10}
                value={replenishAmount}
                onChange={(e) => setReplenishAmount(parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setReplenishOpen(false)}
              className="bg-slate-800 border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplenishConfirm}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Add {replenishAmount} Beds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}