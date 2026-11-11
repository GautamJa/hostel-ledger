import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { clientDataStore } from '../lib/clientDataStore.ts';
import {
  Database,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  X,
  FileJson,
  ArrowRight,
} from 'lucide-react';

interface BackupItem {
  id: number;
  filename: string;
  backupType: string;
  fileSizeBytes: number;
  tablesCount: number;
  recordsCount: number;
  checksum?: string | null;
  status: string;
  createdAt: string;
}

export const BackupsView: React.FC = () => {
  const { apiFetch, token, activeRole } = useAuth();
  const [backupsList, setBackupsList] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal for download format selection
  const [selectedBackupForDownload, setSelectedBackupForDownload] = useState<BackupItem | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/backups');
      setBackupsList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [activeRole]);

  const handleCreateBackup = async (type: 'manual_export' | 'daily_automated') => {
    try {
      setCreating(true);
      setError(null);
      const newBackup = await apiFetch('/api/backups/create', {
        method: 'POST',
        body: JSON.stringify({ backupType: type }),
      });

      setSuccessMsg(`Database snapshot "${newBackup.filename}" created successfully! (${newBackup.recordsCount} records, ${(newBackup.fileSizeBytes / 1024).toFixed(1)} KB)`);
      fetchBackups();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  // Download either XLSX or JSON for a specific backup
  const handleDownloadBackup = async (backupId: number, filename: string, format: 'xlsx' | 'json') => {
    try {
      setError(null);
      const url = format === 'xlsx'
        ? `/api/backups/${backupId}/download?format=xlsx`
        : `/api/backups/${backupId}/download`;

      let blob: Blob | null = null;
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token || 'demo-token'}`,
            'x-active-role': activeRole,
          },
        });

        if (response.ok) {
          blob = await response.blob();
        }
      } catch {
        // Fallback below
      }

      if (!blob) {
        if (format === 'xlsx') {
          blob = clientDataStore.exportFinancialLedgerToExcel();
        } else {
          const snapshot = JSON.stringify(clientDataStore.getState(), null, 2);
          blob = new Blob([snapshot], { type: 'application/json' });
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      if (format === 'xlsx') {
        a.download = filename.replace(/\.json$/i, '') + '.xlsx';
      } else {
        a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg(`Downloaded "${format === 'xlsx' ? 'Excel (.xlsx)' : 'JSON snapshot'}" file successfully.`);
      setSelectedBackupForDownload(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error downloading backup');
    }
  };

  // Direct export of current monthly financial ledger to Excel
  const handleExportDirectExcel = async () => {
    try {
      setExportingExcel(true);
      setError(null);

      let blob: Blob | null = null;
      try {
        const response = await fetch('/api/backups/export-excel', {
          headers: {
            Authorization: `Bearer ${token || 'demo-token'}`,
            'x-active-role': activeRole,
          },
        });

        if (response.ok) {
          blob = await response.blob();
        }
      } catch {
        // Fallback below
      }

      if (!blob) {
        blob = clientDataStore.exportFinancialLedgerToExcel();
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `SomnathRecorders_Financial_Ledger_${currentMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg('Monthly financial report exported to Excel (.xlsx) successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to export Excel report');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl flex items-center justify-between text-sm shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl flex items-center justify-between text-sm shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span>Database Backups & Excel Financial Export</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Download Excel (.xlsx) reports showing payments and balances by month, or PostgreSQL cryptographic JSON dumps.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportDirectExcel}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
            title="Download formatted Excel spreadsheet showing student payments and balances for each month"
          >
            <FileSpreadsheet className={`w-4 h-4 ${exportingExcel ? 'animate-spin' : ''}`} />
            <span>{exportingExcel ? 'Generating Excel...' : 'Export to Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={() => handleCreateBackup('manual_export')}
            disabled={creating}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Dumping Database...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Snapshot Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cloud SQL PostgreSQL Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 text-white p-5 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Database Engine</span>
            <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-md border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-serif font-bold mt-2">PostgreSQL (Cloud SQL)</p>
          <div className="mt-2 text-xs text-zinc-400 space-y-1">
            <p>Region: <span className="text-zinc-200 font-mono">asia-southeast1</span></p>
            <p>Connection: <span className="text-emerald-400 font-medium">Auth Proxy / pg.Pool</span></p>
          </div>
        </div>

        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Excel Export Format</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-serif font-bold text-white mt-2">Comprehensive Financial Ledger</p>
          <p className="mt-2 text-xs text-zinc-400">
            Multi-sheet Excel workbook with full billing dates, month-by-month breakdown, complete transaction journal, and student financial summaries.
          </p>
        </div>

        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stored Snapshots</span>
            <HardDrive className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-serif font-bold text-white mt-2">{backupsList.length} Backups</p>
          <p className="mt-2 text-xs text-zinc-400">
            Available for immediate offline export in both Excel (.xlsx) and JSON formats.
          </p>
        </div>
      </div>

      {/* Backups Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div>
            <h2 className="text-sm font-serif font-bold text-white">Database Backup Archive & Export</h2>
            <p className="text-xs text-zinc-400">Choose between Excel (.xlsx) report or raw PostgreSQL JSON snapshot</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            {backupsList.length} Snapshots
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Backup Filename</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Tables</th>
                <th className="py-3 px-4">Records</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center">Download Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  </td>
                </tr>
              ) : backupsList.length > 0 ? (
                backupsList.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-400">{b.filename}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                        {b.backupType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{b.tablesCount} Tables</td>
                    <td className="py-3 px-4 font-bold text-white">{b.recordsCount} rows</td>
                    <td className="py-3 px-4 text-zinc-400">
                      {(b.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1-click Excel download */}
                        <button
                          onClick={() => handleDownloadBackup(b.id, b.filename, 'xlsx')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded text-xs font-semibold transition"
                          title="Download monthly ledger in Excel (.xlsx) file"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>.XLSX</span>
                        </button>

                        {/* 1-click JSON download */}
                        <button
                          onClick={() => handleDownloadBackup(b.id, b.filename, 'json')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-xs font-semibold transition"
                          title="Download raw PostgreSQL JSON snapshot"
                        >
                          <FileJson className="w-3.5 h-3.5 text-amber-400" />
                          <span>.JSON</span>
                        </button>

                        {/* Open choice modal */}
                        <button
                          onClick={() => setSelectedBackupForDownload(b)}
                          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                          title="Open download format options"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No backups generated yet. Click "Create Snapshot Now" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Choice Modal */}
      {selectedBackupForDownload && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-amber-400" />
                  <span>Choose Download Format</span>
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{selectedBackupForDownload.filename}</p>
              </div>
              <button
                onClick={() => setSelectedBackupForDownload(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Option 1: Excel (.xlsx) */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg mt-0.5 border border-emerald-500/30">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">Excel Spreadsheet (.xlsx)</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Complete financial audit workbook with <strong>Student Monthly Breakdown</strong> (with full billing dates, amounts due/paid, remaining balances, and receipts), <strong>Transactions Journal</strong> (all student payment records), and <strong>Financial Summaries</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadBackup(selectedBackupForDownload.id, selectedBackupForDownload.filename, 'xlsx')}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download in Excel (.xlsx)</span>
                </button>
              </div>

              {/* Option 2: JSON Database Dump */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-zinc-800 text-amber-400 rounded-lg mt-0.5 border border-zinc-700">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">PostgreSQL Snapshot (.json)</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 font-semibold px-2 py-0.5 rounded-full border border-zinc-700">
                          System Backup
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Full relational database dump containing JSON schemas, activity logs, and raw ledger records with SHA256 checksum verification.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadBackup(selectedBackupForDownload.id, selectedBackupForDownload.filename, 'json')}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Database (.json)</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 mt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedBackupForDownload(null)}
                className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
