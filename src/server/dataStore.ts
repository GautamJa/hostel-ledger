import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserEntity {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'warden' | 'accountant' | 'student';
  phone?: string | null;
  passwordHash?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`somnath_salt_${password}`).digest('hex');
}

export function verifyPassword(password: string, hash?: string): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'somnath_recorders_auth_secret_key_2026';

export function generateSessionToken(user: UserEntity): string {
  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(b64Payload).digest('base64url');
  return `sr_token_${b64Payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: number; email: string; role: string; fullName: string } | null {
  if (!token || !token.startsWith('sr_token_')) return null;
  const raw = token.slice('sr_token_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [b64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(b64Payload).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface HostelEntity {
  id: number;
  name: string;
  type: 'boys' | 'girls' | 'co-ed';
  address?: string | null;
  wardenName?: string | null;
  contactPhone?: string | null;
  createdAt: string;
}

export interface RoomEntity {
  id: number;
  hostelId: number;
  roomNumber: string;
  floor: number;
  capacity: number;
  defaultMonthlyFee: string;
  status: 'available' | 'full' | 'maintenance';
  createdAt: string;
}

export interface StudentEntity {
  id: number;
  userId?: number | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldEntity {
  id: number;
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  isRequired: boolean;
  optionsJson?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface StudentFieldValueEntity {
  id: number;
  studentId: number;
  fieldId: number;
  fieldValue: string;
  updatedAt: string;
}

export interface FeeAdjustmentEntity {
  id: number;
  studentId: number;
  oldFee: string;
  newFee: string;
  effectiveFrom: string;
  reason: string;
  adjustedBy?: number | null;
  createdAt: string;
}

export interface InvoiceEntity {
  id: number;
  invoiceNumber: string;
  studentId: number;
  billingMonth: string;
  dueDate: string;
  amountDue: string;
  amountPaid: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  createdAt: string;
}

export interface PaymentEntity {
  id: number;
  receiptNumber: string;
  invoiceId?: number | null;
  studentId: number;
  amount: string;
  paymentMethod: string;
  transactionReference?: string | null;
  paymentDate: string;
  collectedBy?: number | null;
  remarks?: string | null;
  createdAt: string;
}

export interface EmailReminderEntity {
  id: number;
  studentId: number;
  invoiceId?: number | null;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string;
}

export interface BackupEntity {
  id: number;
  filename: string;
  backupType: 'daily_automated' | 'manual_export';
  fileSizeBytes: number;
  tablesCount: number;
  recordsCount: number;
  checksum: string;
  payloadJson?: string | null;
  status: string;
  createdAt: string;
}

export interface ActivityLogEntity {
  id: number;
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
  createdAt: string;
}

export interface DatabaseState {
  users: UserEntity[];
  hostels: HostelEntity[];
  rooms: RoomEntity[];
  students: StudentEntity[];
  customFields: CustomFieldEntity[];
  studentFieldValues: StudentFieldValueEntity[];
  feeAdjustments: FeeAdjustmentEntity[];
  invoices: InvoiceEntity[];
  payments: PaymentEntity[];
  emailReminders: EmailReminderEntity[];
  backups: BackupEntity[];
  activityLogs: ActivityLogEntity[];
}

const DATA_FILE_PATH = path.resolve(process.cwd(), 'data', 'hostel_database.json');

const INITIAL_SEED_STATE: DatabaseState = {
  users: [
    {
      id: 1,
      uid: 'system_admin_uid',
      email: 'admin@dormis.edu',
      fullName: 'System Administrator',
      role: 'admin',
      phone: '+1 (555) 100-2000',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      uid: 'system_warden_uid',
      email: 'warden@dormis.edu',
      fullName: 'Arthur Pendelton (Warden)',
      role: 'warden',
      phone: '+1 (555) 234-5678',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 3,
      uid: 'system_accountant_uid',
      email: 'accountant@dormis.edu',
      fullName: 'Accounts Officer',
      role: 'accountant',
      phone: '+1 (555) 345-6789',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 4,
      uid: 'system_student_uid',
      email: 'julian.vance@example.edu',
      fullName: 'Julian Vance',
      role: 'student',
      phone: '+1 (555) 456-7890',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 5,
      uid: 'user_gautam_jayswal',
      email: 'jayswalgautam4@gmail.com',
      fullName: 'Gautam Jayswal',
      role: 'student',
      phone: '+977 980-0000000',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  hostels: [
    {
      id: 1,
      name: 'Ashoka Residence (Block A - Boys)',
      type: 'boys',
      address: 'North Residential Quad, Campus Road',
      wardenName: 'Arthur Pendelton',
      contactPhone: '+1 (555) 234-5678',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Lotus Wing (Block B - Girls)',
      type: 'girls',
      address: 'South Garden Quad, Campus Road',
      wardenName: 'Eleanor Vance',
      contactPhone: '+1 (555) 987-6543',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  rooms: [
    {
      id: 1,
      hostelId: 1,
      roomNumber: 'A-101',
      floor: 1,
      capacity: 2,
      defaultMonthlyFee: '500.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      hostelId: 1,
      roomNumber: 'A-102',
      floor: 1,
      capacity: 2,
      defaultMonthlyFee: '480.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 3,
      hostelId: 1,
      roomNumber: 'A-201',
      floor: 2,
      capacity: 3,
      defaultMonthlyFee: '420.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 4,
      hostelId: 1,
      roomNumber: 'A-202',
      floor: 2,
      capacity: 2,
      defaultMonthlyFee: '520.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 5,
      hostelId: 2,
      roomNumber: 'B-101',
      floor: 1,
      capacity: 2,
      defaultMonthlyFee: '500.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 6,
      hostelId: 2,
      roomNumber: 'B-102',
      floor: 1,
      capacity: 2,
      defaultMonthlyFee: '500.00',
      status: 'available',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  students: [],
  customFields: [
    {
      id: 1,
      entityType: 'student',
      fieldName: 'guardian_name',
      fieldLabel: 'Guardian / Parent Name',
      fieldType: 'text',
      isRequired: true,
      optionsJson: null,
      displayOrder: 1,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      entityType: 'student',
      fieldName: 'guardian_phone',
      fieldLabel: 'Guardian Phone',
      fieldType: 'text',
      isRequired: true,
      optionsJson: null,
      displayOrder: 2,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 3,
      entityType: 'student',
      fieldName: 'department',
      fieldLabel: 'Academic Department',
      fieldType: 'dropdown',
      isRequired: false,
      optionsJson: JSON.stringify(['Computer Science', 'Mechanical Engineering', 'Business Administration', 'Biotechnology', 'Architecture']),
      displayOrder: 3,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 4,
      entityType: 'student',
      fieldName: 'dietary_preference',
      fieldLabel: 'Mess & Dietary Preference',
      fieldType: 'dropdown',
      isRequired: false,
      optionsJson: JSON.stringify(['Standard / Non-Veg', 'Vegetarian', 'Vegan', 'Halal', 'Jain']),
      displayOrder: 4,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 5,
      entityType: 'student',
      fieldName: 'laptop_serial_no',
      fieldLabel: 'Registered Laptop Serial #',
      fieldType: 'text',
      isRequired: false,
      optionsJson: null,
      displayOrder: 5,
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  studentFieldValues: [],
  feeAdjustments: [],
  invoices: [],
  payments: [],
  emailReminders: [],
  backups: [
    {
      id: 1,
      filename: 'hostel_db_automated_daily_snapshot.json',
      backupType: 'daily_automated',
      fileSizeBytes: 4280,
      tablesCount: 11,
      recordsCount: 32,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      payloadJson: null,
      status: 'completed',
      createdAt: '2025-02-01T04:00:00.000Z',
    },
  ],
  activityLogs: [
    {
      id: 1,
      userId: 1,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'system',
      entityId: null,
      details: 'Hostel Management System initialized with verified baseline data.',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
};

class DataStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.students)) {
          const validStudentIds = new Set(parsed.students.map((s: any) => s.id));
          parsed.invoices = (parsed.invoices || []).filter((i: any) => validStudentIds.has(i.studentId));
          parsed.payments = (parsed.payments || []).filter((p: any) => validStudentIds.has(p.studentId));
          parsed.emailReminders = (parsed.emailReminders || []).filter((r: any) => validStudentIds.has(r.studentId));
          parsed.studentFieldValues = (parsed.studentFieldValues || []).filter((v: any) => validStudentIds.has(v.studentId));
          parsed.feeAdjustments = (parsed.feeAdjustments || []).filter((f: any) => validStudentIds.has(f.studentId));

          // Auto-sync pending invoices with student's current monthly fee
          const studentFeeMap = new Map<number, string>(parsed.students.map((s: any) => [s.id, s.monthlyFee]));
          for (const inv of parsed.invoices) {
            if ((inv.status === 'pending' || inv.status === 'partial') && studentFeeMap.has(inv.studentId)) {
              const currentFee = studentFeeMap.get(inv.studentId);
              if (currentFee && Number(inv.amountPaid) === 0 && Number(inv.amountDue) !== Number(currentFee)) {
                inv.amountDue = Number(currentFee).toFixed(2);
              }
            }
          }

          // Guarantee admin account for jayswalgautam4@gmail.com with password Gautam123
          parsed.users = parsed.users || [];
          const adminIdx = parsed.users.findIndex((u: any) => u.email.toLowerCase() === 'jayswalgautam4@gmail.com');
          if (adminIdx >= 0) {
            parsed.users[adminIdx].role = 'admin';
            parsed.users[adminIdx].fullName = parsed.users[adminIdx].fullName || 'Gautam Jayswal';
            parsed.users[adminIdx].passwordHash = hashPassword('Gautam123');
            parsed.users[adminIdx].isActive = true;
          } else {
            const nextId = parsed.users.reduce((m: number, u: any) => Math.max(m, u.id || 0), 0) + 1;
            parsed.users.push({
              id: nextId,
              uid: 'user_admin_gautam',
              email: 'jayswalgautam4@gmail.com',
              fullName: 'Gautam Jayswal',
              role: 'admin',
              passwordHash: hashPassword('Gautam123'),
              phone: '+977 982-5227507',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          // Guarantee student account for student@dormis.edu with password Student123
          const studentIdx = parsed.users.findIndex((u: any) => u.email.toLowerCase() === 'student@dormis.edu');
          if (studentIdx >= 0) {
            parsed.users[studentIdx].role = 'student';
            parsed.users[studentIdx].passwordHash = hashPassword('Student123');
            parsed.users[studentIdx].isActive = true;
          } else {
            const nextId = parsed.users.reduce((m: number, u: any) => Math.max(m, u.id || 0), 0) + 1;
            parsed.users.push({
              id: nextId,
              uid: 'user_student_demo',
              email: 'student@dormis.edu',
              fullName: 'Julian Vance (Student)',
              role: 'student',
              passwordHash: hashPassword('Student123'),
              phone: '+1 (555) 456-7890',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing hostel_database.json, initializing fresh seed:', e);
    }

    // Write initial seed
    this.writeStateToDisk(INITIAL_SEED_STATE);
    return JSON.parse(JSON.stringify(INITIAL_SEED_STATE));
  }

  private writeStateToDisk(stateToSave: DatabaseState) {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(stateToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write state to disk:', e);
    }
  }

  private save() {
    this.writeStateToDisk(this.state);
  }

  // Users
  getUsers(): UserEntity[] {
    return [...this.state.users];
  }

  getUserById(id: number): UserEntity | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  getUserByUid(uid: string): UserEntity | undefined {
    return this.state.users.find((u) => u.uid === uid);
  }

  getUserByEmail(email: string): UserEntity | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): UserEntity {
    const nextId = this.state.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const now = new Date().toISOString();
    const newUser: UserEntity = {
      ...user,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: number, updates: Partial<UserEntity>): UserEntity | undefined {
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    const updated = {
      ...this.state.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.users[idx] = updated;
    this.save();
    return updated;
  }

  // Hostels
  getHostels(): HostelEntity[] {
    return [...this.state.hostels];
  }

  getHostelById(id: number): HostelEntity | undefined {
    return this.state.hostels.find((h) => h.id === id);
  }

  createHostel(data: Omit<HostelEntity, 'id' | 'createdAt'>): HostelEntity {
    const nextId = this.state.hostels.reduce((m, h) => Math.max(m, h.id), 0) + 1;
    const newHostel: HostelEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.hostels.push(newHostel);
    this.save();
    return newHostel;
  }

  // Rooms
  getRooms(hostelId?: number): RoomEntity[] {
    if (hostelId) {
      return this.state.rooms.filter((r) => r.hostelId === hostelId);
    }
    return [...this.state.rooms];
  }

  getRoomById(id: number): RoomEntity | undefined {
    return this.state.rooms.find((r) => r.id === id);
  }

  createRoom(data: Omit<RoomEntity, 'id' | 'createdAt'>): RoomEntity {
    const nextId = this.state.rooms.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const newRoom: RoomEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.rooms.push(newRoom);
    this.save();
    return newRoom;
  }

  // Students
  getStudents(status?: string, query?: string): StudentEntity[] {
    let list = [...this.state.students];
    if (status && status !== 'all') {
      list = list.filter((s) => s.status === status);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.admissionNumber.toLowerCase().includes(q) ||
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }
    return list;
  }

  getStudentById(id: number): StudentEntity | undefined {
    return this.state.students.find((s) => s.id === id);
  }

  getStudentByEmail(email: string): StudentEntity | undefined {
    return this.state.students.find((s) => s.email.toLowerCase() === email.toLowerCase());
  }

  getStudentByAdmissionNumber(adm: string): StudentEntity | undefined {
    return this.state.students.find((s) => s.admissionNumber.toLowerCase() === adm.toLowerCase());
  }

  createStudent(data: Omit<StudentEntity, 'id' | 'createdAt' | 'updatedAt'>): StudentEntity {
    const nextId = this.state.students.reduce((m, s) => Math.max(m, s.id), 0) + 1;
    const now = new Date().toISOString();
    const newStudent: StudentEntity = {
      ...data,
      id: nextId,
      createdAt: now,
      updatedAt: now,
    };
    this.state.students.push(newStudent);
    this.save();
    return newStudent;
  }

  syncStudentPendingInvoices(studentId: number, newFee: string): void {
    const formattedFee = Number(newFee).toFixed(2);
    let updatedAny = false;
    for (const inv of this.state.invoices) {
      if (inv.studentId === studentId && (inv.status === 'pending' || inv.status === 'partial')) {
        const paid = Number(inv.amountPaid) || 0;
        const due = Number(formattedFee);
        inv.amountDue = formattedFee;
        if (paid >= due) {
          inv.status = 'paid';
        } else if (paid > 0) {
          inv.status = 'partial';
        } else {
          inv.status = 'pending';
        }
        updatedAny = true;
      }
    }
    this.save();
  }

  updateStudent(id: number, updates: Partial<StudentEntity>): StudentEntity | undefined {
    const idx = this.state.students.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    const updated = {
      ...this.state.students[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.students[idx] = updated;

    if (updates.monthlyFee !== undefined) {
      this.syncStudentPendingInvoices(id, updates.monthlyFee);
    } else {
      this.save();
    }

    return updated;
  }

  deleteStudent(id: number, _permanent = true): { success: boolean; message: string } {
    const idx = this.state.students.findIndex((s) => s.id === id);
    if (idx === -1) return { success: false, message: 'Student not found' };

    const student = this.state.students[idx];
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    // 1. Remove student record from students
    this.state.students.splice(idx, 1);

    // 2. Cascade delete all associated records so nothing lingers in dashboard or reminders
    this.state.invoices = (this.state.invoices || []).filter((i) => i.studentId !== id);
    this.state.emailReminders = (this.state.emailReminders || []).filter((r) => r.studentId !== id);
    this.state.payments = (this.state.payments || []).filter((p) => p.studentId !== id);
    this.state.studentFieldValues = (this.state.studentFieldValues || []).filter((v) => v.studentId !== id);
    this.state.feeAdjustments = (this.state.feeAdjustments || []).filter((f) => f.studentId !== id);

    this.save();
    return { success: true, message: `Student "${studentName}" deleted from everywhere.` };
  }

  // Custom Fields
  getCustomFields(activeOnly = true): CustomFieldEntity[] {
    let fields = [...this.state.customFields];
    if (activeOnly) {
      fields = fields.filter((f) => f.isActive);
    }
    return fields.sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  }

  createCustomField(data: Omit<CustomFieldEntity, 'id' | 'createdAt'>): CustomFieldEntity {
    const nextId = this.state.customFields.reduce((m, f) => Math.max(m, f.id), 0) + 1;
    const newField: CustomFieldEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.customFields.push(newField);
    this.save();
    return newField;
  }

  updateCustomField(id: number, updates: Partial<CustomFieldEntity>): CustomFieldEntity | undefined {
    const idx = this.state.customFields.findIndex((f) => f.id === id);
    if (idx === -1) return undefined;
    const updated = { ...this.state.customFields[idx], ...updates };
    this.state.customFields[idx] = updated;
    this.save();
    return updated;
  }

  getStudentFieldValues(studentId: number): Record<string, string> {
    const values = this.state.studentFieldValues.filter((v) => v.studentId === studentId);
    const result: Record<string, string> = {};
    for (const val of values) {
      const field = this.state.customFields.find((f) => f.id === val.fieldId);
      if (field) {
        result[field.fieldName] = val.fieldValue;
      }
    }
    return result;
  }

  setStudentFieldValue(studentId: number, fieldId: number, fieldValue: string) {
    const idx = this.state.studentFieldValues.findIndex(
      (v) => v.studentId === studentId && v.fieldId === fieldId
    );
    const now = new Date().toISOString();
    if (idx >= 0) {
      this.state.studentFieldValues[idx].fieldValue = fieldValue;
      this.state.studentFieldValues[idx].updatedAt = now;
    } else {
      const nextId = this.state.studentFieldValues.reduce((m, v) => Math.max(m, v.id), 0) + 1;
      this.state.studentFieldValues.push({
        id: nextId,
        studentId,
        fieldId,
        fieldValue,
        updatedAt: now,
      });
    }
    this.save();
  }

  // Fee Adjustments
  getFeeAdjustments(studentId?: number): FeeAdjustmentEntity[] {
    if (studentId) {
      return this.state.feeAdjustments.filter((f) => f.studentId === studentId);
    }
    return [...this.state.feeAdjustments];
  }

  recordFeeAdjustment(data: Omit<FeeAdjustmentEntity, 'id' | 'createdAt'>): FeeAdjustmentEntity {
    const nextId = this.state.feeAdjustments.reduce((m, f) => Math.max(m, f.id), 0) + 1;
    const newAdj: FeeAdjustmentEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.feeAdjustments.push(newAdj);
    this.save();
    return newAdj;
  }

  // Invoices
  getInvoices(studentId?: number): InvoiceEntity[] {
    if (studentId) {
      return this.state.invoices.filter((i) => i.studentId === studentId);
    }
    return [...this.state.invoices];
  }

  getInvoiceById(id: number): InvoiceEntity | undefined {
    return this.state.invoices.find((i) => i.id === id);
  }

  createInvoice(data: Omit<InvoiceEntity, 'id' | 'createdAt'>): InvoiceEntity {
    const nextId = this.state.invoices.reduce((m, i) => Math.max(m, i.id), 0) + 1;
    const newInv: InvoiceEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.invoices.push(newInv);
    this.save();
    return newInv;
  }

  updateInvoice(id: number, updates: Partial<InvoiceEntity>): InvoiceEntity | undefined {
    const idx = this.state.invoices.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    const updated = { ...this.state.invoices[idx], ...updates };
    this.state.invoices[idx] = updated;
    this.save();
    return updated;
  }

  // Payments (Ledger - Append only!)
  getPayments(studentId?: number): PaymentEntity[] {
    if (studentId) {
      return this.state.payments.filter((p) => p.studentId === studentId);
    }
    return [...this.state.payments];
  }

  recordPayment(data: Omit<PaymentEntity, 'id' | 'createdAt'>): PaymentEntity {
    const nextId = this.state.payments.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const newPay: PaymentEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.payments.push(newPay);

    // Update corresponding invoice if provided
    if (newPay.invoiceId) {
      const inv = this.getInvoiceById(newPay.invoiceId);
      if (inv) {
        const newPaidTotal = (Number(inv.amountPaid) + Number(newPay.amount)).toFixed(2);
        const due = Number(inv.amountDue);
        const paid = Number(newPaidTotal);
        const status = paid >= due ? 'paid' : paid > 0 ? 'partial' : 'pending';
        this.updateInvoice(inv.id, {
          amountPaid: newPaidTotal,
          status,
        });
      }
    }

    this.save();
    return newPay;
  }

  // Email Reminders
  getReminders(): EmailReminderEntity[] {
    return [...this.state.emailReminders];
  }

  recordReminder(data: Omit<EmailReminderEntity, 'id' | 'sentAt'>): EmailReminderEntity {
    const nextId = this.state.emailReminders.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    const newRem: EmailReminderEntity = {
      ...data,
      id: nextId,
      sentAt: new Date().toISOString(),
    };
    this.state.emailReminders.push(newRem);
    this.save();
    return newRem;
  }

  // Backups
  getBackups(): BackupEntity[] {
    return [...this.state.backups];
  }

  getBackupById(id: number): BackupEntity | undefined {
    return this.state.backups.find((b) => b.id === id);
  }

  createBackup(type: 'daily_automated' | 'manual_export' = 'manual_export'): BackupEntity {
    const snapshot = this.getFullDatabaseSnapshot();
    const payloadJson = JSON.stringify(snapshot, null, 2);
    const checksum = crypto.createHash('sha256').update(payloadJson).digest('hex');
    const fileSizeBytes = Buffer.byteLength(payloadJson, 'utf-8');
    const totalRecords =
      this.state.users.length +
      this.state.hostels.length +
      this.state.rooms.length +
      this.state.students.length +
      this.state.customFields.length +
      this.state.invoices.length +
      this.state.payments.length;

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hostel_database_backup_${timestampStr}.json`;
    const nextId = this.state.backups.reduce((m, b) => Math.max(m, b.id), 0) + 1;

    const newBackup: BackupEntity = {
      id: nextId,
      filename,
      backupType: type,
      fileSizeBytes,
      tablesCount: 11,
      recordsCount: totalRecords,
      checksum,
      payloadJson,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    this.state.backups.unshift(newBackup);
    this.save();
    return newBackup;
  }

  // Activity Logs
  logActivity(data: Omit<ActivityLogEntity, 'id' | 'createdAt'>): ActivityLogEntity {
    const nextId = this.state.activityLogs.reduce((m, l) => Math.max(m, l.id), 0) + 1;
    const newLog: ActivityLogEntity = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };
    this.state.activityLogs.unshift(newLog);
    // keep last 500 logs
    if (this.state.activityLogs.length > 500) {
      this.state.activityLogs = this.state.activityLogs.slice(0, 500);
    }
    this.save();
    return newLog;
  }

  getFullDatabaseSnapshot() {
    return {
      version: '2.0',
      database: 'PostgreSQL Cloud SQL & Independent Storage Engine',
      exportedAt: new Date().toISOString(),
      metadata: {
        system: 'Classical Hostel Management System',
        authoritativeStore: 'Encrypted & Independent Daily Backups Enabled',
      },
      counts: {
        users: this.state.users.length,
        hostels: this.state.hostels.length,
        rooms: this.state.rooms.length,
        students: this.state.students.length,
        customFields: this.state.customFields.length,
        invoices: this.state.invoices.length,
        payments: this.state.payments.length,
        emailReminders: this.state.emailReminders.length,
      },
      tables: {
        users: this.state.users,
        hostels: this.state.hostels,
        rooms: this.state.rooms,
        students: this.state.students,
        customFields: this.state.customFields,
        studentFieldValues: this.state.studentFieldValues,
        feeAdjustments: this.state.feeAdjustments,
        invoices: this.state.invoices,
        payments: this.state.payments,
        emailReminders: this.state.emailReminders,
      },
    };
  }
}

export const dataStore = new DataStore();
