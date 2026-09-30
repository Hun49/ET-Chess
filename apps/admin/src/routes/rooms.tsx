import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { Filter, RefreshCw, Search, Swords } from 'lucide-react';
import { useState } from 'react';
import { fetchAdminRooms } from '../api/client';
import { rootRoute } from './__root';

export const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rooms',
  component: RoomsPage,
});

function RoomsPage() {
  const [searchCode, setSearchCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'waiting' | 'ready' | 'active' | 'finished'
  >('all');

  const {
    data: result,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: () => fetchAdminRooms(),
    refetchInterval: 10000,
  });

  const rooms = result?.rooms ?? [];

  const filteredRooms = rooms.filter((r) => {
    if (searchCode && !r.code.toLowerCase().includes(searchCode.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const activeCount = rooms.filter((r) => r.status === 'active').length;
  const waitingCount = rooms.filter((r) => r.status === 'waiting' || r.status === 'ready').length;

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Swords className="w-6 h-6 text-board-light" />
            <span>Online Game Rooms</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time monitor for multiplayer friend challenge rooms and active matches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Total Rooms
          </span>
          <p className="mt-1 text-2xl font-black text-white">{rooms.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Live Matches Active
          </span>
          <p className="mt-1 text-2xl font-black text-green-400">{activeCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Waiting in Lobby
          </span>
          <p className="mt-1 text-2xl font-black text-amber-400">{waitingCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-card border border-surface-border">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Search room code..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-base border border-surface-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-board-light"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">Status:</span>
          {(['all', 'waiting', 'ready', 'active', 'finished'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-board-light text-slate-900 font-bold'
                  : 'bg-surface-base text-gray-400 hover:text-white border border-surface-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-xl bg-surface-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base/80 border-b border-surface-border text-gray-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Kind</th>
                <th className="py-3 px-4">Time Control</th>
                <th className="py-3 px-4">Host / Guest</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Loading rooms data...
                  </td>
                </tr>
              )}

              {!isLoading && filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No matching rooms found.
                  </td>
                </tr>
              )}

              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-surface-accent/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white tracking-widest">
                    #{room.code}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'active'
                          ? 'bg-green-950/60 border border-green-600/60 text-green-300'
                          : room.status === 'ready'
                            ? 'bg-blue-950/60 border border-blue-600/60 text-blue-300'
                            : room.status === 'waiting'
                              ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
                              : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize text-gray-300">{room.kind}</td>
                  <td className="py-3 px-4 font-mono text-gray-300">
                    {room.timeControlMinutes}m + {room.timeControlIncrement}s
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    <div className="font-mono text-[11px]">
                      <span>Host: {room.hostUserId.slice(0, 10)}...</span>
                      {room.guestUserId && (
                        <span className="block text-gray-500">
                          Guest: {room.guestUserId.slice(0, 10)}...
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                    {new Date(room.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
