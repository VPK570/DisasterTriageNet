import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, MapPin, Activity, ChevronLeft, ChevronRight, Loader2, Send, Clock, Heart, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE, SEVERITY_COLORS } from '@/config';

const SEVERITY_LABELS = {
  0: { label: 'Low', color: '#22c55e' },
  1: { label: 'Moderate', color: '#eab308' },
  2: { label: 'High', color: '#f97316' },
  3: { label: 'Critical', color: '#ef4444' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'discharged', label: 'Discharged' },
];

export default function Victims({ token, activeIncident, onAssign, onDischarge }) {
  const [victims, setVictims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedVictims, setSelectedVictims] = useState([]);
  const [selectedVictimDetails, setSelectedVictimDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const fetchVictims = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        incident_id: activeIncident || '',
      });
      
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await apiFetch(`${API_BASE}/victims?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        const mapped = data.victims?.map(v => ({ ...v, severity: v.triage_level })) || [];
        setVictims(mapped);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setPages(data.pages || 1);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch victims');
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }, [page, limit, severityFilter, statusFilter, searchQuery, activeIncident, apiFetch]);

  useEffect(() => {
    fetchVictims();
  }, [fetchVictims]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setPage(newPage);
    }
  };

  const handleRowClick = (victim) => {
    setSelectedVictimDetails(victim);
    setDetailsOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedVictims.length === victims.length) {
      setSelectedVictims([]);
    } else {
      setSelectedVictims(victims.map(v => v.id));
    }
  };

  const toggleSelectOne = (victimId) => {
    setSelectedVictims(prev => 
      prev.includes(victimId)
        ? prev.filter(id => id !== victimId)
        : [...prev, victimId]
    );
  };

  const handleBulkDispatch = async () => {
    if (selectedVictims.length === 0) return;
    
    for (const victimId of selectedVictims) {
      if (onAssign) onAssign(victimId);
    }
    setSelectedVictims([]);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-blue-500/20 text-blue-400">Assigned</Badge>;
      case 'discharged':
        return <Badge className="bg-green-500/20 text-green-400">Discharged</Badge>;
      default:
        return <Badge className="bg-slate-700 text-slate-400">Unassigned</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Victims Management</h2>
          <p className="text-sm text-slate-500">{total} total victims</p>
        </div>
        {selectedVictims.length > 0 && (
          <Button onClick={handleBulkDispatch} className="bg-blue-600 hover:bg-blue-500">
            <Send size={14} className="mr-2" />
            Dispatch Selected ({selectedVictims.length})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input
            placeholder="Search victim ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            className="pl-9 bg-slate-800 border-slate-700"
          />
        </div>
        <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 bg-slate-800 border-slate-700">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="3">Critical</SelectItem>
            <SelectItem value="2">High</SelectItem>
            <SelectItem value="1">Moderate</SelectItem>
            <SelectItem value="0">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 bg-slate-800 border-slate-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
        <Table>
          <TableHeader className="bg-slate-800/50">
            <TableRow>
              <TableHead className="w-10 text-slate-400">
                <Checkbox
                  checked={selectedVictims.length === victims.length && victims.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-slate-400">ID</TableHead>
              <TableHead className="text-slate-400">Timestamp</TableHead>
              <TableHead className="text-slate-400">Severity</TableHead>
              <TableHead className="text-slate-400">Age</TableHead>
              <TableHead className="text-slate-400">Heart Rate</TableHead>
              <TableHead className="text-slate-400">SpO2</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Hospital</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-red-400 py-8">
                  {error}
                </TableCell>
              </TableRow>
            ) : victims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                  No victims found
                </TableCell>
              </TableRow>
            ) : (
              victims.map((victim) => (
                <TableRow 
                  key={victim.id} 
                  className="hover:bg-slate-800/30 cursor-pointer"
                  onClick={() => handleRowClick(victim)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedVictims.includes(victim.id)}
                      onCheckedChange={() => toggleSelectOne(victim.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-slate-200">{victim.id}</TableCell>
                  <TableCell className="text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(victim.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className="text-white"
                      style={{ backgroundColor: SEVERITY_LABELS[victim.severity]?.color }}
                    >
                      {SEVERITY_LABELS[victim.severity]?.label || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{victim.age || '--'}</TableCell>
                  <TableCell className="text-slate-300">
                    <div className="flex items-center gap-1">
                      <Heart size={12} className="text-red-400" />
                      {victim.heart_rate || '--'} BPM
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <div className="flex items-center gap-1">
                      <Wind size={12} className="text-blue-400" />
                      {victim.spo2 || '--'}%
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(victim.status)}</TableCell>
                  <TableCell className="text-slate-400">{victim.hospital_assigned || '--'}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {victim.status !== 'assigned' && onAssign && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssign(victim.id)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <MapPin size={14} />
                        </Button>
                      )}
                      {victim.status === 'assigned' && onDischarge && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDischarge(victim.id, victim.hospital_assigned)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Activity size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">
          Page {page} of {pages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="bg-slate-800 border-slate-700"
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pages}
            className="bg-slate-800 border-slate-700"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Victim Details</DialogTitle>
          </DialogHeader>
          {selectedVictimDetails && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">ID</p>
                  <p className="font-mono text-slate-200">{selectedVictimDetails.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Timestamp</p>
                  <p className="text-slate-200">{formatDate(selectedVictimDetails.timestamp)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Severity</p>
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: SEVERITY_LABELS[selectedVictimDetails.severity]?.color }}
                  >
                    {SEVERITY_LABELS[selectedVictimDetails.severity]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  {getStatusBadge(selectedVictimDetails.status)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Age</p>
                  <p className="text-slate-200">{selectedVictimDetails.age || '--'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Heart Rate</p>
                  <p className="text-slate-200">{selectedVictimDetails.heart_rate || '--'} BPM</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">SpO2</p>
                  <p className="text-slate-200">{selectedVictimDetails.spo2 || '--'}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Hospital</p>
                  <p className="text-slate-200">{selectedVictimDetails.hospital_assigned || '--'}</p>
                </div>
              </div>
              {selectedVictimDetails.notes && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Notes</p>
                  <p className="text-slate-200">{selectedVictimDetails.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}