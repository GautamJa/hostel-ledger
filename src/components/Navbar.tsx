import React from 'react';
import { useAuth, UserRole } from '../context/AuthContext.tsx';
import {
  Users,
  SlidersHorizontal,
  CreditCard,
  Mail,
  Database,
  LayoutDashboard,
  LogOut,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { firebaseUser, dbUser, activeRole, setActiveRole, signInWithGoogle, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Simplified navigation: 'rooms' removed per user request
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'warden', 'accountant', 'student'] },
    { id: 'students', label: 'Students', icon: Users, roles: ['admin', 'warden', 'accountant', 'student'] },
    { id: 'custom-fields', label: 'Custom Columns', icon: SlidersHorizontal, roles: ['admin', 'warden'] },
    { id: 'payments', label: 'Billing & Ledger', icon: CreditCard, roles: ['admin', 'accountant', 'student'] },
    { id: 'reminders', label: 'Auto Reminders', icon: Mail, roles: ['admin', 'warden', 'accountant'] },
    { id: 'backups', label: 'Backups & DB', icon: Database, roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <header className="bg-zinc-950 border-b border-zinc-900 text-zinc-100 sticky top-0 z-40 shadow-xl backdrop-blur-md">
      {/* Top Banner: Classical Identity & Role Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand: SomnathRecorders */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center shadow-lg text-white font-serif font-black text-base border border-amber-400/30">
              SR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-white">
                  SomnathRecorders
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-800">
                  Secure System
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                PostgreSQL Ledger &bull; Student Records &bull; Month-End Reminders
              </p>
            </div>
          </div>

          {/* Right Section: Role Switcher & User Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Database status pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium font-mono text-[11px]">DB Healthy</span>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-amber-400 hidden sm:block ml-1" />
              <span className="text-xs text-zinc-400 hidden md:inline">Role:</span>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="bg-black text-xs font-semibold text-zinc-200 border border-zinc-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                title="Switch active role to test role permissions"
              >
                <option value="admin">Administrator</option>
                <option value="warden">Hostel Warden</option>
                <option value="accountant">Accountant</option>
                <option value="student">Resident Student</option>
              </select>
            </div>

            {/* Auth Button */}
            {firebaseUser ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-zinc-200 leading-tight">
                    {dbUser?.fullName || firebaseUser.displayName || 'Staff Member'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{firebaseUser.email}</span>
                </div>
                {firebaseUser.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-amber-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    {(dbUser?.fullName || firebaseUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={signOutUser}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-in</span>
              </button>
            )}

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <nav className="bg-zinc-950/80 border-t border-zinc-900 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-t border-zinc-900 px-4 pt-2 pb-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
