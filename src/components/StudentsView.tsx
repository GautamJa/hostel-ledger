import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  Phone,
  Mail,
  Calendar,
  Layers,
  History,
  ShieldAlert,
  Pencil,
  Trash2,
  CreditCard,
  Check,
  Receipt,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { generateAdmissionSlipPDF, generatePaymentReceiptPDF } from '../utils/pdfGenerator.ts';
import { formatBillingMonthFull, getRelativeMonthString, getUpcomingBillingMonths, getDefaultCustomDateRange } from '../utils/dateUtils.ts';

export interface CustomField {
  id: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  isRequired: boolean;
  optionsJson?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Student {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob?: string | null;
  email: string;
  phone: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodGroup?: string | null;
  homeAddress?: string | null;
  roomId?: number | null;
  monthlyFee: string;
  status: 'active' | 'vacated' | 'suspended';
  admissionDate: string;
  vacatedDate?: string | null;
  notes?: string | null;
  room?: {
    id: number;
    roomNumber: string;
    capacity: number;
    defaultMonthlyFee: string;
  } | null;
  customFieldValues?: Record<string, string>;
}

export interface RoomOption {
  id: number;
  roomNumber: string;
  capacity: number;
  occupancyCount: number;
  availableBeds: number;
  defaultMonthlyFee: string;
}

interface StudentsViewProps {
  onOpenPaymentModal?: (studentId: number) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ onOpenPaymentModal }) => {
  const { apiFetch, activeRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & dynamic columns
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'vacated'>('active');
  const [selectedCustomColumns, setSelectedCustomColumns] = useState<string[]>([]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [studentDetailsFull, setStudentDetailsFull] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [panelTab, setPanelTab] = useState<'ledger' | 'profile'>('ledger');

  // Inline Payment Form State inside Student Side Panel
  const [showAddPaymentInline, setShowAddPaymentInline] = useState(false);
  const [inlinePayment, setInlinePayment] = useState(() => {
    const dates = getDefaultCustomDateRange();
    return {
      billingMonth: '',
      isCustomMonth: false,
      customStartDate: dates.startDate,
      customEndDate: dates.endDate,
      customMonth: `${dates.startDate} to ${dates.endDate}`,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMethod: 'upi_bank_transfer',
      transactionReference: '',
      remarks: '',
      isSubmitting: false,
    };
  });
  const [lastRecordedReceipt, setLastRecordedReceipt] = useState<any | null>(null);

  // Inline Editable Monthly Fee
  const [isEditingFeeInline, setIsEditingFeeInline] = useState(false);
  const [newFeeInlineVal, setNewFeeInlineVal] = useState('');
  const [isSavingFeeInline, setIsSavingFeeInline] = useState(false);

  // Edit Form State (Clean 5 Fields + Status + Editable Monthly Fee)
  const [editFormData, setEditFormData] = useState({
    id: 0,
    admissionNumber: '',
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    address: '',
    monthlyFee: '500.00',
    status: 'active' as 'active' | 'vacated' | 'suspended',
  });

  // Register Form State (Clean 5 Fields: Room No manual, Phone, Gmail, Name, Address)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    address: '',
  });

  // Fee adjustment state
  const [feeAdjustData, setFeeAdjustData] = useState({
    newFee: '',
    reason: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsData, fieldsData, roomsData] = await Promise.all([
        apiFetch(`/api/students?status=${statusFilter}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`),
        apiFetch('/api/custom-fields'),
        apiFetch('/api/rooms'),
      ]);

      setStudents(studentsData);
      setCustomFields(fieldsData);
      setRooms(roomsData);
    } catch (err: any) {
      console.error('Failed to load students data:', err);
      setError(err.message || 'Error loading students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, activeRole]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenRegister = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      roomNumber: '',
      address: '',
    });
    setRegisterModalOpen(true);
  };

  // Submit Student Registration (5 Fields)
  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setSuccessMsg(`Student "${formData.name}" successfully registered into SomnathRecorders!`);
      setRegisterModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to register student');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditFormData({
      id: student.id,
      admissionNumber: student.admissionNumber,
      name: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email,
      phone: student.phone,
      roomNumber: student.room?.roomNumber || '',
      address: student.homeAddress || '',
      monthlyFee: student.monthlyFee || '500.00',
      status: student.status,
    });
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      setError(null);

      await apiFetch(`/api/students/${editFormData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone,
          roomNumber: editFormData.roomNumber,
          address: editFormData.address,
          monthlyFee: editFormData.monthlyFee,
          status: editFormData.status,
        }),
      });

      setSuccessMsg(`Student "${editFormData.name}" updated successfully!`);
      setEditModalOpen(false);
      fetchData();
      if (detailModalOpen && selectedStudent?.id === editFormData.id) {
        refreshStudentDetails(editFormData.id);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update student');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete/Vacate Modal
  const handleOpenDelete = (student: Student) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  // Confirm Delete or Vacate
  const handleConfirmDelete = async (permanent: boolean) => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      const res = await apiFetch(`/api/students/${studentToDelete.id}?permanent=${permanent}`, {
        method: 'DELETE',
      });

      setSuccessMsg(res.message || 'Student action completed.');
      setDeleteModalOpen(false);
      if (detailModalOpen && selectedStudent?.id === studentToDelete.id) {
        setDetailModalOpen(false);
      }
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  // Refresh student details inside side panel
  const refreshStudentDetails = async (studentId: number) => {
    try {
      const fullDetails = await apiFetch(`/api/students/${studentId}`);
      setStudentDetailsFull(fullDetails);
      setNewFeeInlineVal(fullDetails.monthlyFee || '500.00');
    } catch (err: any) {
      console.error('Failed to refresh student details:', err);
    }
  };

  // View Student Full Details (Opens Side Panel)
  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setIsDetailLoading(true);
    setDetailModalOpen(true);
    setShowAddPaymentInline(false);
    setLastRecordedReceipt(null);
    setIsEditingFeeInline(false);
    try {
      const fullDetails = await apiFetch(`/api/students/${student.id}`);
      setStudentDetailsFull(fullDetails);
      setNewFeeInlineVal(fullDetails.monthlyFee || '500.00');

      // Initialize default inline payment month & amount
      const pendingMonthItem = fullDetails.monthWiseLedger?.find((m: any) => m.status !== 'paid');
      const targetMonth = pendingMonthItem?.billingMonth || fullDetails.monthWiseLedger?.[0]?.billingMonth || new Date().toISOString().slice(0, 7);
      const targetAmount = pendingMonthItem ? pendingMonthItem.pendingBalance : (fullDetails.monthlyFee || '500.00');

      const defaultDates = getDefaultCustomDateRange();
      setInlinePayment({
        billingMonth: targetMonth,
        isCustomMonth: false,
        customStartDate: defaultDates.startDate,
        customEndDate: defaultDates.endDate,
        customMonth: `${defaultDates.startDate} to ${defaultDates.endDate}`,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: targetAmount,
        paymentMethod: 'upi_bank_transfer',
        transactionReference: '',
        remarks: '',
        isSubmitting: false,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Inline Editable Fee Save
  const handleSaveInlineFee = async () => {
    if (!studentDetailsFull || !newFeeInlineVal || isNaN(Number(newFeeInlineVal))) return;
    try {
      setIsSavingFeeInline(true);
      setError(null);
      await apiFetch(`/api/students/${studentDetailsFull.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          monthlyFee: Number(newFeeInlineVal).toFixed(2),
          feeReason: 'Updated directly from resident side panel',
        }),
      });

      setSuccessMsg(`Monthly fee updated to ${Number(newFeeInlineVal).toFixed(2)}`);
      setIsEditingFeeInline(false);
      await refreshStudentDetails(studentDetailsFull.id);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update fee');
    } finally {
      setIsSavingFeeInline(false);
    }
  };

  // Commit Inline Payment (Append-only, calculates balance, generates receipt)
  const handleCommitInlinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentDetailsFull) return;
    const payAmt = Number(inlinePayment.amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      setError('Please enter a valid positive payment amount');
      return;
    }

    try {
      setInlinePayment(prev => ({ ...prev, isSubmitting: true }));
      setError(null);

      const chosenMonth = inlinePayment.isCustomMonth && inlinePayment.customMonth
        ? inlinePayment.customMonth
        : inlinePayment.billingMonth;
      const chosenDate = inlinePayment.paymentDate || new Date().toISOString().split('T')[0];

      const res = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          studentId: studentDetailsFull.id,
          billingMonth: chosenMonth,
          amount: payAmt.toFixed(2),
          paymentMethod: inlinePayment.paymentMethod,
          transactionReference: inlinePayment.transactionReference || null,
          paymentDate: chosenDate,
          remarks: inlinePayment.remarks || `Payment settlement for month ${chosenMonth}`,
        }),
      });

      const receipt = {
        receiptNumber: res.receiptNumber,
        studentName: `${studentDetailsFull.firstName} ${studentDetailsFull.lastName}`,
        admissionNumber: studentDetailsFull.admissionNumber,
        roomNumber: studentDetailsFull.room?.roomNumber,
        amount: payAmt.toFixed(2),
        paymentMethod: inlinePayment.paymentMethod,
        transactionReference: inlinePayment.transactionReference,
        paymentDate: chosenDate,
      };

      setLastRecordedReceipt(receipt);
      setSuccessMsg(`Payment of ${payAmt.toFixed(2)} committed successfully! Voucher #${res.receiptNumber}`);
      setShowAddPaymentInline(false);

      // Refresh student full ledger and main table
      await refreshStudentDetails(studentDetailsFull.id);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to commit payment');
    } finally {
      setInlinePayment(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Open Fee Adjustment Modal
  const handleOpenFeeModal = (student: Student) => {
    setSelectedStudent(student);
    setFeeAdjustData({
      newFee: student.monthlyFee,
      reason: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setFeeModalOpen(true);
  };

  // Submit Fee Adjustment (with required audit trail reason)
  const handleSubmitFeeAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setError(null);
      await apiFetch(`/api/students/${selectedStudent.id}/fee`, {
        method: 'PUT',
        body: JSON.stringify(feeAdjustData),
      });

      setSuccessMsg(`Monthly fee updated to ${Number(feeAdjustData.newFee).toFixed(2)} with audit entry`);
      setFeeModalOpen(false);
      fetchData();
      if (detailModalOpen) {
        handleViewStudent(selectedStudent);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust fee');
    }
  };

  const toggleCustomColumn = (fieldName: string) => {
    setSelectedCustomColumns((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]
    );
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

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-xl">
        <div>
          <h1 className="text-xl font-serif font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Student Directory & Registration</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage students, assign manual room numbers, configure custom columns, and edit monthly fee rates.
          </p>
        </div>

        {['admin', 'warden'].includes(activeRole) && (
          <button
            onClick={handleOpenRegister}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Student</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, admission #, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-750 text-white placeholder-zinc-500 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg text-xs border border-zinc-800">
            {(['active', 'all', 'vacated'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                  statusFilter === st ? 'bg-zinc-800 text-amber-300 shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Dynamic Column Picker Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 transition"
              title="Select dynamic custom columns to display in table"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Columns ({selectedCustomColumns.length})</span>
            </button>

            {showColumnPicker && (
              <div className="absolute right-0 mt-2 w-64 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 p-3 z-30">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs font-bold text-white">
                  <span>Toggle Custom Columns</span>
                  <button onClick={() => setShowColumnPicker(false)} className="text-zinc-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {customFields.map((cf) => (
                    <label
                      key={cf.id}
                      className="flex items-center gap-2 text-xs text-zinc-300 hover:bg-zinc-800 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomColumns.includes(cf.fieldName)}
                        onChange={() => toggleCustomColumn(cf.fieldName)}
                        className="rounded border-zinc-700 text-amber-600 focus:ring-amber-500 bg-zinc-950"
                      />
                      <span>{cf.fieldLabel}</span>
                    </label>
                  ))}
                  {customFields.length === 0 && (
                    <p className="text-[11px] text-zinc-500 italic">No custom fields defined yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Admission #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Monthly Fee</th>
                {selectedCustomColumns.map((colName) => {
                  const fieldDef = customFields.find((f) => f.fieldName === colName);
                  return (
                    <th key={colName} className="py-3 px-4 text-amber-400 bg-zinc-950/50">
                      {fieldDef?.fieldLabel || colName}
                    </th>
                  );
                })}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={7 + selectedCustomColumns.length} className="py-12 text-center text-zinc-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => handleViewStudent(st)}
                    className="hover:bg-zinc-800/60 transition cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-amber-400">{st.admissionNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {st.firstName} {st.lastName}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">{st.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      {st.room ? (
                        <span className="inline-flex items-center gap-1 font-medium text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          {st.room.roomNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      <div>{st.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-white">{Number(st.monthlyFee).toFixed(2)}</div>
                      {['admin', 'accountant'].includes(activeRole) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFeeModal(st);
                          }}
                          className="text-[10px] text-amber-400 hover:underline flex items-center justify-end gap-0.5 ml-auto mt-0.5"
                          title="Edit monthly fee"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          <span>Adjust</span>
                        </button>
                      )}
                    </td>

                    {/* Dynamic Custom Field Values */}
                    {selectedCustomColumns.map((colName) => {
                      const val = st.customFieldValues?.[colName] || '—';
                      return (
                        <td key={colName} className="py-3 px-4 text-zinc-300 font-medium">
                          {val}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          st.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewStudent(st)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                          title="Open Resident Side Panel & Payment Ledger"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            const guardian = st.customFieldValues?.['guardian_name'] || st.emergencyContactName || '';
                            const guardianPh = st.customFieldValues?.['guardian_phone'] || st.emergencyContactPhone || '';
                            const dept = st.customFieldValues?.['department'] || '';
                            generateAdmissionSlipPDF({
                              admissionNumber: st.admissionNumber,
                              name: `${st.firstName} ${st.lastName}`,
                              gender: st.gender,
                              dob: st.dob || undefined,
                              email: st.email,
                              phone: st.phone,
                              roomNumber: st.room?.roomNumber,
                              monthlyFee: st.monthlyFee,
                              admissionDate: st.admissionDate,
                              guardianName: guardian,
                              guardianPhone: guardianPh,
                              department: dept,
                            });
                          }}
                          className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition"
                          title="Download Admission Slip PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {['admin', 'warden'].includes(activeRole) && (
                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition"
                            title="Edit Student Information"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {['admin', 'warden'].includes(activeRole) && (
                          <button
                            onClick={() => handleOpenDelete(st)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
                            title="Vacate or Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {['admin', 'accountant'].includes(activeRole) && (
                          <button
                            onClick={() => handleViewStudent(st)}
                            className="px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded text-[11px] font-medium transition flex items-center gap-1"
                            title="Open Payments & Ledger"
                          >
                            <span>Ledger</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7 + selectedCustomColumns.length} className="py-10 text-center text-zinc-500">
                    No students match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          1. Student Registration Modal (Clean: 5 Requested Fields)
         ======================================================== */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Register Student</h2>
                <p className="text-xs text-zinc-400">
                  Fill in room number, phone number, Gmail, name, and address.
                </p>
              </div>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRegister} className="mt-5 space-y-4">
              {/* 1. Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gautam Jayswal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 2. Gmail */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Gmail / Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jayswalgautam4@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white font-mono rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 3. Phone & 4. Room No (Manual text input) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +977 980-1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Room No (Manual)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Type room</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, A-102, Room 4"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* 5. Address */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Kathmandu, Ward 4, Nepal"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          2. Editable Monthly Fee Modal (with Audit Trail)
         ======================================================== */}
      {feeModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white">Adjust Monthly Fee Rate</h2>
                <p className="text-xs text-zinc-400">{selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.admissionNumber})</p>
              </div>
              <button onClick={() => setFeeModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeeAdjust} className="mt-4 space-y-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Current Monthly Fee:</span>
                <span className="font-bold text-white text-sm">{Number(selectedStudent.monthlyFee).toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  New Monthly Fee Rate *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={feeAdjustData.newFee}
                  onChange={(e) => setFeeAdjustData({ ...feeAdjustData, newFee: e.target.value })}
                  className="w-full text-sm font-bold p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reason for Adjustment (Mandatory Audit Trail) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g., Merit scholarship concession, single room surcharge, approval note..."
                  value={feeAdjustData.reason}
                  onChange={(e) => setFeeAdjustData({ ...feeAdjustData, reason: e.target.value })}
                  className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Effective Date *</label>
                <input
                  type="date"
                  required
                  value={feeAdjustData.effectiveFrom}
                  onChange={(e) => setFeeAdjustData({ ...feeAdjustData, effectiveFrom: e.target.value })}
                  className="w-full text-xs p-2 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setFeeModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Record Fee Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          3. Resident Profile & Month-Wise Financial Side Panel
         ======================================================== */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setDetailModalOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-2xl sm:max-w-3xl bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col h-full text-zinc-100 animate-in slide-in-from-right duration-300">
              {isDetailLoading || !studentDetailsFull ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3"></div>
                  <p className="text-xs font-medium">Loading resident statement & ledger...</p>
                </div>
              ) : (
                <>
                  {/* Top Header */}
                  <div className="p-5 border-b border-zinc-800 bg-zinc-950/70">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h2 className="text-xl font-serif font-bold text-white tracking-tight">
                            {studentDetailsFull.firstName} {studentDetailsFull.lastName}
                          </h2>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              studentDetailsFull.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {studentDetailsFull.status}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                            {studentDetailsFull.admissionNumber}
                          </span>
                        </div>

                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400">
                          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Room: {studentDetailsFull.room?.roomNumber || 'Manual/Unassigned'}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono text-zinc-300">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{studentDetailsFull.email}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-zinc-300">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{studentDetailsFull.phone}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDetailModalOpen(false)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                        title="Close panel"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800/80 text-xs font-semibold">
                      <button
                        onClick={() => setPanelTab('ledger')}
                        className={`pb-1 border-b-2 transition flex items-center gap-1.5 ${
                          panelTab === 'ledger'
                            ? 'border-amber-500 text-amber-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Monthly Ledger & Payments</span>
                      </button>
                      <button
                        onClick={() => setPanelTab('profile')}
                        className={`pb-1 border-b-2 transition flex items-center gap-1.5 ${
                          panelTab === 'profile'
                            ? 'border-amber-500 text-amber-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Profile & Audit History</span>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Confirmation banner for just-recorded payment */}
                    {lastRecordedReceipt && (
                      <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold">Payment Committed:</span> {lastRecordedReceipt.amount} recorded for voucher{' '}
                            <span className="font-mono text-emerald-200">{lastRecordedReceipt.receiptNumber}</span>.
                          </div>
                        </div>
                        <button
                          onClick={() => generatePaymentReceiptPDF(lastRecordedReceipt)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1 shadow-sm transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Receipt</span>
                        </button>
                      </div>
                    )}

                    {/* 4 Financial KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* 1. Editable Monthly Fee */}
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-1">
                          <span>Monthly Fee</span>
                          {!isEditingFeeInline ? (
                            <button
                              onClick={() => {
                                setNewFeeInlineVal(studentDetailsFull.monthlyFee || '500.00');
                                setIsEditingFeeInline(true);
                              }}
                              className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 text-[10px]"
                              title="Edit monthly fee for this resident"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                          ) : null}
                        </div>

                        {!isEditingFeeInline ? (
                          <div>
                            <div className="text-base font-bold text-white tracking-tight">
                              {Number(studentDetailsFull.monthlyFee || 0).toFixed(2)}
                            </div>
                            <span className="text-[10px] text-zinc-500">per month (editable)</span>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={newFeeInlineVal}
                              onChange={(e) => setNewFeeInlineVal(e.target.value)}
                              className="w-full text-xs p-1 bg-zinc-900 border border-amber-500 text-white rounded font-mono focus:outline-none"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleSaveInlineFee}
                                disabled={isSavingFeeInline}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                              >
                                {isSavingFeeInline ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setIsEditingFeeInline(false)}
                                className="px-2 py-0.5 bg-zinc-800 text-zinc-400 hover:text-white rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. Total Billed */}
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-zinc-400 text-[11px] block mb-1">Total Billed</span>
                        <div className="text-base font-bold text-white tracking-tight">
                          {studentDetailsFull.financialSummary?.totalBilled || '0.00'}
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {studentDetailsFull.financialSummary?.totalMonths || 0} billing cycles
                        </span>
                      </div>

                      {/* 3. Total Paid */}
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-zinc-400 text-[11px] block mb-1">Total Paid</span>
                        <div className="text-base font-bold text-emerald-400 tracking-tight">
                          {studentDetailsFull.financialSummary?.totalPaid || '0.00'}
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {studentDetailsFull.payments?.length || 0} payment vouchers
                        </span>
                      </div>

                      {/* 4. Auto-Calculated Remaining Balance */}
                      <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                        <span className="text-zinc-400 text-[11px] block mb-1">Remaining Balance</span>
                        <div
                          className={`text-base font-bold tracking-tight ${
                            Number(studentDetailsFull.financialSummary?.remainingBalance || 0) > 0
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {studentDetailsFull.financialSummary?.remainingBalance || '0.00'}
                        </div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                            Number(studentDetailsFull.financialSummary?.remainingBalance || 0) > 0
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {Number(studentDetailsFull.financialSummary?.remainingBalance || 0) > 0
                            ? 'Pending Dues'
                            : 'Fully Settled'}
                        </span>
                      </div>
                    </div>

                    {panelTab === 'ledger' && (
                      <>
                        {/* Latest Payment Highlight (Newest First) */}
                        {studentDetailsFull.financialSummary?.latestPayment && (
                          <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <Receipt className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">Latest Payment:</span>
                                  <span className="font-mono text-amber-400 font-medium">
                                    {studentDetailsFull.financialSummary.latestPayment.receiptNumber}
                                  </span>
                                  <span className="text-zinc-500 text-[11px]">
                                    ({studentDetailsFull.financialSummary.latestPayment.paymentDate})
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  Amount:{' '}
                                  <span className="font-bold text-emerald-400">
                                    {Number(studentDetailsFull.financialSummary.latestPayment.amount).toFixed(2)}
                                  </span>{' '}
                                  via{' '}
                                  <span className="uppercase text-zinc-300">
                                    {studentDetailsFull.financialSummary.latestPayment.paymentMethod}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                generatePaymentReceiptPDF({
                                  receiptNumber: studentDetailsFull.financialSummary.latestPayment.receiptNumber,
                                  studentName: `${studentDetailsFull.firstName} ${studentDetailsFull.lastName}`,
                                  admissionNumber: studentDetailsFull.admissionNumber,
                                  roomNumber: studentDetailsFull.room?.roomNumber,
                                  amount: studentDetailsFull.financialSummary.latestPayment.amount,
                                  paymentMethod: studentDetailsFull.financialSummary.latestPayment.paymentMethod,
                                  transactionReference: studentDetailsFull.financialSummary.latestPayment.transactionReference,
                                  paymentDate: studentDetailsFull.financialSummary.latestPayment.paymentDate,
                                })
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 shrink-0 flex items-center gap-1 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </div>
                        )}

                        {/* Inline "Add New Payment" Section */}
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                          <div className="p-3.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-amber-400" />
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                Add New Payment (Append-Only)
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAddPaymentInline(!showAddPaymentInline)}
                              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                            >
                              {showAddPaymentInline ? (
                                <>
                                  <span>Hide Form</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>+ Quick Add Payment</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>

                          {showAddPaymentInline && (
                            <form onSubmit={handleCommitInlinePayment} className="p-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Billing Month */}
                                <div className="sm:col-span-1">
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                                    <span>Billing Period <span className="text-rose-400">*</span></span>
                                    <span className="text-[10px] text-amber-400">Next Month Ready</span>
                                  </label>
                                  <select
                                    value={inlinePayment.isCustomMonth ? 'custom' : inlinePayment.billingMonth}
                                    onChange={(e) => {
                                      const selMonth = e.target.value;
                                      if (selMonth === 'custom') {
                                        setInlinePayment({
                                          ...inlinePayment,
                                          isCustomMonth: true,
                                        });
                                        return;
                                      }
                                      const found = studentDetailsFull.monthWiseLedger?.find((m: any) => m.billingMonth === selMonth);
                                      setInlinePayment({
                                        ...inlinePayment,
                                        isCustomMonth: false,
                                        billingMonth: selMonth,
                                        amount: found && Number(found.pendingBalance) > 0 ? found.pendingBalance : (studentDetailsFull.monthlyFee || '500.00'),
                                        remarks: selMonth > new Date().toISOString().slice(0, 7) ? `Advance payment for ${selMonth}` : inlinePayment.remarks,
                                      });
                                    }}
                                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                                  >
                                    {/* Existing months from student ledger */}
                                    {studentDetailsFull.monthWiseLedger?.map((m: any) => (
                                      <option key={m.billingMonth} value={m.billingMonth}>
                                        {m.billingMonth} ({formatBillingMonthFull(m.billingMonth)}) — {m.status.toUpperCase()} ({m.pendingBalance})
                                      </option>
                                    ))}
                                    {/* Next Month Advance option */}
                                    <option value={getRelativeMonthString(1)}>
                                      {getRelativeMonthString(1)} ({formatBillingMonthFull(getRelativeMonthString(1))}) — Next Month Advance
                                    </option>
                                    {/* Month + 2 Advance option */}
                                    <option value={getRelativeMonthString(2)}>
                                      {getRelativeMonthString(2)} ({formatBillingMonthFull(getRelativeMonthString(2))}) — Advance (+2)
                                    </option>
                                    <option value="custom">-- Custom Period (Specify Dates with Day) --</option>
                                  </select>

                                  {inlinePayment.isCustomMonth && (
                                    <div className="mt-2 p-2.5 bg-zinc-950 border border-amber-500/40 rounded-lg space-y-2">
                                      <div className="text-[11px] font-semibold text-amber-300 flex items-center justify-between">
                                        <span>Custom Period (With Day)</span>
                                        <span className="text-[10px] text-zinc-400">Set start & end days</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] text-zinc-400 mb-0.5">From Day *</label>
                                          <input
                                            type="date"
                                            required
                                            value={inlinePayment.customStartDate}
                                            onChange={(e) => {
                                              const sVal = e.target.value;
                                              const periodStr = `${sVal} to ${inlinePayment.customEndDate}`;
                                              setInlinePayment({
                                                ...inlinePayment,
                                                customStartDate: sVal,
                                                customMonth: periodStr,
                                                remarks: `Payment for period ${periodStr}`,
                                              });
                                            }}
                                            className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-700 text-white rounded font-mono focus:border-amber-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-zinc-400 mb-0.5">To Day *</label>
                                          <input
                                            type="date"
                                            required
                                            value={inlinePayment.customEndDate}
                                            onChange={(e) => {
                                              const eVal = e.target.value;
                                              const periodStr = `${inlinePayment.customStartDate} to ${eVal}`;
                                              setInlinePayment({
                                                ...inlinePayment,
                                                customEndDate: eVal,
                                                customMonth: periodStr,
                                                remarks: `Payment for period ${periodStr}`,
                                              });
                                            }}
                                            className="w-full text-xs p-1.5 bg-zinc-900 border border-zinc-700 text-white rounded font-mono focus:border-amber-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="text-[10px] text-emerald-400 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                        Selected Period: {inlinePayment.customStartDate} to {inlinePayment.customEndDate}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Manual Payment Date */}
                                <div className="sm:col-span-1">
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                                    <span>Payment Date (Manual) <span className="text-rose-400">*</span></span>
                                    <span className="text-[10px] text-amber-400">Actual Date Paid</span>
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={inlinePayment.paymentDate}
                                    onChange={(e) => setInlinePayment({ ...inlinePayment, paymentDate: e.target.value })}
                                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                                  />
                                </div>

                                {/* Amount */}
                                <div className="sm:col-span-1">
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                                    <span>Amount to Pay</span>
                                    <span className="text-[10px] text-amber-400">Partial OK</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    required
                                    value={inlinePayment.amount}
                                    onChange={(e) => setInlinePayment({ ...inlinePayment, amount: e.target.value })}
                                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-bold"
                                    placeholder="e.g. 20000.00"
                                  />
                                </div>
                              </div>

                              {/* Quick Amount Helper Chips */}
                              <div className="flex items-center flex-wrap gap-2 text-[10px]">
                                <span className="text-zinc-500">Quick set:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextM = getRelativeMonthString(1);
                                    setInlinePayment({
                                      ...inlinePayment,
                                      billingMonth: nextM,
                                      isCustomMonth: false,
                                      amount: studentDetailsFull.monthlyFee || '500.00',
                                      remarks: `Advance payment for ${formatBillingMonthFull(nextM)}`,
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-semibold"
                                >
                                  ✨ Next Month Advance ({getRelativeMonthString(1)})
                                </button>
                                {Number(studentDetailsFull.financialSummary?.remainingBalance || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlinePayment({
                                        ...inlinePayment,
                                        amount: studentDetailsFull.financialSummary.remainingBalance,
                                      })
                                    }
                                    className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20"
                                  >
                                    Full Current Dues ({studentDetailsFull.financialSummary.remainingBalance})
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlinePayment({
                                      ...inlinePayment,
                                      amount: studentDetailsFull.monthlyFee || '500.00',
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                                >
                                  Standard Fee ({studentDetailsFull.monthlyFee})
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlinePayment({
                                      ...inlinePayment,
                                      amount: (Number(studentDetailsFull.monthlyFee || 500) / 2).toFixed(2),
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                                >
                                  50% Partial ({(Number(studentDetailsFull.monthlyFee || 500) / 2).toFixed(2)})
                                </button>
                              </div>

                              {/* Live Balance Preview Calculation */}
                              <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 text-xs">
                                <div className="flex items-center justify-between text-zinc-400 mb-1">
                                  <span>Live Balance Calculation:</span>
                                  <span className="text-[11px] font-mono text-zinc-300">
                                    Month: {inlinePayment.billingMonth || '—'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
                                  <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                                    <span className="text-[10px] text-zinc-500 block">Current Balance</span>
                                    <span className="font-semibold text-white">
                                      {studentDetailsFull.financialSummary?.remainingBalance || '0.00'}
                                    </span>
                                  </div>
                                  <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                                    <span className="text-[10px] text-emerald-400 block">Paying Now</span>
                                    <span className="font-bold text-emerald-400">
                                      {Number(inlinePayment.amount || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="p-1.5 bg-zinc-950 rounded border border-zinc-800">
                                    <span className="text-[10px] text-zinc-500 block">New Balance After</span>
                                    <span
                                      className={`font-bold ${
                                        Math.max(
                                          0,
                                          Number(studentDetailsFull.financialSummary?.remainingBalance || 0) -
                                            Number(inlinePayment.amount || 0)
                                        ) > 0
                                          ? 'text-amber-400'
                                          : 'text-emerald-400'
                                      }`}
                                    >
                                      {Math.max(
                                        0,
                                        Number(studentDetailsFull.financialSummary?.remainingBalance || 0) -
                                          Number(inlinePayment.amount || 0)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Method & Ref */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                    Payment Method
                                  </label>
                                  <select
                                    value={inlinePayment.paymentMethod}
                                    onChange={(e) => setInlinePayment({ ...inlinePayment, paymentMethod: e.target.value })}
                                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 uppercase text-[11px]"
                                  >
                                    <option value="upi_bank_transfer">UPI / Bank Transfer</option>
                                    <option value="cash">Cash Settlement</option>
                                    <option value="card">Debit / Credit Card</option>
                                    <option value="cheque">Cheque Deposit</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                    Transaction / Reference ID
                                  </label>
                                  <input
                                    type="text"
                                    value={inlinePayment.transactionReference}
                                    onChange={(e) =>
                                      setInlinePayment({ ...inlinePayment, transactionReference: e.target.value })
                                    }
                                    placeholder="e.g. UPI Ref / Cheque # / Cash Memo"
                                    className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                                  />
                                </div>
                              </div>

                              {/* Remarks */}
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                                  Notes / Remarks
                                </label>
                                <input
                                  type="text"
                                  value={inlinePayment.remarks}
                                  onChange={(e) => setInlinePayment({ ...inlinePayment, remarks: e.target.value })}
                                  placeholder="Optional transaction comment..."
                                  className="w-full text-xs p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                                />
                              </div>

                              {/* Commit Button */}
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-[11px] text-zinc-500">
                                  Append-only: Never overwrites prior payment records.
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowAddPaymentInline(false)}
                                    className="px-3.5 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={inlinePayment.isSubmitting}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>{inlinePayment.isSubmitting ? 'Recording...' : 'Commit'}</span>
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Monthly Fee Schedule & Dues Ledger */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>Monthly Fee Schedule & Dues Ledger</span>
                            </h3>
                            <span className="text-[11px] text-zinc-500">Includes carry-forward dues</span>
                          </div>

                          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
                                <tr>
                                  <th className="py-2.5 px-3">Billing Period (Full Dates)</th>
                                  <th className="py-2.5 px-3 text-right">Fee Due</th>
                                  <th className="py-2.5 px-3 text-right">Paid</th>
                                  <th className="py-2.5 px-3 text-right">Carry Forward</th>
                                  <th className="py-2.5 px-3 text-right">Pending Balance</th>
                                  <th className="py-2.5 px-3 text-center">Status</th>
                                  <th className="py-2.5 px-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                                {studentDetailsFull.monthWiseLedger && studentDetailsFull.monthWiseLedger.length > 0 ? (
                                  studentDetailsFull.monthWiseLedger.map((m: any) => (
                                    <tr key={m.billingMonth} className="hover:bg-zinc-900/40 transition">
                                      <td className="py-2.5 px-3 font-mono font-medium text-white">
                                        <div>{formatBillingMonthFull(m.billingMonth)}</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-semibold text-zinc-200">
                                        {m.amountDue}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                        {m.amountPaid}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-zinc-400">
                                        {Number(m.carryForward) > 0 ? (
                                          <span className="text-amber-400">+{m.carryForward}</span>
                                        ) : (
                                          '0.00'
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold">
                                        <span
                                          className={
                                            Number(m.pendingBalance) > 0 ? 'text-rose-400' : 'text-emerald-400'
                                          }
                                        >
                                          {m.pendingBalance}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                            m.status === 'paid'
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                              : m.status === 'partial'
                                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                              : m.status === 'overdue'
                                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                          }`}
                                        >
                                          {m.status}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {Number(m.pendingBalance) > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setInlinePayment({
                                                ...inlinePayment,
                                                billingMonth: m.billingMonth,
                                                amount: m.pendingBalance,
                                              });
                                              setShowAddPaymentInline(true);
                                            }}
                                            className="px-2 py-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 transition"
                                          >
                                            Pay Dues
                                          </button>
                                        ) : (
                                          <span className="text-[10px] text-emerald-500 font-medium flex items-center justify-center gap-0.5">
                                            <Check className="w-3 h-3" />
                                            <span>Cleared</span>
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-zinc-500">
                                      No billing records generated yet for this resident.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Payment History & Receipts (Vouchers) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-amber-400" />
                              <span>Payment History & Receipts ({studentDetailsFull.payments?.length || 0} Records)</span>
                            </h3>
                            <span className="text-[11px] text-zinc-500">Downloadable PDF Receipts</span>
                          </div>

                          {studentDetailsFull.payments && studentDetailsFull.payments.length > 0 ? (
                            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
                                  <tr>
                                    <th className="py-2.5 px-3">Receipt #</th>
                                    <th className="py-2.5 px-3">Payment Date</th>
                                    <th className="py-2.5 px-3">Method</th>
                                    <th className="py-2.5 px-3 text-right">Amount</th>
                                    <th className="py-2.5 px-3">Reference</th>
                                    <th className="py-2.5 px-3 text-center">Receipt PDF</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                                  {studentDetailsFull.payments.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-zinc-900/40 transition">
                                      <td className="py-2.5 px-3 font-mono font-medium text-amber-400">
                                        {p.receiptNumber}
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                                        {p.paymentDate}
                                      </td>
                                      <td className="py-2.5 px-3 uppercase text-[11px] font-medium text-zinc-300">
                                        {p.paymentMethod}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                        {Number(p.amount).toFixed(2)}
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-400 text-[11px] truncate max-w-[120px]">
                                        {p.transactionReference || p.remarks || '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            generatePaymentReceiptPDF({
                                              receiptNumber: p.receiptNumber,
                                              studentName: `${studentDetailsFull.firstName} ${studentDetailsFull.lastName}`,
                                              admissionNumber: studentDetailsFull.admissionNumber,
                                              roomNumber: studentDetailsFull.room?.roomNumber,
                                              amount: p.amount,
                                              paymentMethod: p.paymentMethod,
                                              transactionReference: p.transactionReference,
                                              paymentDate: p.paymentDate,
                                              remarks: p.remarks,
                                            })
                                          }
                                          className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 transition flex items-center gap-1 mx-auto"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>PDF</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                              <div className="flex items-center justify-center gap-2 text-zinc-300 text-xs font-semibold">
                                <Receipt className="w-4 h-4 text-amber-400" />
                                <span>No Payment History (0 Payments Recorded)</span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-1">
                                This resident was newly registered and has not made any fee payments yet.
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowAddPaymentInline(true)}
                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Record First Payment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {panelTab === 'profile' && (
                      <div className="space-y-5">
                        {/* Resident Core Information */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs space-y-3">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Personal & Contact Particulars
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                              <span className="text-zinc-500 block">Full Name</span>
                              <span className="font-semibold text-white">
                                {studentDetailsFull.firstName} {studentDetailsFull.lastName}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Gmail / Email</span>
                              <span className="font-mono text-zinc-300">{studentDetailsFull.email}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Phone</span>
                              <span className="font-semibold text-zinc-200">{studentDetailsFull.phone}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Allocated Room</span>
                              <span className="font-semibold text-amber-400">
                                {studentDetailsFull.room?.roomNumber || 'None'}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Admission Date</span>
                              <span className="font-semibold text-zinc-300">{studentDetailsFull.admissionDate}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Home Address</span>
                              <span className="text-zinc-300">{studentDetailsFull.homeAddress || 'Not recorded'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Custom Fields Values */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                            Custom Attributes
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {studentDetailsFull.customFields && studentDetailsFull.customFields.length > 0 ? (
                              studentDetailsFull.customFields.map((cf: any) => (
                                <div key={cf.fieldId} className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                                    {cf.fieldLabel}
                                  </span>
                                  <span className="text-xs font-semibold text-zinc-200">
                                    {cf.fieldValue || <span className="text-zinc-500 italic">Not set</span>}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-zinc-500 italic">No custom attributes recorded.</p>
                            )}
                          </div>
                        </div>

                        {/* Fee Adjustment Audit History */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-amber-400" />
                              <span>Monthly Fee Audit History</span>
                            </h4>
                            {['admin', 'accountant'].includes(activeRole) && (
                              <button
                                onClick={() => handleOpenFeeModal(studentDetailsFull)}
                                className="text-xs text-amber-400 font-semibold hover:underline"
                              >
                                + Formal Audit Adjustment
                              </button>
                            )}
                          </div>

                          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold border-b border-zinc-800">
                                <tr>
                                  <th className="py-2 px-3">Effective Date</th>
                                  <th className="py-2 px-3 text-right">Old Fee</th>
                                  <th className="py-2 px-3 text-right">New Fee</th>
                                  <th className="py-2 px-3">Audit Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                                {studentDetailsFull.feeAdjustments && studentDetailsFull.feeAdjustments.length > 0 ? (
                                  studentDetailsFull.feeAdjustments.map((fa: any) => (
                                    <tr key={fa.id}>
                                      <td className="py-2 px-3 text-zinc-400 font-mono text-[11px]">
                                        {fa.effectiveFrom}
                                      </td>
                                      <td className="py-2 px-3 text-right text-zinc-500">
                                        {Number(fa.oldFee).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                                        {Number(fa.newFee).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-3 italic text-zinc-400 text-[11px]">{fa.reason}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={4} className="py-3 px-3 text-center text-zinc-500">
                                      No fee adjustments recorded yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Bar */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const guardian =
                          studentDetailsFull.customFields?.find((c: any) => c.fieldName === 'guardian_name')?.fieldValue ||
                          '';
                        const guardianPh =
                          studentDetailsFull.customFields?.find((c: any) => c.fieldName === 'guardian_phone')?.fieldValue ||
                          '';
                        const dept =
                          studentDetailsFull.customFields?.find((c: any) => c.fieldName === 'department')?.fieldValue || '';
                        generateAdmissionSlipPDF({
                          admissionNumber: studentDetailsFull.admissionNumber,
                          name: `${studentDetailsFull.firstName} ${studentDetailsFull.lastName}`,
                          gender: studentDetailsFull.gender,
                          dob: studentDetailsFull.dob,
                          email: studentDetailsFull.email,
                          phone: studentDetailsFull.phone,
                          roomNumber: studentDetailsFull.room?.roomNumber,
                          monthlyFee: studentDetailsFull.monthlyFee,
                          admissionDate: studentDetailsFull.admissionDate,
                          guardianName: guardian,
                          guardianPhone: guardianPh,
                          department: dept,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-700 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admission Slip (PDF)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {['admin', 'warden'].includes(activeRole) && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEdit(studentDetailsFull);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit Resident</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleOpenDelete(studentDetailsFull);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Vacate / Delete</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailModalOpen(false)}
                        className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                      >
                        Close Panel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. Edit Student Modal (Clean: 5 Requested Fields + Status)
         ======================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-serif font-bold text-white">
                    Edit Student
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                    {editFormData.admissionNumber}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Update student name, Gmail, phone, manual room number, or address.
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="mt-5 space-y-4">
              {/* 1. Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Student Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 2. Gmail */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Gmail / Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white font-mono rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 3. Phone & 4. Room No (Manual text input) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Room No (Manual)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Type room</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, A-102"
                    value={editFormData.roomNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, roomNumber: e.target.value })}
                    className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* 5. Address */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Monthly Fee Rate (Editable) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>Monthly Fee Rate (Numeric)</span>
                  <span className="text-[10px] text-amber-400 font-normal">Customizable per student</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editFormData.monthlyFee}
                  onChange={(e) => setEditFormData({ ...editFormData, monthlyFee: e.target.value })}
                  placeholder="500.00"
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              {/* Residency Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Residency Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  className="w-full text-xs p-2.5 bg-zinc-950 border border-zinc-700 text-white rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active (Enrolled)</option>
                  <option value="vacated">Vacated (Left)</option>
                  <option value="suspended">Suspended / On Leave</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          5. Delete Student Everywhere Confirmation Modal
         ======================================================== */}
      {deleteModalOpen && studentToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-rose-500">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h2 className="text-base font-serif font-bold text-white">Delete Student Everywhere</h2>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                <span className="text-zinc-500 block">Student to Remove:</span>
                <span className="font-bold text-white text-base block mt-0.5">
                  {studentToDelete.firstName} {studentToDelete.lastName}
                </span>
                <span className="font-mono text-zinc-400 text-xs block mt-1">
                  Admission ID: {studentToDelete.admissionNumber} {studentToDelete.room ? `• Room ${studentToDelete.room.roomNumber}` : ''}
                </span>
              </div>

              <div className="p-3.5 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs text-rose-200/90 leading-relaxed">
                <p className="font-semibold text-rose-300 mb-1">Permanent Deletion from Everywhere</p>
                Deleting this student will completely remove their records from everywhere:
                <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-rose-300/80">
                  <li>Student profile and contact info</li>
                  <li>Invoices and fee obligations</li>
                  <li>Automated Gmail reminders queue</li>
                  <li>Dashboard metrics & recent transactions</li>
                  <li>Payment receipts and ledger history</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleConfirmDelete(true)}
                  className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Student Everywhere'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
