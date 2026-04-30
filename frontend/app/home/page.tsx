'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  useInView,
} from 'motion/react';
import Image from 'next/image';
import {
  Plus, Link2, History, Zap, MessageSquare, Play,
  Files, ArrowRight, Copy, Check, Terminal, Users,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ── Types ─────────────────────────────────────────────────────────────────────
type RecentRoom = {
  roomId: string;
  language: string;
  lastActivity?: string;
  createdAt?: string;
  files?: { id: string }[];
};

const LANG_COLOR: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3572A5',
  java: '#b07219', cpp: '#f34b7d', c: '#555', go: '#00ADD8',
  rust: '#dea584', php: '#4F5D95', ruby: '#701516', html: '#e34c26',
  css: '#563d7c', bash: '#89e051', csharp: '#178600',
};
const LANG_ICON: Record<string, string> = {
  javascript: 'JS', typescript: 'TS', python: 'PY', java: 'JV',
  cpp: 'C++', c: 'C', go: 'GO', rust: 'RS', php: 'PHP',
  ruby: 'RB', html: 'HT', css: 'CS', bash: 'SH', csharp: 'C#',
};

function timeAgo(d?: string) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (isNaN(s) || s < 0) return '';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Animated Code Preview ────────────────────────────────────────────────────
const CODE = [
  { txt: "const room = await CodeShip.create({", c: "#c792ea" },
  { txt: '  language: "typescript",', c: "#c3e88d" },
  { txt: '  name: "my-project",', c: "#c3e88d" },
  { txt: "});", c: "#c792ea" },
  { txt: "", c: "" },
  { txt: "room.on('user-joined', (user) => {", c: "#82aaff" },
  { txt: "  console.log(`${user.name} joined`);", c: "#f78c6c" },
  { txt: "});", c: "#82aaff" },
  { txt: "", c: "" },
  { txt: "room.sync(); // Real-time ✓", c: "#546e7a" },
];

function CodePreview() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const currentLine = CODE[visibleLines];
    if (!currentLine) { setDone(true); return; }

    if (charIdx < currentLine.txt.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), 28);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setVisibleLines(l => l + 1);
        setCharIdx(0);
      }, currentLine.txt === '' ? 80 : 120);
      return () => clearTimeout(t);
    }
  }, [visibleLines, charIdx, done]);

  return (
    <div className="font-mono text-[13px] leading-6 select-none">
      {CODE.slice(0, visibleLines).map((line, i) => (
        <div key={i} style={{ color: line.c || 'transparent' }}>&nbsp;{line.txt || '\u00a0'}</div>
      ))}
      {visibleLines < CODE.length && (
        <div style={{ color: CODE[visibleLines].c || '#888' }}>
          &nbsp;{CODE[visibleLines].txt.slice(0, charIdx)}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-[2px] h-[14px] bg-indigo-400 ml-[1px] align-middle"
          />
        </div>
      )}
    </div>
  );
}

// ── Background Orbs ────────────────────────────────────────────────────────
const ORBS = [
  { color: '#4f46e5', x: '8%', y: '30%', size: 500, dur: 20 },
  { color: '#7c3aed', x: '80%', y: '15%', size: 400, dur: 25 },
  { color: '#0891b2', x: '65%', y: '70%', size: 320, dur: 18 },
  { color: '#be185d', x: '15%', y: '80%', size: 280, dur: 22 },
  { color: '#059669', x: '90%', y: '55%', size: 200, dur: 28 },
];

function Orbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {ORBS.map((o, i) => (
        <motion.div key={i}
          className="absolute rounded-full blur-[120px] opacity-[0.09]"
          style={{ left: o.x, top: o.y, width: o.size, height: o.size, backgroundColor: o.color, translateX: '-50%', translateY: '-50%' }}
          animate={{ x: [0, 40, -25, 20, 0], y: [0, -30, 25, -15, 0] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
        />
      ))}
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  );
}

// ── Magnetic Button ────────────────────────────────────────────────────────
function MagBtn({ children, onClick, className, id, disabled }: {
  children: React.ReactNode; onClick?: () => void; className?: string; id?: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  const move = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.2);
    y.set((e.clientY - r.top - r.height / 2) * 0.2);
  };
  return (
    <motion.button ref={ref} id={id} style={{ x: sx, y: sy }}
      onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.96 }} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </motion.button>
  );
}

