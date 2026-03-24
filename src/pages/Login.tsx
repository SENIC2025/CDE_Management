import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, ArrowLeft } from 'lucide-react';
import CdeLogo from '../components/CdeLogo';

type ViewMode = 'login' | 'signup' | 'forgot';

export default function Login() {
  const [view, setView] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();

  const isSignUp = view === 'signup';
  const isForgot = view === 'forgot';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isForgot) {
        await resetPasswordForEmail(email);
        setResetSent(true);
      } else if (isSignUp) {
        await signUp(email, password, name, orgName);
        navigate('/');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function switchView(newView: ViewMode) {
    setView(newView);
    setError('');
    setResetSent(false);
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#14261C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1BAE70]/40 focus:border-[#1BAE70] transition';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F6F4' }}>
      {/* Left panel — brand identity */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#14261C' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-[#1BAE70] flex items-center justify-center">
              <CdeLogo size={22} className="text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">CDE Manager</span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Plan. Execute.<br />
            Monitor. Report.
          </h2>
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            Governance-grade management for Communication, Dissemination & Exploitation
            in EU-funded projects.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1BAE70]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[#1BAE70]" />
            </div>
            <div>
              <p className="text-white/90 font-medium">Trusted by EU project teams</p>
              <p className="text-white/50 text-sm">Audit-ready evidence and compliance tracking</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1BAE70]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[#1BAE70]" />
            </div>
            <div>
              <p className="text-white/90 font-medium">Data-driven decisions</p>
              <p className="text-white/50 text-sm">Channel effectiveness and stakeholder analytics</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1BAE70]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-[#1BAE70]" />
            </div>
            <div>
              <p className="text-white/90 font-medium">One source of truth</p>
              <p className="text-white/50 text-sm">No more spreadsheets and slide decks</p>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-xs">
          &copy; {new Date().getFullYear()} SENIC &middot; Powering Impact
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-[#1BAE70] flex items-center justify-center">
              <CdeLogo size={22} className="text-white" />
            </div>
            <span className="text-[#14261C] text-xl font-bold tracking-tight">CDE Manager</span>
          </div>

          {/* ═══════════════ FORGOT PASSWORD — RESET SENT ═══════════════ */}
          {isForgot && resetSent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#1BAE70]/10 flex items-center justify-center mx-auto mb-6">
                <Mail size={28} className="text-[#1BAE70]" />
              </div>
              <h1 className="text-2xl font-bold text-[#14261C] mb-2">Check your email</h1>
              <p className="text-[#4E5652] mb-2">
                We've sent a password reset link to
              </p>
              <p className="font-medium text-[#14261C] mb-6">{email}</p>
              <p className="text-sm text-[#4E5652] mb-8">
                Click the link in the email to set a new password. If you don't see it, check your spam folder.
              </p>
              <button
                onClick={() => switchView('login')}
                className="inline-flex items-center gap-2 text-[#1BAE70] hover:text-[#06752E] text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* ═══════════════ HEADER ═══════════════ */}
              <div className="mb-8">
                {isForgot && (
                  <button
                    onClick={() => switchView('login')}
                    className="inline-flex items-center gap-1.5 text-[#4E5652] hover:text-[#14261C] text-sm mb-4 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </button>
                )}
                <h1 className="text-2xl font-bold text-[#14261C]">
                  {isForgot
                    ? 'Reset your password'
                    : isSignUp
                    ? 'Create your account'
                    : 'Welcome back'}
                </h1>
                <p className="text-[#4E5652] mt-1">
                  {isForgot
                    ? "Enter your email and we'll send you a reset link"
                    : isSignUp
                    ? 'Start managing your CDE activities today'
                    : 'Sign in to your CDE workspace'}
                </p>
              </div>

              {/* ═══════════════ FORM ═══════════════ */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#14261C] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your full name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#14261C] mb-1.5">
                        Organisation Name
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                        placeholder="Your organisation"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#14261C] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@organisation.eu"
                    className={inputClass}
                  />
                </div>

                {!isForgot && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-[#14261C]">Password</label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => switchView('forgot')}
                          className="text-xs text-[#1BAE70] hover:text-[#06752E] font-medium transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Min. 6 characters"
                      className={inputClass}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5">&#9888;</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1BAE70] text-white py-2.5 px-4 rounded-lg hover:bg-[#06752E] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-base"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isForgot ? (
                    <>
                      <Mail size={18} />
                      Send Reset Link
                    </>
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* ═══════════════ FOOTER LINKS ═══════════════ */}
              {!isForgot && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => switchView(isSignUp ? 'login' : 'signup')}
                    className="text-[#1BAE70] hover:text-[#06752E] text-sm font-medium transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
