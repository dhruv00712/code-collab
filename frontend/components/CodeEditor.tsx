'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import debounce from 'lodash/debounce';

const socket = io(process.env.NEXT_PUBLIC_API_URL!, {
  transports: ['websocket'],
  withCredentials: true,
});

interface CodeEditorProps {
  roomId: string;
}

export default function CodeEditor({ roomId }: CodeEditorProps) {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const skipNextUpdate = useRef(false);

  // Debounced socket emitter
  const debouncedEmitCode = useRef(
    debounce((newCode: string) => {
      socket.emit('code-change', { roomId, code: newCode });
    }, 200)
  ).current;

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      socket.emit('join-room', { roomId, userId });
    } else {
      console.warn('⚠️ No userId found in localStorage');
    }

    socket.on('code-change', ({ code: newCode }) => {
      skipNextUpdate.current = true;
      setCode(newCode);
    });

    socket.on('load-room-data', ({ code: savedCode, language: savedLang }) => {
      setCode(savedCode);
      setLanguage(savedLang);
    });

    return () => {
      socket.off('code-change');
      socket.off('load-room-data');
    };
  }, [roomId]);

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);
    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }
    debouncedEmitCode(value);
  };

  const handleCompile = async () => {
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      const result = await res.json();

      if (result.status?.description !== 'Accepted') {
        setOutput(result.compile_output || result.stderr || '❌ Compilation failed.');
      } else {
        setOutput(result.stdout?.trim() || '✅ No output.');
      }
    } catch (err) {
      console.error(err);
      setOutput('❌ Error connecting to compiler API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label htmlFor="language" className="font-medium">
          Language:
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
          <option value="cpp">C++</option>
          <option value="ruby">Ruby</option>
          <option value="go">Go</option>
          <option value="php">PHP</option>
          <option value="bash">Bash</option>
          <option value="csharp">C#</option>
        </select>

        <button
          onClick={handleCompile}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
        >
          {loading ? 'Running...' : 'Run Code'}
        </button>
      </div>

      <div className="border rounded overflow-hidden min-h-[300px]">
        <Editor
          height="300px"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>

      <div className="bg-black text-white p-4 rounded min-h-[100px]">
        <strong>Output:</strong>
        <pre className="whitespace-pre-wrap mt-2">{output}</pre>
      </div>
    </div>
  );
}
