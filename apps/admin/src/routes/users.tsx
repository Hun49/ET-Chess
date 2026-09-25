import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { Calendar, RefreshCw, Search, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fetchUsers } from '../api/client';
import { rootRoute } from './__root';

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
});

export function UsersPage() {
  const [search, setSearch] = useState('');
  const {
    data: usersData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  });

  const users = usersData?.users ?? [];
  const isMock = usersData?.isMock ?? false;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter(
      (u) => u.id.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query),
    );
  }, [users, search]);

  return (
    <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-400" />
              <span>User Management</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-sky-400/10 text-sky-300 border border-sky-400/20">
              {users.length} registered
            </span>
            {isMock && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-accent text-gray-400 border border-surface-border">
                Mock Source
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Browse registered players, master titles, and account creation dates.
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
            placeholder="Search by User ID or Display Name..."
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
          Showing <span className="font-mono text-white font-medium">{filteredUsers.length}</span>{' '}
          of <span className="font-mono text-white font-medium">{users.length}</span> users
        </div>
      </div>

      {/* Users Data Table */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-base/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <th scope="col" className="px-5 py-3.5">
                  User ID
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Display Name
                </th>
                <th scope="col" className="px-5 py-3.5 whitespace-nowrap">
                  Member Since
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-board-light" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-gray-400 space-y-2">
                    <Users className="w-6 h-6 mx-auto text-gray-500" />
                    <p className="text-sm font-medium text-gray-300">No users found</p>
                    <p className="text-xs text-gray-400">
                      {search
                        ? 'Try a different search term.'
                        : 'User directory is currently empty.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const initials = user.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-surface-accent/40 transition-colors group"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-sky-300 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-sky-400/10 border border-sky-400/20">
                          {user.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface-accent border border-surface-border flex items-center justify-center text-xs font-semibold text-board-light">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-100 flex items-center gap-1.5">
                              <span>{user.displayName}</span>
                            </div>
                            <span className="text-[11px] text-gray-400">Player</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
