'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Copy, Download, Minus, Plus, ChevronDown, Sparkles, X,
  FileCode, CheckCircle, XCircle, Info, Clock, History,
  ChevronRight, Terminal, Eye, AlignLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import parserCss from 'prettier/plugins/postcss';
import parserHtml from 'prettier/plugins/html';

// ─── Constants ───────────────────────────────────────────────────────────────
const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java',
  'cpp', 'html', 'css', 'go', 'ruby', 'php', 'bash', 'csharp', 'c', 'rust',
];

const CURSOR_COLORS = [
  '#f87171', '#fb923c', '#facc15',
  '#4ade80', '#60a5fa', '#a78bfa', '#f472b6',
];

const EXTENSIONS: Record<string, string> = {
  javascript: 'js', typescript: 'ts', python: 'py',
  java: 'java', cpp: 'cpp', html: 'html', css: 'css',
  go: 'go', ruby: 'rb', php: 'php', bash: 'sh', csharp: 'cs', c: 'c', rust: 'rs',
};

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python',
  java: 'java', cpp: 'cpp', html: 'html', css: 'css',
  go: 'go', rb: 'ruby', php: 'php', sh: 'bash', cs: 'csharp', c: 'c', rs: 'rust',
};

// Languages that can accept stdin input
const STDIN_LANGS = new Set(['python', 'java', 'cpp', 'c', 'go', 'ruby', 'php', 'bash', 'csharp', 'rust']);

// ─── Types ───────────────────────────────────────────────────────────────────
interface IFile { id: string; name: string; language: string; }

interface RunEntry {
  id: string;
  language: string;
  output: string;
  isError: boolean;
  execTime?: string;
  timestamp: Date;
}

