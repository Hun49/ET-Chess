import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { type AdminTournament, fetchAdminTournaments } from '../api/client';
import { rootRoute } from './__root';

export const tournamentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tournaments',
  component: TournamentsPage,
});

function TournamentsPage() {
  const [selectedTourney, setSelectedTourney] = useState<AdminTournament | null>(null);

  const {
    data: result,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: () => fetchAdminTournaments(),
    refetchInterval: 15000,
  });

  const tournaments = result?.tournaments ?? [];

  const inProgressCount = tournaments.filter((t) => t.status === 'in-progress').length;
  const registeringCount = tournaments.filter((t) => t.status === 'registering').length;

  return (
    <div className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-board-light" />
            <span>Tournaments Management</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Overview of single-elimination tournament cups, bracket progress, and registrations
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
            Total Tournaments
          </span>
          <p className="mt-1 text-2xl font-black text-white">{tournaments.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            In Progress
          </span>
          <p className="mt-1 text-2xl font-black text-green-400">{inProgressCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Open Registration
          </span>
          <p className="mt-1 text-2xl font-black text-amber-400">{registeringCount}</p>
        </div>
      </div>

      {/* Tournaments Table */}
      <div className="rounded-xl bg-surface-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-base/80 border-b border-surface-border text-gray-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    Loading tournaments...
                  </td>
                </tr>
              )}

              {!isLoading && tournaments.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No tournaments recorded.
                  </td>
                </tr>
              )}

              {tournaments.map((t) => (
                <tr key={t.id} className="hover:bg-surface-accent/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-board-light" />
                    <span>{t.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'in-progress'
                          ? 'bg-green-950/60 border border-green-600/60 text-green-300'
                          : t.status === 'registering'
                            ? 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
                            : 'bg-board-dark/30 border border-board-light/40 text-board-light'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedTourney(t)}
                      className="px-3 py-1.5 rounded-lg bg-surface-accent border border-surface-border text-xs font-semibold text-gray-200 hover:text-white hover:bg-surface-border transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedTourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-card border border-surface-border p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-board-light" />
                <h3 className="text-lg font-bold text-white">{selectedTourney.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTourney(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-surface-border/50">
                <span className="text-gray-400 font-semibold">Tournament ID</span>
                <span className="font-mono text-white">{selectedTourney.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-border/50">
                <span className="text-gray-400 font-semibold">Current Status</span>
                <span className="font-bold text-board-light uppercase">
                  {selectedTourney.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-border/50">
                <span className="text-gray-400 font-semibold">Created Date</span>
                <span className="font-mono text-gray-300">
                  {new Date(selectedTourney.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTourney(null)}
              className="mt-2 w-full py-2.5 rounded-xl bg-surface-accent border border-surface-border text-xs font-bold text-white hover:bg-surface-border transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
