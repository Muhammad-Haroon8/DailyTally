// app/(dashboard)/shops/[shopId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Truck,
  Search,
  ChevronRight,
  Mail,
  Phone,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../../../../components/Header';
import { StatusBadge } from '../../../../components/StatusBadge';
import { SkeletonTable } from '../../../../components/SkeletonTable';
import { apiClient } from '../../../../lib/apiClient';
import { formatCurrency } from '../../../../lib/formatters';
import {
  ShopSummary,
  Customer,
  Wholesaler,
  ShopCustomersResponse,
  ShopWholesalersResponse,
} from '../../../../types/superAdmin';
import tableStyles from '../../../../styles/tables.module.scss';

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = params?.shopId as string;

  const [activeTab, setActiveTab] = useState<'customers' | 'wholesalers'>('customers');
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDeleted, setOnlyDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [custRes, wholRes] = await Promise.all([
        apiClient.get<ShopCustomersResponse>(`/super-admin/shops/${shopId}/customers`),
        apiClient.get<ShopWholesalersResponse>(`/super-admin/shops/${shopId}/wholesalers`),
      ]);

      setShop(custRes.shop || wholRes.shop);
      setCustomers(custRes.customers || []);
      setWholesalers(wholRes.wholesalers || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch shop details and ledgers');
      }
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  const filteredCustomers = customers.filter((c) => {
    if (onlyDeleted && !c.isDeleted) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const filteredWholesalers = wholesalers.filter((w) => {
    if (onlyDeleted && !w.isDeleted) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return w.name?.toLowerCase().includes(q) || w.phone?.includes(q);
  });

  const deletedCustomerCount = customers.filter((c) => c.isDeleted).length;
  const deletedWholesalerCount = wholesalers.filter((w) => w.isDeleted).length;

  return (
    <div>
      <Header
        title={shop ? `${shop.name} — Shop Ledgers` : 'Shop Details'}
        breadcrumbs={[
          { label: 'Daily Tally Super Admin', href: '/shops' },
          { label: 'Shops', href: '/shops' },
          { label: shop?.name || 'Shop' },
        ]}
        actions={
          <button
            onClick={fetchShopData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Shop Info Card */}
      {shop && (
        <div className="p-5 mb-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Active Shop Account
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">{shop.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {shop.email}
              </span>
              {shop.phone && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {shop.phone}
                </span>
              )}
              <span className="font-mono text-slate-400">Shop ID: {shop.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Customers
              </span>
              <span className="text-base font-bold text-white font-mono">
                {customers.length}
                {deletedCustomerCount > 0 && (
                  <span className="text-xs text-rose-400 ml-1">({deletedCustomerCount} del)</span>
                )}
              </span>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Wholesalers
              </span>
              <span className="text-base font-bold text-white font-mono">
                {wholesalers.length}
                {deletedWholesalerCount > 0 && (
                  <span className="text-xs text-rose-400 ml-1">({deletedWholesalerCount} del)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchShopData} className="underline hover:text-white ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'customers'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Ledgers</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {customers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wholesalers')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'wholesalers'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Wholesalers</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-mono">
              {wholesalers.length}
            </span>
          </button>
        </div>

        {/* Search & Only Deleted Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={onlyDeleted}
              onChange={(e) => setOnlyDeleted(e.target.checked)}
              className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-950"
            />
            <Filter className="w-3 h-3 text-rose-400" />
            <span>Soft-Deleted Only</span>
          </label>
        </div>
      </div>

      {/* Main Table Content */}
      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : activeTab === 'customers' ? (
        filteredCustomers.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Customers Found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || onlyDeleted
                ? 'No customers match the active filters.'
                : 'This shop has not registered any customers yet.'}
            </p>
          </div>
        ) : (
          <div className={tableStyles.tableContainer}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Status & Attribution</th>
                  <th className="text-right">Total Udhaar</th>
                  <th className="text-right">Total Wasool</th>
                  <th className="text-right">Current Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust, idx) => (
                  <motion.tr
                    key={cust._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className={cust.isDeleted ? tableStyles.deletedRow : undefined}
                  >
                    <td>
                      <div className="font-semibold text-white">{cust.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {cust._id}
                      </div>
                    </td>

                    <td>
                      <span className="text-xs text-slate-300 font-mono">
                        {cust.phone || '—'}
                      </span>
                    </td>

                    <td>
                      <StatusBadge
                        isDeleted={cust.isDeleted}
                        deletedAt={cust.deletedAt}
                        deletedBy={cust.deletedBy}
                        showDetails={true}
                      />
                    </td>

                    <td className="text-right">
                      <span className={tableStyles.amountDebit}>
                        {formatCurrency(cust.totalUdhaar || 0)}
                      </span>
                    </td>

                    <td className="text-right">
                      <span className={tableStyles.amountCredit}>
                        {formatCurrency(cust.totalWasool || 0)}
                      </span>
                    </td>

                    <td className="text-right font-mono font-bold">
                      <span
                        className={
                          (cust.balance || 0) > 0
                            ? tableStyles.amountDebit
                            : tableStyles.amountNeutral
                        }
                      >
                        {formatCurrency(cust.balance || 0)}
                      </span>
                    </td>

                    <td className="text-right">
                      <Link
                        href={`/customers/${cust._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-medium border border-emerald-500/20 transition"
                      >
                        <span>Full Ledger</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : filteredWholesalers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Wholesalers Found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || onlyDeleted
              ? 'No wholesalers match the active filters.'
              : 'This shop has not registered any wholesalers yet.'}
          </p>
        </div>
      ) : (
        <div className={tableStyles.tableContainer}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Wholesaler Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="text-right">Total Kharedari</th>
                <th className="text-right">Total Payment</th>
                <th className="text-right">Advance Baqi</th>
                <th className="text-right">Baqi Baqaya</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWholesalers.map((whol, idx) => (
                <motion.tr
                  key={whol._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  className={whol.isDeleted ? tableStyles.deletedRow : undefined}
                >
                  <td>
                    <div className="font-semibold text-white">{whol.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {whol._id}
                    </div>
                  </td>

                  <td>
                    <span className="text-xs text-slate-300 font-mono">
                      {whol.phone || '—'}
                    </span>
                  </td>

                  <td>
                    <StatusBadge
                      isDeleted={whol.isDeleted}
                      deletedAt={whol.deletedAt}
                      deletedBy={whol.deletedBy}
                      showDetails={true}
                    />
                  </td>

                  <td className="text-right font-mono">
                    {formatCurrency(whol.totalKharedari || 0)}
                  </td>

                  <td className="text-right font-mono text-emerald-400">
                    {formatCurrency(whol.totalPayment || 0)}
                  </td>

                  <td className="text-right font-mono text-purple-400">
                    {formatCurrency(whol.advanceBaqi || 0)}
                  </td>

                  <td className="text-right font-mono font-bold text-rose-400">
                    {formatCurrency(whol.baqiBaqaya || 0)}
                  </td>

                  <td className="text-right">
                    <Link
                      href={`/wholesalers/${whol._id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 text-xs font-medium border border-purple-500/20 transition"
                    >
                      <span>Full Ledger</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
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
