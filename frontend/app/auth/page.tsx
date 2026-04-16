'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  Zap, MessageSquare, Play, Loader2,
} from 'lucide-react';

// ─── Background (matches landing page) ───────────────────────────────────────
function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#060608]">
      {[
        { c: '#4f46e5', x: '5%', y: '20%', s: 500, d: 22 },
        { c: '#7c3aed', x: '90%', y: '10%', s: 380, d: 26 },
        { c: '#0891b2', x: '70%', y: '75%', s: 300, d: 20 },
        { c: '#be185d', x: '20%', y: '85%', s: 260, d: 24 },
      ].map((o, i) => (
        <motion.div key={i}
          className="absolute rounded-full blur-[130px]"
          style={{ left: o.x, top: o.y, width: o.s, height: o.s, backgroundColor: o.c, opacity: 0.10, translateX: '-50%', translateY: '-50%' }}
          animate={{ x: [0, 40, -25, 20, 0], y: [0, -35, 28, -18, 0] }}
          transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
        />
      ))}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
function Field({ icon: Icon, ...props }: { icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative group">
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
      <input
        {...props}
        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 group-focus-within:border-indigo-500/50 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
      />
    </div>
  );
}

// ─── Password field with show/hide ───────────────────────────────────────────
function PasswordField({ value, onChange, placeholder = 'Password' }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative group">
      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/[0.06] border border-white/10 group-focus-within:border-indigo-500/50 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── Google button ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.5 33.1 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.7 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.9 13.4-4.9l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.4-7l-6.6 5.1C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.7 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z" />
    </svg>
  );
}

// ─── Features side panel ──────────────────────────────────────────────────────
const FEATURES = [
  { icon: Zap, label: 'Real-time sync', desc: 'Every keystroke synced in <50ms', color: '#6366f1' },
  { icon: MessageSquare, label: 'Live chat', desc: 'Discuss code without leaving the editor', color: '#8b5cf6' },
  { icon: Play, label: 'Code runner', desc: 'Run in 14 languages, instantly', color: '#06b6d4' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const isLogin = mode === 'login';

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError(''); setSuccess(''); setName(''); setEmail(''); setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    try {
      const endpoint = isLogin
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong.');
        return;
      }

      if (data.user?._id) {
        localStorage.setItem('userId', data.user._id);
        localStorage.setItem('token', data.token);
        if (data.user.name) localStorage.setItem('userName', data.user.name);
      }

      if (!isLogin) {
        setSuccess('Account created! Redirecting…');
        await new Promise(r => setTimeout(r, 800));
      }

      router.push('/home');
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/home' });
  };

  return (
    <>
      <Background />

      {/* Nav */}
      <div className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6 border-b border-white/[0.05] bg-[#060608]/60 backdrop-blur-xl">
        <Link href="/" className="text-sm font-bold">
          <span className="text-white">Code</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Collab</span>
        </Link>
      </div>

      <div className="min-h-screen pt-14 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60">

          {/* ── Left: Features panel ── */}
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-950/80 via-purple-950/60 to-[#0d0d14] p-10 relative overflow-hidden">
            {/* Orb */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] bg-indigo-500/20 pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
                <Zap size={11} />Real-time collaboration
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white leading-tight mb-3">
                Code together,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  build faster.
                </span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                Everything your team needs to collaborate on code — live sync, chat, and a built-in runner.
              </p>
            </div>

            <div className="relative space-y-4">
              {FEATURES.map(({ icon: Icon, label, desc, color }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}20`, border: `1px solid ${color}35` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-xs text-white/35 mt-0.5">{desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="relative text-xs text-white/20 mt-8">
              No credit card required · Always free
            </div>
          </div>

          {/* ── Right: Auth form ── */}
          <div className="bg-[#0d0d14] p-8 sm:p-10 flex flex-col justify-center">

            {/* Mode toggle tabs */}
            <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1 mb-8">
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

                <div className="mb-7">
                  <h1 className="text-2xl font-bold text-white">
                    {isLogin ? 'Welcome back' : 'Create your account'}
                  </h1>
                  <p className="text-sm text-white/35 mt-1">
                    {isLogin ? 'Sign in to access your rooms and history.' : 'Start collaborating in seconds — it\'s free.'}
                  </p>
                </div>

                {/* Error / Success */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                      <span className="text-base leading-none">⚠</span>{error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                      <span>✓</span>{success}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Google */}
                <motion.button
                  id="google-signin-btn"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/12 bg-white/[0.05] hover:bg-white/[0.09] text-white text-sm font-semibold transition-all mb-5 disabled:opacity-60">
                  {googleLoading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <GoogleIcon />}
                  Continue with Google
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  <span className="text-xs text-white/25">or with email</span>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {!isLogin && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                      <Field icon={User} type="text" placeholder="Full name" value={name}
                        onChange={e => setName(e.target.value)} required={!isLogin} autoComplete="name" />
                    </motion.div>
                  )}

                  <Field icon={Mail} type="email" placeholder="Email address" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email" />

                  <PasswordField value={password} onChange={setPassword}
                    placeholder={isLogin ? 'Password' : 'Create a password (min. 6 chars)'} />

                  <motion.button
                    id="auth-submit-btn"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 mt-1">
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" />{isLogin ? 'Signing in…' : 'Creating account…'}</>
                      : <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowRight size={15} /></>}
                  </motion.button>
                </form>

                {/* Switch mode */}
                <p className="text-center text-xs text-white/30 mt-6">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button onClick={switchMode} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Back to landing */}
        <Link href="/"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-white/25 hover:text-white/60 transition-colors">
          ← Back to home
        </Link>
      </div>
    </>
  );
}
