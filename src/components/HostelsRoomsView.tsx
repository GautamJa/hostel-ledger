import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Building2,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Bed,
  MapPin,
  Phone,
  UserCheck,
} from 'lucide-react';

interface Hostel {
  id: number;
  name: string;
  type: string;
  address?: string;
  wardenName?: string;
  contactPhone?: string;
  roomsCount: number;
  totalCapacity: number;
  totalOccupied: number;
  availableBeds: number;
}

interface Room {
  id: number;
  hostelId: number;
  roomNumber: string;
  floor: number;
  capacity: number;
  defaultMonthlyFee: string;
  status: string;
  occupancyCount: number;
  availableBeds: number;
  isFull: boolean;
  hostel?: { name: string } | null;
  occupants: Array<{ id: number; name: string; admissionNumber: string }>;
}

export const HostelsRoomsView: React.FC = () => {
  const { apiFetch, activeRole } = useAuth();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedHostelFilter, setSelectedHostelFilter] = useState<number | 'all'>('all');

  // Modals
  const [hostelModalOpen, setHostelModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  // Forms
  const [hostelForm, setHostelForm] = useState({
    name: '',
    type: 'boys',
    address: '',
    wardenName: '',
    contactPhone: '',
  });

  const [roomForm, setRoomForm] = useState({
    hostelId: '',
    roomNumber: '',
    floor: 1,
    capacity: 2,
    defaultMonthlyFee: '550.00',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [hostelsData, roomsData] = await Promise.all([
        apiFetch('/api/hostels'),
        apiFetch('/api/rooms'),
      ]);
      setHostels(hostelsData);
      setRooms(roomsData);
      if (hostelsData.length > 0 && !roomForm.hostelId) {
        setRoomForm((prev) => ({ ...prev, hostelId: hostelsData[0].id.toString() }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole]);

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/hostels', {
        method: 'POST',
        body: JSON.stringify(hostelForm),
      });
      setSuccessMsg(`Hostel block "${hostelForm.name}" registered successfully!`);
      setHostelModalOpen(false);
      setHostelForm({ name: '', type: 'boys', address: '', wardenName: '', contactPhone: '' });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create hostel');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(roomForm),
      });
      setSuccessMsg(`Room ${roomForm.roomNumber} created with ${roomForm.capacity} beds capacity!`);
      setRoomModalOpen(false);
      setRoomForm({
        hostelId: hostels[0]?.id.toString() || '',
        roomNumber: '',
        floor: 1,
        capacity: 2,
        defaultMonthlyFee: '550.00',
      });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    }
  };

  const filteredRooms = selectedHostelFilter === 'all'
    ? rooms
    : rooms.filter((r) => r.hostelId === selectedHostelFilter);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <span>Hostel Blocks & Room Allocations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage living buildings, track bed occupancy, and monitor dormitory capacity.
          </p>
        </div>

        {['admin', 'warden'].includes(activeRole) && (
          <div className="flex items-center gap-2">
            {activeRole === 'admin' && (
              <button
                onClick={() => setHostelModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hostel Block</span>
              </button>
            )}
            <button
              onClick={() => setRoomModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dorm Room</span>
            </button>
          </div>
        )}
      </div>

      {/* Hostels Blocks Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hostels.map((h) => (
          <div
            key={h.id}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              selectedHostelFilter === h.id
                ? 'bg-amber-50/40 border-amber-500 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setSelectedHostelFilter(selectedHostelFilter === h.id ? 'all' : h.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold text-slate-900">{h.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                    {h.type}
                  </span>
                </div>
                {h.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{h.address}</span>
                  </p>
                )}
                {h.wardenName && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Warden: {h.wardenName}</span>
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-xl font-bold font-serif text-slate-900">
                  {h.totalOccupied} / {h.totalCapacity}
                </span>
                <span className="text-[10px] text-slate-400 block">Occupied Beds</span>
              </div>
            </div>

            {/* Occupancy Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{
                    width: `${h.totalCapacity > 0 ? (h.totalOccupied / h.totalCapacity) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[11px] mt-1.5 text-slate-500 font-medium">
                <span>{h.roomsCount} Rooms</span>
                <span className={h.availableBeds > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                  {h.availableBeds} beds available
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rooms Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-serif font-bold text-slate-900">Dormitory Rooms Inventory</h2>
            <p className="text-xs text-slate-500">
              Showing {filteredRooms.length} rooms {selectedHostelFilter !== 'all' ? '(Filtered by building)' : ''}
            </p>
          </div>
          {selectedHostelFilter !== 'all' && (
            <button
              onClick={() => setSelectedHostelFilter('all')}
              className="text-xs text-amber-600 hover:underline font-semibold"
            >
              Show All Hostels
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRooms.map((rm) => (
            <div
              key={rm.id}
              className={`p-4 rounded-xl border transition ${
                rm.isFull
                  ? 'bg-rose-50/30 border-rose-200'
                  : rm.occupancyCount > 0
                  ? 'bg-amber-50/20 border-amber-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">Room {rm.roomNumber}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Floor {rm.floor}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{rm.hostel?.name || 'Main Hall'}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                    rm.isFull
                      ? 'bg-rose-100 text-rose-800'
                      : rm.occupancyCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {rm.isFull ? 'Full' : `${rm.availableBeds} Free`}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Rate:</span>
                <span className="font-bold text-slate-900">${Number(rm.defaultMonthlyFee).toFixed(2)} / mo</span>
              </div>

              {/* Occupants List */}
              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                  Residents ({rm.occupancyCount}/{rm.capacity})
                </span>
                {rm.occupants && rm.occupants.length > 0 ? (
                  <div className="space-y-1">
                    {rm.occupants.map((occ) => (
                      <div
                        key={occ.id}
                        className="flex items-center justify-between text-[11px] bg-white/80 p-1 rounded border border-slate-100"
                      >
                        <span className="font-semibold text-slate-800 truncate">{occ.name}</span>
                        <span className="font-mono text-slate-400 text-[10px]">{occ.admissionNumber}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No students allocated</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Hostel Block Modal */}
      {hostelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-serif font-bold text-slate-900">Add Hostel Building / Block</h2>
              <button onClick={() => setHostelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHostel} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Wing Hall, Block C"
                  value={hostelForm.name}
                  onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={hostelForm.type}
                  onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  <option value="boys">Boys Hostel</option>
                  <option value="girls">Girls Hostel</option>
                  <option value="co-ed">Co-educational</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Location</label>
                <input
                  type="text"
                  placeholder="e.g. East Quad, Gate 3"
                  value={hostelForm.address}
                  onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Warden</label>
                <input
                  type="text"
                  placeholder="Warden Name"
                  value={hostelForm.wardenName}
                  onChange={(e) => setHostelForm({ ...hostelForm, wardenName: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setHostelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Hostel Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {roomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-serif font-bold text-slate-900">Add Dormitory Room</h2>
              <button onClick={() => setRoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel Block *</label>
                <select
                  required
                  value={roomForm.hostelId}
                  onChange={(e) => setRoomForm({ ...roomForm, hostelId: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, A-204"
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Floor Level</label>
                  <input
                    type="number"
                    min="1"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 2 })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rate ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={roomForm.defaultMonthlyFee}
                    onChange={(e) => setRoomForm({ ...roomForm, defaultMonthlyFee: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
