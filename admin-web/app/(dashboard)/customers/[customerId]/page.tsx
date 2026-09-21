// app/(dashboard)/customers/[customerId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  Phone,
  Store,
  Layers,
} from 'lucide-react';
import { Header } from '../../../../components/Header';
import { MetricCard } from '../../../../components/MetricCard';
import { StatusBadge } from '../../../../components/StatusBadge';
import { SkeletonTable } from '../../../../components/SkeletonTable';
import { apiClient } from '../../../../lib/apiClient';
import { formatCurrency, formatDate, formatTimeAgo } from '../../../../lib/formatters';
import { CustomerDetailResponse } from '../../../../types/superAdmin';
import tableStyles from '../../../../styles/tables.module.scss';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.customerId as string;

  const [data, setData] = useState<CustomerDetailResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'item' | 'payment'>('all');
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerHistory = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CustomerDetailResponse>(
        `/super-admin/customers/${customerId}`
      );
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch customer history');
      }
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerHistory();
  }, [fetchCustomerHistory]);

  const customer = data?.customer;
  const shop = data?.shop;
  const totals = data?.totals;
  const entries = data?.entries || [];

  const filteredEntries = entries.filter((e) => {
    if (onlyDeleted && !e.isDeleted) return false;
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.itemName?.toLowerCase().includes(q) ||
      e.note?.toLowerCase().includes(q) ||
      e.type?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Header
        title={customer ? `${customer.name}'s Ledger History` : 'Customer History'}
        breadcrumbs={[
          { label: 'Daily Tally Super Admin', href: '/shops' },
          { label: 'Shops', href: '/shops' },
          { label: shop?.name || 'Shop', href: shop ? `/shops/${shop.id}` : '/shops' },
          { label: customer?.name || 'Customer' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/audit-log?entityId=${customerId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit History</span>
            </Link>
            <button
              onClick={fetchCustomerHistory}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Customer & Shop Profile Banner */}
      {customer && (
        <div className="p-5 mb-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-slate-200">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">{customer.name}</h2>
                <StatusBadge
                  isDeleted={customer.isDeleted}
                  deletedAt={customer.deletedAt}
                  deletedBy={customer.deletedBy}
                  showDetails={true}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                {customer.phone && (
                  <span className="flex items-center gap-1 text-slate-300 font-mono">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {customer.phone}
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
                  Customer ID: {customer.id}
                </span>
              </div>
            </div>
          </div>

          {customer.isDeleted && customer.deletedBy && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
              <span className="font-semibold block">Preserved Soft-Deletion</span>
              <span>
                Deleted by {customer.deletedBy.name} ({customer.deletedBy.email})
                {customer.deletedAt && ` • ${formatTimeAgo(customer.deletedAt)}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCustomerHistory} className="underline hover:text-white ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Totals KPI Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Udhaar (Credit)"
            value={totals.totalUdhaar}
            isCurrency={true}
            color="rose"
            icon={<ArrowUpRight className="w-5 h-5" />}
            subtitle="Goods / credit taken"
          />
          <MetricCard
            title="Total Wasool (Payment)"
            value={totals.totalWasool}
            isCurrency={true}
            color="emerald"
            icon={<ArrowDownLeft className="w-5 h-5" />}
            subtitle="Cash payments received"
          />
          <MetricCard
            title="Current Net Balance"
            value={totals.balance}
            isCurrency={true}
            color={totals.balance > 0 ? 'rose' : 'slate'}
            icon={<CreditCard className="w-5 h-5" />}
            subtitle={totals.balance > 0 ? 'Pending credit to recover' : 'Settled balance'}
          />
          <MetricCard
            title="Entries Breakdown"
            value={totals.totalEntriesCount}
            color="blue"
            icon={<Layers className="w-5 h-5" />}
            subtitle={`${totals.activeEntriesCount} active • ${totals.deletedEntriesCount} deleted`}
          />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            All Entries ({entries.length})
          </button>
          <button
            onClick={() => setTypeFilter('item')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'item'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Udhaar (Credit)
          </button>
          <button
            onClick={() => setTypeFilter('payment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'payment'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Wasool (Payment)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries or notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
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
          <p className="text-sm font-semibold text-slate-300">No Ledger Entries Found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || onlyDeleted || typeFilter !== 'all'
              ? 'No transaction entries match the selected filters.'
              : 'This customer currently has zero ledger records recorded.'}
          </p>
        </div>
      ) : (
        <div className={tableStyles.tableContainer}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Item / Description</th>
                <th className="text-right">Amount</th>
                <th>Status & Attribution</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => {
                const isItem = entry.type === 'item';
                return (
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
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          isItem
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {isItem ? 'Udhaar (Credit)' : 'Wasool (Payment)'}
                      </span>
                    </td>

                    <td>
                      <div
                        className={`text-xs font-medium text-white ${
                          entry.isDeleted ? tableStyles.strikethroughText : ''
                        }`}
                      >
                        {entry.itemName || (isItem ? 'Goods / Credit' : 'Cash Received')}
                      </div>
                      {entry.quantity !== undefined && entry.rate !== undefined && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {entry.quantity} x {formatCurrency(entry.rate)}
                        </div>
                      )}
                    </td>

                    <td className="text-right">
                      <span
                        className={`font-mono font-bold text-sm ${
                          entry.isDeleted
                            ? tableStyles.strikethroughText
                            : isItem
                            ? tableStyles.amountDebit
                            : tableStyles.amountCredit
                        }`}
                      >
                        {isItem ? `+${formatCurrency(entry.amount)}` : `-${formatCurrency(entry.amount)}`}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
