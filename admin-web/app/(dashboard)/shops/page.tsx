// app/(dashboard)/shops/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Users, Truck, AlertTriangle, Search, RefreshCw, ChevronRight, Mail, Phone, Calendar } from 'lucide-react';
import { Header } from '../../../components/Header';
import { MetricCard } from '../../../components/MetricCard';
import { SkeletonTable } from '../../../components/SkeletonTable';
import { apiClient } from '../../../lib/apiClient';
import { formatDate } from '../../../lib/formatters';
import { Shop } from '../../../types/superAdmin';
import tableStyles from '../../../styles/tables.module.scss';

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShops = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Shop[]>('/super-admin/shops');
      setShops(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch shops');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const totalCustomers = shops.reduce((acc, s) => acc + (s.counts?.customers?.total || 0), 0);
  const totalDeletedCustomers = shops.reduce((acc, s) => acc + (s.counts?.customers?.deleted || 0), 0);
  const totalWholesalers = shops.reduce((acc, s) => acc + (s.counts?.wholesalers?.total || 0), 0);

  const filteredShops = shops.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  return (
    <div>
      <Header
        title="Shops Directory"
        breadcrumbs={[{ label: 'Daily Tally Super Admin' }, { label: 'Shops' }]}
        actions={
          <button
            onClick={fetchShops}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        }
      />

      {/* KPI Metric Cards using GSAP for number count up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Registered Shops"
          value={shops.length}
          color="emerald"
          icon={<Store className="w-5 h-5" />}
          subtitle="Active retail shops on platform"
        />
        <MetricCard
          title="Total Customers"
          value={totalCustomers}
          color="blue"
          icon={<Users className="w-5 h-5" />}
          subtitle={`${totalCustomers - totalDeletedCustomers} active customers`}
        />
        <MetricCard
          title="Preserved Soft-Deletions"
          value={totalDeletedCustomers}
          color="rose"
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Recoverable customer records"
        />
        <MetricCard
          title="Total Wholesalers"
          value={totalWholesalers}
          color="purple"
          icon={<Truck className="w-5 h-5" />}
          subtitle="Suppliers across all shops"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shops by name, email, phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="text-xs text-slate-400 self-end sm:self-center font-mono">
          Showing {filteredShops.length} of {shops.length} shops
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchShops}
            className="underline hover:text-white ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Shops Table */}
      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : filteredShops.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Shops Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No shops match the search query "${searchQuery}". Try a different keyword.`
              : 'There are currently no registered shops in the database.'}
          </p>
        </div>
      ) : (
        <div className={tableStyles.tableContainer}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Shop & Owner</th>
                <th>Contact</th>
                <th>Customers</th>
                <th>Wholesalers</th>
                <th>Catalog Items</th>
                <th>Registered</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.map((shop, idx) => {
                const activeCust = shop.counts?.customers?.active || 0;
                const delCust = shop.counts?.customers?.deleted || 0;
                const activeWhol = shop.counts?.wholesalers?.active || 0;
                const delWhol = shop.counts?.wholesalers?.deleted || 0;

                return (
                  <motion.tr
                    key={shop.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                  >
                    <td>
                      <div className="font-semibold text-white">{shop.name}</div>
                      <div className="text-xs text-slate-400 font-mono">ID: {shop.id}</div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{shop.email}</span>
                      </div>
                      {shop.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{shop.phone}</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/20"
                          title="Active Customers"
                        >
                          {activeCust} Active
                        </span>
                        {delCust > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/40 text-rose-300 border border-rose-500/20"
                            title="Soft Deleted Customers"
                          >
                            {delCust} Deleted
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-950/40 text-purple-300 border border-purple-500/20">
                          {activeWhol} Active
                        </span>
                        {delWhol > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/40 text-rose-300 border border-rose-500/20">
                            {delWhol} Del
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="text-xs text-slate-300 font-mono">
                        {shop.counts?.items || 0} items
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(shop.createdAt)}</span>
                      </div>
                    </td>

                    <td className="text-right">
                      <Link
                        href={`/shops/${shop.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-medium border border-emerald-500/20 transition"
                      >
                        <span>Inspect Ledgers</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
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
