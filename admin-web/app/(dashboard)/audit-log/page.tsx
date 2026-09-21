// app/(dashboard)/audit-log/page.tsx
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  Store,
  User,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import { Header } from '../../../components/Header';
import { SnapshotModal } from '../../../components/SnapshotModal';
import { SkeletonTable } from '../../../components/SkeletonTable';
import { apiClient } from '../../../lib/apiClient';
import { formatDateTime } from '../../../lib/formatters';
import { AuditLogEntry, AuditLogResponse } from '../../../types/superAdmin';
import tableStyles from '../../../styles/tables.module.scss';

function AuditLogContent() {
  const searchParams = useSearchParams();
  const initialEntityId = searchParams.get('entityId') || '';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit] = useState<number>(50);

  // Filters
  const [entityType, setEntityType] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entityIdSearch, setEntityIdSearch] = useState<string>(initialEntityId);

  // Snapshot Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (entityIdSearch.trim()) {
        // Direct entity history lookup
        const res = await apiClient.get<AuditLogEntry[]>(
          `/super-admin/audit-log/${entityIdSearch.trim()}`
        );
        setLogs(res);
        setTotal(res.length);
        setTotalPages(1);
        setPage(1);
      } else {
        // Paginated query
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(limit));

        if (entityType !== 'all') queryParams.set('entityType', entityType);
        if (startDate) queryParams.set('startDate', startDate);
        if (endDate) queryParams.set('endDate', endDate);

        const res = await apiClient.get<AuditLogResponse>(
          `/super-admin/audit-log?${queryParams.toString()}`
        );

        let filtered = res.logs || [];
        if (actionFilter !== 'all') {
          filtered = filtered.filter((l) => l.action === actionFilter);
        }

        setLogs(filtered);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch platform audit log');
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, entityType, actionFilter, startDate, endDate, entityIdSearch]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleOpenSnapshot = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleResetFilters = () => {
    setEntityType('all');
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
    setEntityIdSearch('');
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DELETE':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/40';
      case 'CREATE':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      case 'RESTORE':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/40';
      case 'UPDATE':
      default:
        return 'bg-sky-950/60 text-sky-300 border-sky-500/40';
    }
  };

  const getShopName = (log: AuditLogEntry): string => {
    if (!log.shopId) return '—';
    if (typeof log.shopId === 'object') {
      return log.shopId.name || log.shopId.email || 'Shop';
    }
    return String(log.shopId);
  };

  const getUserName = (log: AuditLogEntry): string => {
    if (!log.performedByUserId) return 'System';
    if (typeof log.performedByUserId === 'object') {
      return log.performedByUserId.name || log.performedByUserId.email || 'User';
    }
    return String(log.performedByUserId);
  };

  return (
    <div>
      <Header
        title="Platform Audit Trail"
        breadcrumbs={[
          { label: 'Daily Tally Super Admin', href: '/shops' },
          { label: 'Audit Log' },
        ]}
        actions={
          <button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div className="p-4 mb-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Entity ID Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={entityIdSearch}
              onChange={(e) => {
                setEntityIdSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by exact Entity ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
            />
            {entityIdSearch && (
              <button
                onClick={() => setEntityIdSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Entity Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Entity:</span>
              <select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Entities</option>
                <option value="Customer">Customer</option>
                <option value="Entry">Entry (Udhaar/Wasool)</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="WholesalerEntry">Wholesaler Entry</option>
                <option value="Item">Item Catalog</option>
              </select>
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Actions</option>
                <option value="DELETE">DELETE (Soft Deletions)</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="RESTORE">RESTORE</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {(entityType !== 'all' ||
              actionFilter !== 'all' ||
              startDate ||
              endDate ||
              entityIdSearch) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAuditLogs} className="underline hover:text-white ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Main Audit Log Table */}
      {isLoading ? (
        <SkeletonTable rows={10} columns={6} />
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Audit Logs Found</p>
          <p className="text-xs text-slate-500 mt-1">
            No audit records match the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className={tableStyles.tableContainer}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Shop</th>
                <th>Performed By</th>
                <th>Action</th>
                <th>Entity & ID</th>
                <th className="text-right">Snapshot Inspection</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <motion.tr
                  key={log._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.015 }}
                  className={log.action === 'DELETE' ? tableStyles.deletedRow : undefined}
                >
                  <td>
                    <span className="text-xs text-slate-300 font-mono">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </td>

                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                      <Store className="w-3.5 h-3.5 text-slate-500" />
                      <span>{getShopName(log)}</span>
                    </div>
                  </td>

                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{getUserName(log)}</span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold font-mono border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td>
                    <div className="text-xs text-slate-200 font-medium">
                      {log.entityType}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {log.entityId}
                    </div>
                  </td>

                  <td className="text-right">
                    <button
                      onClick={() => handleOpenSnapshot(log)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-medium border border-emerald-500/20 transition"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Inspect Snapshot</span>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!entityIdSearch && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between px-2 text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span> ({total} total records)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Snapshot Modal */}
      <SnapshotModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Loading Audit Records...</p>
        </div>
      }
    >
      <AuditLogContent />
    </Suspense>
  );
}
