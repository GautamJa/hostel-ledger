import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  User,
  CreditCard,
  Building2,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { generatePaymentReceiptPDF, generateAdmissionSlipPDF } from '../utils/pdfGenerator.ts';

export const StudentPortalView: React.FC = () => {
  const { apiFetch, dbUser, studentProfile } = useAuth();
  const [student, setStudent] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get students to locate current student's record
      const allStudents = await apiFetch('/api/students?status=all');
      
      // Match by studentProfile id or dbUser email
      let myStudent: any = null;
      if (Array.isArray(allStudents) && allStudents.length > 0) {
        if (studentProfile?.id) {
          myStudent = allStudents.find((s: any) => s.id === studentProfile.id);
        }
        if (!myStudent && dbUser?.email) {
          myStudent = allStudents.find((s: any) => s.email?.toLowerCase() === dbUser.email.toLowerCase());
        }
        if (!myStudent) {
          myStudent = allStudents[0];
        }
      }

      if (myStudent?.id) {
        // Fetch full ledger details for this student
        const details = await apiFetch(`/api/students/${myStudent.id}`);
        const studentObj = details?.student || details || myStudent;
        setStudent(studentObj);
        setInvoices(details?.invoices || []);
        // Sort payments newest first
        const sortedPayments = (details?.payments || []).sort(
          (a: any, b: any) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
        );
        setPayments(sortedPayments);
      } else if (studentProfile) {
        setStudent(studentProfile);
      } else {
        setStudent(null);
      }
    } catch (err: any) {
      console.error('Failed to load student portal data:', err);
      setError(err.message || 'Error loading records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [dbUser]);

  // Financial calculations
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amountDue || 0), 0);
  const totalInvoicePaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalInvoicePaid);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3"></div>
        <p className="text-xs text-zinc-400 font-mono">Loading student records & payment ledger...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">Student Record</h3>
        <p className="text-xs text-zinc-400 mt-1">
          {error || 'No student profile is currently linked with your account. Please contact the hostel office.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-Only Notice Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Resident Student Portal
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Read-Only Verified
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Welcome, <strong className="text-white">{student.firstName} {student.lastName}</strong>. View your month-wise fee payments, dues balance, and download watermarked receipts.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            generateAdmissionSlipPDF({
              admissionNumber: student.admissionNumber,
              name: `${student.firstName} ${student.lastName}`,
              gender: student.gender || 'male',
              dob: student.dob,
              email: student.email,
              phone: student.phone,
              roomNumber: student.room?.roomNumber,
              monthlyFee: student.monthlyFee,
              admissionDate: student.admissionDate,
              guardianName: student.emergencyContactName || '',
              guardianPhone: student.emergencyContactPhone || '',
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold border border-zinc-700 transition"
          title="Download official Admission Slip with Somnath watermark"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Admission Slip (PDF)</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Fee */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Monthly Fee Structure
          </span>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {Number(student.monthlyFee || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Per billing cycle</p>
        </div>

        {/* Total Paid */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Total Settled (Paid)
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {totalPaid.toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Across all verified months</p>
        </div>

        {/* Current Balance Due */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Current Balance Due
          </span>
          <div className={`text-2xl font-black mt-1 font-mono ${balanceDue > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
            {balanceDue.toFixed(2)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {balanceDue > 0 ? 'Month-end dues pending' : 'All accounts settled clean'}
          </p>
        </div>

        {/* Room & Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Allocated Room
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono flex items-center gap-1.5">
            <Building2 className="w-5 h-5" />
            <span>{student.room?.roomNumber || 'Room 122'}</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Status: <span className="text-emerald-400 font-semibold uppercase">{student.status}</span>
          </p>
        </div>
      </div>

      {/* Resident Personal Details Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Resident Particulars (Read-Only)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-zinc-500 block">Admission Number</span>
            <span className="font-mono font-bold text-white text-sm">{student.admissionNumber}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Full Name</span>
            <span className="font-semibold text-zinc-200">{student.firstName} {student.lastName}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Gender</span>
            <span className="capitalize font-semibold text-zinc-200">{student.gender || 'male'}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Admission Date</span>
            <span className="font-mono text-zinc-300">{student.admissionDate}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Contact Phone</span>
            <span className="font-semibold text-zinc-300 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-amber-400" />
              <span>{student.phone}</span>
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Gmail / Email</span>
            <span className="font-mono text-zinc-300 flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 text-amber-400" />
              <span>{student.email}</span>
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-zinc-500 block">Home Address</span>
            <span className="text-zinc-300 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{student.homeAddress || 'Kathmandu, Nepal'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Month-Wise Payment History Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Month-Wise Payment History</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Detailed audit voucher of in which months payments were made, amounts paid, and receipt downloads.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {payments.length} {payments.length === 1 ? 'transaction' : 'transactions'} recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Billing Month / Period</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4 text-center">Receipt (PDF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {payments.length > 0 ? (
                payments.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoiceId);
                  const monthDisplay = inv?.billingMonth || 'Standard Monthly Due';
                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white font-mono">{monthDisplay}</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-mono">
                        {p.paymentDate}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {Number(p.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-zinc-300">
                        {String(p.paymentMethod || 'upi_bank_transfer').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {p.transactionReference || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            generatePaymentReceiptPDF({
                              receiptNumber: p.receiptNumber,
                              studentName: `${student.firstName} ${student.lastName}`,
                              admissionNumber: student.admissionNumber,
                              roomNumber: student.room?.roomNumber,
                              amount: String(p.amount),
                              paymentMethod: p.paymentMethod || 'upi_bank_transfer',
                              transactionReference: p.transactionReference,
                              paymentDate: p.paymentDate,
                              remarks: p.remarks || `Payment for ${monthDisplay}`,
                              collectorName: 'Somnath Accounts',
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg text-[11px] font-semibold transition"
                          title="Download receipt with official Somnath watermark"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Receipt (PDF)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No payment records found yet for this account.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Month-Wise Billing Schedule & Outstanding Invoices */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/60">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Monthly Fee Schedule & Dues Status</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Overview of scheduled billing periods, due dates, amounts billed, and settlement status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Billing Month / Period</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Amount Billed</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const due = Number(inv.amountDue || 0);
                  const paid = Number(inv.amountPaid || 0);
                  const bal = Math.max(0, due - paid);
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {inv.billingMonth}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {inv.dueDate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-zinc-200">
                        {due.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        {paid.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={bal > 0 ? 'text-rose-400' : 'text-zinc-400'}>
                          {bal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No billing schedules generated yet.
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
