import express from 'express';
import axios from 'axios';
const router = express.Router();

router.post('/run', async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        source_code: code,
        language_id: getLanguageId(language),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      }
    );

    res.json(response.data);
  } catch (err: any) {
    console.error('Compilation Error:', err.message);
    res.status(500).json({ error: 'Compilation failed.' });
  }
});

function getLanguageId(lang: string): number {
  const map: Record<string, number> = {
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
  return map[lang.toLowerCase()] || 63;
}

export default router;
