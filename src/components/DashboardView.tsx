import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  Building2,
  DollarSign,
  AlertCircle,
  Download,
  PlusCircle,
  CreditCard,
  Database,
  ArrowRight,
  Mail,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator.ts';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  totalRevenue: number;
  totalOutstanding: number;
  hostelsCount: number;
  roomsCount: number;
  customFieldsCount: number;
  recentPayments: Array<{
    id: number;
    receiptNumber: string;
    studentName: string;
    admissionNumber: string;
    amount: string;
    paymentMethod: string;
    paymentDate: string;
    transactionReference?: string;
  }>;
}

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { apiFetch, activeRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/dashboard/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 max-w-2xl mx-auto my-8">
        <div className="flex items-center gap-2 font-semibold text-base mb-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>Notice</span>
        </div>
        <p className="text-xs text-rose-300/90">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner - SomnathRecorders Sleek Dark */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black rounded-2xl p-6 sm:p-8 text-white shadow-2xl border border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SomnathRecorders System
              </span>
              <span className="text-xs text-zinc-400 font-mono">Month-End Billing &bull; PostgreSQL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-2">
              SomnathRecorders Control Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Automated Gmail deadline reminders, streamlined student registration, append-only payments ledger, and verified backups.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {['admin', 'warden'].includes(activeRole) && (
              <button
                onClick={() => onNavigate('students')}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                Register Student
              </button>
            )}
            {['admin', 'accountant'].includes(activeRole) && (
              <button
                onClick={() => onNavigate('payments')}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                Collect Payment
              </button>
            )}
            {['admin', 'accountant', 'warden'].includes(activeRole) && (
              <button
                onClick={() => onNavigate('reminders')}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg border border-amber-500/40 transition"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                Auto Reminders
              </button>
            )}
            {activeRole === 'admin' && (
              <button
                onClick={() => onNavigate('backups')}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 transition"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                Backup Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Residents */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registered Students</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">{stats?.activeStudents || 0}</span>
            <span className="text-xs text-zinc-400">/ {stats?.totalStudents || 0} total</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Active student accounts</p>
        </div>

        {/* Room / Capacity status */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rooms Assigned</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">{stats?.occupiedBeds || 0}</span>
            <span className="text-xs font-medium text-emerald-400">allotted</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Manual room assignments active
          </p>
        </div>

        {/* Revenue Collected */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Revenue Collected</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">
              {Number(stats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Immutable ledger transaction total</p>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">
              {Number(stats?.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Unsettled fees</span>
            {stats && stats.totalOutstanding > 0 && (
              <button
                onClick={() => onNavigate('reminders')}
                className="text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                Send Notice &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Month-End Automated Reminders */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg flex items-center justify-between hover:border-zinc-700 transition">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Automated Reminders</span>
            </div>
            <p className="text-lg font-bold font-serif text-white mt-1">1 Day Pre-Deadline</p>
            <p className="text-xs text-zinc-400">Triggered before month-end cut-off</p>
          </div>
          <button
            onClick={() => onNavigate('reminders')}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
            title="Open Reminders"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Custom Columns */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg flex items-center justify-between hover:border-zinc-700 transition">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Dynamic Columns</span>
            </div>
            <p className="text-lg font-bold font-serif text-white mt-1">{stats?.customFieldsCount || 0} Custom Fields</p>
            <p className="text-xs text-zinc-400">Extended attributes for students</p>
          </div>
          <button
            onClick={() => onNavigate('custom-fields')}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
            title="Open Custom Fields"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Database & Security */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-lg flex items-center justify-between hover:border-zinc-700 transition">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Database Backups</span>
            </div>
            <p className="text-lg font-bold font-serif text-white mt-1">PostgreSQL Snapshots</p>
            <p className="text-xs text-zinc-400">Encrypted JSON & SHA256 hashes</p>
          </div>
          <button
            onClick={() => onNavigate('backups')}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
            title="Open Backups"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div>
            <h2 className="text-base font-serif font-bold text-white">Recent Payment Ledger Entries</h2>
            <p className="text-xs text-zinc-400">Append-only immutable transaction log (PostgreSQL)</p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission #</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Receipt PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {stats?.recentPayments && stats.recentPayments.length > 0 ? (
                stats.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-amber-400">{p.receiptNumber}</td>
                    <td className="py-3 px-4 font-semibold text-white">{p.studentName}</td>
                    <td className="py-3 px-4 text-zinc-400">{p.admissionNumber}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-medium border border-zinc-700 uppercase">
                        {p.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{p.paymentDate}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() =>
                          generatePaymentReceiptPDF({
                            receiptNumber: p.receiptNumber,
                            studentName: p.studentName,
                            admissionNumber: p.admissionNumber,
                            amount: p.amount,
                            paymentMethod: p.paymentMethod,
                            transactionReference: p.transactionReference,
                            paymentDate: p.paymentDate,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No transactions recorded yet. Click "Collect Payment" to record a transaction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
