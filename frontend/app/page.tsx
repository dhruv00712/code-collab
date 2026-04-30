'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'motion/react';
import {
  Zap, MessageSquare, Play, Files, Users, ArrowRight,
  Code2, Globe, Lock, ChevronRight, Terminal, Sparkles,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, [threshold]);
  return scrolled;
}

// ─── Background ──────────────────────────────────────────────────────────────
function MeshBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#060608]" />
      {/* Orbs */}
      {[
        { c: '#4f46e5', x: '10%', y: '25%', s: 600, d: 22 },
        { c: '#7c3aed', x: '82%', y: '12%', s: 460, d: 26 },
        { c: '#0891b2', x: '60%', y: '68%', s: 380, d: 19 },
        { c: '#be185d', x: '12%', y: '78%', s: 340, d: 24 },
        { c: '#059669', x: '88%', y: '54%', s: 220, d: 30 },
      ].map((o, i) => (
        <motion.div key={i}
          className="absolute rounded-full blur-[140px]"
          style={{ left: o.x, top: o.y, width: o.s, height: o.s, backgroundColor: o.c, opacity: 0.11, translateX: '-50%', translateY: '-50%' }}
          animate={{ x: [0, 50, -30, 25, 0], y: [0, -40, 30, -20, 0] }}
          transition={{ duration: o.d, repeat: Infinity, ease: 'easeInOut', delay: i * 2.2 }}
        />
      ))}
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
      {/* Radial vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, #060608 100%)' }} />
    </div>
  );
}

// ─── Animated Code Demo ───────────────────────────────────────────────────────
const DEMO_LINES = [
  { t: 'import { createRoom } from "@codeship/sdk";', c: '#c792ea' },
  { t: '', c: '' },
  { t: 'const room = await CodeShip.create({', c: '#c792ea' },
  { t: '  language: "typescript",', c: '#c3e88d' },
  { t: '  name: "my-project",', c: '#c3e88d' },
  { t: '});', c: '#82aaff' },
  { t: '', c: '' },
  { t: '// Invite your team', c: '#546e7a' },
  { t: 'room.invite(["alice@dev.io", "bob@dev.io"]);', c: '#f78c6c' },
  { t: '', c: '' },
  { t: 'room.on("code-change", (delta) => {', c: '#82aaff' },
  { t: '  editor.applyDelta(delta); // real-time ✓', c: '#c3e88d' },
  { t: '});', c: '#82aaff' },
];

const CURSORS = [
  { name: 'Alice', color: '#f472b6', line: 4 },
  { name: 'Bob', color: '#34d399', line: 10 },
];

function CodeDemo() {
  const [shown, setShown] = useState(0);
  const [char, setChar] = useState(0);

  useEffect(() => {
    if (shown >= DEMO_LINES.length) return;
    const line = DEMO_LINES[shown];
    if (char < line.t.length) {
      const t = setTimeout(() => setChar(c => c + 1), 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setShown(s => s + 1); setChar(0); }, line.t === '' ? 60 : 100);
    return () => clearTimeout(t);
  }, [shown, char]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60 bg-[#0e0e12]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-1.5">
          {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c, opacity: 0.7 }} />)}
        </div>
        <span className="text-xs text-white/30 ml-2 font-mono flex items-center gap-1.5"><Terminal size={11} />main.ts</span>
        <div className="ml-auto flex items-center gap-1.5">
          {CURSORS.map(cu => (
            <div key={cu.name} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: cu.color + '20', color: cu.color, border: `1px solid ${cu.color}40` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cu.color }} />
              {cu.name}
            </div>
          ))}
        </div>
      </div>

      {/* Code */}
      <div className="px-5 py-5 font-mono text-[13px] leading-7 min-h-[260px] relative">
        {DEMO_LINES.slice(0, shown).map((ln, i) => (
          <div key={i} className="relative">
            <span className="select-none text-white/15 mr-4 text-xs">{String(i + 1).padStart(2, ' ')}</span>
            <span style={{ color: ln.c || 'transparent' }}>{ln.t || '\u00a0'}</span>
            {/* Inline cursors */}
            {CURSORS.filter(cu => cu.line === i).map(cu => (
              <span key={cu.name} className="inline-flex items-center gap-1 ml-2 text-[10px] px-1.5 py-0.5 rounded font-sans"
                style={{ backgroundColor: cu.color + '25', color: cu.color }}>
                {cu.name}
              </span>
            ))}
          </div>
        ))}
        {shown < DEMO_LINES.length && (
          <div>
            <span className="select-none text-white/15 mr-4 text-xs">{String(shown + 1).padStart(2, ' ')}</span>
            <span style={{ color: DEMO_LINES[shown].c || '#888' }}>{DEMO_LINES[shown].t.slice(0, char)}</span>
            <motion.span className="inline-block w-[2px] h-[14px] bg-indigo-400 ml-px align-middle"
              animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-5 py-2 border-t border-white/[0.05] bg-indigo-600/10 text-[11px] text-indigo-300/70 font-mono">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>
        <span>TypeScript</span>
        <span className="ml-auto flex items-center gap-1"><Users size={10} />2 collaborators</span>
      </div>
    </div>
  );
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
  );
}

