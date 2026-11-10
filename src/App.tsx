import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthView } from './components/AuthView.tsx';
import { StudentPortalView } from './components/StudentPortalView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { StudentsView } from './components/StudentsView.tsx';
import { CustomFieldsView } from './components/CustomFieldsView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { RemindersView } from './components/RemindersView.tsx';
import { BackupsView } from './components/BackupsView.tsx';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<number | null>(null);
  const { isLoggedIn, loading, activeRole } = useAuth();

  const handleOpenPaymentModal = (studentId: number) => {
    setSelectedStudentForPayment(studentId);
    setCurrentTab('payments');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-300">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-serif font-black text-xl mb-4 animate-pulse">
          SR
        </div>
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500 mb-2" />
        <span className="text-xs text-zinc-500 font-mono">Verifying SomnathRecorders session...</span>
      </div>
    );
  }

  // If not logged in, render the Login / Signup page
  if (!isLoggedIn) {
    return <AuthView />;
  }

  const isStudentRole = activeRole === 'student';

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans antialiased text-zinc-100 selection:bg-amber-500 selection:text-black">
      <Navbar currentTab={isStudentRole ? 'portal' : currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isStudentRole ? (
          /* Student Role: Read-only student details, month-wise payment history, and watermark receipts */
          <StudentPortalView />
        ) : (
          /* Admin / Staff Role: Full access to all management modules */
          <>
            {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
            {currentTab === 'students' && <StudentsView onOpenPaymentModal={handleOpenPaymentModal} />}
            {currentTab === 'custom-fields' && <CustomFieldsView />}
            {currentTab === 'payments' && <PaymentsView initialStudentId={selectedStudentForPayment} />}
            {currentTab === 'reminders' && <RemindersView />}
            {currentTab === 'backups' && <BackupsView />}
          </>
        )}
      </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 text-zinc-400 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white tracking-wider">SOMNATHRECORDERS</span>
            <span className="text-zinc-500">&bull; Student Records & Financial Ledger</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Database: <strong className="text-emerald-400 font-mono">PostgreSQL Active</strong></span>
            <span>Ledger: <strong className="text-amber-400 font-mono">Append-Only Immutable</strong></span>
            <span>Role: <strong className="text-zinc-200 capitalize">{activeRole}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
