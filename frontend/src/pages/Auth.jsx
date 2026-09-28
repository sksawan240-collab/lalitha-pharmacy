import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AppContext';
import { Field, roleHome, ThemeToggle } from '../components/ui';
import { apiError } from '../services/api';
import { authApi } from '../services/endpoints';
import toast from 'react-hot-toast';

function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
      <svg className="absolute -left-8 top-16 h-32 w-32 rotate-12 text-emerald-100 opacity-60 animate-floaty" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" /></svg>
      <svg className="absolute -right-6 bottom-24 h-40 w-40 -rotate-12 text-sky-100 opacity-50 animate-floaty" style={{ animationDelay: '2s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" /></svg>
      <svg className="absolute right-20 top-8 h-20 w-20 rotate-45 text-emerald-100 opacity-40 animate-floaty" style={{ animationDelay: '1s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" /></svg>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #057e57 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
    </div>
  );
}

function AuthShell({ title, sub, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AuthBackground />
      <div className="absolute right-5 top-5 z-20"><ThemeToggle /></div>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" /></svg>
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink-900">LALITHA PHARMACY</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pharm-600">Healthcare Supply</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-[0_20px_60px_-15px_rgba(5,126,87,0.15)] backdrop-blur-xl">
          <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Secure &bull; Trusted &bull; Verified</p>
      </motion.div>
    </div>
  );
}


export function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [show, setShow] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const on = async (v) => {
    try { const r = await login(v); toast.success('Welcome back!'); nav(roleHome(r.data.user.role)); }
    catch (e) { toast.error(apiError(e, 'Login failed')); }
  };
  return (
    <AuthShell title="Welcome back" sub="Sign in to your account to continue">
      <form onSubmit={handleSubmit(on)} className="space-y-5">
        <Field label="Email address" error={errors.email?.message}>
          <input className="input" type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input className="input pr-14" type={show ? 'text' : 'password'} placeholder="••••••••" {...register('password', { required: 'Password is required' })} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-pharm-600 hover:text-pharm-700 transition">{show ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" {...register('remember')} className="h-4 w-4 rounded border-slate-300 text-pharm-600 focus:ring-pharm-500" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-semibold text-pharm-600 hover:text-pharm-700 transition">Forgot password?</Link>
        </div>
        <button disabled={isSubmitting} className="btn-primary w-full !py-3">
          {isSubmitting ? <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> Signing in…</span> : 'Sign in'}
        </button>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
        </div>
        <p className="text-center text-sm text-slate-600">Don&apos;t have an account? <Link to="/register" className="font-bold text-pharm-600 hover:text-pharm-700 transition">Create account</Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [show, setShow] = useState(false);
  const nav = useNavigate();
  const [q] = useSearchParams();
  const on = async (v) => {
    try {
      const fd = {
        name: v.name,
        email: v.email.trim(),
        password: v.password,
        confirmPassword: v.confirmPassword,
        mobile: v.mobile,
        address: v.address,
        city: v.city,
        state: v.state,
        pincode: v.pincode,
        role: v.role || 'CUSTOMER'
      };
      const r = await authApi.register(fd);
      if (r.data?.requireOtp) {
        toast.success('OTP sent! Check your email (including spam).');
        nav(`/verify-otp?email=${encodeURIComponent(fd.email)}&requireOtp=1`);
      } else {
        toast.success('Account created! Please log in.');
        nav('/login');
      }
    } catch (e) { toast.error(apiError(e, 'Registration failed')); }
  };
  const selected = watch('role', 'CUSTOMER');
  return (
    <AuthShell title="Create your account" sub="Join Lalitha Pharmacy today">
      <form onSubmit={handleSubmit(on)} className="space-y-4">
        <Field label="Full name" error={errors.name?.message}>
          <input className="input" placeholder="John Doe" {...register('name', { required: 'Full name is required' })} />
        </Field>
        <Field label="Email address" error={errors.email?.message}>
          <input className="input" type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} />
        </Field>
        <Field label="Mobile number" error={errors.mobile?.message}>
          <input className="input" type="tel" placeholder="+91 9876543210" {...register('mobile', { required: 'Mobile number is required', pattern: { value: /^[0-9+\-\s()]{7,16}$/, message: 'Invalid mobile number' } })} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <input className="input" placeholder="123, Main Street" {...register('address', { required: 'Address is required' })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" error={errors.city?.message}>
            <input className="input" placeholder="Mumbai" {...register('city', { required: 'City is required' })} />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <input className="input" placeholder="Maharashtra" {...register('state', { required: 'State is required' })} />
          </Field>
          <Field label="Pincode" error={errors.pincode?.message}>
            <input className="input" placeholder="400001" {...register('pincode', { required: 'Pincode is required', pattern: { value: /^\d{4,6}$/, message: 'Invalid pincode' } })} />
          </Field>
        </div>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input className="input pr-14" type={show ? 'text' : 'password'} placeholder="Min 8 characters" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-pharm-600 hover:text-pharm-700 transition">{show ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input className="input" type={show ? 'text' : 'password'} placeholder="Re-enter password" {...register('confirmPassword', { required: 'Please confirm your password' })} />
        </Field>
        {!q.get('role') && (
          <div>
            <span className="label">I want to</span>
            <div className="grid grid-cols-1 gap-3">
              {[
                { val: 'CUSTOMER', label: 'Order medicines', icon: '🛒' },
              ].map((r) => (
                <label key={r.val} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${selected === r.val ? 'border-pharm-500 bg-pharm-50 text-pharm-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" value={r.val} {...register('role')} className="sr-only" />
                  <span className="text-lg">{r.icon}</span>
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        )}
        <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-500">
          <input type="checkbox" {...register('agree', { required: 'You must agree' })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pharm-600 focus:ring-pharm-500" />
          <span>I agree to the <Link to="/about" className="font-semibold text-pharm-600 underline">Terms of Service</Link> and <Link to="/about" className="font-semibold text-pharm-600 underline">Privacy Policy</Link></span>
        </label>
        <button disabled={isSubmitting} className="btn-primary w-full !py-3">
          {isSubmitting ? <span className="inline-flex items-center gap-2"><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg> Creating…</span> : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-bold text-pharm-600 hover:text-pharm-700 transition">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

export function VerifyOtp() {
  const [q] = useSearchParams();
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState(q.get('email') || '');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.verifyOtp({ email: email.trim(), code: otp, purpose: 'REGISTER' });
      toast.success('Verified! Please log in with your password.');
      nav('/login');
    } catch (e2) { toast.error(apiError(e2, 'Invalid OTP')); }
    setBusy(false);
  };
  const resend = async () => {
    try { await authApi.resendOtp({ email: email.trim() }); toast.success('OTP resent — check your inbox (and spam folder)'); }
    catch (e) { toast.error(apiError(e)); }
  };
  return (
    <AuthShell title="Verify your email" sub={`We sent a 6-digit code to ${email || 'your email'}`}>
      <form onSubmit={verify} className="space-y-5">
        {!q.get('email') && (
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </Field>
        )}
        <div>
          <span className="label">Verification code</span>
          <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="input text-center text-2xl font-extrabold tracking-[0.5em]" inputMode="numeric" minLength={6} maxLength={6} required />
        </div>
        <button disabled={busy || otp.length !== 6 || !email.trim()} className="btn-primary w-full !py-3">{busy ? 'Verifying…' : 'Verify email'}</button>
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={resend} disabled={!email.trim()} className="text-sm font-semibold text-pharm-600 hover:text-pharm-700 transition disabled:opacity-50">Resend code</button>
          <Link to="/login" className="text-xs text-slate-400 hover:text-slate-500 transition">← Back to login</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function Forgot() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const on = async (v) => { try { await authApi.forgot(v.email); toast.success('If the account exists, a reset OTP was emailed'); } catch (e) { toast.error(apiError(e)); } };
  return (
    <AuthShell title="Reset password" sub="We'll email you a verification code">
      <form onSubmit={handleSubmit(on)} className="space-y-5">
        <Field label="Email address">
          <input className="input" type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
        </Field>
        <button disabled={isSubmitting} className="btn-primary w-full !py-3">{isSubmitting ? 'Sending…' : 'Send reset code'}</button>
        <Link to="/login" className="block text-center text-sm font-semibold text-pharm-600 hover:text-pharm-700 transition">← Back to login</Link>
      </form>
    </AuthShell>
  );
}

export function ResetPw() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const nav = useNavigate();
  const on = async (v) => {
    try { await authApi.reset(v); toast.success('Password updated. Please login.'); nav('/login'); }
    catch (e) { toast.error(apiError(e)); }
  };
  return (
    <AuthShell title="Set new password" sub="Enter the code from your email">
      <form onSubmit={handleSubmit(on)} className="space-y-4">
        <Field label="Email"><input className="input" type="email" placeholder="you@example.com" {...register('email', { required: true })} /></Field>
        <Field label="Reset code"><input className="input" placeholder="6-digit code" {...register('otp', { required: true })} /></Field>
        <Field label="New password"><input className="input" type="password" placeholder="Min 8 characters" {...register('newPassword', { required: true, minLength: 8 })} /></Field>
        <button disabled={isSubmitting} className="btn-primary w-full !py-3">{isSubmitting ? 'Updating…' : 'Update password'}</button>
        <Link to="/login" className="block text-center text-sm font-semibold text-pharm-600 hover:text-pharm-700 transition">← Back to login</Link>
      </form>
    </AuthShell>
  );
}