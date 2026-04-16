'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type RoomEntry = {
  _id: string;
  roomId: string;
  language: string;
  lastActivity: string;
  updatedAt: string;
  createdBy?: string;
  files?: { id: string; name: string; language: string }[];
  participants?: string[];
};

const LANGUAGE_ICONS: Record<string, string> = {
  javascript: '🟨',
  typescript: '🔷',
  python: '🐍',
  java: '☕',
  cpp: '⚙️',
  c: '🔩',
  go: '🩵',
  rust: '🦀',
  php: '🐘',
  ruby: '💎',
  html: '🌐',
  css: '🎨',
  bash: '🖥️',
  csharp: '🟣',
};

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#f7df1e',
  typescript: '#3178c6',
  python: '#3572A5',
  java: '#b07219',
  cpp: '#f34b7d',
  c: '#555555',
  go: '#00ADD8',
  rust: '#dea584',
  php: '#4F5D95',
  ruby: '#701516',
  html: '#e34c26',
  css: '#563d7c',
  bash: '#89e051',
  csharp: '#178600',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function waitForAuthCredentials(
  timeoutMs = 8000,
  intervalMs = 300
): Promise<{ token: string; userId: string } | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      if (token && userId) { resolve({ token, userId }); return; }
      if (Date.now() - start >= timeoutMs) { resolve(null); return; }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  isCreator,
  roomId,
  onConfirm,
  onCancel,
  loading,
}: {
  isCreator: boolean;
  roomId: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="text-3xl mb-3">{isCreator ? '🗑️' : '🚪'}</div>
        <h2 className="text-lg font-semibold text-white mb-1">
          {isCreator ? 'Delete Room?' : 'Leave Room?'}
        </h2>
        <p className="text-sm text-white/50 mb-5">
          {isCreator
            ? <>You created this room. Deleting it will <span className="text-red-400 font-medium">permanently remove</span> it for everyone.</>
            : <>You&apos;ll be removed from <span className="font-mono text-white/70 text-xs">{roomId}</span>. The room will still exist for its creator.</>
          }
        </p>
        <div className="flex gap-2">
          <button
            id="confirm-cancel-btn"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="confirm-action-btn"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${isCreator
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
          >
            {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isCreator ? 'Delete Room' : 'Leave Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'language'>('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Delete/leave confirm state
  const [confirmRoom, setConfirmRoom] = useState<RoomEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    const creds = await waitForAuthCredentials();
    if (!creds) {
      setError('Not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    const { token, userId } = creds;
    setCurrentUserId(userId);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          setError('Session expired. Please log out and log back in.');
        } else {
          setError(`Failed to load history (${res.status}).`);
        }
        setLoading(false);
        return;
      }

      const data: RoomEntry[] = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    fetchRooms();
  }, [sessionStatus, fetchRooms]);

  // ── Delete / Leave ──────────────────────────────────────────────────────────
  const handleDeleteOrLeave = async () => {
    if (!confirmRoom) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${confirmRoom.roomId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Delete/leave failed:', body.message);
        return;
      }

      // Remove from local list
      setRooms((prev) => prev.filter((r) => r.roomId !== confirmRoom.roomId));
    } catch (err) {
      console.error('Delete/leave error:', err);
    } finally {
      setDeleteLoading(false);
      setConfirmRoom(null);
    }
  };

  const uniqueLanguages = useMemo(() => {
    return [...new Set(rooms.map((r) => r.language).filter(Boolean))].sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    if (filterLang !== 'all') result = result.filter((r) => r.language === filterLang);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.roomId.toLowerCase().includes(q) || r.language?.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.lastActivity || b.updatedAt).getTime() - new Date(a.lastActivity || a.updatedAt).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.lastActivity || a.updatedAt).getTime() - new Date(b.lastActivity || b.updatedAt).getTime());
    } else {
      result.sort((a, b) => (a.language || '').localeCompare(b.language || ''));
    }
    return result;
  }, [rooms, search, filterLang, sortBy]);

  const copyRoomId = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedId(roomId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      {/* Confirm dialog */}
      {confirmRoom && (
        <ConfirmDialog
          isCreator={confirmRoom.createdBy === currentUserId}
          roomId={confirmRoom.roomId}
          onConfirm={handleDeleteOrLeave}
          onCancel={() => setConfirmRoom(null)}
          loading={deleteLoading}
        />
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-[#111] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-blue-400">⏱</span> Room History
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {loading ? 'Loading…' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && !error && (
              <button
                id="refresh-btn"
                onClick={fetchRooms}
                title="Refresh"
                className="text-white/40 hover:text-white transition px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 bg-white/5 text-sm"
              >
                ↺ Refresh
              </button>
            )}
            <button
              id="back-to-home-btn"
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 bg-white/5"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
            <input
              id="room-search-input"
              type="text"
              placeholder="Search by Room ID or language…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
            />
          </div>
          <select
            id="language-filter-select"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition cursor-pointer min-w-[150px]"
          >
            <option value="all" className="bg-[#1a1a1a]">All Languages</option>
            {uniqueLanguages.map((lang) => (
              <option key={lang} value={lang} className="bg-[#1a1a1a]">
                {LANGUAGE_ICONS[lang] || '📄'} {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'language')}
            className="bg-white/5 border border-white/10 rounded-lg text-sm text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition cursor-pointer min-w-[140px]"
          >
            <option value="recent" className="bg-[#1a1a1a]">⬇ Most Recent</option>
            <option value="oldest" className="bg-[#1a1a1a]">⬆ Oldest First</option>
            <option value="language" className="bg-[#1a1a1a]">A–Z Language</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Loading your rooms…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-red-400 text-sm font-medium max-w-sm">{error}</p>
            <div className="flex gap-2 mt-2">
              <button id="retry-btn" onClick={fetchRooms} className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition">↺ Retry</button>
              <button id="go-home-error-btn" onClick={() => router.push('/home')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition">← Go Home</button>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">📂</span>
            <p className="text-white/60 font-medium">
              {rooms.length === 0 ? 'No rooms yet. Create or join one to get started!' : 'No rooms match your filters.'}
            </p>
            {rooms.length === 0 && (
              <button
                id="create-room-btn"
                onClick={() => router.push('/home')}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition font-medium"
              >
                ➕ Create Your First Room
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredRooms.map((room) => {
              const lang = room.language || 'javascript';
              const icon = LANGUAGE_ICONS[lang] || '📄';
              const color = LANGUAGE_COLORS[lang] || '#888';
              const activityDate = room.lastActivity || room.updatedAt;
              const fileCount = room.files?.length ?? 0;
              const isCreator = room.createdBy === currentUserId;

              return (
                <li
                  key={room._id || room.roomId}
                  id={`room-card-${room.roomId}`}
                  onClick={() => router.push(`/editor/${room.roomId}`)}
                  className="group relative bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
                >
                  {/* Language accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-70"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    {/* Left: icon + info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}
                      >
                        {icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
                          >
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </span>
                          {isCreator && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
                              👑 Owner
                            </span>
                          )}
                          {fileCount > 0 && (
                            <span className="text-xs text-white/40">📁 {fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 group/id">
                          <code className="text-xs text-white/55 font-mono truncate max-w-[180px] sm:max-w-[200px]">
                            {room.roomId}
                          </code>
                          <button
                            id={`copy-btn-${room.roomId}`}
                            onClick={(e) => copyRoomId(e, room.roomId)}
                            title="Copy Room ID"
                            className="opacity-0 group-hover/id:opacity-100 transition text-white/30 hover:text-white text-xs"
                          >
                            {copiedId === room.roomId ? '✅' : '📋'}
                          </button>
                        </div>

                        <p className="text-xs text-white/30 mt-1" title={formatFullDate(activityDate)}>
                          Last active {timeAgo(activityDate)}
                        </p>
                      </div>
                    </div>

                    {/* Right: delete/leave + arrow */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        id={`delete-btn-${room.roomId}`}
                        onClick={(e) => { e.stopPropagation(); setConfirmRoom(room); }}
                        title={isCreator ? 'Delete room' : 'Leave room'}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-sm hover:bg-white/10 ${isCreator ? 'text-red-400 hover:text-red-300' : 'text-orange-400 hover:text-orange-300'
                          }`}
                      >
                        {isCreator ? '🗑️' : '🚪'}
                      </button>
                      <div className="text-white/20 group-hover:text-white/60 transition text-lg">→</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Stats footer */}
        {!loading && !error && rooms.length > 0 && (
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/25">
            <span>Showing {filteredRooms.length} of {rooms.length} rooms</span>
            <span>{uniqueLanguages.length} language{uniqueLanguages.length !== 1 ? 's' : ''} used</span>
          </div>
        )}
      </div>
    </div>
  );
}
