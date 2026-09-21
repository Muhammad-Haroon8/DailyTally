// app/(dashboard)/wholesalers/[wholesalerId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Clock,
  Phone,
  Store,
  Wallet,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { Header } from '../../../../components/Header';
import { MetricCard } from '../../../../components/MetricCard';
import { StatusBadge } from '../../../../components/StatusBadge';
import { SkeletonTable } from '../../../../components/SkeletonTable';
import { apiClient } from '../../../../lib/apiClient';
import { formatCurrency, formatDate, formatTimeAgo } from '../../../../lib/formatters';
import { WholesalerDetailResponse } from '../../../../types/superAdmin';
import tableStyles from '../../../../styles/tables.module.scss';

export default function WholesalerDetailPage() {
  const params = useParams();
  const wholesalerId = params?.wholesalerId as string;

  const [data, setData] = useState<WholesalerDetailResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWholesalerHistory = useCallback(async () => {
    if (!wholesalerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<WholesalerDetailResponse>(
        `/super-admin/wholesalers/${wholesalerId}`
      );
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch wholesaler history');
      }
    } finally {
      setIsLoading(false);
    }
  }, [wholesalerId]);

  useEffect(() => {
    fetchWholesalerHistory();
  }, [fetchWholesalerHistory]);

  const wholesaler = data?.wholesaler;
  const shop = data?.shop;
  const totals = data?.totals;
  const entries = data?.entries || [];

  const filteredEntries = entries.filter((e) => {
    if (onlyDeleted && !e.isDeleted) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.note?.toLowerCase().includes(q) ||
      e.billNumber?.toLowerCase().includes(q) ||
      e.receiptNumber?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q)
    );
  });

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-blue-950/40 text-blue-300 border-blue-500/20';
      case 'payment':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20';
      case 'advance':
        return 'bg-purple-950/40 text-purple-300 border-purple-500/20';
      case 'advanceSettlement':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div>
      <Header
        title={wholesaler ? `${wholesaler.name}'s Supplier History` : 'Wholesaler Ledger'}
        breadcrumbs={[
          { label: 'Daily Tally Super Admin', href: '/shops' },
          { label: 'Shops', href: '/shops' },
          { label: shop?.name || 'Shop', href: shop ? `/shops/${shop.id}` : '/shops' },
          { label: wholesaler?.name || 'Wholesaler' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/audit-log?entityId=${wholesalerId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit History</span>
            </Link>
            <button
              onClick={fetchWholesalerHistory}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Profile Card */}
      {wholesaler && (
        <div className="p-5 mb-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center font-bold text-lg text-purple-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">{wholesaler.name}</h2>
                <StatusBadge
                  isDeleted={wholesaler.isDeleted}
                  deletedAt={wholesaler.deletedAt}
                  deletedBy={wholesaler.deletedBy}
                  showDetails={true}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                {wholesaler.phone && (
                  <span className="flex items-center gap-1 text-slate-300 font-mono">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {wholesaler.phone}
                  </span>
                )}
                {shop && (
                  <Link
                    href={`/shops/${shop.id}`}
                    className="flex items-center gap-1 text-emerald-400 hover:underline"
                  >
                    <Store className="w-3 h-3" />
                    <span>Shop: {shop.name}</span>
                  </Link>
                )}
                <span className="font-mono text-slate-400">
                  Wholesaler ID: {wholesaler.id}
                </span>
              </div>
            </div>
          </div>

          {wholesaler.isDeleted && wholesaler.deletedBy && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
              <span className="font-semibold block">Soft-Deleted Wholesaler</span>
              <span>
                Deleted by {wholesaler.deletedBy.name} ({wholesaler.deletedBy.email})
                {wholesaler.deletedAt && ` • ${formatTimeAgo(wholesaler.deletedAt)}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWholesalerHistory} className="underline hover:text-white ml-2">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Kharedari (Purchases)"
            value={totals.totalKharedari}
            isCurrency={true}
            color="blue"
            icon={<ArrowUpRight className="w-5 h-5" />}
            subtitle="Supplies purchased from vendor"
          />
          <MetricCard
            title="Total Payment (Paid)"
            value={totals.totalPayment}
            isCurrency={true}
            color="emerald"
            icon={<ArrowDownLeft className="w-5 h-5" />}
            subtitle="Payments dispatched to vendor"
          />
          <MetricCard
            title="Advance Baqi (Remaining Advance)"
            value={totals.advanceBaqi}
            isCurrency={true}
            color="purple"
            icon={<Wallet className="w-5 h-5" />}
            subtitle={`Total Advance: ${formatCurrency(totals.totalAdvance)}`}
          />
          <MetricCard
            title="Baqi Baqaya (Remaining Due)"
            value={totals.baqiBaqaya}
            isCurrency={true}
            color={totals.baqiBaqaya > 0 ? 'rose' : 'slate'}
            icon={<Coins className="w-5 h-5" />}
            subtitle={totals.baqiBaqaya > 0 ? 'Pending payment due' : 'Settled account'}
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'purchase', 'payment', 'advance', 'advanceSettlement'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                typeFilter === t
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t === 'advanceSettlement' ? 'Settlement' : t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bills, receipts, notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={onlyDeleted}
              onChange={(e) => setOnlyDeleted(e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-950"
            />
            <span>Deleted Only</span>
          </label>
        </div>
      </div>

      {/* Entries Table */}
      {isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Wholesaler Entries Found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || onlyDeleted || typeFilter !== 'all'
              ? 'No records match the active filter criteria.'
              : 'Zero transaction records exist for this supplier.'}
          </p>
        </div>
      ) : (
        <div className={tableStyles.tableContainer}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Bill / Receipt</th>
                <th className="text-right">Amount</th>
                <th>Breakdown & Items</th>
                <th>Status & Attribution</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => (
                <motion.tr
                  key={entry._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  className={entry.isDeleted ? tableStyles.deletedRow : undefined}
                >
                  <td>
                    <span className="text-xs text-slate-300 font-mono">
                      {formatDate(entry.entryDate)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getBadgeForType(
                        entry.type
                      )}`}
                    >
                      {entry.type === 'advanceSettlement'
                        ? 'Advance Settlement'
                        : entry.type.toUpperCase()}
                    </span>
                  </td>

                  <td>
                    <span className="text-xs text-slate-300 font-mono">
                      {entry.billNumber
                        ? `Bill: ${entry.billNumber}`
                        : entry.receiptNumber
                        ? `Receipt: ${entry.receiptNumber}`
                        : '—'}
                    </span>
                  </td>

                  <td className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        entry.isDeleted
                          ? tableStyles.strikethroughText
                          : entry.type === 'purchase'
                          ? tableStyles.amountDebit
                          : tableStyles.amountCredit
                      }`}
                    >
                      {formatCurrency(entry.amount)}
                    </span>
                  </td>

                  <td>
                    {entry.extraItems && entry.extraItems.length > 0 && (
                      <div className="text-[11px] text-amber-300">
                        +{entry.extraItems.length} Extra items
                      </div>
                    )}
                    {entry.shortageItems && entry.shortageItems.length > 0 && (
                      <div className="text-[11px] text-rose-300">
                        -{entry.shortageItems.length} Shortage items
                      </div>
                    )}
                    {(!entry.extraItems || entry.extraItems.length === 0) &&
                      (!entry.shortageItems || entry.shortageItems.length === 0) && (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                  </td>

                  <td>
                    <StatusBadge
                      isDeleted={entry.isDeleted}
                      deletedAt={entry.deletedAt}
                      deletedBy={entry.deletedBy}
                      showDetails={true}
                    />
                  </td>

                  <td>
                    <span className="text-xs text-slate-400 italic max-w-xs truncate block">
                      {entry.note || '—'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
