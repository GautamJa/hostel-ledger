import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users table (Admins, Wardens, Accountants, Students)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('student'), // 'admin' | 'warden' | 'accountant' | 'student'
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. Hostels
export const hostels = pgTable('hostels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('boys'), // 'boys' | 'girls' | 'co-ed'
  address: text('address'),
  wardenName: text('warden_name'),
  contactPhone: text('contact_phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Rooms
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  hostelId: integer('hostel_id')
    .references(() => hostels.id, { onDelete: 'cascade' })
    .notNull(),
  roomNumber: text('room_number').notNull(),
  floor: integer('floor').notNull().default(1),
  capacity: integer('capacity').notNull().default(2),
  defaultMonthlyFee: numeric('default_monthly_fee', { precision: 10, scale: 2 }).notNull().default('500.00'),
  status: text('status').notNull().default('available'), // 'available' | 'full' | 'maintenance'
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Students
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  admissionNumber: text('admission_number').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  gender: text('gender').notNull().default('male'), // 'male' | 'female' | 'other'
  dob: text('dob'),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  bloodGroup: text('blood_group'),
  homeAddress: text('home_address'),
  roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  monthlyFee: numeric('monthly_fee', { precision: 10, scale: 2 }).notNull().default('500.00'),
  status: text('status').notNull().default('active'), // 'active' | 'vacated' | 'suspended'
  admissionDate: text('admission_date').notNull(),
  vacatedDate: text('vacated_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Dynamic Custom Fields definition
export const customFields = pgTable('custom_fields', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type').notNull().default('student'),
  fieldName: text('field_name').notNull().unique(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type').notNull().default('text'), // 'text' | 'number' | 'date' | 'boolean' | 'dropdown'
  isRequired: boolean('is_required').notNull().default(false),
  optionsJson: text('options_json'), // JSON array of options for dropdowns
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Values for custom fields attached to students
export const studentFieldValues = pgTable('student_field_values', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  fieldId: integer('field_id')
    .references(() => customFields.id, { onDelete: 'cascade' })
    .notNull(),
  fieldValue: text('field_value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 7. Fee adjustment history (Audit trail for editable monthly fees)
export const feeAdjustments = pgTable('fee_adjustments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  oldFee: numeric('old_fee', { precision: 10, scale: 2 }).notNull(),
  newFee: numeric('new_fee', { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: text('effective_from').notNull(),
  reason: text('reason').notNull(),
  adjustedBy: integer('adjusted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Invoices (Monthly billing generation)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  billingMonth: text('billing_month').notNull(), // 'YYYY-MM'
  dueDate: text('due_date').notNull(),
  amountDue: numeric('amount_due', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0.00'),
  status: text('status').notNull().default('pending'), // 'pending' | 'partial' | 'paid' | 'overdue'
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Payments (Append-Only Ledger: Old payments are NEVER overwritten)
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cash' | 'upi_bank_transfer' | 'card' | 'cheque' | 'online'
  transactionReference: text('transaction_reference'),
  paymentDate: text('payment_date').notNull(),
  collectedBy: integer('collected_by').references(() => users.id, { onDelete: 'set null' }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Email reminders
export const emailReminders = pgTable('email_reminders', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  recipientEmail: text('recipient_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('sent'), // 'sent' | 'failed'
  sentAt: timestamp('sent_at').defaultNow(),
});

// 11. Database backups log & snapshot store
export const backups = pgTable('backups', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  backupType: text('backup_type').notNull().default('daily_automated'), // 'daily_automated' | 'manual_export'
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  tablesCount: integer('tables_count').notNull().default(0),
  recordsCount: integer('records_count').notNull().default(0),
  checksum: text('checksum'),
  payloadJson: text('payload_json'),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. Audit activity log
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  paymentsCollected: many(payments),
  feeAdjustmentsMade: many(feeAdjustments),
}));

export const hostelsRelations = relations(hostels, ({ many }) => ({
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  hostel: one(hostels, {
    fields: [rooms.hostelId],
    references: [hostels.id],
  }),
  students: many(students),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [students.roomId],
    references: [rooms.id],
  }),
  fieldValues: many(studentFieldValues),
  invoices: many(invoices),
  payments: many(payments),
  feeAdjustments: many(feeAdjustments),
  emailReminders: many(emailReminders),
}));

export const customFieldsRelations = relations(customFields, ({ many }) => ({
  values: many(studentFieldValues),
}));

export const studentFieldValuesRelations = relations(studentFieldValues, ({ one }) => ({
  student: one(students, {
    fields: [studentFieldValues.studentId],
    references: [students.id],
  }),
  customField: one(customFields, {
    fields: [studentFieldValues.fieldId],
    references: [customFields.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  student: one(students, {
    fields: [payments.studentId],
    references: [students.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  collector: one(users, {
    fields: [payments.collectedBy],
    references: [users.id],
  }),
}));
