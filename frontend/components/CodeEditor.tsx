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
// }
'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';
import { toast } from 'sonner';
import { Socket } from 'socket.io-client';
import { Play, Copy, Download, Minus, Plus, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  '#f87171', // red
  '#fb923c', // orange  
  '#facc15', // yellow
  '#4ade80', // green
  '#60a5fa', // blue
  '#a78bfa', // purple
  '#f472b6', // pink
];
const EXTENSIONS: Record<string, string> = {
  javascript: 'js', typescript: 'ts', python: 'py',
  java: 'java', cpp: 'cpp', html: 'html', css: 'css',
  go: 'go', ruby: 'rb', php: 'php', bash: 'sh', csharp: 'cs',
};

interface CodeEditorProps {
  roomId: string;
  socket: Socket;
  onlineUsers: string[];
}

export default function CodeEditor({ roomId, socket }: CodeEditorProps) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const [output, setOutput] = useState('');
  const [outputError, setOutputError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [outputOpen, setOutputOpen] = useState(true);
  const skipNextUpdate = useRef(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();


  const debouncedEmitCode = useRef(
    debounce((newCode: string) => {
      socket.emit('code-change', { roomId, code: newCode });
    }, 200)
  ).current;

  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<any[]>([]);
  const getUserColor = (userId: string) => CURSOR_COLORS[userId.charCodeAt(0) % CURSOR_COLORS.length];

  useEffect(() => {

    socket.on('cursor-update', ({ userId, userName, position, color }) => {
      if (!editorRef.current) return;
      console.log('cursor received:', userName, position);
      const newDecorations = editorRef.current.deltaDecorations(decorationsRef.current, [{
        range: new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
        options: {
          className: `cursor-${userId}`,
          afterContentClassName: `cursor-label-${userId}`,
          zIndex: 100,
        }
      }]);
      decorationsRef.current = newDecorations;

      // inject CSS for this cursor color
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
    socket.on('code-change', ({ code: newCode }) => {
      skipNextUpdate.current = true;
      setCode(newCode);
    });
    socket.on('load-room-data', ({ code: savedCode, language: savedLang }) => {
      setCode(savedCode || '// Start coding...');
      setLanguage(savedLang || 'javascript');
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
    return () => {
      socket.off('code-change');
      socket.off('load-room-data');
      socket.off('user-typing');
      socket.off('language-change');
      socket.off('cursor-update');
    };
  }, [socket]);

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);
    if (skipNextUpdate.current) { skipNextUpdate.current = false; return; }
    debouncedEmitCode(value);
    const userName = localStorage.getItem('userName')
      || session?.user?.name
      || 'User';
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
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as code.${ext}`);
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
      socket.emit('code-change', { roomId, code: formatted });
      toast.success('Code formatted!');
    } catch {
      toast.error('Could not format this code');
    }
  };

  const handleRun = async () => {
    setLoading(true);
    setOutput('');
    setOutputError(false);
    setOutputOpen(true);

    if (language === 'html' || language === 'css') {
      const content = language === 'html' ? code : `<style>${code}</style>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(content); w.document.close(); setOutput('Opened in new tab.'); }
      else { setOutput('Popup blocked.'); setOutputError(true); }
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

        {/* Language selector */}
        <div className="relative flex items-center">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="appearance-none bg-white/5 hover:bg-white/8 text-white/70 text-xs border border-white/10 rounded px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-white/20 cursor-pointer font-mono"
          >
            {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 text-white/30 pointer-events-none" />
        </div>

        <Separator orientation="vertical" className="h-4 bg-white/10" />

        {/* Run */}
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

        {/* Copy */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCopy}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5">
              <Copy size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy code</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleExport}
              className="h-7 px-2 text-white/40 hover:text-white/70 hover:bg-white/5">
              <Download size={12} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export file</TooltipContent>
        </Tooltip>
        {/* Format */}
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

        {/* Font size */}
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

        {/* Typing indicator */}
        {typingUser && (
          <span className="ml-auto text-[11px] text-white/30 animate-pulse font-mono">
            {typingUser} is typing...
          </span>
        )}
      </div>

      {/* Editor */}
      <div
        className="flex-1 overflow-hidden"
        onMouseMove={() => {
          const position = editorRef.current?.getPosition();
          console.log('cursor position:', position);
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