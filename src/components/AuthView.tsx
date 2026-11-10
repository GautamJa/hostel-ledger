import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, signup } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpRoom, setSignUpRoom] = useState('');
  const [signUpMonthlyFee, setSignUpMonthlyFee] = useState('500.00');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-fill admin credentials requested by user
  const handleAutoFillAdmin = () => {
    setSignInEmail('jayswalgautam4@gmail.com');
    setSignInPassword('Gautam123');
    setError(null);
  };

  // Auto-fill student credentials for quick testing
  const handleAutoFillStudent = () => {
    setSignInEmail('student@dormis.edu');
    setSignInPassword('Student123');
    setError(null);
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(signInEmail.trim(), signInPassword.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (signUpPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signup({
        fullName: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword.trim(),
        phone: signUpPhone.trim(),
        roomNumber: signUpRoom.trim(),
        monthlyFee: signUpMonthlyFee.trim(),
      });
      setSuccessMsg('Student account created successfully! You are now logged in.');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-8 relative selection:bg-amber-500 selection:text-black">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Card Container */}
      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white font-serif font-black text-2xl shadow-xl shadow-amber-950/40 border border-amber-400/40 mb-3">
            SR
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            SomnathRecorders
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Student Records &bull; Month-End Reminders &bull; Immutable Ledger
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 mb-6 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'signin'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'signup'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Student Account
          </button>
        </div>

        {/* Auth Body Box */}
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email / Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="e.g. jayswalgautam4@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-300">Password</label>
                  <span className="text-[10px] text-zinc-500">Default: Gautam123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to SomnathRecorders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Quick Credentials Buttons */}
              <div className="pt-4 mt-4 border-t border-zinc-800 space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center">
                  Quick-Login Options
                </p>

                {/* Admin auto-fill */}
                <button
                  type="button"
                  onClick={handleAutoFillAdmin}
                  className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-amber-300">
                        Admin Login (Full System Control)
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        jayswalgautam4@gmail.com &bull; Gautam123
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono group-hover:bg-amber-500/30">
                    Auto-Fill
                  </span>
                </button>

                {/* Student auto-fill */}
                <button
                  type="button"
                  onClick={handleAutoFillStudent}
                  className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">
                        Student Login (Read-Only Records)
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        student@dormis.edu &bull; Student123
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono group-hover:bg-zinc-700">
                    Auto-Fill
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* SIGN UP FORM (RESIDENT STUDENT) */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Student accounts have read-only access to their personal fee ledger and records.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Ramesh Thapa"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email / Gmail <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="e.g. student@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Minimum 4 chars"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      placeholder="+977 980-..."
                      className="w-full pl-8 pr-2.5 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Room No (Optional)
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={signUpRoom}
                      onChange={(e) => setSignUpRoom(e.target.value)}
                      placeholder="e.g. 102, A-201"
                      className="w-full pl-8 pr-2.5 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Resident Student Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security watermark footer */}
        <div className="text-center mt-6 text-zinc-400 text-xs flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Protected with cryptographic sessions & SomnathRecorders audit rules</span>
        </div>
      </div>
    </div>
  );
};
