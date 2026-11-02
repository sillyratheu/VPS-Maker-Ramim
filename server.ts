import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API endpoint for AI-assisted bash execution fallback
  app.post('/api/terminal/exec', async (req, res) => {
    try {
      const { command, cwd, user, isRoot, vpsInfo, fileContext } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      // Check if Gemini API key is configured
      if (!process.env.GEMINI_API_KEY) {
        return res.json({
          stdout: '',
          stderr: `bash: ${command.split(' ')[0]}: command executed in offline mode`,
          exitCode: 0,
        });
      }

      const systemPrompt = `You are the Linux Bash terminal kernel simulator of an Ubuntu 24.04.1 LTS cloud VPS server.
The user executed a command in the bash shell.
Simulate the EXACT standard terminal output (stdout, stderr, exit code) as if executed on an Ubuntu Linux server.

Current context:
- Server Hostname: ${vpsInfo?.hostname || 'vps-ubuntu-01'}
- Operating System: ${vpsInfo?.os || 'Ubuntu 24.04.1 LTS (Noble Numbat)'}
- Current User: ${user || 'admin'} (UID: ${isRoot ? 0 : 1000})
- Is Root / Sudo Mode: ${isRoot ? 'YES (Full root privileges)' : 'NO (Unprivileged user, unless prefixed with sudo)'}
- Current Working Directory: ${cwd || '/home/admin'}
- Existing files in current context: ${fileContext ? JSON.stringify(fileContext) : 'standard Linux root'}

Rules:
1. Return realistic Linux output matching tools like python, awk, sed, curl, gcc, docker, git, systemctl, etc.
2. If the user runs a command requiring root permissions without sudo or root privileges (e.g., editing /etc/shadow or restarting systemd daemon), produce the authentic Linux "Permission denied" error.
3. If the command creates or writes a file (e.g. echo "x" > file, touch, python writing a file), specify the created/modified files in the json response.
4. Output MUST be valid JSON conforming to this schema:
{
  "stdout": string, // standard output text with newlines (or empty string)
  "stderr": string, // standard error text (or empty string)
  "exitCode": number, // 0 for success, 1+ for errors
  "newCwd": string | null, // only if cd changed directory
  "filesCreated": [ { "path": string, "content": string } ] // optional created/modified files
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Command executed: ${command}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = {
          stdout: responseText,
          stderr: '',
          exitCode: 0,
        };
      }

      return res.json(parsed);
    } catch (err: unknown) {
      console.error('Terminal exec error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown execution failure';
      return res.status(500).json({
        stdout: '',
        stderr: `kernel: exception executing command: ${errorMessage}`,
        exitCode: 1,
      });
    }
  });

  // Server health / ping proxy for simulated real traceroute/ping
  app.get('/api/terminal/ping', (req, res) => {
    const host = req.query.host || '8.8.8.8';
    res.json({
      host,
      status: 'ok',
      latencyMs: Math.floor(Math.random() * 18) + 8,
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VPS Terminal Server listening on port ${PORT}`);
  });
}

startServer();