// ── Language Marquee ────────────────────────────────────────────────────────
const LANGS = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'C++', 'Java', 'Ruby', 'PHP', 'C#', 'HTML', 'CSS', 'Bash', 'C'];
function Marquee() {
  const doubled = [...LANGS, ...LANGS];
  return (
    <div className="overflow-hidden border-t border-white/[0.06] py-3 relative">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0d0d0d] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((lang, i) => (
          <span key={i} className="flex items-center gap-2 text-xs text-white/30 font-medium flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
            {lang}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function Feat({ icon: Icon, title, desc, color, delay }: {
  icon: React.ElementType; title: string; desc: string; color: string; delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -5, scale: 1.01 }}
      className="relative flex flex-col gap-3 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden group cursor-default"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at top left, ${color}10 0%, transparent 60%)` }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <div className="text-sm font-semibold text-white mb-0.5">{title}</div>
        <div className="text-xs text-white/40 leading-relaxed">{desc}</div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [joinId, setJoinId] = useState('');
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [shake, setShake] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.name) setUserName(session.user.name);
    else { const n = localStorage.getItem('userName'); if (n) setUserName(n); }
    if (session?.user?.image) setAvatar(session.user.image);
  }, [session]);

  const fetchRooms = useCallback(async () => {
    await new Promise(r => setTimeout(r, 900));
    const uid = localStorage.getItem('userId');
    const tok = localStorage.getItem('token');
    if (!uid || !tok) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${uid}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return;
      const data: RecentRoom[] = await res.json();
      setRooms(Array.isArray(data) ? data.slice(0, 4) : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const createRoom = async () => {
    setCreating(true);
    await new Promise(r => setTimeout(r, 300));
    router.push(`/editor/${uuidv4()}`);
  };

  const joinRoom = () => {
    if (!joinId.trim()) {
      setShake(true); setTimeout(() => setShake(false), 500);
      inputRef.current?.focus(); return;
    }
    router.push(`/editor/${joinId.trim()}`);
  };

  const copyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/editor/${id}`);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const first = userName.split(' ')[0];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative min-h-[calc(100vh-56px)] bg-[#0d0d0d] text-white overflow-hidden">
        <Orbs />

        {/* ── Two-Column Hero ───────────────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] min-h-[calc(100vh-56px)]">

          {/* LEFT ─ Hero + Actions */}
          <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12 gap-10">

            {/* Greeting */}
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-4">
              {/* Avatar row */}
              <div className="flex items-center gap-3">
                {avatar ? (
                  <motion.div className="relative" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
                    <div className="absolute inset-0 rounded-full" style={{ margin: '-4px', border: '1.5px solid rgba(99,102,241,0.5)' }}>
                      <motion.div className="absolute inset-0 rounded-full border border-indigo-500/30"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.5, repeat: Infinity }} />
                    </div>
                    <Image src={avatar} alt={userName} width={44} height={44} className="rounded-full ring-1 ring-indigo-500/40" />
                  </motion.div>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-base">
                    {first?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="text-sm text-white/40 font-medium">
                  Hey {first || 'there'} &mdash;
                  <Badge variant="outline" className="ml-2 text-[10px] border-green-500/30 text-green-400 bg-green-500/10 py-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
                    Online
                  </Badge>
                </div>
              </div>

              {/* Big heading */}
              <div>
                <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.08]">
                  Code together,
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                    ship faster.
                  </span>
                </h1>
                <p className="mt-4 text-white/40 text-base sm:text-lg max-w-md leading-relaxed">
                  Collaborative rooms with live sync, chat, multi-file support - and a built-in code runner.
                </p>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }} className="space-y-4 max-w-lg">
              {/* Create + History */}
              <div className="flex gap-3">
                <MagBtn id="create-room-btn" onClick={createRoom} disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-xl shadow-indigo-500/25 disabled:opacity-70">
                  <AnimatePresence mode="wait">
                    {creating
                      ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</motion.span>
                      : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2"><Plus size={16} />Create New Room</motion.span>}
                  </AnimatePresence>
                </MagBtn>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button id="view-history-btn" onClick={() => router.push('/history')}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className="px-4 py-3.5 rounded-xl border border-white/12 bg-white/[0.05] hover:bg-white/[0.09] text-white/60 hover:text-white transition-all">
                      <History size={18} />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">View History</TooltipContent>
                </Tooltip>
              </div>

              {/* Join */}
              <div className="flex gap-2">
                <motion.div className="flex-1"
                  animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.45 }}>
                  <input ref={inputRef} id="join-input" type="text" placeholder="Paste a Room ID to join…"
                    value={joinId} onChange={e => setJoinId(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinRoom()}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/12 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition font-mono" />
                </motion.div>
                <motion.button id="join-room-btn" onClick={joinRoom}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  className="px-5 py-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/12 text-white/70 hover:text-white transition-all flex items-center gap-2 text-sm font-semibold flex-shrink-0">
                  <Link2 size={15} /> Join
                </motion.button>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="flex items-center gap-6 text-xs text-white/30">
              {[
                { icon: Users, label: `${rooms.length > 0 ? rooms.length : '-'} recent rooms` },
                { icon: Files, label: '14 languages' },
                { icon: Terminal, label: 'Live runner' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon size={12} className="text-white/20" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT ─ Panel */}
          <div className="hidden lg:flex flex-col border-l border-white/[0.06] bg-white/[0.02] overflow-hidden">

            {/* Code preview */}
            <div className="flex-1 flex flex-col border-b border-white/[0.06]">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-white/25 ml-2 flex items-center gap-1.5"><Terminal size={11} /> room.ts</span>
              </div>
              <div className="flex-1 px-5 py-5 overflow-hidden">
                <CodePreview />
              </div>
            </div>

            {/* Recent Rooms */}
            <div className="flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Recent Rooms</span>
                <button onClick={() => router.push('/history')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1">
                  All <ChevronRight size={11} />
                </button>
              </div>

              <div className="flex flex-col divide-y divide-white/[0.04] overflow-y-auto">
                <AnimatePresence>
                  {rooms.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="px-5 py-8 text-center text-xs text-white/25 flex flex-col items-center gap-2">
                      <Files size={22} className="text-white/15" />
                      No rooms yet - create one!
                    </motion.div>
                  ) : rooms.map((room, i) => {
                    const lang = room.language || 'javascript';
                    const color = LANG_COLOR[lang] || '#888';
                    const label = LANG_ICON[lang] || lang.slice(0, 2).toUpperCase();
                    const ago = timeAgo(room.lastActivity || room.createdAt);
                    return (
                      <motion.div key={room.roomId}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                        className="group relative flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                        onClick={() => router.push(`/editor/${room.roomId}`)}>
                        {/* Lang badge */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: color + '18', border: `1px solid ${color}35`, color }}>
                          {label}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white/65 font-mono truncate">{room.roomId}</div>
                          <div className="text-[11px] text-white/30 mt-0.5">
                            {lang} {ago ? `· ${ago}` : ''}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={(e) => copyLink(e, room.roomId)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition">
                                {copied === room.roomId ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Copy link</TooltipContent>
                          </Tooltip>
                          <div className="text-white/20 hover:text-white/50 transition p-1.5">
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ── Language Marquee ─────────────────────────────────────────── */}
        <Marquee />

        {/* ── Feature Grid (full width) ─────────────────────────────── */}
        <div className="relative z-10 px-8 sm:px-12 lg:px-16 xl:px-20 py-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-white/25 font-medium uppercase tracking-widest">Everything you need</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Feat icon={Zap} title="Real-Time Sync" desc="All edits broadcast over WebSocket to every collaborator instantly." color="#6366f1" delay={0} />
            <Feat icon={MessageSquare} title="Live Chat" desc="Persistent room chat keeps conversation tied to your code." color="#8b5cf6" delay={0.08} />
            <Feat icon={Play} title="Code Runner" desc="Execute in 14 languages - output appears inline, no context switch." color="#06b6d4" delay={0.16} />
            <Feat icon={Files} title="Multi-File" desc="Create and manage multiple files per room with per-file sync." color="#10b981" delay={0.24} />
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}
