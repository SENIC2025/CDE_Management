import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 border border-slate-300 rounded-lg text-[#14261C] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1BAE70]/40 focus:border-[#1BAE70] transition';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F4F6F4' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-lg bg-[#1BAE70] flex items-center justify-center">
            <Leaf size={22} className="text-white" />
          </div>
          <span className="text-[#14261C] text-xl font-bold tracking-tight">CDE Manager</span>
        </div>

        {success ? (
          /* ═══════════════ SUCCESS STATE ═══════════════ */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#1BAE70]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={28} className="text-[#1BAE70]" />
            </div>
            <h1 className="text-2xl font-bold text-[#14261C] mb-2">Password updated</h1>
            <p className="text-[#4E5652] mb-8">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-[#1BAE70] text-white py-2.5 px-6 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
            >
              Sign In
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* ═══════════════ RESET FORM ═══════════════ */
          <>
            <div className="mb-8">
              <div className="w-12 h-12 rounded-full bg-[#1BAE70]/10 flex items-center justify-center mb-4">
                <Lock size={22} className="text-[#1BAE70]" />
              </div>
              <h1 className="text-2xl font-bold text-[#14261C]">Set new password</h1>
              <p className="text-[#4E5652] mt-1">
                Choose a strong password for your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#14261C] mb-1.5">
                  New Password
                </label>
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

              <div>
                <label className="block text-sm font-medium text-[#14261C] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter password again"
                  className={inputClass}
                />
              </div>

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
                ) : (
                  <>
                    <Lock size={18} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
