import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MapPin, Clock, AlertTriangle, Edit, Trash2, Loader2, Radio } from 'lucide-react';
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

export default function Incidents({ 
  token, 
  activeIncident, 
  onIncidentChange, 
  userRole 
}) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({ 
    name: '', 
    location: '', 
    description: '' 
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState(null);

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

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiFetch(`${API_BASE}/incidents`);
      
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch incidents');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleCreateConfirm = async () => {
    if (!newIncident.name) return;
    
    try {
      const res = await apiFetch(`${API_BASE}/incidents`, {
        method: 'POST',
        body: JSON.stringify(newIncident),
      });
      
      if (res.ok) {
        const data = await res.json();
        await fetchIncidents();
        if (data.id) {
          onIncidentChange?.(data.id);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create incident');
      }
    } catch (err) {
      alert('Connection failed');
    }
    
    setNewIncident({ name: '', location: '', description: '' });
    setCreateDialogOpen(false);
  };

  const handleDeleteClick = (incident) => {
    setIncidentToDelete(incident);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!incidentToDelete) return;
    
    try {
      const res = await apiFetch(`${API_BASE}/incidents/${incidentToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await fetchIncidents();
        if (activeIncident === incidentToDelete.id && incidents.length > 1) {
          const remaining = incidents.filter(i => i.id !== incidentToDelete.id);
          if (remaining.length > 0) {
            onIncidentChange?.(remaining[0].id);
          }
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete incident');
      }
    } catch (err) {
      alert('Connection failed');
    }
    
    setDeleteDialogOpen(false);
    setIncidentToDelete(null);
  };

  const handleSwitchIncident = (incidentId) => {
    onIncidentChange?.(incidentId);
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
        <h2 className="text-xl font-bold text-slate-100">Incident Management</h2>
        {userRole === 'admin' && (
          <Button 
            onClick={() => setCreateDialogOpen(true)} 
            className="bg-blue-600 hover:bg-blue-500"
          >
            <Plus size={14} className="mr-2" />
            New Incident
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow>
              <TableHead className="text-slate-400">ID</TableHead>
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Location</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Start Time</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-red-400 py-8">
                  {error}
                </TableCell>
              </TableRow>
            ) : incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No incidents found
                </TableCell>
              </TableRow>
            ) : (
              incidents.map((incident) => (
                <TableRow 
                  key={incident.id} 
                  className={`hover:bg-slate-800/30 ${activeIncident === incident.id ? 'bg-blue-500/10' : ''}`}
                >
                  <TableCell className="font-mono text-slate-200">
                    {incident.id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        size={14}
                        className={
                          incident.status === 'active'
                            ? 'text-red-500'
                            : 'text-slate-500'
                        }
                      />
                      {incident.name}
                      {activeIncident === incident.id && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                          Active
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      {incident.location || incident.location_name || '--'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        incident.status === 'active'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {incident.status || 'inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(incident.created_at || incident.start_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {activeIncident !== incident.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSwitchIncident(incident.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Radio size={14} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <MapPin size={14} />
                      </Button>
                      {userRole === 'admin' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(incident)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Create New Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-400">Incident Name *</Label>
              <Input
                value={newIncident.name}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, name: e.target.value })
                }
                placeholder="e.g., Building Collapse - Anna Nagar"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label className="text-slate-400">Location</Label>
              <Input
                value={newIncident.location}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, location: e.target.value })
                }
                placeholder="e.g., Chennai, Tamil Nadu"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label className="text-slate-400">Description</Label>
              <Input
                value={newIncident.description}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, description: e.target.value })
                }
                placeholder="Brief description..."
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="bg-slate-800 border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfirm}
              disabled={!newIncident.name}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Create Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Delete Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-slate-300">
              Are you sure you want to delete incident{' '}
              <span className="font-medium text-slate-100">
                {incidentToDelete?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-slate-800 border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}