import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Mail,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  RefreshCw,
  Info,
  Check,
  Bot,
  Calendar,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { formatBillingMonthFull } from '../utils/dateUtils.ts';

interface ReminderLog {
  id: number;
  studentId: number;
  invoiceId?: number | null;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string;
  student?: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
}

interface PendingInvoice {
  id: number;
  invoiceNumber: string;
  studentId: number;
  billingMonth: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  status: string;
  deadlineDate?: string;
  reminderDate?: string;
  daysRemaining?: number;
  is1DayBeforeDeadline?: boolean;
  isDueOrPast?: boolean;
  automatedReminderSent?: boolean;
  student?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    admissionNumber: string;
    roomId?: number;
    monthlyFee?: string;
  } | null;
}

interface SchedulerPolicy {
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalDispatched: number;
  currentCycle: string;
  currentCycleDeadline: string;
  currentCycleReminderTriggerDate: string;
  daysToCurrentDeadline: number;
  policy: {
    deadlineRule: string;
    automatedReminderRule: string;
  };
}

export const RemindersView: React.FC = () => {
  const { apiFetch, activeRole } = useAuth();

  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [policy, setPolicy] = useState<SchedulerPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'automated' | 'manual'>('all');

  // Send Reminder Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PendingInvoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [remindersData, invoicesData, policyData] = await Promise.all([
        apiFetch('/api/reminders'),
        apiFetch('/api/invoices'),
        apiFetch('/api/reminders/policy').catch(() => null),
      ]);
      setReminders(remindersData);
      setPendingInvoices(
        invoicesData.filter(
          (inv: PendingInvoice) => inv.status === 'pending' || inv.status === 'partial'
        )
      );
      if (policyData) {
        setPolicy(policyData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reminders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeRole]);

  const handleRunAutomatedCheck = async (simulateDate?: string, forceAllPending?: boolean) => {
    try {
      setIsAutoChecking(true);
      setError(null);
      const result = await apiFetch('/api/reminders/auto-check', {
        method: 'POST',
        body: JSON.stringify({ simulateDate, forceAllPending }),
      });

      if (result.dispatchedCount > 0) {
        setSuccessMsg(
          `🤖 Automated Reminder Engine: Successfully dispatched ${result.dispatchedCount} fee reminder(s) before the month-end deadline!`
        );
      } else {
        setSuccessMsg(
          `🤖 Automated Check Completed: ${result.message}`
        );
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute automated reminder check');
    } finally {
      setIsAutoChecking(false);
    }
  };

  const handleOpenSend = (invoice: PendingInvoice) => {
    setSelectedInvoice(invoice);
    const effectiveDue = invoice.student?.monthlyFee && Number(invoice.amountPaid) === 0
      ? Number(invoice.student.monthlyFee)
      : Number(invoice.amountDue);
    const balance = (effectiveDue - Number(invoice.amountPaid)).toFixed(2);
    const defaultEmail = invoice.student?.email || '';
    const deadline = invoice.deadlineDate || invoice.dueDate;
    setRecipientEmail(defaultEmail);
    setSubject(`⏰ Urgent: Fee Payment Due (${deadline}) - ${invoice.student?.firstName || 'Student'}`);
    setCustomMessage(
      `Dear ${invoice.student?.firstName || 'Student'} ${invoice.student?.lastName || ''},\n\nThis is an official payment reminder from SomnathRecorders.\n\nIn accordance with rules, payment must be completed before the last day of the calendar month (${deadline}). There is 1 day remaining to settle your pending balance.\n\nSummary of Dues:\n- Student Name: ${invoice.student?.firstName || ''} ${invoice.student?.lastName || ''} (ID: ${invoice.student?.admissionNumber || 'N/A'})\n- Invoice Number: ${invoice.invoiceNumber}\n- Billing Cycle: ${invoice.billingMonth}\n- Total Due: ${effectiveDue.toFixed(2)}\n- Balance Remaining: ${balance}\n- Month-End Deadline: ${deadline}\n\nPlease complete your fee settlement before the deadline.\n\nWarm regards,\nSomnathRecorders Accounts Office`
    );
    setCopied(false);
    setModalOpen(true);
  };

  const handleOpenInGmailWeb = async () => {
    if (!recipientEmail) {
      setError('Recipient email cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (selectedInvoice) {
        await apiFetch('/api/reminders/send', {
          method: 'POST',
          body: JSON.stringify({
            studentId: selectedInvoice.studentId,
            invoiceId: selectedInvoice.id,
            customSubject: subject,
            customMessage,
            status: 'sent_via_gmail',
          }),
        });
      }

      setSuccessMsg(`Opened Gmail composer for ${recipientEmail} and recorded notice in system audit log!`);
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error logging reminder:', err);
      setError(err.message || 'Failed to log reminder dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyNotice = () => {
    const fullText = `To: ${recipientEmail}\nSubject: ${subject}\n\n${customMessage}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRecordManualOnly = async () => {
    if (!selectedInvoice) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await apiFetch('/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedInvoice.studentId,
          invoiceId: selectedInvoice.id,
          customSubject: subject,
          customMessage,
          status: 'manual_notice',
        }),
      });

      setSuccessMsg(`Fee reminder notice recorded in system audit trail for ${recipientEmail}.`);
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to log reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filterType === 'automated') return r.status === 'automated_sent';
    if (filterType === 'manual') return r.status !== 'automated_sent';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-800 text-emerald-200 rounded-xl flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-200 rounded-xl flex items-center justify-between text-xs shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
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
            <Mail className="w-5 h-5 text-amber-400" />
            <span>Automated Fee Reminders & Gmail Notices</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Automated payment notifications scheduled 1 day prior to the month-end deadline with direct Gmail dispatch and audit logging.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-zinc-300 text-xs font-medium transition"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* AUTOMATED DEADLINE POLICY & SCHEDULER CONTROL CARD */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black rounded-2xl p-6 text-white border border-zinc-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Automated Scheduler Active
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                Background Job Running Hourly & On Boot
              </span>
            </div>

            <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>Automated Month-End Payment Policy</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  1. Payment Deadline Rule
                </span>
                <p className="text-[11px] text-zinc-400">
                  Payments must be settled <strong>before the last day of each month</strong>.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  2. Automated Reminder Trigger
                </span>
                <p className="text-[11px] text-zinc-400">
                  If payment is unpaid, system automatically sends a Gmail reminder <strong>1 day before deadline</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          {['admin', 'accountant', 'warden'].includes(activeRole) && (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
              <button
                onClick={() => handleRunAutomatedCheck()}
                disabled={isAutoChecking}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isAutoChecking ? 'animate-spin' : ''}`} />
                <span>{isAutoChecking ? 'Evaluating Invoices...' : 'Run Automated Check Now'}</span>
              </button>

              <button
                onClick={() => handleRunAutomatedCheck(undefined, true)}
                disabled={isAutoChecking}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700 transition disabled:opacity-50"
                title="Force-trigger automated reminder for all pending invoices regardless of date (e.g. testing Gautam Jayswal's email jayswalgautam4@gmail.com)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Trigger All Pending (Test Mode)</span>
              </button>
            </div>
          )}
        </div>

        {policy && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div className="flex items-center gap-4">
              <span>Current Cycle: <strong className="text-white font-mono">{policy.currentCycle}</strong></span>
              <span>Month-End Deadline: <strong className="text-amber-400 font-mono">{policy.currentCycleDeadline}</strong></span>
              <span>1-Day Trigger: <strong className="text-emerald-400 font-mono">{policy.currentCycleReminderTriggerDate}</strong></span>
            </div>
            <span>Total Automated Notices Sent: <strong className="text-white font-mono">{policy.totalDispatched}</strong></span>
          </div>
        )}
      </div>

      {/* Overdue/Pending Fee Students Queue */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950/50">
          <div>
            <h2 className="text-sm font-serif font-bold text-white">Pending Fee Accounts & Deadline Tracker</h2>
            <p className="text-xs text-zinc-400">
              Evaluated by scheduler: automated reminders trigger 1 day before month-end
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/30">
              {pendingInvoices.length} Invoices Pending
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Billing Period (Full Dates)</th>
                <th className="py-3 px-4">Deadline (Month-End)</th>
                <th className="py-3 px-4">Auto-Reminder Date</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Deadline Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {pendingInvoices.length > 0 ? (
                pendingInvoices.map((inv) => {
                  const effectiveDue = inv.student?.monthlyFee && Number(inv.amountPaid) === 0
                    ? Number(inv.student.monthlyFee)
                    : Number(inv.amountDue);
                  const balance = (effectiveDue - Number(inv.amountPaid)).toFixed(2);
                  const deadline = inv.deadlineDate || inv.dueDate;
                  const reminderDate = inv.reminderDate || `${inv.billingMonth}-27`;
                  const studentName = inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Student';
                  const studentEmail = inv.student?.email || '';

                  const gmailSubject = encodeURIComponent(
                    `⏰ Urgent: Fee Due Tomorrow (${deadline}) - ${studentName}`
                  );
                  const gmailBody = encodeURIComponent(
                    `Dear ${studentName},\n\nThis is an automated payment reminder from SomnathRecorders. Your payment for period ${formatBillingMonthFull(inv.billingMonth)} must be settled before the last day of the month (${deadline}).\n\nThere is 1 day left before the deadline.\n\nSummary:\n- Student Name: ${studentName} (ID: ${inv.student?.admissionNumber || 'N/A'})\n- Invoice Number: ${inv.invoiceNumber}\n- Balance Remaining: ${balance}\n- Deadline: ${deadline}\n\nPlease complete your payment promptly.\n\nWarm regards,\nSomnathRecorders Accounts Office`
                  );
                  const directGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                    studentEmail
                  )}&su=${gmailSubject}&body=${gmailBody}`;

                  return (
                    <tr key={inv.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{studentName}</div>
                        <div className="text-[11px] text-blue-400 font-mono">{studentEmail}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {inv.student?.admissionNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium text-white text-[11px] bg-zinc-950 px-2 py-1 rounded border border-zinc-800 inline-block">
                          {formatBillingMonthFull(inv.billingMonth)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {deadline}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{reminderDate}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">(1 day before)</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-400 text-sm">
                        {balance}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.is1DayBeforeDeadline ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            1 Day Left (Triggered)
                          </span>
                        ) : inv.daysRemaining !== undefined && inv.daysRemaining < 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Past Deadline
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {inv.daysRemaining !== undefined ? `${inv.daysRemaining} days left` : 'Pending'}
                          </span>
                        )}
                        {inv.automatedReminderSent && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Auto-notified
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={directGmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md text-[11px] font-semibold transition"
                            title={`Open Gmail composer for ${studentEmail}`}
                          >
                            <ExternalLink className="w-3 h-3 text-amber-400" />
                            <span>Gmail</span>
                          </a>

                          <button
                            onClick={() => handleOpenSend(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[11px] font-semibold shadow-xs transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Custom Notice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500">
                    All accounts are settled! No pending fee invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sent Reminders Audit Log */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-serif font-bold text-white">Dispatched Reminders Audit Trail</h2>
            <p className="text-xs text-zinc-400">Complete immutable record of all automatic and manual notices</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'all' ? 'bg-zinc-800 text-amber-300 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({reminders.length})
              </button>
              <button
                onClick={() => setFilterType('automated')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'automated' ? 'bg-zinc-800 text-purple-300 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🤖 Automated ({reminders.filter((r) => r.status === 'automated_sent').length})
              </button>
              <button
                onClick={() => setFilterType('manual')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterType === 'manual' ? 'bg-zinc-800 text-amber-300 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Manual ({reminders.filter((r) => r.status !== 'automated_sent').length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Message Snippet</th>
                <th className="py-3 px-4 text-center">Dispatch Mode</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {filteredReminders.length > 0 ? (
                filteredReminders.map((r) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {r.status}
                    </span>
                  );

                  if (r.status === 'automated_sent') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <Bot className="w-3 h-3 text-purple-400" />
                        <span>Automated (1d to Deadline)</span>
                      </span>
                    );
                  } else if (r.status === 'sent_via_gmail') {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Dispatched via Gmail
                      </span>
                    );
                  }

                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                    r.recipientEmail
                  )}&su=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}`;

                  return (
                    <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(r.sentAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        <div>{r.student ? `${r.student.firstName} ${r.student.lastName}` : r.recipientEmail}</div>
                        <div className="text-[11px] text-blue-400 font-mono font-medium">{r.recipientEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-200 max-w-xs truncate">{r.subject}</td>
                      <td className="py-3 px-4 text-zinc-400 max-w-sm truncate font-mono text-[11px]">{r.body}</td>
                      <td className="py-3 px-4 text-center">{badge}</td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold hover:underline"
                          title="Open this reminder in Gmail"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View in Gmail</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No reminders found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Notice Modal */}
      {modalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-400" />
                  <span>Send Fee Payment Reminder</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Invoice {selectedInvoice.invoiceNumber} &bull; {selectedInvoice.billingMonth} &bull; Month-End Deadline:{' '}
                  {selectedInvoice.deadlineDate || selectedInvoice.dueDate}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Recipient Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="resident@example.com"
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-md font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email Subject <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-md focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Notice Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Notice Message Body <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyNotice}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  required
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full text-xs p-3 bg-zinc-950 border border-zinc-700 text-white rounded-md font-mono leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Information banner */}
              <div className="p-3 bg-zinc-950 border border-amber-500/30 rounded-xl text-xs text-zinc-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Automated Deadline Policy:</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal pl-5">
                  Payment is due before the last day of the calendar month. The system automatically sends payment reminders 1 day prior to the deadline for all unsettled accounts.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleRecordManualOnly}
                  disabled={isSubmitting}
                  className="px-3 py-2 border border-zinc-700 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Record Offline Notice Only
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      recipientEmail
                    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(customMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleOpenInGmailWeb();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold shadow-md transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open & Send in Gmail</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
