import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { StudentsView } from './components/StudentsView.tsx';
import { CustomFieldsView } from './components/CustomFieldsView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { RemindersView } from './components/RemindersView.tsx';
import { BackupsView } from './components/BackupsView.tsx';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<number | null>(null);
  const { activeRole } = useAuth();

  const handleOpenPaymentModal = (studentId: number) => {
    setSelectedStudentForPayment(studentId);
    setCurrentTab('payments');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans antialiased text-zinc-100 selection:bg-amber-500 selection:text-black">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />}
        {currentTab === 'students' && <StudentsView onOpenPaymentModal={handleOpenPaymentModal} />}
        {currentTab === 'custom-fields' && <CustomFieldsView />}
        {currentTab === 'payments' && <PaymentsView initialStudentId={selectedStudentForPayment} />}
        {currentTab === 'reminders' && <RemindersView />}
        {currentTab === 'backups' && <BackupsView />}
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
            <span>Active Role: <strong className="text-zinc-200 capitalize">{activeRole}</strong></span>
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
