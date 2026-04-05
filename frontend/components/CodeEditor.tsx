// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import Editor from '@monaco-editor/react';
// import io from 'socket.io-client';
// import debounce from 'lodash/debounce';

// const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
//   transports: ['websocket'],
//   withCredentials: true,
// });

// interface CodeEditorProps {
//   roomId: string;
// }

// export default function CodeEditor({ roomId }: CodeEditorProps) {
//   const [language, setLanguage] = useState('javascript');
//   const [code, setCode] = useState('// Start coding...');
//   const [output, setOutput] = useState('');
//   const [loading, setLoading] = useState(false);
//   const skipNextUpdate = useRef(false);

//   // Debounced socket emitter
//   const debouncedEmitCode = useRef(
//     debounce((newCode: string) => {
//       socket.emit('code-change', { roomId, code: newCode });
//     }, 200)
//   ).current;

//   useEffect(() => {
//     const userId = localStorage.getItem('userId');
//     if (userId) {
//       socket.emit('join-room', { roomId, userId });
//     } else {
//       console.warn('⚠️ No userId found in localStorage');
//     }

//     socket.on('code-change', ({ code: newCode }) => {
//       skipNextUpdate.current = true;
//       setCode(newCode);
//     });

//     socket.on('load-room-data', ({ code: savedCode, language: savedLang }) => {
//       setCode(savedCode);
//       setLanguage(savedLang);
//     });

//     return () => {
//       socket.off('code-change');
//       socket.off('load-room-data');
//     };
//   }, [roomId]);

//   const handleCodeChange = (value: string | undefined) => {
//     if (value === undefined) return;
//     setCode(value);
//     if (skipNextUpdate.current) {
//       skipNextUpdate.current = false;
//       return;
//     }
//     debouncedEmitCode(value);
//   };

//   const handleCompile = async () => {
//     setLoading(true);
//     setOutput('');

//     if (language === 'html' || language === 'css') {
//     const htmlContent =
//       language === 'html'
//         ? code
//         : `<style>${code}</style><div class="preview">CSS Preview Area</div>`;

//     const newWindow = window.open('', '_blank');
//     if (newWindow) {
//       newWindow.document.write(htmlContent);
//       newWindow.document.close();
//       setOutput(' Opened output in a new tab.');
//     } else {
//       setOutput(' Popup blocked. Please allow popups.');
//     }

//     setLoading(false);
//     return;
//   }

//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/run`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ code, language }),
//       });

//       const result = await res.json();

//       if (result.status?.description !== 'Accepted') {
//         setOutput(result.compile_output || result.stderr || '❌ Compilation failed.');
//       } else {
//         setOutput(result.stdout?.trim() || '✅ No output.');
//       }
//     } catch (err) {
//       console.error(err);
//       setOutput('❌ Error connecting to compiler API.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center gap-4">
//         <label htmlFor="language" className="font-medium">
//           Language:
//         </label>
//         <select
//           id="language"
//           value={language}
//           onChange={(e) => setLanguage(e.target.value)}
//           className="bg-gray-800 text-white border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           <option value="javascript">JavaScript</option>
//           <option value="python">Python</option>
//           <option value="html">HTML</option>
//           <option value="css">CSS</option>
//           <option value="java">Java</option>
//           <option value="typescript">TypeScript</option>
//           <option value="cpp">C++</option>
//           <option value="ruby">Ruby</option>
//           <option value="go">Go</option>
//           <option value="php">PHP</option>
//           <option value="bash">Bash</option>
//           <option value="csharp">C#</option>
//         </select>

//         <button
//           onClick={handleCompile}
//           disabled={loading}
//           className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
//         >
//           {loading ? 'Running...' : 'Run Code'}
//         </button>
//       </div>

//       <div className="border rounded overflow-hidden min-h-[300px]">
//         <Editor
//           height="300px"
//           language={language}
//           value={code}
//           onChange={handleCodeChange}
//           theme="vs-dark"
//           options={{
//             fontSize: 14,
//             minimap: { enabled: false },
//             scrollBeyondLastLine: false,
//             wordWrap: 'on',
//           }}
//         />
//       </div>

//       <div className="bg-black text-white p-4 rounded min-h-[100px]">
//         <strong>Output:</strong>
//         <pre className="whitespace-pre-wrap mt-2">{output}</pre>
//       </div>
//     </div>
//   );
// }'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import { Socket } from 'socket.io-client';
import { Play, Copy, Download, Minus, Plus, ChevronDown, Sparkles, X, FileCode } from 'lucide-react';
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

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java',
  'cpp', 'html', 'css', 'go', 'ruby', 'php', 'bash', 'csharp'
];

