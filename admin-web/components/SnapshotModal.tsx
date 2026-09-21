// components/SnapshotModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Code2, ListTree, Database } from 'lucide-react';
import { AuditLogEntry } from '../types/superAdmin';
import { formatDateTime } from '../lib/formatters';
import styles from '../styles/snapshot.module.scss';

interface SnapshotModalProps {
  log: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ log, isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !log) return null;

  const rawJsonString = log.entitySnapshot
    ? JSON.stringify(log.entitySnapshot, null, 2)
    : '{\n  "message": "No snapshot data captured"\n}';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy snapshot JSON:', err);
    }
  };

  const renderValue = (val: unknown): React.ReactNode => {
    if (val === null || val === undefined) {
      return <span className={styles.valueNull}>null</span>;
    }
    if (typeof val === 'boolean') {
      return <span className={styles.valueBoolean}>{String(val)}</span>;
    }
    if (typeof val === 'number') {
      return <span className={styles.valueNumber}>{val}</span>;
    }
    if (typeof val === 'object') {
      return <span className={styles.valueString}>{JSON.stringify(val)}</span>;
    }
    return <span className={styles.valueString}>"{String(val)}"</span>;
  };

  const getPerformerName = () => {
    if (!log.performedByUserId) return 'System / Unknown';
    if (typeof log.performedByUserId === 'object') {
      return log.performedByUserId.name || log.performedByUserId.email;
    }
    return String(log.performedByUserId);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <span>Entity Snapshot</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {log.entityType}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                      log.action === 'DELETE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                        : log.action === 'CREATE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                        : 'bg-sky-950 text-sky-300 border border-sky-800/40'
                    }`}
                  >
                    {log.action}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <code className="font-mono text-slate-300">{log.entityId}</code> • Performed by{' '}
                  <span className="text-slate-200">{getPerformerName()}</span> •{' '}
                  {formatDateTime(log.timestamp)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              aria-label="Close snapshot modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/30 border-b border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('tree')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                  viewMode === 'tree'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Tree View</span>
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition ${
                  viewMode === 'raw'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {viewMode === 'tree' ? (
              log.entitySnapshot && Object.keys(log.entitySnapshot).length > 0 ? (
                <div className={styles.snapshotContainer}>
                  <div className={styles.treeView}>
                    {Object.entries(log.entitySnapshot).map(([key, val]) => (
                      <div key={key} className={styles.row}>
                        <span className={styles.key}>{key}:</span>
                        <span className="ml-2 flex-1">{renderValue(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No snapshot fields recorded for this action.
                </div>
              )
            ) : (
              <pre className={styles.rawJson}>{rawJsonString}</pre>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 font-medium transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
