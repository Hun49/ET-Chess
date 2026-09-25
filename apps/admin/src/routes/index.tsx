import { useQuery } from '@tanstack/react-query';
import { createRoute, Link } from '@tanstack/react-router';
import {
  Activity,
  ArrowRight,
  Clock,
  Cpu,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { fetchHealth, fetchReports, fetchUsers } from '../api/client';
import { rootRoute } from './__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
});

export function OverviewPage() {
  const {
    data: usersData,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['reports'],
    queryFn: () => fetchReports(),
  });

  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchHealth(),
  });

  const userCount = usersData?.users.length ?? 0;
  const reportCount = reportsData?.reports.length ?? 0;
  const isHealthy = healthData?.status === 'ok';

  return (
    <div className="p-6 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Admin Overview</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time monitoring, engine health, and player fair-play management.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            refetchHealth();
            refetchUsers();
            refetchReports();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-card border border-surface-border text-xs font-medium text-gray-300 hover:text-white hover:border-gray-500 hover:bg-surface-accent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-board-dark"
        >
          <RefreshCw className="w-3.5 h-3.5 text-board-light" />
          <span>Refresh All Metrics</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Users Count */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between hover:border-surface-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Total Users
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-white">
              {isUsersLoading ? '...' : userCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">Registered player accounts</p>
          </div>
          <Link
            to="/users"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors pt-2 border-t border-surface-border/40"
          >
            <span>Manage users</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Metric 2: Reports Count */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between hover:border-surface-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Active Reports
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-amber-400">
              {isReportsLoading ? '...' : reportCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">Fair play & engine infractions</p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors pt-2 border-t border-surface-border/40"
          >
            <span>Review reports</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Metric 3: Server Health Status */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between hover:border-surface-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Server Health
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isHealthy && !healthData?.isMock
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-xl font-bold font-mono text-white">
                {isHealthLoading
                  ? 'CHECKING'
                  : isHealthy && !healthData?.isMock
                    ? 'ONLINE'
                    : 'MOCK FALLBACK'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {healthData?.isMock ? 'Local offline fixture data' : 'Cloudflare Workers live edge'}
            </p>
          </div>
          <div className="pt-2 border-t border-surface-border/40 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Latency</span>
            <span className="font-mono text-gray-300">
              {healthData?.isMock ? '0ms (mock)' : '< 25ms'}
            </span>
          </div>
        </div>

        {/* Metric 4: Version Badge */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border flex flex-col justify-between hover:border-surface-border/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Release Version
            </span>
            <div className="p-2 rounded-lg bg-board-dark/20 text-board-light border border-board-dark/40">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-board-light">
              v1.0.0
            </div>
            <p className="text-xs text-gray-400 mt-1">Cloudflare Pages + D1</p>
          </div>
          <div className="pt-2 border-t border-surface-border/40 flex items-center justify-between text-[11px]">
            <span className="text-gray-400">Environment</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-accent border border-surface-border text-emerald-400 font-mono">
              Production
            </span>
          </div>
        </div>
      </div>

      {/* Split Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports Preview (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Recent Infraction Reports</h2>
            </div>
            <Link
              to="/reports"
              className="text-xs text-board-light hover:underline flex items-center gap-1 font-medium"
            >
              <span>View all ({reportCount})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {reportsData?.reports.slice(0, 3).map((report) => (
              <div
                key={report.id}
                className="p-3.5 rounded-lg bg-surface-base border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      {report.id}
                    </span>
                    <span className="text-xs text-gray-400">by</span>
                    <span className="font-mono text-xs text-sky-300">{report.reporterId}</span>
                  </div>
                  <p className="text-xs text-gray-200 line-clamp-1">{report.reason}</p>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!reportsData || reportsData.reports.length === 0) && (
              <p className="text-xs text-gray-400 py-6 text-center">No reports on record.</p>
            )}
          </div>
        </div>

        {/* API Contracts & Spec Info (1 col) */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-board-light" />
            <h2 className="text-sm font-semibold text-white">API Contracts (Hono RPC)</h2>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            All dashboard data is loaded through strictly typed Hono RPC routes defined in{' '}
            <code className="text-board-light font-mono text-[11px]">@et-chess/api</code>.
          </p>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between">
              <span className="text-emerald-400">GET /health</span>
              <span className="text-[10px] text-gray-400">HealthCheck</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between">
              <span className="text-sky-400">GET /users</span>
              <span className="text-[10px] text-gray-400">User[]</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between">
              <span className="text-amber-400">GET /reports</span>
              <span className="text-[10px] text-gray-400">Report[]</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between">
              <span className="text-purple-400">POST /reports</span>
              <span className="text-[10px] text-gray-400">Zod Validated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