interface StatusMsg {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface CodeEditorProps {
  roomId: string;
  socket: Socket;
  onlineUsers: string[];
}

// ─── Inline status pill (replaces all floating toasts) ───────────────────────
function StatusPill({ status }: { status: StatusMsg | null }) {
  return (
    <AnimatePresence>
      {status && (
        <motion.div
          key={status.text}
          initial={{ opacity: 0, x: -10, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border flex-shrink-0',
            status.type === 'success' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            status.type === 'error'   && 'bg-red-500/10 border-red-500/20 text-red-400',
            status.type === 'info'    && 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          )}
        >
          {status.type === 'success' && <CheckCircle size={11} />}
          {status.type === 'error'   && <XCircle size={11} />}
          {status.type === 'info'    && <Info size={11} />}
          {status.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CodeEditor({ roomId, socket }: CodeEditorProps) {
  const { data: session } = useSession();

  // Editor state
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const [output, setOutput] = useState('');
  const [outputError, setOutputError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [outputOpen, setOutputOpen] = useState(true);

  // Inline status (replaces floating toasts)
  const [status, setStatus] = useState<StatusMsg | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showStatus = useCallback((type: StatusMsg['type'], text: string) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus({ type, text });
    statusTimerRef.current = setTimeout(() => setStatus(null), 2500);
  }, []);

  // Stdin
  const [stdin, setStdin] = useState('');
  const [stdinOpen, setStdinOpen] = useState(false);

  // Output tabs: 'output' | 'preview' | 'history'
  const [outputTab, setOutputTab] = useState<'output' | 'preview' | 'history'>('output');
  const [previewSrc, setPreviewSrc] = useState('');
  const [execTime, setExecTime] = useState<string | null>(null);

  // Run history
  const [runHistory, setRunHistory] = useState<RunEntry[]>([]);

  // File tabs
  const [files, setFiles] = useState<IFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const fileCodeCache = useRef<Record<string, string>>({});

  // Refs
  const skipNextUpdate = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);
  const activeFileIdRef = useRef<string | null>(null);

  useEffect(() => { activeFileIdRef.current = activeFileId; }, [activeFileId]);

  const getUserColor = (userId: string) =>
    CURSOR_COLORS[userId.charCodeAt(0) % CURSOR_COLORS.length];

  const debouncedEmitCode = useRef(
    debounce((newCode: string, fileId: string | null) => {
      socket.emit('code-change', { roomId, code: newCode, fileId });
    }, 200)
  ).current;

  // ─── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    socket.on('load-room-data', ({ code: savedCode, language: savedLang, files: savedFiles }) => {
      const loadedFiles: IFile[] = savedFiles || [];
      setFiles(loadedFiles);
      setCode(savedCode || '// Start coding...');
      setLanguage(savedLang || 'javascript');
      setActiveFileId(null);
      fileCodeCache.current = {};
    });

    socket.on('code-change', ({ code: newCode, fileId }) => {
      if (fileId) {
        fileCodeCache.current[fileId] = newCode;
        if (fileId === activeFileIdRef.current) {
          skipNextUpdate.current = true;
          setCode(newCode);
        }
      } else {
        skipNextUpdate.current = true;
        setCode(newCode);
      }
    });

    socket.on('file-added', ({ file }: { file: IFile }) => {
      setFiles(prev => {
        if (prev.find(f => f.id === file.id)) return prev;
        return [...prev, file];
      });
      fileCodeCache.current[file.id] = '';
    });

    socket.on('file-deleted', ({ fileId }: { fileId: string }) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      delete fileCodeCache.current[fileId];
      if (activeFileIdRef.current === fileId) {
        setActiveFileId(null);
        setCode('// Start coding...');
      }
    });

    socket.on('file-code', ({ fileId, code: fileCode }: { fileId: string; code: string }) => {
      fileCodeCache.current[fileId] = fileCode || '';
      if (fileId === activeFileIdRef.current) {
        skipNextUpdate.current = true;
        setCode(fileCode || '// Start coding...');
      }
    });

    socket.on('user-typing', ({ user }: { user: string }) => {
      setTypingUser(user);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
    });

    socket.on('language-change', ({ language: newLang }: { language: string }) => {
      setLanguage(newLang);
      showStatus('info', `Language: ${newLang}`);
    });

    socket.on('cursor-update', ({ userId, userName, position, color }) => {
      if (!editorRef.current) return;
      const newDecorations = editorRef.current.deltaDecorations(decorationsRef.current, [{
        range: new (window as any).monaco.Range(
          position.lineNumber, position.column,
          position.lineNumber, position.column + 1
        ),
        options: {
          className: `cursor-${userId}`,
          afterContentClassName: `cursor-label-${userId}`,
          zIndex: 100,
        }
      }]);
      decorationsRef.current = newDecorations;
      const styleId = `cursor-style-${userId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .cursor-${userId} { border-left: 2px solid ${color}; }
          .cursor-label-${userId}::after { content: '${userName}'; background: ${color}; color: #000; font-size: 10px; padding: 0 4px; border-radius: 2px; }
        `;
        document.head.appendChild(style);
      }
    });

    return () => {
      socket.off('load-room-data');
      socket.off('code-change');
      socket.off('file-added');
      socket.off('file-deleted');
      socket.off('file-code');
      socket.off('user-typing');
      socket.off('language-change');
      socket.off('cursor-update');
    };
  }, [socket, showStatus]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);
    if (activeFileIdRef.current) fileCodeCache.current[activeFileIdRef.current] = value;
    if (skipNextUpdate.current) { skipNextUpdate.current = false; return; }
    debouncedEmitCode(value, activeFileIdRef.current);
    const userName = localStorage.getItem('userName') || session?.user?.name || 'User';
    socket.emit('typing', { roomId, user: userName });
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    socket.emit('language-change', { roomId, language: newLang });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    showStatus('success', 'Copied!');
  };

  const handleExport = () => {
    const ext = EXTENSIONS[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFileId
      ? (files.find(f => f.id === activeFileId)?.name || `code.${ext}`)
      : `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', 'Exported!');
  };

  const handleFormat = async () => {
    try {
      const plugins: any[] = [parserEstree];
      let parser = 'babel';
      if (language === 'typescript') { parser = 'typescript'; plugins.push(parserTypescript); }
      else if (language === 'css') { parser = 'css'; plugins.push(parserCss); }
      else if (language === 'html') { parser = 'html'; plugins.push(parserHtml); }
      else { plugins.push(parserBabel); }
      const formatted = await prettier.format(code, { parser, plugins, semi: true, singleQuote: true, tabWidth: 2 });
      setCode(formatted);
      socket.emit('code-change', { roomId, code: formatted, fileId: activeFileId });
      showStatus('success', 'Formatted!');
    } catch {
      showStatus('error', 'Cannot format this language');
    }
  };

  const handleAddFile = () => {
    const name = prompt('File name (e.g. index.html):');
    if (!name?.trim()) return;
    const ext = name.split('.').pop() || 'js';
    const fileLang = LANG_MAP[ext] || 'javascript';
    const file: IFile = { id: uuidv4(), name: name.trim(), language: fileLang };
    fileCodeCache.current[file.id] = '';
    socket.emit('add-file', { roomId, file });
    setActiveFileId(file.id);
    setLanguage(fileLang);
    setCode('');
  };

  const handleSwitchFile = (fileId: string, fileLang: string) => {
    if (activeFileIdRef.current) {
      fileCodeCache.current[activeFileIdRef.current] = code;
      socket.emit('code-change', { roomId, code, fileId: activeFileIdRef.current });
    }
    setActiveFileId(fileId);
    setLanguage(fileLang);
    const cached = fileCodeCache.current[fileId];
    if (cached !== undefined) {
      setCode(cached || '// Start coding...');
    } else {
      setCode('// Loading...');
      socket.emit('switch-file', { roomId, fileId });
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    socket.emit('delete-file', { roomId, fileId });
  };

  // ─── Build HTML for preview/new-tab ───────────────────────────────────────
  const buildHtmlContent = () => {
    if (files.length > 0) {
      const htmlFile = files.find(f => f.language === 'html');
      const cssFiles  = files.filter(f => f.language === 'css');
      const jsFiles   = files.filter(f => f.language === 'javascript' || f.language === 'typescript');
      if (htmlFile) {
        let html = fileCodeCache.current[htmlFile.id] || '';
        const cssContent = cssFiles.map(f => fileCodeCache.current[f.id] || '').join('\n');
        const jsContent  = jsFiles.map(f => fileCodeCache.current[f.id] || '').join('\n');
        if (cssContent) html = html.includes('</head>') ? html.replace('</head>', `<style>${cssContent}</style></head>`) : `<style>${cssContent}</style>` + html;
        if (jsContent)  html = html.includes('</body>') ? html.replace('</body>', `<script>${jsContent}</script></body>`) : html + `<script>${jsContent}</script>`;
        return html;
      }
    }
    return language === 'css' ? `<style>${code}</style><div style="padding:16px;font-family:sans-serif">CSS Preview</div>` : code;
  };

  // ─── Run ──────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    setLoading(true);
    setOutput('');
    setOutputError(false);
    setExecTime(null);
    setOutputOpen(true);

    if (activeFileIdRef.current) fileCodeCache.current[activeFileIdRef.current] = code;

    const activeFile = files.find(f => f.id === activeFileId);
    const isHtmlRun = language === 'html' || activeFile?.language === 'html';
    const isCssRun  = language === 'css' && !isHtmlRun;

    if (isHtmlRun || isCssRun) {
      const htmlContent = buildHtmlContent();
      setPreviewSrc(htmlContent);
      setOutputTab('preview');
      showStatus('success', 'Preview ready');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, language, stdin }),
      });

      if (res.status === 401) { showStatus('error', 'Session expired'); setLoading(false); return; }
      if (res.status === 429) { showStatus('error', 'Too many requests'); setLoading(false); return; }

      const result = await res.json();
      const isError = result.status?.description !== 'Accepted';
      const out = isError
        ? (result.compile_output || result.stderr || 'Compilation failed.')
        : (result.stdout?.trim() || 'No output.');
      const time = result.time ? `${result.time}s` : null;

      setOutput(out);
      setOutputError(isError);
      setExecTime(time);
      setOutputTab('output');

      // Push to history (keep last 5)
      const entry: RunEntry = {
        id: uuidv4(), language, output: out,
        isError, execTime: time ?? undefined, timestamp: new Date(),
      };
      setRunHistory(prev => [entry, ...prev].slice(0, 5));

      showStatus(isError ? 'error' : 'success', isError ? 'Compilation failed' : `Done${time ? ` · ${time}` : ''}`);
    } catch {
      setOutput('Error connecting to compiler.');
      setOutputError(true);
      showStatus('error', 'Compiler unreachable');
    } finally {
      setLoading(false);
    }
  };

  const isHtmlOrCss = language === 'html' || language === 'css'
    || files.some(f => f.language === 'html');

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="h-10 bg-[#111111] border-b border-white/[0.06] flex items-center gap-2 px-3 shrink-0 overflow-x-auto">

        {/* Language selector */}
        <div className="relative flex items-center flex-shrink-0">
          <select value={language} onChange={e => handleLanguageChange(e.target.value)}
            className="appearance-none bg-white/5 text-white/70 text-xs border border-white/10 rounded px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer font-mono">
            {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 text-white/30 pointer-events-none" />
        </div>

        <Separator orientation="vertical" className="h-4 bg-white/10 flex-shrink-0" />

        {/* Run */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleRun} disabled={loading} size="sm"
              className="h-7 px-3 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 flex-shrink-0">
              <Play size={11} className={cn('mr-1.5', loading && 'animate-spin')} />
              {loading ? 'Running' : 'Run'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Run code (Ctrl+Enter)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 bg-white/10 flex-shrink-0" />

        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCopy}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5 flex-shrink-0">
              <Copy size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy code</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleExport}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5 flex-shrink-0">
              <Download size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export file</TooltipContent>
        </Tooltip>

        {/* Format */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleFormat}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5 flex-shrink-0">
              <AlignLeft size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Format code</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 bg-white/10 flex-shrink-0" />

        {/* Font size */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setFontSize(s => Math.max(10, s - 1))}
            className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 rounded transition-colors">
            <Minus size={10} />
          </button>
          <span className="text-[11px] text-white/30 w-5 text-center font-mono">{fontSize}</span>
          <button onClick={() => setFontSize(s => Math.min(24, s + 1))}
            className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 rounded transition-colors">
            <Plus size={10} />
          </button>
        </div>

        {/* ── Inline status pill ── */}
        <StatusPill status={status} />

        {/* Typing indicator (pushed to right) */}
        {typingUser && (
          <span className="ml-auto text-[11px] text-white/25 animate-pulse font-mono flex-shrink-0">
            {typingUser} is typing…
          </span>
        )}
      </div>

      {/* ── File Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center bg-[#0a0a0a] border-b border-white/[0.06] overflow-x-auto shrink-0">
        {files.map(file => (
          <div key={file.id}
            onClick={() => handleSwitchFile(file.id, file.language)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-white/[0.06] shrink-0 group transition-colors',
              activeFileId === file.id
                ? 'bg-[#1a1a1a] text-white/80 border-t border-t-indigo-500'
                : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
            )}>
            <FileCode size={11} />
            <span className="font-mono">{file.name}</span>
            <button onClick={e => { e.stopPropagation(); handleDeleteFile(file.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-1">
              <X size={10} />
            </button>
          </div>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleAddFile}
              className="px-3 py-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.03] transition-colors shrink-0">
              <Plus size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add file</TooltipContent>
        </Tooltip>
      </div>

      {/* ── Stdin input (collapsible, only for relevant languages) ───── */}
      {STDIN_LANGS.has(language) && (
        <div className="border-b border-white/[0.06] bg-[#0a0a0a] shrink-0">
          <button onClick={() => setStdinOpen(o => !o)}
            className="w-full h-7 flex items-center gap-2 px-3 text-[11px] text-white/25 hover:text-white/45 transition-colors font-mono">
            <ChevronRight size={10} className={cn('transition-transform', stdinOpen && 'rotate-90')} />
            STDIN INPUT
            {stdin && <span className="text-indigo-400/60 ml-1">(has input)</span>}
          </button>
          {stdinOpen && (
            <div className="px-3 pb-2">
              <textarea
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Type program input here (one value per line)..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/60 placeholder-white/20 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/30 resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Monaco Editor ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden"
        onMouseMove={() => {
          const position = editorRef.current?.getPosition();
          if (!position) return;
          const userId = localStorage.getItem('userId') || 'anon';
          const userName = localStorage.getItem('userName') || session?.user?.name || 'User';
          socket.emit('cursor-move', { roomId, userId, userName, position, color: getUserColor(userId) });
        }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          onMount={editor => { editorRef.current = editor; }}
          options={{
            fontSize,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            formatOnPaste: true,
            padding: { top: 12 },
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* ── Output Panel ─────────────────────────────────────────────── */}
      <div className={cn('border-t border-white/[0.06] bg-[#0a0a0a] shrink-0 transition-all', outputOpen ? 'h-44' : 'h-8')}>

        {/* Output panel header with tabs */}
        <div className="h-8 flex items-center border-b border-white/[0.04]">
          <button onClick={() => setOutputOpen(o => !o)}
            className="h-8 flex items-center gap-2 px-3 text-[11px] text-white/30 hover:text-white/50 transition-colors font-mono flex-shrink-0">
            <ChevronDown size={11} className={cn('transition-transform', !outputOpen && '-rotate-90')} />
          </button>

          {outputOpen && (
            <>
              {/* Tabs */}
              {[
                { id: 'output',  icon: Terminal,  label: 'Output'  },
                { id: 'preview', icon: Eye,        label: 'Preview', show: isHtmlOrCss },
                { id: 'history', icon: History,    label: `History${runHistory.length > 0 ? ` (${runHistory.length})` : ''}` },
              ].filter(t => t.show !== false).map(tab => (
                <button key={tab.id}
                  onClick={() => { setOutputTab(tab.id as any); setOutputOpen(true); }}
                  className={cn(
                    'h-8 px-3 text-[11px] font-mono flex items-center gap-1.5 border-r border-white/[0.04] transition-colors flex-shrink-0',
                    outputTab === tab.id
                      ? 'text-white/70 border-b-2 border-b-indigo-500 bg-white/[0.02]'
                      : 'text-white/25 hover:text-white/45'
                  )}>
                  <tab.icon size={10} />
                  {tab.label}
                </button>
              ))}

              {/* Exec time */}
              {execTime && outputTab === 'output' && (
                <span className="ml-auto mr-3 flex items-center gap-1 text-[10px] text-white/20 font-mono flex-shrink-0">
                  <Clock size={9} />{execTime}
                </span>
              )}
              {outputError && outputTab === 'output' && (
                <span className="ml-auto mr-3 text-red-400/50 text-[10px] font-mono flex-shrink-0">error</span>
              )}
            </>
          )}
        </div>

        {/* Panel content */}
        {outputOpen && (
          <>
            {/* Output tab */}
            {outputTab === 'output' && (
              <ScrollArea className="h-36 px-3 py-2">
                <pre className={cn(
                  'text-xs font-mono whitespace-pre-wrap leading-relaxed',
                  outputError ? 'text-red-400/80' : 'text-emerald-400/80'
                )}>
                  {output || 'Run your code to see output here…'}
                </pre>
              </ScrollArea>
            )}

            {/* Preview tab */}
            {outputTab === 'preview' && (
              previewSrc
                ? <iframe
                    srcDoc={previewSrc}
                    sandbox="allow-scripts"
                    className="w-full h-36 border-0 bg-white"
                    title="HTML Preview"
                  />
                : <div className="h-36 flex items-center justify-center text-xs text-white/20 font-mono">
                    Run HTML/CSS to see preview
                  </div>
            )}

            {/* History tab */}
            {outputTab === 'history' && (
              <ScrollArea className="h-36">
                {runHistory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-white/20 font-mono">
                    No runs yet
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {runHistory.map(entry => (
                      <div key={entry.id} className="px-3 py-2 flex items-start gap-3 group hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => { setOutput(entry.output); setOutputError(entry.isError); setOutputTab('output'); }}>
                        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', entry.isError ? 'bg-red-400' : 'bg-emerald-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] text-white/40 font-mono">{entry.language}</span>
                            {entry.execTime && <span className="text-[10px] text-white/20 font-mono flex items-center gap-1"><Clock size={8} />{entry.execTime}</span>}
                            <span className="text-[10px] text-white/15 font-mono ml-auto">
                              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <pre className={cn('text-[11px] font-mono truncate', entry.isError ? 'text-red-400/60' : 'text-emerald-400/60')}>
                            {entry.output.split('\n')[0]}
                          </pre>
                        </div>
                        <ChevronRight size={10} className="text-white/15 group-hover:text-white/40 transition mt-1 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </>
        )}
      </div>
    </div>
  );
}