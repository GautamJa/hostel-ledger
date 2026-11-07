import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  CreditCard,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Calendar,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator.ts';
import { formatBillingMonthFull, getUpcomingBillingMonths, getRelativeMonthString, getDefaultCustomDateRange } from '../utils/dateUtils.ts';

interface Invoice {
  id: number;
  invoiceNumber: string;
  studentId: number;
  billingMonth: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    email: string;
  } | null;
}

interface PaymentRecord {
  id: number;
  receiptNumber: string;
  invoiceId?: number | null;
  billingMonth?: string;
  studentId: number;
  amount: string;
  paymentMethod: string;
  transactionReference?: string | null;
  paymentDate: string;
  remarks?: string | null;
  createdAt: string;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
  collector?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  invoice?: Invoice | null;
}

interface StudentOption {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  monthlyFee: string;
}

interface PaymentsViewProps {
  initialStudentId?: number | null;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ initialStudentId }) => {
  const { apiFetch, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices'>('ledger');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceGenModalOpen, setInvoiceGenModalOpen] = useState(false);

  // Payment Form
  const defaultDates = getDefaultCustomDateRange();
  const [paymentForm, setPaymentForm] = useState({
    studentId: initialStudentId ? String(initialStudentId) : '',
    invoiceId: '',
    billingMonth: new Date().toISOString().slice(0, 7),
    isCustomMonth: false,
    customStartDate: defaultDates.startDate,
    customEndDate: defaultDates.endDate,
    customMonth: `${defaultDates.startDate} to ${defaultDates.endDate}`,
    amount: '',
    paymentMethod: 'cash',
    transactionReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Invoice Generation Form
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [paymentsData, invoicesData, studentsData] = await Promise.all([
        apiFetch('/api/payments'),
        apiFetch('/api/invoices'),
        apiFetch('/api/students?status=active'),
      ]);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setStudents(studentsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole]);

  useEffect(() => {
    if (initialStudentId) {
      setPaymentForm((prev) => ({ ...prev, studentId: String(initialStudentId) }));
      setPaymentModalOpen(true);
    }
  }, [initialStudentId]);

  const handleStudentSelect = (studentIdStr: string) => {
    const sId = parseInt(studentIdStr);
    const student = students.find((s) => s.id === sId);
    const studentInvoices = invoices.filter(
      (inv) => inv.studentId === sId && inv.status !== 'paid'
    );
    let autoInvoiceId = '';
    let autoMonth = new Date().toISOString().slice(0, 7);
    let autoAmount = student?.monthlyFee || '500.00';

    if (studentInvoices.length > 0) {
      autoInvoiceId = String(studentInvoices[0].id);
      autoMonth = studentInvoices[0].billingMonth;
      autoAmount = (Number(studentInvoices[0].amountDue) - Number(studentInvoices[0].amountPaid)).toFixed(2);
    }

    setPaymentForm((prev) => ({
      ...prev,
      studentId: studentIdStr,
      invoiceId: autoInvoiceId,
      billingMonth: autoMonth,
      isCustomMonth: false,
      amount: autoAmount,
    }));
  };

  const handleBillingMonthChange = (monthVal: string) => {
    if (monthVal === 'custom') {
      const dates = getDefaultCustomDateRange();
      const sDate = paymentForm.customStartDate || dates.startDate;
      const eDate = paymentForm.customEndDate || dates.endDate;
      setPaymentForm((prev) => ({
        ...prev,
        isCustomMonth: true,
        customStartDate: sDate,
        customEndDate: eDate,
        customMonth: `${sDate} to ${eDate}`,
        invoiceId: '',
        remarks: `Payment for custom period ${sDate} to ${eDate}`,
      }));
      return;
    }

    const sId = parseInt(paymentForm.studentId);
    const matchedInvoice = invoices.find(
      (inv) => inv.studentId === sId && inv.billingMonth === monthVal
    );
    const student = students.find((s) => s.id === sId);
    const autoAmount = matchedInvoice
      ? (Number(matchedInvoice.amountDue) - Number(matchedInvoice.amountPaid)).toFixed(2)
      : (student?.monthlyFee || '500.00');

    setPaymentForm((prev) => ({
      ...prev,
      billingMonth: monthVal,
      isCustomMonth: false,
      invoiceId: matchedInvoice ? String(matchedInvoice.id) : '',
      amount: autoAmount,
      remarks: prev.remarks || (monthVal > new Date().toISOString().slice(0, 7) ? `Advance fee payment for ${monthVal}` : ''),
    }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const chosenMonth = paymentForm.isCustomMonth && paymentForm.customMonth
        ? paymentForm.customMonth
        : paymentForm.billingMonth;

      const result = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...paymentForm,
          billingMonth: chosenMonth,
        }),
      });

      setSuccessMsg(`Payment recorded! Voucher Receipt #${result.receiptNumber} generated.`);
      setPaymentModalOpen(false);

      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    }
  };

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const result = await apiFetch('/api/invoices/generate-monthly', {
        method: 'POST',
        body: JSON.stringify({ month: targetMonth }),
      });

      setSuccessMsg(result.message);
      setInvoiceGenModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate monthly invoices');
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'partial');
  const totalOutstanding = totalPendingInvoices.reduce(
    (acc, i) => acc + (Number(i.amountDue) - Number(i.amountPaid)),
    0
  );

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
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>Financial Ledger & Collections</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Append-only financial transaction journal, month-end billing schedules, and printable PDF receipts.
          </p>
        </div>

        {['admin', 'accountant'].includes(activeRole) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInvoiceGenModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Issue Monthly Bills</span>
            </button>

            <button
              onClick={() => {
                const dDates = getDefaultCustomDateRange();
                setPaymentForm({
                  studentId: students[0]?.id ? String(students[0].id) : '',
                  invoiceId: '',
                  billingMonth: new Date().toISOString().slice(0, 7),
                  isCustomMonth: false,
                  customStartDate: dDates.startDate,
                  customEndDate: dDates.endDate,
                  customMonth: `${dDates.startDate} to ${dDates.endDate}`,
                  amount: students[0]?.monthlyFee || '500.00',
                  paymentMethod: 'cash',
                  transactionReference: '',
                  paymentDate: new Date().toISOString().split('T')[0],
                  remarks: '',
                });
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        )}
      </div>

      {/* Immutability Banner */}
      <div className="p-4 bg-zinc-950 rounded-xl text-zinc-300 flex items-start gap-3 border border-zinc-800 shadow-lg">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-white uppercase tracking-wider block">
            PostgreSQL Append-Only Ledger Compliance
          </span>
          <p className="text-zinc-400 mt-0.5">
            Every transaction is permanently assigned a receipt voucher number and audit timestamp. Past transactions are immutable and never deleted.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Total Revenue Collected</span>
          <p className="text-2xl font-serif font-bold text-white mt-1">
            {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-zinc-500">{payments.length} transactions recorded</span>
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Pending Outstanding Dues</span>
          <p className="text-2xl font-serif font-bold text-rose-400 mt-1">
            {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-zinc-500">{totalPendingInvoices.length} unsettled invoices</span>
        </div>

        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg">
          <span className="text-xs text-zinc-400 font-semibold uppercase">Total Invoices Issued</span>
          <p className="text-2xl font-serif font-bold text-white mt-1">{invoices.length} Bills</p>
          <span className="text-[11px] text-zinc-500">Month-end billing cycle records</span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
            activeTab === 'ledger'
              ? 'border-b-2 border-amber-500 text-amber-300'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Transactions Journal ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
            activeTab === 'invoices'
              ? 'border-b-2 border-amber-500 text-amber-300'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Monthly Invoices Directory ({invoices.length})</span>
        </button>
      </div>

      {/* Tab 1: Append-Only Payments Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Billing Period (Full Dates)</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Reference / UTR</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                    </td>
                  </tr>
                ) : payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400">{p.receiptNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Resident'}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {p.student?.admissionNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {formatBillingMonthFull(p.billingMonth || (p.invoice ? p.invoice.billingMonth : p.paymentDate.slice(0, 7)))}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-700 uppercase">
                          {p.paymentMethod.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {p.transactionReference || '—'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{p.paymentDate}</td>
                      <td className="py-3 px-4 text-zinc-400">
                        {p.collector?.fullName || 'Staff Officer'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                        {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            generatePaymentReceiptPDF({
                              receiptNumber: p.receiptNumber,
                              studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Resident',
                              admissionNumber: p.student?.admissionNumber || 'ADM-N/A',
                              amount: p.amount,
                              paymentMethod: p.paymentMethod,
                              transactionReference: p.transactionReference,
                              paymentDate: p.paymentDate,
                              remarks: p.remarks,
                              collectorName: p.collector?.fullName,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-500">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Invoices Directory */}
      {activeTab === 'invoices' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Billing Period (Full Dates)</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount Due</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Collect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">{formatBillingMonthFull(inv.billingMonth)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Resident'}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {inv.student?.admissionNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {Number(inv.amountDue).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                        {Number(inv.amountPaid).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            inv.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : inv.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.status !== 'paid' && ['admin', 'accountant'].includes(activeRole) && (
                          <button
                            onClick={() => {
                              const remaining = (Number(inv.amountDue) - Number(inv.amountPaid)).toFixed(2);
                              const dDates = getDefaultCustomDateRange();
                              setPaymentForm({
                                studentId: String(inv.studentId),
                                invoiceId: String(inv.id),
                                billingMonth: inv.billingMonth,
                                isCustomMonth: false,
                                customStartDate: dDates.startDate,
                                customEndDate: dDates.endDate,
                                customMonth: `${dDates.startDate} to ${dDates.endDate}`,
                                amount: remaining,
                                paymentMethod: 'cash',
                                transactionReference: '',
                                paymentDate: new Date().toISOString().split('T')[0],
                                remarks: `Payment against invoice ${inv.invoiceNumber}`,
                              });
                              setPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded text-[11px] font-semibold transition"
                          >
                            Pay Dues
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-500">
                      No invoices generated yet. Click "Issue Monthly Bills" to create billing records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Transaction Modal (Append-Only) */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white">Record Payment Transaction</h2>
                <p className="text-xs text-zinc-400">Append-only audit ledger entry with official receipt</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Select Student *</label>
                <select
                  required
                  value={paymentForm.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.admissionNumber}) &bull; Monthly: {st.monthlyFee}
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Month & Period (Supports Next Month & Advances) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Billing Period (Which month is this payment for?) *</span>
                  <span className="text-[10px] text-amber-400 font-normal">Supports Next Month Advance</span>
                </label>
                <select
                  value={paymentForm.isCustomMonth ? 'custom' : paymentForm.billingMonth}
                  onChange={(e) => handleBillingMonthChange(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                >
                  {paymentForm.studentId &&
                    invoices
                      .filter((i) => i.studentId === parseInt(paymentForm.studentId) && i.status !== 'paid')
                      .map((inv) => (
                        <option key={`inv-${inv.id}`} value={inv.billingMonth}>
                          {inv.billingMonth} ({formatBillingMonthFull(inv.billingMonth)}) — Pending Due: {(Number(inv.amountDue) - Number(inv.amountPaid)).toFixed(2)}
                        </option>
                      ))}
                  {getUpcomingBillingMonths(4).map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} &bull; {m.fullDate}
                    </option>
                  ))}
                  <option value="custom">-- Custom Period (Specify Dates with Day) --</option>
                </select>

                {paymentForm.isCustomMonth && (
                  <div className="mt-2 p-2.5 bg-zinc-900 border border-amber-500/40 rounded-lg space-y-2">
                    <div className="text-[11px] font-semibold text-amber-300 flex items-center justify-between">
                      <span>Custom Billing Period (With Day)</span>
                      <span className="text-[10px] text-zinc-400">Select start and end days</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">From Day *</label>
                        <input
                          type="date"
                          required
                          value={paymentForm.customStartDate}
                          onChange={(e) => {
                            const sVal = e.target.value;
                            const periodStr = `${sVal} to ${paymentForm.customEndDate}`;
                            setPaymentForm((prev) => ({
                              ...prev,
                              customStartDate: sVal,
                              customMonth: periodStr,
                              remarks: `Payment for period ${periodStr}`,
                            }));
                          }}
                          className="w-full text-xs p-1.5 bg-zinc-950 border border-zinc-700 text-white rounded font-mono focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-0.5">To Day *</label>
                        <input
                          type="date"
                          required
                          value={paymentForm.customEndDate}
                          onChange={(e) => {
                            const eVal = e.target.value;
                            const periodStr = `${paymentForm.customStartDate} to ${eVal}`;
                            setPaymentForm((prev) => ({
                              ...prev,
                              customEndDate: eVal,
                              customMonth: periodStr,
                              remarks: `Payment for period ${periodStr}`,
                            }));
                          }}
                          className="w-full text-xs p-1.5 bg-zinc-950 border border-zinc-700 text-white rounded font-mono focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                      Selected Period: {paymentForm.customStartDate} to {paymentForm.customEndDate}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full text-sm font-bold p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Method *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi_bank_transfer">UPI / Bank Transfer</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>
              </div>

              {/* Quick Set Helper Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="text-zinc-500">Quick set:</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextM = getRelativeMonthString(1);
                    handleBillingMonthChange(nextM);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                >
                  Pay Next Month Advance ({getRelativeMonthString(1)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curM = getRelativeMonthString(0);
                    handleBillingMonthChange(curM);
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                >
                  Current Month ({getRelativeMonthString(0)})
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Transaction / Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-9831726, Cheque #004"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                    className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Date Received (Manual) *</span>
                    <span className="text-[10px] text-amber-400">Actual Date Paid</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Advance fee settled, receipt issued..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  Commit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Monthly Invoices Modal */}
      {invoiceGenModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-base font-serif font-bold text-white">Batch Issue Monthly Bills</h2>
              <button onClick={() => setInvoiceGenModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoices} className="mt-4 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will automatically compute and issue fee invoices for all currently active students according to their individual fee rate.
              </p>

              <div className="p-3 bg-zinc-950 border border-amber-500/30 rounded-lg text-xs text-zinc-300 space-y-1">
                <span className="font-semibold block text-amber-400">📅 Deadline & Auto-Reminder Rule:</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Payment is due before the <strong>last day of the month</strong>. If unpaid, the background scheduler sends an automatic Gmail reminder <strong>1 day before the deadline</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Billing Month (YYYY-MM) *</label>
                <input
                  type="month"
                  required
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setInvoiceGenModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  Issue Bills
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
