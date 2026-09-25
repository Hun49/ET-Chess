import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { AlertTriangle, Clock, RefreshCw, Search, ShieldAlert, User, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchReports } from '../api/client';
import { rootRoute } from './__root';

export const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

export function ReportsPage() {
  const [search, setSearch] = useState('');
  const {
    data: reportsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReports(),
  });

  const reports = reportsData?.reports ?? [];
  const isMock = reportsData?.isMock ?? false;

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reports;

    return reports.filter(
      (r) =>
        r.id.toLowerCase().includes(query) ||
        r.reporterId.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query),
    );
  }, [reports, search]);

  return (
    <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span>Infraction Reports</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
              {reports.length} total
            </span>
            {isMock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-accent text-gray-400 border border-surface-border">
                Mock Source
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Review reported players, suspected engine assistance, stalling, and conduct issues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-card border border-surface-border text-xs font-medium text-gray-300 hover:text-white hover:border-gray-500 hover:bg-surface-accent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-board-light ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Report ID, Reporter ID, or Reason..."
            className="w-full pl-10 pr-9 py-2 rounded-lg bg-surface-base border border-surface-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-board-dark focus:ring-1 focus:ring-board-dark transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400 shrink-0 self-center">
          Showing <span className="font-mono text-white font-medium">{filteredReports.length}</span>{' '}
          of <span className="font-mono text-white font-medium">{reports.length}</span> reports
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-base/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th scope="col" className="px-5 py-3.5">
                  Report ID
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Reporter ID
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Reason / Summary
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-board-light" />
                      <span>Loading reports...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-gray-400 space-y-2">
                    <AlertTriangle className="w-6 h-6 mx-auto text-amber-400/60" />
                    <p className="text-sm font-medium text-gray-300">No reports found</p>
                    <p className="text-xs text-gray-400">
                      {search
                        ? 'Try clearing your search query filter.'
                        : 'All clear. No active infractions.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-accent/40 transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-amber-300 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-amber-400/10 border border-amber-400/20">
                        {report.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-sky-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{report.reporterId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-200">
                      <p className="leading-relaxed font-normal">{report.reason}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