// ─── Bento Card ───────────────────────────────────────────────────────────────
function BentoCard({ icon: Icon, title, desc, color, className = '', children }: {
  icon: React.ElementType; title: string; desc: string; color: string; className?: string; children?: React.ReactNode;
}) {
  return (
    <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden group p-6 ${className}`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${color}12 0%, transparent 65%)` }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <h3 className="text-white font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
      {children}
    </motion.div>
  );
}

// ─── Step ────────────────────────────────────────────────────────────────────
function Step({ n, title, desc, icon: Icon, color }: { n: number; title: string; desc: string; icon: React.ElementType; color: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: (n - 1) * 0.12 }}
      className="flex gap-5 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm relative"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}35`, color }}>
        {n}
        <div className="absolute -right-[1px] top-full h-full w-[1px] mt-1"
          style={{ background: `linear-gradient(to bottom, ${color}40, transparent)`, display: n === 3 ? 'none' : 'block' }} />
      </div>
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} style={{ color }} />
          <span className="text-white font-semibold text-sm">{title}</span>
        </div>
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Marquee ─────────────────────────────────────────────────────────────────
const LANGS = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'C++', 'Java', 'Ruby', 'PHP', 'C#', 'HTML', 'CSS', 'Bash', 'C'];
function LangMarquee() {
  const doubled = [...LANGS, ...LANGS];
  return (
    <div className="overflow-hidden relative py-4 border-y border-white/[0.05]">
      <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-[#060608] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-[#060608] to-transparent z-10 pointer-events-none" />
      <motion.div className="flex gap-8" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((l, i) => (
          <span key={i} className="flex items-center gap-2 text-xs text-white/30 font-medium flex-shrink-0">
            <Code2 size={11} className="text-indigo-500/50" />{l}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const scrolled = useScrolled();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOp = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-x-hidden">
      <MeshBackground />

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <motion.nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#060608]/80 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-lg font-bold">
            <span className="text-white">Code</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Ship</span>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm text-white/50">
            {['Features', 'How it works', 'Languages'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-white/60 hover:text-white transition-colors font-medium">Sign in</Link>
            <Link href="/auth"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} id="hero" className="relative min-h-screen flex items-center pt-16">
        <motion.div style={{ y: heroY, opacity: heroOp }}
          className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-24">

          {/* Left */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-6">
                <Sparkles size={11} /><span>Real-time collaboration, built for developers</span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold tracking-[-0.03em] leading-[1.04]">
                Code together,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  ship faster.
                </span>
              </h1>

              <p className="mt-5 text-white/45 text-lg leading-relaxed max-w-lg">
                Collaborative coding rooms with live sync, multi-cursor editing, built-in chat, and an instant code runner - no setup required.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-wrap gap-3">
              <Link href="/auth"
                className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all shadow-xl shadow-indigo-500/25 text-sm">
                Start coding free
                <motion.span className="inline-block" animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight size={15} />
                </motion.span>
              </Link>
              <a href="#how-it-works"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white font-semibold transition-all text-sm">
                See how it works
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex items-center gap-6 pt-2">
              {[
                { icon: Globe, label: '14 languages' },
                { icon: Users, label: 'Multi-cursor live' },
                { icon: Lock, label: 'Auth protected' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-white/30">
                  <Icon size={12} className="text-white/20" />{label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Code Demo */}
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <CodeDemo />
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="text-[10px] text-white/20 tracking-widest uppercase font-medium">Scroll</div>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* ── Language Marquee ─────────────────────────────────────────── */}
      <LangMarquee />

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="py-16 border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { val: '14', label: 'Languages' },
            { val: '<50ms', label: 'Sync latency' },
            { val: '∞', label: 'Collaborators' },
            { val: '100%', label: 'Free to use' },
          ].map(({ val, label }, i) => (
            <Reveal key={label} delay={i * 0.08} className="space-y-2">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{val}</div>
              <div className="text-sm text-white/35 font-medium">{label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features Bento ───────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-4">
              <Zap size={11} />Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Everything you need to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">collaborate at speed</span>
            </h2>
          </Reveal>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large card */}
            <Reveal delay={0} className="md:col-span-2">
              <BentoCard icon={Zap} title="Real-Time Code Sync" color="#6366f1" className="h-full"
                desc="Every keystroke is broadcast to all collaborators in under 50ms via WebSocket. Powered by Redis for instant persistence.">
                <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/[0.06] font-mono text-xs text-indigo-300/70">
                  <div><span className="text-white/25">// user A types</span></div>
                  <div>socket.emit(<span className="text-green-400">&apos;code-change&apos;</span>, {'{'} code, roomId {'}'});</div>
                  <div className="mt-1"><span className="text-white/25">// user B receives instantly</span></div>
                  <div>socket.on(<span className="text-pink-400">&apos;code-change&apos;</span>, sync);</div>
                </div>
              </BentoCard>
            </Reveal>

            <Reveal delay={0.08}>
              <BentoCard icon={Users} title="Multi-Cursor Editing" color="#8b5cf6" className="h-full"
                desc="See where each collaborator's cursor is in real time, with unique color-coded presence indicators." />
            </Reveal>

            <Reveal delay={0.12}>
              <BentoCard icon={MessageSquare} title="Persistent Live Chat" color="#ec4899" className="h-full"
                desc="Built-in room chat that persists messages. Discuss ideas without leaving the editor." />
            </Reveal>

            <Reveal delay={0.16} className="md:col-span-2">
              <BentoCard icon={Play} title="Instant Code Runner" color="#06b6d4" className="h-full"
                desc="Execute your code in 14 languages with a single click. Output appears inline - no context switching, no setup.">
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'Java'].map(l => (
                    <span key={l} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300/70 border border-cyan-500/20 font-mono">{l}</span>
                  ))}
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/30 border border-white/10">+7 more</span>
                </div>
              </BentoCard>
            </Reveal>

            <Reveal delay={0.2}>
              <BentoCard icon={Files} title="Multi-File Support" color="#10b981" className="h-full"
                desc="Create and switch between multiple files in a room. Each file syncs independently." />
            </Reveal>

            <Reveal delay={0.24}>
              <BentoCard icon={Lock} title="Secure by Default" color="#f59e0b" className="h-full"
                desc="JWT-protected rooms, rate limiting, and authenticated history - your code stays yours." />
            </Reveal>

            <Reveal delay={0.28} className="md:col-span-2">
              <BentoCard icon={Globe} title="Room History & Management" color="#a78bfa" className="h-full"
                desc="Every room you've joined is saved to your history. Owners can delete rooms; participants can remove themselves.">
                <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />TypeScript · 3h ago
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />Python · 1d ago
                  </div>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </BentoCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-medium mb-5">
                <Terminal size={11} />How it works
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-12">
                From zero to<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">collaborating in seconds.</span>
              </h2>
              <div className="space-y-10">
                <Step n={1} icon={Code2} color="#6366f1" title="Create a room" desc="Click 'Create New Room' and get a unique link instantly. No configuration needed." />
                <Step n={2} icon={Users} color="#8b5cf6" title="Invite collaborators" desc="Share the room ID or link with your team. They join with one click - no sign-up required to view." />
                <Step n={3} icon={Play} color="#10b981" title="Code, chat, run" desc="Edit together in real time, discuss in the sidebar, and run code without leaving the page." />
              </div>
            </Reveal>
          </div>

          {/* Visual */}
          <Reveal delay={0.2}>
            <div className="relative rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 overflow-hidden">
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, #4f46e520 0%, transparent 70%)' }} />
              <div className="relative space-y-4">
                {[
                  { step: '01', title: 'Room created', sub: 'room/f47c-3bda-...', color: '#6366f1', done: true },
                  { step: '02', title: 'Alice joined', sub: 'alice@dev.io · cursor #1', color: '#f472b6', done: true },
                  { step: '03', title: 'Bob joined', sub: 'bob@dev.io · cursor #2', color: '#34d399', done: true },
                  { step: '04', title: 'Live sync active', sub: '3 edits/sec · 0 conflicts', color: '#06b6d4', done: false },
                ].map((s, i) => (
                  <motion.div key={s.step}
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: s.color + '20', color: s.color, border: `1px solid ${s.color}35` }}>{s.step}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{s.title}</div>
                      <div className="text-xs text-white/35 mt-0.5 font-mono">{s.sub}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.done ? 'bg-green-400' : 'bg-green-400 animate-pulse'}`} />
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-[#060608] p-12 sm:p-20 text-center">
              {/* Orb inside CTA */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] bg-indigo-500/20 pointer-events-none" />
              <div className="relative">
                <h2 className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight mb-5">
                  Ready to build together?
                </h2>
                <p className="text-white/45 text-lg mb-10 max-w-xl mx-auto">
                  Create your first room in seconds. No credit card, no setup - just open the editor and share the link.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/auth"
                    className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base transition-all shadow-2xl shadow-indigo-500/30">
                    Start coding free
                    <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ArrowRight size={17} />
                    </motion.span>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-bold">
            <span className="text-white">Code</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Collab</span>
          </div>
          <p className="text-xs text-white/25">
            Built with Next.js · Socket.io · MongoDB · Redis
          </p>
          <div className="flex items-center gap-5 text-xs text-white/30">
            <Link href="/auth" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/auth" className="hover:text-white transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
