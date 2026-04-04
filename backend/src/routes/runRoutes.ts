// import express from 'express';
// import axios from 'axios';
// const router = express.Router();

// router.post('/run', async (req, res) => {
//   const { code, language } = req.body;

//   try {
//     const response = await axios.post(
//       'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
//       {
//         source_code: code,
//         language_id: getLanguageId(language),
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
//           'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
//         },
//       }
//     );

//     res.json(response.data);
//   } catch (err: any) {
//     console.error('Compilation Error:', err.message);
//     res.status(500).json({ error: 'Compilation failed.' });
//   }
// });

// function getLanguageId(lang: string): number {
//   const map: Record<string, number> = {
//     javascript: 63,
//     python: 71,
//     html: 42,
//     css: 50,
//     java: 62,
//     typescript: 74,
//     cpp: 54,
//     ruby: 72,
//     go: 60,
//     php: 68,
//     bash: 46,
//     csharp: 51,
//   };
//   return map[lang.toLowerCase()] || 63;
// }

// export default router;

import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middlewares/authMiddleware';

// Prevent code execution abuse
const runLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // max 15 executions per minute
  message: { message: 'Too many code executions, slow down!' },
  standardHeaders: true,
  legacyHeaders: false,
});

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
  html: 42,
  css: 50,
  java: 62,
  typescript: 74,
  cpp: 54,
  ruby: 72,
  go: 60,
  php: 68,
  bash: 46,
  csharp: 51,
};

const getLanguageId = (lang: string): number => {
  return LANGUAGE_MAP[lang.toLowerCase()] ?? 63;
};

const router = express.Router();

router.post('/run', authenticateToken, runLimiter, async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    res.status(400).json({ error: 'Code and language are required' });
    return;
  }

  if (code.length > 50000) {
    res.status(400).json({ error: 'Code too large' });
    return;
  }

  const languageId = getLanguageId(language);

  if (!process.env.RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY not set');
    res.status(500).json({ error: 'Code execution service not configured' });
    return;
  }

  try {
    const response = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        source_code: code,
        language_id: languageId,
        cpu_time_limit: 5,      // max 5 seconds
        memory_limit: 128000,   // max 128MB
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        timeout: 10000, // 10 second axios timeout
      }
    );

    const { stdout, stderr, compile_output, status, time, memory } = response.data;

    res.json({
      stdout,
      stderr,
      compile_output,
      status,
      time,
      memory,
    });

  } catch (err: any) {
    console.error('❌ Code execution error:', err.message);
    if (err.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Code execution timed out' });
      return;
    }
    res.status(500).json({ error: 'Code execution failed' });
  }
});

export default router;