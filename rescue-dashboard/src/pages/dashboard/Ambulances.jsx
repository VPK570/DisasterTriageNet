import React, { useState, useEffect, useCallback } from 'react';
import { Truck, MapPin, Navigation, Phone, Loader2, Clock } from 'lucide-react';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { API_BASE } from '@/config';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: 'bg-green-500/20 text-green-400' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'en_route', label: 'En Route', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'at_hospital', label: 'At Hospital', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'returning', label: 'Returning', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'offline', label: 'Offline', color: 'bg-slate-500/20 text-slate-400' },
];

const STATUS_COLORS = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o]));

export default function Ambulances({ token, onRoutePlan, activeIncident, onDispatchToVictim }) {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [victimIdToDispatch, setVictimIdToDispatch] = useState('');

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

  const fetchAmbulances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiFetch(`${API_BASE}/ambulances`);
      
      if (res.ok) {
        const data = await res.json();
        setAmbulances(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch ambulances');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchAmbulances();
  }, [fetchAmbulances]);

  const handleRoutePlanClick = async (ambulance) => {
    setSelectedAmbulance(ambulance);
    setRouteDialogOpen(true);
    
    if (onRoutePlan) {
      onRoutePlan(ambulance);
    }
  };

  const handleDispatchClick = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setVictimIdToDispatch('');
    setDispatchDialogOpen(true);
  };

  const handleDispatchConfirm = async () => {
    if (!selectedAmbulance || !victimIdToDispatch) return;
    
    if (onDispatchToVictim) {
      await onDispatchToVictim(selectedAmbulance.id, victimIdToDispatch);
    }
    setDispatchDialogOpen(false);
  };

  const getStatusBadge = (status) => {
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.offline;
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${statusStyle.color}`}>
        {statusStyle.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100">Ambulance Fleet</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            {ambulances.length} ambulances
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow>
              <TableHead className="text-slate-400">ID</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Current Location</TableHead>
              <TableHead className="text-slate-400">Assigned Victim</TableHead>
              <TableHead className="text-slate-400">Last Update</TableHead>
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
            ) : ambulances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  No ambulances available
                </TableCell>
              </TableRow>
            ) : (
              ambulances.map((amb) => {
                const statusStyle = STATUS_COLORS[amb.status] || STATUS_COLORS.offline;
                return (
                  <TableRow key={amb.id} className="hover:bg-slate-800/30">
                    <TableCell className="font-mono text-slate-200">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-slate-500" />
                        {amb.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(amb.status)}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {amb.lat && amb.lng
                        ? `${amb.lat.toFixed(4)}, ${amb.lng.toFixed(4)}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {amb.assigned_victim || '--'}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(amb.last_update)}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {amb.eta_minutes ? `${amb.eta_minutes}m` : '--'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRoutePlanClick(amb)}
                          className="text-blue-400 hover:text-blue-300"
                          disabled={amb.status === 'offline'}
                          title="Plan Route"
                        >
                          <Navigation size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-slate-200"
                          title="View Location"
                        >
                          <MapPin size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDispatchClick(amb)}
                          className="text-green-400 hover:text-green-300"
                          disabled={amb.status !== 'available'}
                          title="Dispatch to Victim"
                        >
                          <Truck size={14} />
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

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Route Planning</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400">Ambulance ID</Label>
                <p className="text-slate-200 font-mono">{selectedAmbulance?.id}</p>
              </div>
              <div>
                <Label className="text-slate-400">Current Status</Label>
                <p className="text-slate-200">{getStatusBadge(selectedAmbulance?.status)}</p>
              </div>
              <div>
                <Label className="text-slate-400">Location</Label>
                <p className="text-slate-200">
                  {selectedAmbulance?.lat && selectedAmbulance?.lng
                    ? `${selectedAmbulance.lat.toFixed(4)}, ${selectedAmbulance.lng.toFixed(4)}`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <Label className="text-slate-400">Assigned Victim</Label>
                <p className="text-slate-200">{selectedAmbulance?.assigned_victim || 'None'}</p>
              </div>
            </div>
            {routeInfo && (
              <div>
                <Label className="text-slate-400">Route</Label>
                <div className="mt-2 p-3 bg-slate-800 rounded text-xs font-mono text-slate-300 max-h-40 overflow-auto">
                  {JSON.stringify(routeInfo, null, 2)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setRouteDialogOpen(false)}
              className="bg-slate-800 border-slate-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Dispatch Ambulance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-400">Ambulance</Label>
              <p className="text-slate-200 font-mono">{selectedAmbulance?.id}</p>
            </div>
            <div>
              <Label className="text-slate-400">Victim ID</Label>
              <Input
                value={victimIdToDispatch}
                onChange={(e) => setVictimIdToDispatch(e.target.value)}
                placeholder="Enter victim ID to dispatch to"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setDispatchDialogOpen(false)}
              className="bg-slate-800 border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispatchConfirm}
              disabled={!victimIdToDispatch}
              className="bg-green-600 hover:bg-green-500"
            >
              Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}