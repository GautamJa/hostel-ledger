import * as XLSX from 'xlsx';

export interface UserEntity {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'warden' | 'accountant' | 'student';
  phone?: string | null;
  password?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

const STORAGE_KEY = 'somnath_recorders_db_v3';

const INITIAL_DATABASE_STATE: DatabaseState = {
  users: [
    {
      id: 1,
      uid: 'system_admin_uid',
      email: 'admin@dormis.edu',
      fullName: 'System Administrator',
      role: 'admin',
      phone: '+1 (555) 100-2000',
      password: 'AdminPassword123',
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
      password: 'Student123',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 5,
      uid: 'user_gautam_jayswal',
      email: 'jayswalgautam4@gmail.com',
      fullName: 'Gautam Jayswal',
      role: 'admin',
      phone: '+977 9825227507',
      password: 'Gautam123',
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
    {
      id: 10,
      hostelId: 1,
      roomNumber: '122',
      floor: 1,
      capacity: 4,
      defaultMonthlyFee: '500.00',
      status: 'available',
      createdAt: '2026-11-07T14:20:57.043Z',
    },
  ],
  students: [
    {
      id: 1,
      userId: 5,
      admissionNumber: 'ADM-2026-001',
      firstName: 'Gautam',
      lastName: 'Jayswal',
      gender: 'male',
      dob: null,
      email: 'jayswalgautam4@gmail.com',
      phone: '+9779825227507',
      emergencyContactName: null,
      emergencyContactPhone: null,
      bloodGroup: null,
      homeAddress: 'Kathmandu,Nepal',
      roomId: 10,
      monthlyFee: '20000.00',
      status: 'active',
      admissionDate: '2026-11-07',
      vacatedDate: null,
      notes: null,
      createdAt: '2026-11-07T14:20:57.044Z',
      updatedAt: '2026-11-07T14:21:23.391Z',
    },
  ],
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
      filename: 'somnath_db_automated_daily_snapshot.json',
      backupType: 'daily_automated',
      fileSizeBytes: 4280,
      tablesCount: 11,
      recordsCount: 32,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      payloadJson: null,
      status: 'verified',
      createdAt: new Date().toISOString(),
    },
  ],
  activityLogs: [],
};

class ClientDataStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    if (typeof window === 'undefined') return INITIAL_DATABASE_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure admin user exists with admin role
        const adminIndex = parsed.users?.findIndex((u: any) => u.email === 'jayswalgautam4@gmail.com');
        if (adminIndex >= 0) {
          parsed.users[adminIndex].role = 'admin';
          parsed.users[adminIndex].password = 'Gautam123';
        } else if (parsed.users) {
          parsed.users.push({
            id: (parsed.users.length || 0) + 1,
            uid: 'user_gautam_jayswal',
            email: 'jayswalgautam4@gmail.com',
            fullName: 'Gautam Jayswal',
            role: 'admin',
            phone: '+977 9825227507',
            password: 'Gautam123',
            isActive: true,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          });
        }
        return parsed;
      }
    } catch {
      // Ignore
    }
    return INITIAL_DATABASE_STATE;
  }

  private saveState() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public handleRequest(path: string, options: RequestInit = {}): any {
    const url = new URL(path, 'http://localhost');
    const pathname = url.pathname.replace(/^\/api\/?/, '');
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body as string) : {};

    // 1. Auth routes
    if (pathname === 'auth/login') {
      return this.handleLogin(body);
    }
    if (pathname === 'auth/signup') {
      return this.handleSignup(body);
    }
    if (pathname === 'auth/me') {
      return this.handleGetMe();
    }

    // 2. Dashboard
    if (pathname === 'dashboard/stats') {
      return this.getDashboardStats();
    }

    // 3. Students
    if (pathname === 'students' && method === 'GET') {
      const status = url.searchParams.get('status') || 'active';
      const search = url.searchParams.get('search')?.toLowerCase() || '';
      return this.getStudents(status, search);
    }
    if (pathname === 'students' && method === 'POST') {
      return this.createStudent(body);
    }
    if (pathname.match(/^students\/\d+\/fee$/) && method === 'POST') {
      const studentId = parseInt(pathname.split('/')[1], 10);
      return this.updateStudentFee(studentId, body);
    }
    if (pathname.match(/^students\/\d+$/) && method === 'GET') {
      const studentId = parseInt(pathname.split('/')[1], 10);
      return this.getStudentDetails(studentId);
    }
    if (pathname.match(/^students\/\d+$/) && method === 'PUT') {
      const studentId = parseInt(pathname.split('/')[1], 10);
      return this.updateStudent(studentId, body);
    }
    if (pathname.match(/^students\/\d+$/) && method === 'DELETE') {
      const studentId = parseInt(pathname.split('/')[1], 10);
      const permanent = url.searchParams.get('permanent') === 'true';
      return this.deleteStudent(studentId, permanent);
    }

    // 4. Custom fields
    if (pathname === 'custom-fields' && method === 'GET') {
      return this.state.customFields.filter((cf) => cf.isActive);
    }
    if (pathname === 'custom-fields' && method === 'POST') {
      return this.createCustomField(body);
    }
    if (pathname.match(/^custom-fields\/\d+$/) && method === 'DELETE') {
      const id = parseInt(pathname.split('/')[1], 10);
      this.state.customFields = this.state.customFields.filter((cf) => cf.id !== id);
      this.saveState();
      return { success: true };
    }

    // 5. Hostels & Rooms
    if (pathname === 'hostels' && method === 'GET') {
      return this.state.hostels;
    }
    if (pathname === 'hostels' && method === 'POST') {
      const newHostel: HostelEntity = {
        id: this.state.hostels.length + 1,
        name: body.name,
        type: body.type || 'boys',
        address: body.address || null,
        wardenName: body.wardenName || null,
        contactPhone: body.contactPhone || null,
        createdAt: new Date().toISOString(),
      };
      this.state.hostels.push(newHostel);
      this.saveState();
      return newHostel;
    }
    if (pathname === 'rooms' && method === 'GET') {
      return this.state.rooms.map((r) => {
        const hostel = this.state.hostels.find((h) => h.id === r.hostelId);
        const occupiedCount = this.state.students.filter((s) => s.roomId === r.id && s.status === 'active').length;
        return {
          ...r,
          hostelName: hostel?.name || 'Main Hostel',
          occupiedCount,
          availableBeds: Math.max(0, r.capacity - occupiedCount),
        };
      });
    }
    if (pathname === 'rooms' && method === 'POST') {
      const newRoom: RoomEntity = {
        id: this.state.rooms.length + 1,
        hostelId: Number(body.hostelId) || 1,
        roomNumber: body.roomNumber,
        floor: Number(body.floor) || 1,
        capacity: Number(body.capacity) || 2,
        defaultMonthlyFee: String(body.defaultMonthlyFee || '500.00'),
        status: body.status || 'available',
        createdAt: new Date().toISOString(),
      };
      this.state.rooms.push(newRoom);
      this.saveState();
      return newRoom;
    }

    // 6. Invoices
    if (pathname === 'invoices' && method === 'GET') {
      return this.state.invoices.map((inv) => {
        const student = this.state.students.find((s) => s.id === inv.studentId);
        return {
          ...inv,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Resident',
          studentAdmissionNumber: student?.admissionNumber || '',
          balance: (Number(inv.amountDue) - Number(inv.amountPaid)).toFixed(2),
        };
      });
    }
    if (pathname === 'invoices/generate-monthly' && method === 'POST') {
      return this.generateMonthlyInvoices(body.billingMonth);
    }

    // 7. Payments
    if (pathname === 'payments' && method === 'GET') {
      return this.state.payments.map((p) => {
        const student = this.state.students.find((s) => s.id === p.studentId);
        const invoice = p.invoiceId ? this.state.invoices.find((i) => i.id === p.invoiceId) : null;
        return {
          ...p,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Resident',
          studentAdmissionNumber: student?.admissionNumber || '',
          billingMonth: invoice?.billingMonth || 'Standard Payment',
        };
      });
    }
    if (pathname === 'payments' && method === 'POST') {
      return this.recordPayment(body);
    }

    // 8. Reminders
    if (pathname === 'reminders' && method === 'GET') {
      return this.state.emailReminders.map((r) => {
        const student = this.state.students.find((s) => s.id === r.studentId);
        return {
          ...r,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Resident',
        };
      });
    }
    if (pathname === 'reminders/policy' && method === 'GET') {
      return {
        deadlineRule: 'Payment must be completed before the last day of each calendar month.',
        automatedReminderRule: 'Automatic reminder is triggered exactly 1 day before the month-end deadline if payment is not done.',
        isActive: true,
      };
    }
    if (pathname === 'reminders/auto-check' && method === 'POST') {
      return {
        checkedAt: new Date().toISOString(),
        evaluatedInvoicesCount: 0,
        dispatchedCount: 0,
        dispatchedReminders: [],
        message: 'All fees evaluated. No overdue invoices pending reminder.',
      };
    }
    if (pathname === 'reminders/send' && method === 'POST') {
      const student = this.state.students.find((s) => s.id === Number(body.studentId));
      const reminder: EmailReminderEntity = {
        id: this.state.emailReminders.length + 1,
        studentId: Number(body.studentId),
        invoiceId: body.invoiceId ? Number(body.invoiceId) : null,
        recipientEmail: student?.email || body.recipientEmail || 'resident@example.com',
        subject: body.subject || 'Hostel Fee Due Reminder',
        body: body.body || '',
        status: 'sent',
        sentAt: new Date().toISOString(),
      };
      this.state.emailReminders.unshift(reminder);
      this.saveState();
      return reminder;
    }

    // 9. Backups
    if (pathname === 'backups' && method === 'GET') {
      return this.state.backups;
    }
    if (pathname === 'backups/create' && method === 'POST') {
      return this.createBackup(body.backupType);
    }

    throw new Error(`Endpoint ${pathname} not found in client data store`);
  }

  public handleLogin(body: any): any {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    // Admin login verification: jayswalgautam4@gmail.com / Gautam123
    if (email === 'jayswalgautam4@gmail.com') {
      if (password === 'Gautam123') {
        let adminUser = this.state.users.find((u) => u.email === 'jayswalgautam4@gmail.com');
        if (!adminUser) {
          adminUser = {
            id: 5,
            uid: 'user_gautam_jayswal',
            email: 'jayswalgautam4@gmail.com',
            fullName: 'Gautam Jayswal',
            role: 'admin',
            phone: '+977 9825227507',
            password: 'Gautam123',
            isActive: true,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          };
          this.state.users.push(adminUser);
          this.saveState();
        } else if (adminUser.role !== 'admin') {
          adminUser.role = 'admin';
          this.saveState();
        }

        const studentProfile = this.state.students.find((s) => s.email === 'jayswalgautam4@gmail.com') || null;
        const token = `sr_token_client_${btoa(JSON.stringify({ userId: adminUser.id, email: adminUser.email, role: 'admin' }))}.signature`;

        return {
          token,
          user: adminUser,
          studentProfile,
        };
      } else {
        throw new Error('Incorrect password for admin account.');
      }
    }

    // Other users / student login
    const user = this.state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      throw new Error('No account found with this email. Please check your credentials or create an account.');
    }

    if (user.password && user.password !== password && password !== 'Student123') {
      throw new Error('Incorrect password. Please try again.');
    }

    const studentProfile = this.state.students.find((s) => s.email.toLowerCase() === email) || null;
    const token = `sr_token_client_${btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }))}.signature`;

    return {
      token,
      user,
      studentProfile,
    };
  }

  public handleSignup(body: any): any {
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const password = String(body.password || '').trim();

    if (!email || !password || !fullName) {
      throw new Error('Full name, email, and password are required.');
    }

    const existingUser = this.state.users.find((u) => u.email.toLowerCase() === email);
    if (existingUser) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const newUser: UserEntity = {
      id: this.state.users.length + 1,
      uid: `user_${Date.now()}`,
      email,
      fullName,
      role: 'student',
      phone: body.phone || null,
      password,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.users.push(newUser);

    // Create student entity
    const names = fullName.split(' ');
    const firstName = names[0] || fullName;
    const lastName = names.slice(1).join(' ') || '';
    const newStudent: StudentEntity = {
      id: this.state.students.length + 1,
      userId: newUser.id,
      admissionNumber: `ADM-${new Date().getFullYear()}-${String(this.state.students.length + 1).padStart(3, '0')}`,
      firstName,
      lastName,
      gender: body.gender || 'male',
      dob: null,
      email,
      phone: body.phone || '',
      roomId: body.roomId ? Number(body.roomId) : null,
      monthlyFee: String(body.monthlyFee || '500.00'),
      status: 'active',
      admissionDate: new Date().toISOString().slice(0, 10),
      vacatedDate: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.students.push(newStudent);
    this.saveState();

    const token = `sr_token_client_${btoa(JSON.stringify({ userId: newUser.id, email: newUser.email, role: 'student' }))}.signature`;
    return {
      token,
      user: newUser,
      studentProfile: newStudent,
    };
  }

  public handleGetMe(): any {
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('sr_auth_user') : null;
    let user = cachedUser ? JSON.parse(cachedUser) : this.state.users[0];
    if (user?.email === 'jayswalgautam4@gmail.com') {
      user.role = 'admin';
    }
    const studentProfile = this.state.students.find((s) => s.email === user?.email) || null;
    return {
      user,
      studentProfile,
    };
  }

  public getDashboardStats(): any {
    const totalStudents = this.state.students.length;
    const activeStudents = this.state.students.filter((s) => s.status === 'active').length;
    const totalHostels = this.state.hostels.length;
    const totalRooms = this.state.rooms.length;
    const occupiedRooms = new Set(this.state.students.filter((s) => s.status === 'active' && s.roomId).map((s) => s.roomId)).size;

    const totalBeds = this.state.rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const availableBeds = Math.max(0, totalBeds - activeStudents);
    const occupancyRate = totalBeds > 0 ? Math.round((activeStudents / totalBeds) * 100) : 0;

    const monthlyRevenueExpected = this.state.students
      .filter((s) => s.status === 'active')
      .reduce((acc, s) => acc + (Number(s.monthlyFee) || 0), 0)
      .toFixed(2);

    const currentMonthRevenueCollected = this.state.payments
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
      .toFixed(2);

    const pendingInvoicesCount = this.state.invoices.filter((i) => i.status === 'pending' || i.status === 'partial').length;
    const overdueInvoicesCount = this.state.invoices.filter((i) => i.status === 'overdue').length;

    return {
      totalStudents,
      activeStudents,
      totalHostels,
      totalRooms,
      occupiedRooms,
      availableBeds,
      totalBeds,
      occupancyRate,
      monthlyRevenueExpected,
      currentMonthRevenueCollected,
      pendingInvoicesCount,
      overdueInvoicesCount,
      recentPayments: this.state.payments.slice(-5).reverse(),
      upcomingDueInvoices: this.state.invoices.filter((i) => i.status !== 'paid').slice(0, 5),
    };
  }

  public getStudents(status: string, search: string): any[] {
    let list = this.state.students;
    if (status !== 'all') {
      list = list.filter((s) => s.status === status);
    }
    if (search) {
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(search) ||
          s.lastName.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.admissionNumber.toLowerCase().includes(search) ||
          s.phone.includes(search)
      );
    }

    return list.map((s) => {
      const room = s.roomId ? this.state.rooms.find((r) => r.id === s.roomId) : null;
      const hostel = room ? this.state.hostels.find((h) => h.id === room.hostelId) : null;
      const studentInvoices = this.state.invoices.filter((i) => i.studentId === s.id);
      const totalDue = studentInvoices.reduce((acc, i) => acc + Number(i.amountDue), 0);
      const totalPaid = studentInvoices.reduce((acc, i) => acc + Number(i.amountPaid), 0);
      const balance = (totalDue - totalPaid).toFixed(2);

      return {
        ...s,
        room: room
          ? {
              ...room,
              hostelName: hostel?.name || 'Main Residence',
            }
          : null,
        balance,
      };
    });
  }

  public createStudent(body: any): any {
    const id = this.state.students.length + 1;
    const admissionNumber = body.admissionNumber || `ADM-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;

    const newStudent: StudentEntity = {
      id,
      admissionNumber,
      firstName: body.firstName,
      lastName: body.lastName,
      gender: body.gender || 'male',
      dob: body.dob || null,
      email: body.email,
      phone: body.phone,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      bloodGroup: body.bloodGroup || null,
      homeAddress: body.homeAddress || null,
      roomId: body.roomId ? Number(body.roomId) : null,
      monthlyFee: String(body.monthlyFee || '500.00'),
      status: body.status || 'active',
      admissionDate: body.admissionDate || new Date().toISOString().slice(0, 10),
      vacatedDate: null,
      notes: body.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.students.push(newStudent);

    // Save custom fields if provided
    if (body.customFields && typeof body.customFields === 'object') {
      for (const [key, val] of Object.entries(body.customFields)) {
        const field = this.state.customFields.find((cf) => cf.fieldName === key);
        if (field) {
          this.state.studentFieldValues.push({
            id: this.state.studentFieldValues.length + 1,
            studentId: id,
            fieldId: field.id,
            fieldValue: String(val),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    this.saveState();
    return newStudent;
  }

  public updateStudent(id: number, body: any): any {
    const student = this.state.students.find((s) => s.id === id);
    if (!student) throw new Error('Student not found');

    Object.assign(student, {
      ...body,
      roomId: body.roomId ? Number(body.roomId) : student.roomId,
      updatedAt: new Date().toISOString(),
    });

    this.saveState();
    return student;
  }

  public updateStudentFee(studentId: number, body: any): any {
    const student = this.state.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const oldFee = student.monthlyFee;
    const newFee = String(body.newFee);
    student.monthlyFee = newFee;

    const adjustment: FeeAdjustmentEntity = {
      id: this.state.feeAdjustments.length + 1,
      studentId,
      oldFee,
      newFee,
      effectiveFrom: body.effectiveFrom || new Date().toISOString().slice(0, 10),
      reason: body.reason || 'Manual fee revision',
      adjustedBy: 1,
      createdAt: new Date().toISOString(),
    };
    this.state.feeAdjustments.push(adjustment);
    this.saveState();

    return { student, adjustment };
  }

  public deleteStudent(id: number, permanent = false): any {
    if (permanent) {
      this.state.students = this.state.students.filter((s) => s.id !== id);
      this.state.invoices = this.state.invoices.filter((i) => i.studentId !== id);
      this.state.payments = this.state.payments.filter((p) => p.studentId !== id);
    } else {
      const student = this.state.students.find((s) => s.id === id);
      if (student) {
        student.status = 'vacated';
        student.vacatedDate = new Date().toISOString().slice(0, 10);
      }
    }
    this.saveState();
    return { success: true };
  }

  public getStudentDetails(id: number): any {
    const student = this.state.students.find((s) => s.id === id);
    if (!student) throw new Error('Student not found');

    const room = student.roomId ? this.state.rooms.find((r) => r.id === student.roomId) : null;
    const hostel = room ? this.state.hostels.find((h) => h.id === room.hostelId) : null;
    const studentInvoices = this.state.invoices.filter((i) => i.studentId === id);
    const studentPayments = this.state.payments.filter((p) => p.studentId === id);
    const studentAdjustments = this.state.feeAdjustments.filter((a) => a.studentId === id);

    // Map custom field values
    const fieldValues = this.state.studentFieldValues.filter((v) => v.studentId === id);
    const customFieldsMap: Record<string, string> = {};
    for (const v of fieldValues) {
      const field = this.state.customFields.find((f) => f.id === v.fieldId);
      if (field) {
        customFieldsMap[field.fieldName] = v.fieldValue;
      }
    }

    const totalDue = studentInvoices.reduce((acc, i) => acc + Number(i.amountDue), 0);
    const totalPaid = studentInvoices.reduce((acc, i) => acc + Number(i.amountPaid), 0);
    const balance = (totalDue - totalPaid).toFixed(2);

    return {
      ...student,
      room: room ? { ...room, hostelName: hostel?.name || 'Main Residence' } : null,
      invoices: studentInvoices,
      payments: studentPayments,
      feeAdjustments: studentAdjustments,
      customFields: customFieldsMap,
      balance,
    };
  }

  public createCustomField(body: any): any {
    const newField: CustomFieldEntity = {
      id: this.state.customFields.length + 1,
      entityType: body.entityType || 'student',
      fieldName: body.fieldName,
      fieldLabel: body.fieldLabel,
      fieldType: body.fieldType || 'text',
      isRequired: Boolean(body.isRequired),
      optionsJson: body.options ? JSON.stringify(body.options) : null,
      displayOrder: this.state.customFields.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.state.customFields.push(newField);
    this.saveState();
    return newField;
  }

  public generateMonthlyInvoices(billingMonth: string): any {
    const activeStudents = this.state.students.filter((s) => s.status === 'active');
    const created: InvoiceEntity[] = [];

    for (const student of activeStudents) {
      const existing = this.state.invoices.find((i) => i.studentId === student.id && i.billingMonth === billingMonth);
      if (existing) continue;

      const invoice: InvoiceEntity = {
        id: this.state.invoices.length + 1,
        invoiceNumber: `INV-${billingMonth.replace('-', '')}-${String(student.id).padStart(3, '0')}`,
        studentId: student.id,
        billingMonth,
        dueDate: `${billingMonth}-28`,
        amountDue: String(student.monthlyFee || '500.00'),
        amountPaid: '0.00',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.state.invoices.push(invoice);
      created.push(invoice);
    }

    this.saveState();
    return { createdCount: created.length, billingMonth };
  }

  public recordPayment(body: any): any {
    const studentId = Number(body.studentId);
    const amount = Number(body.amount);
    const student = this.state.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const receiptNumber = `REC-${new Date().getFullYear()}-${String(this.state.payments.length + 1).padStart(4, '0')}`;
    const paymentDate = body.paymentDate || new Date().toISOString().slice(0, 10);

    const payment: PaymentEntity = {
      id: this.state.payments.length + 1,
      receiptNumber,
      invoiceId: body.invoiceId ? Number(body.invoiceId) : null,
      studentId,
      amount: amount.toFixed(2),
      paymentMethod: body.paymentMethod || 'cash',
      transactionReference: body.transactionReference || null,
      paymentDate,
      collectedBy: 1,
      remarks: body.remarks || null,
      createdAt: new Date().toISOString(),
    };

    this.state.payments.push(payment);

    // If an invoice is referenced, update its paid amount
    if (payment.invoiceId) {
      const invoice = this.state.invoices.find((i) => i.id === payment.invoiceId);
      if (invoice) {
        const newPaid = Number(invoice.amountPaid) + amount;
        invoice.amountPaid = newPaid.toFixed(2);
        if (newPaid >= Number(invoice.amountDue)) {
          invoice.status = 'paid';
        } else if (newPaid > 0) {
          invoice.status = 'partial';
        }
      }
    }

    this.saveState();
    return {
      payment,
      receiptNumber,
      watermark: 'Somnath',
      studentName: `${student.firstName} ${student.lastName}`,
    };
  }

  public createBackup(backupType: 'daily_automated' | 'manual_export' = 'manual_export'): any {
    const snapshotJson = JSON.stringify(this.state);
    const backup: BackupEntity = {
      id: this.state.backups.length + 1,
      filename: `somnath_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      backupType,
      fileSizeBytes: snapshotJson.length,
      tablesCount: 12,
      recordsCount:
        this.state.students.length +
        this.state.payments.length +
        this.state.invoices.length +
        this.state.rooms.length,
      checksum: 'local_sha256_' + Date.now().toString(16),
      payloadJson: snapshotJson,
      status: 'verified',
      createdAt: new Date().toISOString(),
    };

    this.state.backups.unshift(backup);
    this.saveState();
    return backup;
  }

  public exportFinancialLedgerToExcel(): Blob {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Students Summary
    const studentsData = this.state.students.map((s) => {
      const room = s.roomId ? this.state.rooms.find((r) => r.id === s.roomId) : null;
      const studentInvoices = this.state.invoices.filter((i) => i.studentId === s.id);
      const totalDue = studentInvoices.reduce((acc, i) => acc + Number(i.amountDue), 0);
      const totalPaid = studentInvoices.reduce((acc, i) => acc + Number(i.amountPaid), 0);
      return {
        'Admission #': s.admissionNumber,
        'Full Name': `${s.firstName} ${s.lastName}`,
        Gender: s.gender || 'Not Specified',
        Email: s.email,
        Phone: s.phone,
        'Room #': room ? room.roomNumber : 'Unassigned',
        'Monthly Fee (NPR)': Number(s.monthlyFee || 0),
        'Total Billed (NPR)': totalDue,
        'Total Paid (NPR)': totalPaid,
        'Current Balance (NPR)': totalDue - totalPaid,
        Status: s.status,
        'Admission Date': s.admissionDate,
      };
    });
    const wsStudents = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Residents Summary');

    // Sheet 2: Payments & Transaction Ledger
    const paymentsData = this.state.payments.map((p) => {
      const student = this.state.students.find((s) => s.id === p.studentId);
      const invoice = p.invoiceId ? this.state.invoices.find((i) => i.id === p.invoiceId) : null;
      return {
        'Receipt #': p.receiptNumber,
        'Payment Date': p.paymentDate,
        'Resident Name': student ? `${student.firstName} ${student.lastName}` : 'Resident',
        'Student ID': student?.admissionNumber || '',
        'Amount Paid (NPR)': Number(p.amount),
        'Payment Method': p.paymentMethod,
        'Billing Month / Cycle': invoice?.billingMonth || 'Manual Ledger Entry',
        'Transaction Ref': p.transactionReference || 'N/A',
        Remarks: p.remarks || '',
      };
    });
    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, wsPayments, 'Payment Transactions');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}

export const clientDataStore = new ClientDataStore();
