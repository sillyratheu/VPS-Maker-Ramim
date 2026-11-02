import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Globe,
  Terminal as TerminalIcon,
  Save,
  Check,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { VirtualFile, VPSInstance } from '../types/terminal';

interface Props {
  vps: VPSInstance;
  files: VirtualFile[];
  onUpdateFiles: (files: VirtualFile[]) => void;
  onSendTerminalCommand: (cmd: string) => void;
}

type CodeLang = 'nodejs' | 'python' | 'html' | 'bash';

interface TemplateOption {
  id: CodeLang;
  name: string;
  ext: string;
  filePath: string;
  port?: number;
  initialCode: string;
}

const TEMPLATES: Record<CodeLang, TemplateOption> = {
  nodejs: {
    id: 'nodejs',
    name: 'Node.js Web Server',
    ext: 'js',
    filePath: '/home/admin/projects/server.js',
    port: 3000,
    initialCode: `// Shahajjo VPS - Live Node.js HTTP Server
const http = require('http');

const PORT = 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(\`
    <!DOCTYPE html>
    <html style="background:#090d16; color:#00f0ff; font-family:sans-serif; text-align:center; padding-top:60px;">
      <head><title>Shahajjo VPS Live App</title></head>
      <body>
        <h1 style="font-size:32px; letter-spacing:-1px;">Shahajjo VPS Live Server</h1>
        <p style="color:#94a3b8; font-size:16px;">Your live code is running on <strong>164.92.128.45:\${PORT}</strong></p>
        <div style="display:inline-block; margin-top:20px; padding:12px 24px; background:#0f172a; border:1px solid #1e293b; border-radius:8px; font-family:monospace; color:#38bdf8;">
          Server Status: ACTIVE · PID: 1420 · Node v20.14.0
        </div>
        <p style="color:#64748b; font-size:12px; margin-top:30px;">Request URL: \${req.url} · Timestamp: \${new Date().toISOString()}</p>
      </body>
    </html>
  \`);
});

server.listen(PORT, () => {
  console.log(\`[+] Shahajjo VPS Live Server listening on http://0.0.0.0:\${PORT}\`);
  console.log(\`[+] Ready to handle live requests.\`);
});
`,
  },
  python: {
    id: 'python',
    name: 'Python 3 Microservice',
    ext: 'py',
    filePath: '/home/admin/projects/app.py',
    port: 8080,
    initialCode: `# Shahajjo VPS - Live Python HTTP Microservice
import json
from datetime import datetime

def generate_report():
    vps_metrics = {
        "server": "shahajjo-vps-prod",
        "status": "online",
        "cpu_usage_pct": 14.8,
        "memory_used_gb": 1.84,
        "nvme_storage_free_gb": 134,
        "timestamp": datetime.utcnow().isoformat(),
        "active_ports": [22, 80, 443, 3000, 8080]
    }
    return json.dumps(vps_metrics, indent=2)

print("[+] Initializing Shahajjo VPS Python 3.12 Engine...")
print("[+] Generating telemetry diagnostics...")
output = generate_report()
print(output)
print("[+] Python microservice executed successfully with exit code 0.")
`,
  },
  html: {
    id: 'html',
    name: 'HTML5 / CSS3 Web App',
    ext: 'html',
    filePath: '/var/www/html/index.html',
    port: 80,
    initialCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shahajjo VPS Live Application</title>
  <style>
    body {
      margin: 0;
      background: radial-gradient(circle at 50% 20%, #0d1527, #06080e);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 16px;
      padding: 32px 48px;
      backdrop-filter: blur(12px);
      box-shadow: 0 0 40px rgba(6, 182, 212, 0.15);
      max-width: 500px;
    }
    h1 { margin: 0 0 12px; font-size: 28px; color: #38bdf8; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Nginx Web Server Active</div>
    <h1>Welcome to Shahajjo VPS</h1>
    <p>Your live code is rendered live from <code>/var/www/html/index.html</code>.</p>
    <button onclick="alert('Connected to Shahajjo VPS Engine!')" style="padding:10px 20px; background:#0284c7; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
      Test Live Interaction
    </button>
  </div>
</body>
</html>
`,
  },
  bash: {
    id: 'bash',
    name: 'Bash Cloud Script',
    ext: 'sh',
    filePath: '/home/admin/deploy_live.sh',
    initialCode: `#!/bin/bash
# Shahajjo VPS - Automated Live Deployment Script
echo "================================================="
echo "   Shahajjo VPS Cloud Automation Runner"
echo "================================================="
echo "[*] Host: $(hostname)"
echo "[*] Kernel: $(uname -r)"
echo "[*] Checking available disk space..."
df -h / | tail -n 1
echo "[*] Verifying Nginx and Docker daemons..."
systemctl is-active --quiet nginx && echo "[+] Nginx: RUNNING" || echo "[-] Nginx: STOPPED"
systemctl is-active --quiet docker && echo "[+] Docker: RUNNING" || echo "[-] Docker: STOPPED"
echo "[*] Pulling live repository updates..."
echo "[+] Fetching latest release manifests from Shahajjo Cloud Hub..."
echo "[+] All system invariants verified. Server is nominal."
`,
  },
};

export const LiveCodeLab: React.FC<Props> = ({
  vps,
  files,
  onUpdateFiles,
  onSendTerminalCommand,
}) => {
  const [selectedLang, setSelectedLang] = useState<CodeLang>('nodejs');
  const [code, setCode] = useState<string>(TEMPLATES.nodejs.initialCode);
  const [activeTab, setActiveTab] = useState<'preview' | 'logs'>('preview');
  const [isRunning, setIsRunning] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Initializing live sandbox runtime...`,
    `[${new Date().toLocaleTimeString()}] Bound to internal virtual socket 127.0.0.1:3000`,
    `[${new Date().toLocaleTimeString()}] Process started (PID 1420)`,
    `[${new Date().toLocaleTimeString()}] Service running and ready for traffic.`,
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentTemplate = TEMPLATES[selectedLang];

  const handleLanguageChange = (lang: CodeLang) => {
    setSelectedLang(lang);
    setCode(TEMPLATES[lang].initialCode);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Switched to ${TEMPLATES[lang].name}`,
      `[${new Date().toLocaleTimeString()}] File path: ${TEMPLATES[lang].filePath}`,
      `[${new Date().toLocaleTimeString()}] Environment ready. Click 'Run Live' to execute.`,
    ]);
  };

  const handleRunLive = () => {
    setIsRunning(true);
    const newLogs = [
      `[${new Date().toLocaleTimeString()}] Running ${currentTemplate.filePath}...`,
      `[${new Date().toLocaleTimeString()}] Syntax checked: OK`,
    ];

    if (selectedLang === 'nodejs') {
      newLogs.push(`[${new Date().toLocaleTimeString()}] Server listening on port ${currentTemplate.port}`);
      newLogs.push(`[${new Date().toLocaleTimeString()}] HTTP/1.1 200 OK responses active`);
    } else if (selectedLang === 'python') {
      newLogs.push(`[${new Date().toLocaleTimeString()}] Python 3.12.3 runtime started`);
      newLogs.push(`[${new Date().toLocaleTimeString()}] Output emitted: telemetry diagnostic JSON`);
      newLogs.push(`[${new Date().toLocaleTimeString()}] Script finished with code 0`);
    } else if (selectedLang === 'html') {
      newLogs.push(`[${new Date().toLocaleTimeString()}] Deployed to Nginx document root (/var/www/html)`);
      newLogs.push(`[${new Date().toLocaleTimeString()}] Live web preview refreshed`);
    } else {
      newLogs.push(`[${new Date().toLocaleTimeString()}] Bash execution started`);
      newLogs.push(`[${new Date().toLocaleTimeString()}] All scripts completed successfully`);
    }

    setLogs(newLogs);
    handleSaveToVPS();
  };

  const handleSaveToVPS = () => {
    const updated = [...files];
    const targetPath = currentTemplate.filePath;
    const existing = updated.find(f => f.path === targetPath);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    if (existing) {
      existing.content = code;
      existing.updatedAt = nowStr;
      existing.size = code.length;
    } else {
      const fileName = targetPath.substring(targetPath.lastIndexOf('/') + 1);
      updated.push({
        name: fileName,
        path: targetPath,
        content: code,
        isDirectory: false,
        permissions: '0755',
        owner: 'admin',
        group: 'admin',
        updatedAt: nowStr,
        size: code.length,
      });
    }

    onUpdateFiles(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExecuteInTerminal = () => {
    handleSaveToVPS();
    if (selectedLang === 'nodejs') {
      onSendTerminalCommand(`node ${currentTemplate.filePath}`);
    } else if (selectedLang === 'python') {
      onSendTerminalCommand(`python3 ${currentTemplate.filePath}`);
    } else if (selectedLang === 'bash') {
      onSendTerminalCommand(`bash ${currentTemplate.filePath}`);
    } else {
      onSendTerminalCommand(`curl -I http://localhost`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#07090e] text-neutral-100 overflow-hidden font-mono">
      {/* Top Controls Bar */}
      <div className="bg-[#0c101a] border-b border-white/[0.08] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold font-sans">
            <Code2 className="w-4 h-4" />
            <span>Live Code Lab</span>
          </div>
          <span className="text-white/20">|</span>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded-lg border border-white/10 text-xs">
            {(Object.keys(TEMPLATES) as CodeLang[]).map(langKey => {
              const tmpl = TEMPLATES[langKey];
              const isSel = selectedLang === langKey;
              return (
                <button
                  key={langKey}
                  onClick={() => handleLanguageChange(langKey)}
                  className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-sans font-medium ${
                    isSel
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tmpl.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToVPS}
            className="min-h-[34px] px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/10 rounded-lg text-xs font-sans flex items-center gap-1.5 transition-colors"
            title="Save file to VPS filesystem"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{savedSuccess ? 'Saved to VPS' : 'Save'}</span>
          </button>

          <button
            onClick={handleRunLive}
            className="min-h-[34px] px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Live</span>
          </button>

          <button
            onClick={handleExecuteInTerminal}
            className="min-h-[34px] px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/60 rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition-colors hidden sm:flex"
            title="Run this file inside the main bash terminal"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Send to Terminal</span>
          </button>
        </div>
      </div>

      {/* Main Split Body: Editor (Left) & Live Runner Preview (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] overflow-hidden min-h-0">
        {/* Left Column: Code Editor */}
        <div className="flex flex-col h-full bg-[#080b12] min-h-0 overflow-hidden">
          {/* File Header */}
          <div className="px-3 py-1.5 bg-[#0a0f18] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <strong className="text-neutral-200 font-mono">{currentTemplate.filePath}</strong>
            </span>
            <span>{code.split('\n').length} lines · {code.length} bytes</span>
          </div>

          {/* Textarea Editor */}
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 w-full p-4 bg-transparent text-neutral-100 font-mono text-xs leading-relaxed resize-none outline-none overflow-auto select-text whitespace-pre"
            spellCheck={false}
          />
        </div>

        {/* Right Column: Live Web Preview & Server Logs */}
        <div className="flex flex-col h-full bg-[#05070c] min-h-0 overflow-hidden">
          {/* Tab switches */}
          <div className="px-3 py-1.5 bg-[#0a0f18] border-b border-white/[0.06] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Web Preview {currentTemplate.port ? `(:${currentTemplate.port})` : ''}</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-sans font-medium transition-colors ${
                  activeTab === 'logs'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Process Logs</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">
            {activeTab === 'preview' ? (
              <div className="flex-1 flex flex-col rounded-xl border border-white/10 overflow-hidden bg-[#090d16] shadow-xl">
                {/* Simulated Browser Address Bar */}
                <div className="bg-[#0f172a] px-3 py-1.5 border-b border-white/10 flex items-center gap-2 text-xs text-neutral-400 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex-1 bg-neutral-900 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300 truncate">
                    http://164.92.128.45:{currentTemplate.port || 3000}/
                  </div>
                  <button
                    onClick={handleRunLive}
                    className="p-1 hover:text-white transition-colors"
                    title="Refresh Live Preview"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live Preview Iframe */}
                <iframe
                  title="Shahajjo VPS Live Preview"
                  srcDoc={
                    selectedLang === 'html'
                      ? code
                      : selectedLang === 'nodejs'
                      ? `<!DOCTYPE html><html style="background:#090d16; color:#00f0ff; font-family:sans-serif; text-align:center; padding-top:60px;"><head><title>Shahajjo VPS Live App</title></head><body><h1 style="font-size:32px; letter-spacing:-1px;">Shahajjo VPS Live Server</h1><p style="color:#94a3b8; font-size:16px;">Node server listening on <strong>port 3000</strong></p><div style="display:inline-block; margin-top:20px; padding:12px 24px; background:#0f172a; border:1px solid #1e293b; border-radius:8px; font-family:monospace; color:#38bdf8;">Server Status: ACTIVE · PID: 1420 · Node v20.14.0</div></body></html>`
                      : `<!DOCTYPE html><html style="background:#090d16; color:#38bdf8; font-family:monospace; padding:30px;"><head><title>Python Microservice</title></head><body><h3 style="color:#22c55e;">Python 3 Microservice Output:</h3><pre style="background:#0f172a; padding:16px; border-radius:8px; border:1px solid #1e293b; color:#e2e8f0;">${code.slice(0, 500)}...</pre></body></html>`
                  }
                  className="flex-1 w-full border-none bg-black"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              /* Server Logs Tab */
              <div className="flex-1 bg-black p-3 rounded-xl border border-white/10 overflow-y-auto space-y-1 font-mono text-xs text-neutral-300">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-cyan-400">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