const CURSOR_COLORS = [
  '#f87171', '#fb923c', '#facc15',
  '#4ade80', '#60a5fa', '#a78bfa', '#f472b6',
];

const EXTENSIONS: Record<string, string> = {
  javascript: 'js', typescript: 'ts', python: 'py',
  java: 'java', cpp: 'cpp', html: 'html', css: 'css',
  go: 'go', ruby: 'rb', php: 'php', bash: 'sh', csharp: 'cs',
};

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python',
  java: 'java', cpp: 'cpp', html: 'html', css: 'css',
  go: 'go', rb: 'ruby', php: 'php', sh: 'bash', cs: 'csharp'
};

interface IFile {
  id: string;
  name: string;
  language: string;
}

interface CodeEditorProps {
  roomId: string;
  socket: Socket;
  onlineUsers: string[];
}

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

  // File tabs state
  const [files, setFiles] = useState<IFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // file code cache — stores code for each file locally
  const fileCodeCache = useRef<Record<string, string>>({});

  // Refs
  const skipNextUpdate = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);
  const activeFileIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const getUserColor = (userId: string) =>
    CURSOR_COLORS[userId.charCodeAt(0) % CURSOR_COLORS.length];

  const debouncedEmitCode = useRef(
    debounce((newCode: string, fileId: string | null) => {
      socket.emit('code-change', { roomId, code: newCode, fileId });
    }, 200)
  ).current;

  // ─── Socket listeners ────────────────────────────────────────────────────
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
        // Update cache for that file
        fileCodeCache.current[fileId] = newCode;
        // Only update editor if it's the active file
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
      toast.info(`Language: ${newLang}`);
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
  }, [socket]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);

    // Update local cache
    if (activeFileIdRef.current) {
      fileCodeCache.current[activeFileIdRef.current] = value;
    }

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
    toast.success('Copied!');
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
    toast.success('Exported!');
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
      toast.success('Formatted!');
    } catch {
      toast.error('Could not format this code');
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
    // switch to new file immediately
    setActiveFileId(file.id);
    setLanguage(fileLang);
    setCode('');
  };

  const handleSwitchFile = (fileId: string, fileLang: string) => {
    // Save current file to cache before switching
    if (activeFileIdRef.current) {
      fileCodeCache.current[activeFileIdRef.current] = code;
      // Emit save for current file
      socket.emit('code-change', {
        roomId,
        code,
        fileId: activeFileIdRef.current
      });
    }

    setActiveFileId(fileId);
    setLanguage(fileLang);

    // Load from cache first
    const cached = fileCodeCache.current[fileId];
    if (cached !== undefined) {
      setCode(cached || '// Start coding...');
    } else {
      // Fetch from server
      setCode('// Loading...');
      socket.emit('switch-file', { roomId, fileId });
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    socket.emit('delete-file', { roomId, fileId });
  };

  // ─── Smart HTML Run — combines all files ─────────────────────────────────
  const handleRun = async () => {
    setLoading(true);
    setOutput('');
    setOutputError(false);
    setOutputOpen(true);

    // Save current file to cache
    if (activeFileIdRef.current) {
      fileCodeCache.current[activeFileIdRef.current] = code;
    }

    const activeFile = files.find(f => f.id === activeFileId);
    const isHtmlRun = language === 'html' || activeFile?.language === 'html';
    const isCssRun = language === 'css' && !isHtmlRun;

    if (isHtmlRun || isCssRun) {
      let htmlContent = '';

      if (files.length > 0) {
        // Find HTML file
        const htmlFile = files.find(f => f.language === 'html');
        const cssFiles = files.filter(f => f.language === 'css');
        const jsFiles = files.filter(f => f.language === 'javascript' || f.language === 'typescript');

        if (htmlFile) {
          htmlContent = fileCodeCache.current[htmlFile.id] || '';

          // Inject CSS files
          let cssContent = '';
          cssFiles.forEach(f => {
            cssContent += fileCodeCache.current[f.id] || '';
          });
          if (cssContent) {
            htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`);
            if (!htmlContent.includes('</head>')) {
              htmlContent = `<style>${cssContent}</style>` + htmlContent;
            }
          }

          // Inject JS files
          let jsContent = '';
          jsFiles.forEach(f => {
            jsContent += fileCodeCache.current[f.id] || '';
          });
          if (jsContent) {
            htmlContent = htmlContent.replace('</body>', `<script>${jsContent}</script></body>`);
            if (!htmlContent.includes('</body>')) {
              htmlContent += `<script>${jsContent}</script>`;
            }
          }
        } else {
          // No HTML file — just wrap current code
          htmlContent = language === 'css'
            ? `<style>${code}</style><div>CSS Preview</div>`
            : code;
        }
      } else {
        htmlContent = language === 'css'
          ? `<style>${code}</style><div>CSS Preview</div>`
          : code;
      }

      const w = window.open('', '_blank');
      if (w) {
        w.document.write(htmlContent);
        w.document.close();
        setOutput('Opened in new tab with all files combined.');
      } else {
        setOutput('Popup blocked.');
        setOutputError(true);
      }
      setLoading(false);
      return;
    }

    // Regular code execution
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, language }),
      });

      if (res.status === 401) { toast.error('Session expired.'); setLoading(false); return; }
      if (res.status === 429) { toast.error('Too many requests.'); setLoading(false); return; }

      const result = await res.json();
      if (result.status?.description !== 'Accepted') {
        setOutput(result.compile_output || result.stderr || 'Compilation failed.');
        setOutputError(true);
        toast.error('Compilation failed');
      } else {
        setOutput(result.stdout?.trim() || 'No output.');
        toast.success('Executed successfully');
      }
    } catch {
      setOutput('Error connecting to compiler.');
      setOutputError(true);
      toast.error('Compiler connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-hidden">

      {/* Toolbar */}
      <div className="h-10 bg-[#111111] border-b border-white/[0.06] flex items-center gap-2 px-3 shrink-0">
        <div className="relative flex items-center">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="appearance-none bg-white/5 text-white/70 text-xs border border-white/10 rounded px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer font-mono"
          >
            {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 text-white/30 pointer-events-none" />
        </div>

        <Separator orientation="vertical" className="h-4 bg-white/10" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={handleRun} disabled={loading} size="sm"
              className="h-7 px-3 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30">
              <Play size={11} className={cn('mr-1.5', loading && 'animate-spin')} />
              {loading ? 'Running' : 'Run'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Run code</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 bg-white/10" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCopy}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5">
              <Copy size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy code</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleExport}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5">
              <Download size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export file</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleFormat}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5">
              <Sparkles size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Format code</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 bg-white/10" />

        <div className="flex items-center gap-1">
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

        {typingUser && (
          <span className="ml-auto text-[11px] text-white/30 animate-pulse font-mono">
            {typingUser} is typing...
          </span>
        )}
      </div>

      {/* File Tabs */}
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
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all ml-1">
              <X size={10} />
            </button>
          </div>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleAddFile}
              className="px-3 py-1.5 text-white/20 hover:text-white/50 hover:bg-white/[0.03] transition-colors shrink-0">
              <Plus size={12} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add file</TooltipContent>
        </Tooltip>
      </div>

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden"
        onMouseMove={() => {
          const position = editorRef.current?.getPosition();
          if (!position) return;
          const userId = localStorage.getItem('userId') || 'anon';
          const userName = localStorage.getItem('userName') || session?.user?.name || 'User';
          socket.emit('cursor-move', { roomId, userId, userName, position, color: getUserColor(userId) });
        }}
      >
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          onMount={(editor) => { editorRef.current = editor; }}
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

      {/* Output panel */}
      <div className={cn(
        'border-t border-white/[0.06] bg-[#0a0a0a] shrink-0 transition-all',
        outputOpen ? 'h-36' : 'h-8'
      )}>
        <button
          onClick={() => setOutputOpen(o => !o)}
          className="w-full h-8 flex items-center gap-2 px-3 text-[11px] text-white/30 hover:text-white/50 transition-colors font-mono"
        >
          <ChevronDown size={11} className={cn('transition-transform', !outputOpen && '-rotate-90')} />
          OUTPUT
          {outputError && <span className="text-red-400/60 ml-auto">error</span>}
        </button>
        {outputOpen && (
          <ScrollArea className="h-28 px-3 pb-2">
            <pre className={cn(
              'text-xs font-mono whitespace-pre-wrap leading-relaxed',
              outputError ? 'text-red-400/80' : 'text-emerald-400/80'
            )}>
              {output || 'Run your code to see output...'}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}