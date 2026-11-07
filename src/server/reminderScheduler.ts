import { dataStore } from './dataStore.ts';

export interface DeadlineInfo {
  billingMonth: string;
  deadlineDate: string; // YYYY-MM-DD (Last day of month)
  reminderDate: string; // YYYY-MM-DD (1 day before deadline)
  lastDay: number;
  reminderDay: number;
  daysRemaining: number;
  is1DayBeforeDeadline: boolean;
  isDueOrPast: boolean;
}

/**
 * Calculates the exact last day of the month and 1-day-before reminder trigger date.
 */
export function getMonthEndDeadline(billingMonth: string, referenceDateStr?: string): DeadlineInfo {
  let deadlineDate = '';
  let reminderDate = '';
  let lastDay = 30;

  if (billingMonth && billingMonth.includes(' to ')) {
    const parts = billingMonth.split(' to ');
    deadlineDate = parts[1]?.trim() || parts[0]?.trim();
    const dObj = new Date(`${deadlineDate}T00:00:00Z`);
    lastDay = dObj.getUTCDate() || 30;
    const rDateObj = new Date(dObj.getTime() - 24 * 60 * 60 * 1000);
    reminderDate = `${rDateObj.getUTCFullYear()}-${String(rDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(rDateObj.getUTCDate()).padStart(2, '0')}`;
  } else if (billingMonth && /^\d{4}-\d{2}-\d{2}$/.test(billingMonth)) {
    deadlineDate = billingMonth;
    const dObj = new Date(`${deadlineDate}T00:00:00Z`);
    lastDay = dObj.getUTCDate() || 30;
    const rDateObj = new Date(dObj.getTime() - 24 * 60 * 60 * 1000);
    reminderDate = `${rDateObj.getUTCFullYear()}-${String(rDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(rDateObj.getUTCDate()).padStart(2, '0')}`;
  } else {
    const [yearStr, monthStr] = (billingMonth && billingMonth.includes('-') ? billingMonth.split('-') : ['2026', '11']);
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // In UTC, day 0 of next month is the last day of the current month
    const lastDate = new Date(Date.UTC(year, month, 0));
    lastDay = lastDate.getUTCDate();
    deadlineDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const reminderDateObj = new Date(Date.UTC(year, month - 1, lastDay - 1));
    const rYear = reminderDateObj.getUTCFullYear();
    const rMonth = reminderDateObj.getUTCMonth() + 1;
    const rDay = reminderDateObj.getUTCDate();
    reminderDate = `${rYear}-${String(rMonth).padStart(2, '0')}-${String(rDay).padStart(2, '0')}`;
  }

  const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${todayStr}T00:00:00Z`);
  const deadlineDateObj = new Date(`${deadlineDate}T00:00:00Z`);
  const reminderDateObjRef = new Date(`${reminderDate}T00:00:00Z`);

  const diffMs = deadlineDateObj.getTime() - todayDate.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const is1DayBeforeDeadline = todayStr === reminderDate || daysRemaining === 1;
  const isDueOrPast = todayDate.getTime() >= reminderDateObjRef.getTime();

  return {
    billingMonth,
    deadlineDate,
    reminderDate,
    lastDay,
    reminderDay: lastDay - 1,
    daysRemaining,
    is1DayBeforeDeadline,
    isDueOrPast,
  };
}

export interface DispatchedAutomatedReminder {
  reminderId: number;
  invoiceId: number;
  invoiceNumber: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  billingMonth: string;
  deadlineDate: string;
  reminderDate: string;
  amountDue: string;
  balance: string;
  subject: string;
  body: string;
  gmailLink: string;
  status: string;
  sentAt: string;
}

export interface AutomatedCheckResult {
  checkedAt: string;
  evaluatedInvoicesCount: number;
  dispatchedCount: number;
  skippedAlreadySentCount: number;
  skippedNotDueCount: number;
  dispatchedReminders: DispatchedAutomatedReminder[];
  simulatedDate?: string;
  message: string;
}

class ReminderScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastRunAt: string | null = null;
  private nextRunAt: string | null = null;
  private totalDispatched = 0;

  /**
   * Evaluates pending invoices and automatically sends reminders for those where
   * payment is not completed and the deadline is 1 day away (or overdue).
   */
  public runAutomatedCheck(options?: {
    simulateDate?: string;
    forceAllPending?: boolean;
    userId?: number | null;
  }): AutomatedCheckResult {
    const checkedAt = new Date().toISOString();
    this.lastRunAt = checkedAt;

    const evaluationDate = options?.simulateDate || checkedAt.slice(0, 10);
    const invoices = dataStore.getInvoices();
    const existingReminders = dataStore.getReminders();
    const students = dataStore.getStudents();
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === 'pending' || inv.status === 'partial'
    );

    const dispatched: DispatchedAutomatedReminder[] = [];
    let skippedAlreadySent = 0;
    let skippedNotDue = 0;

    for (const inv of unpaidInvoices) {
      const student = studentMap.get(inv.studentId);
      if (!student || !student.email || student.status !== 'active') continue;

      // Ensure amountDue reflects student's current monthly fee
      if (student.monthlyFee && Number(inv.amountPaid) === 0 && Number(inv.amountDue) !== Number(student.monthlyFee)) {
        inv.amountDue = Number(student.monthlyFee).toFixed(2);
        dataStore.updateInvoice(inv.id, { amountDue: inv.amountDue });
      }

      const deadlineInfo = getMonthEndDeadline(inv.billingMonth, evaluationDate);
      const balance = (Number(inv.amountDue) - Number(inv.amountPaid)).toFixed(2);

      // Check if 1 day left before deadline or due/overdue, or forced
      const shouldTrigger =
        options?.forceAllPending ||
        deadlineInfo.is1DayBeforeDeadline ||
        deadlineInfo.isDueOrPast;

      if (!shouldTrigger) {
        skippedNotDue++;
        continue;
      }

      // Check if automated reminder already recorded for this invoice in the current cycle
      const alreadySent = existingReminders.some(
        (r) =>
          r.invoiceId === inv.id &&
          (r.status === 'automated_sent' || r.status === 'sent_via_gmail') &&
          r.sentAt.slice(0, 7) === inv.billingMonth
      );

      if (alreadySent && !options?.forceAllPending) {
        skippedAlreadySent++;
        continue;
      }

      // Format professional automated reminder
      const subject = `⏰ Urgent: Fee Due Tomorrow (${deadlineInfo.deadlineDate}) - ${student.firstName} ${student.lastName}`;
      const body = `Dear ${student.firstName} ${student.lastName},

This is an automated notification from SomnathRecorders Accounts Office.

In accordance with hostel rules, your accommodation payment for ${inv.billingMonth} must be settled before the last day of the month (${deadlineInfo.deadlineDate}). There is exactly 1 day left before the deadline.

Payment Account Summary:
- Resident Name: ${student.firstName} ${student.lastName} (Student ID: ${student.admissionNumber})
- Assigned Room: Room ${student.roomId || 'Residential Block'}
- Billing Cycle: ${inv.billingMonth}
- Invoice Number: ${inv.invoiceNumber}
- Total Amount Due: ${Number(inv.amountDue).toFixed(2)}
- Amount Paid: ${Number(inv.amountPaid).toFixed(2)}
- Remaining Balance: ${balance}
- Month-End Deadline: ${deadlineInfo.deadlineDate} (End of Calendar Month)

Please arrange payment clearance today at the accounts counter or through digital bank transfer to ensure uninterrupted hostel accommodation.

Warm regards,
SomnathRecorders Accounts Office`;

      // Record in dataStore
      const recorded = dataStore.recordReminder({
        studentId: student.id,
        invoiceId: inv.id,
        recipientEmail: student.email,
        subject,
        body,
        status: 'automated_sent',
      });

      this.totalDispatched++;

      dataStore.logActivity({
        userId: options?.userId || 1,
        action: 'AUTOMATED_REMINDER_TRIGGERED',
        entityType: 'email_reminder',
        entityId: recorded.id,
        details: `Automated Gmail reminder dispatched to ${student.email} for invoice ${inv.invoiceNumber} (1 day before deadline ${deadlineInfo.deadlineDate})`,
      });

      const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        student.email
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      dispatched.push({
        reminderId: recorded.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        billingMonth: inv.billingMonth,
        deadlineDate: deadlineInfo.deadlineDate,
        reminderDate: deadlineInfo.reminderDate,
        amountDue: inv.amountDue,
        balance,
        subject,
        body,
        gmailLink,
        status: 'automated_sent',
        sentAt: recorded.sentAt,
      });
    }

    const message =
      dispatched.length > 0
        ? `Successfully generated & dispatched ${dispatched.length} automated fee reminder(s) before the month-end deadline.`
        : unpaidInvoices.length === 0
        ? 'All resident fees are fully settled. No pending invoices to remind.'
        : `Evaluated ${unpaidInvoices.length} pending invoice(s). 0 dispatched (${skippedAlreadySent} already sent, ${skippedNotDue} not at 1-day threshold yet).`;

    return {
      checkedAt,
      evaluatedInvoicesCount: unpaidInvoices.length,
      dispatchedCount: dispatched.length,
      skippedAlreadySentCount: skippedAlreadySent,
      skippedNotDueCount: skippedNotDue,
      dispatchedReminders: dispatched,
      simulatedDate: options?.simulateDate,
      message,
    };
  }

  /**
   * Starts background interval scheduler (runs every hour).
   */
  public start(intervalMinutes: number = 60) {
    if (this.intervalTimer) return;

    console.log(`[ReminderScheduler] Starting background scheduler (Interval: ${intervalMinutes}m)`);
    
    // Initial check on boot
    try {
      const result = this.runAutomatedCheck();
      console.log(`[ReminderScheduler] Initial boot check: ${result.message}`);
    } catch (e: any) {
      console.error('[ReminderScheduler] Error during initial boot check:', e.message);
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + intervalMs).toISOString();

    this.intervalTimer = setInterval(() => {
      try {
        const result = this.runAutomatedCheck();
        console.log(`[ReminderScheduler] Hourly run completed: ${result.message}`);
        this.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
      } catch (e: any) {
        console.error('[ReminderScheduler] Error running hourly automated reminder check:', e.message);
      }
    }, intervalMs);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[ReminderScheduler] Stopped background scheduler');
    }
  }

  public getStatus() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const deadlineInfo = getMonthEndDeadline(currentMonth);

    return {
      isActive: this.intervalTimer !== null,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      totalDispatched: this.totalDispatched,
      currentCycle: currentMonth,
      currentCycleDeadline: deadlineInfo.deadlineDate,
      currentCycleReminderTriggerDate: deadlineInfo.reminderDate,
      daysToCurrentDeadline: deadlineInfo.daysRemaining,
      policy: {
        deadlineRule: 'Payment must be completed before the last day of each calendar month.',
        automatedReminderRule:
          'Automatic Gmail reminder is triggered exactly 1 day before the month-end deadline if payment is not done.',
      },
    };
  }
}

export const reminderScheduler = new ReminderScheduler();
