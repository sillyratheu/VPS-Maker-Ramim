import React, { useState, useRef, useEffect } from 'react';
import { TerminalTab, VirtualFile, VPSInstance, ServiceItem, PortRule, TerminalTheme } from '../types/terminal';
import { executeCommand, ExecResult } from '../lib/linuxKernel';
import { parseAnsiToReact } from '../lib/ansiParser';
import { InteractiveNano } from './InteractiveNano';
import { InteractiveHtop } from './InteractiveHtop';
import { InteractiveCmatrix } from './InteractiveCmatrix';
import { ShieldCheck, ShieldAlert, Sparkles, Copy, Check, Terminal as TerminalIcon } from 'lucide-react';

interface Props {
  tab: TerminalTab;
  vps: VPSInstance;
  files: VirtualFile[];
  theme: TerminalTheme;
  crtEnabled: boolean;
  fontSize: number;
  services: ServiceItem[];
  ports: PortRule[];
  onUpdateTab: (tabId: string, updater: (prev: TerminalTab) => TerminalTab) => void;
  onUpdateFiles: (files: VirtualFile[]) => void;
  onUpdateServices: (updater: (prev: ServiceItem[]) => ServiceItem[]) => void;
  onUpdatePorts: (updater: (prev: PortRule[]) => PortRule[]) => void;
  onReboot: () => void;
}

export const TerminalView: React.FC<Props> = ({
  tab,
  vps,
  files,
  theme,
  crtEnabled,
  fontSize,
  services,
  ports,
  onUpdateTab,
  onUpdateFiles,
  onUpdateServices,
  onUpdatePorts,
  onReboot,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sudoPasswordInput, setSudoPasswordInput] = useState('');
  const [pendingSudoCmd, setPendingSudoCmd] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sudoInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when output changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.history, tab.activeApp, isExecuting]);

  // Focus input when clicking anywhere inside terminal
  const handleTerminalClick = () => {
    if (pendingSudoCmd) {
      sudoInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExecuting) return;

    const cmdToRun = inputValue;
    setInputValue('');
    setHistoryIndex(-1);

    if (!cmdToRun.trim()) {
      onUpdateTab(tab.id, prev => ({
        ...prev,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: '',
            exitCode: 0,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
          },
        ],
      }));
      return;
    }

    setCommandHistory(prev => [cmdToRun, ...prev]);
    setIsExecuting(true);

    try {
      const res: ExecResult = await executeCommand(
        cmdToRun,
        tab.cwd,
        tab.user,
        tab.isRoot,
        tab.sudoAuthenticatedUntil,
        files,
        vps,
        services,
        onUpdateServices,
        ports,
        onUpdatePorts
      );

      // Handle reboot
      if (res.rebootTriggered) {
        onReboot();
        setIsExecuting(false);
        return;
      }

      // Handle sudo password prompt
      if (res.needsSudoPassword && res.pendingSudoCommand) {
        setPendingSudoCmd(res.pendingSudoCommand);
        onUpdateTab(tab.id, prev => ({
          ...prev,
          history: [
            ...prev.history,
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              command: cmdToRun,
              output: `[sudo] password for ${prev.user}: `,
              exitCode: 0,
              cwd: prev.cwd,
              user: prev.user,
              isRoot: prev.isRoot,
              isSudoPrompt: true,
            },
          ],
        }));
        setIsExecuting(false);
        setTimeout(() => sudoInputRef.current?.focus(), 50);
        return;
      }

      // Handle clear screen
      if (res.output === '__CLEAR_SCREEN__') {
        onUpdateTab(tab.id, prev => ({
          ...prev,
          history: [],
        }));
        setIsExecuting(false);
        return;
      }

      // Handle filesystem changes
      if (res.newFiles) {
        onUpdateFiles(res.newFiles);
      }

      // Handle interactive apps
      if (res.startInteractiveApp) {
        let initialNanoContent = '';
        if (res.startInteractiveApp === 'nano' && res.interactiveAppFile) {
          const target = files.find(f => f.path === res.interactiveAppFile);
          initialNanoContent = target ? target.content : '';
        }

        onUpdateTab(tab.id, prev => ({
          ...prev,
          activeApp: res.startInteractiveApp,
          activeAppFile: res.interactiveAppFile,
          nanoContent: initialNanoContent,
          history: [
            ...prev.history,
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              command: cmdToRun,
              output: `Launching ${res.startInteractiveApp}...`,
              exitCode: 0,
              cwd: prev.cwd,
              user: prev.user,
              isRoot: prev.isRoot,
            },
          ],
        }));
        setIsExecuting(false);
        return;
      }

      // Append standard command result
      onUpdateTab(tab.id, prev => ({
        ...prev,
        cwd: res.newCwd || prev.cwd,
        user: res.newUser || prev.user,
        isRoot: res.newIsRoot !== undefined ? res.newIsRoot : prev.isRoot,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: cmdToRun,
            output: res.output,
            exitCode: res.exitCode,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
            isAiGenerated: res.isAiGenerated,
          },
        ],
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSudoPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSudoCmd) return;

    const enteredPassword = sudoPasswordInput;
    setSudoPasswordInput('');
    const targetCmd = pendingSudoCmd;
    setPendingSudoCmd(null);

    // Validate password (default admin password is 'admin' or user-configured)
    const isValid = enteredPassword === vps.rootPassword || enteredPassword === 'admin' || enteredPassword === 'root';

    if (!isValid) {
      onUpdateTab(tab.id, prev => ({
        ...prev,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: '',
            output: 'sudo: 1 incorrect password attempt',
            exitCode: 1,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
          },
        ],
      }));
      return;
    }

    // Authenticated for 15 minutes!
    const authUntil = Date.now() + 15 * 60 * 1000;
    onUpdateTab(tab.id, prev => ({
      ...prev,
      sudoAuthenticatedUntil: authUntil,
    }));

    // If target was to switch to root shell
    if (targetCmd === 'switch_to_root' || targetCmd === '-i' || targetCmd === 'su' || targetCmd === 'bash') {
      onUpdateTab(tab.id, prev => ({
        ...prev,
        user: 'root',
        isRoot: true,
        newCwd: '/root',
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: '',
            output: 'Switched to root shell (UID 0). Type \'exit\' to drop back to admin.',
            exitCode: 0,
            cwd: '/root',
            user: 'root',
            isRoot: true,
          },
        ],
      }));
      return;
    }

    // Run the pending command with root privileges!
    setIsExecuting(true);
    try {
      const res = await executeCommand(
        targetCmd,
        tab.cwd,
        'root',
        true,
        authUntil,
        files,
        vps,
        services,
        onUpdateServices,
        ports,
        onUpdatePorts
      );

      if (res.newFiles) onUpdateFiles(res.newFiles);

      onUpdateTab(tab.id, prev => ({
        ...prev,
        cwd: res.newCwd || prev.cwd,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: `[sudo authenticated] ${targetCmd}`,
            output: res.output,
            exitCode: res.exitCode,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
          },
        ],
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // History UP
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputValue(commandHistory[nextIdx]);
      }
    }
    // History DOWN
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputValue(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
    // Tab Auto-Completion
    else if (e.key === 'Tab') {
      e.preventDefault();
      const tokens = inputValue.split(' ');
      const lastToken = tokens[tokens.length - 1];

      const commandList = [
        'sudo', 'apt', 'systemctl', 'service', 'ufw', 'nano', 'htop', 'cmatrix',
        'docker', 'neofetch', 'clear', 'history', 'df', 'free', 'uname', 'hostname',
        'uptime', 'whoami', 'id', 'cat', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'chmod',
        'chown', 'grep', 'ping', 'curl', 'ifconfig', 'ip', 'help'
      ];

      // File matches
      const currentDirFiles = files
        .filter(f => {
          if (tab.cwd === '/') return f.path !== '/' && f.path.split('/').length === 2;
          const parent = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
          return parent === tab.cwd;
        })
        .map(f => f.name);

      const allCandidates = tokens.length === 1 ? commandList : currentDirFiles;
      const match = allCandidates.find(c => c.startsWith(lastToken));

      if (match) {
        tokens[tokens.length - 1] = match;
        setInputValue(tokens.join(' ') + (tokens.length === 1 ? ' ' : ''));
      }
    }
    // Ctrl+C: Cancel command line
    else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      onUpdateTab(tab.id, prev => ({
        ...prev,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: inputValue + '^C',
            exitCode: 130,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
          },
        ],
      }));
      setInputValue('');
    }
    // Ctrl+L: Clear screen
    else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onUpdateTab(tab.id, prev => ({
        ...prev,
        history: [],
      }));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If interactive app is active in this tab
  if (tab.activeApp === 'nano') {
    return (
      <InteractiveNano
        filePath={tab.activeAppFile || '/home/admin/file.txt'}
        initialContent={tab.nanoContent || ''}
        files={files}
        isRoot={tab.isRoot}
        user={tab.user}
        onSave={(filePath, content) => {
          const updated = [...files];
          const existing = updated.find(f => f.path === filePath);
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
          if (existing) {
            existing.content = content;
            existing.updatedAt = nowStr;
            existing.size = content.length;
          } else {
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            updated.push({
              name: fileName,
              path: filePath,
              content,
              isDirectory: false,
              permissions: tab.isRoot ? '0644' : '0664',
              owner: tab.user,
              group: tab.user,
              updatedAt: nowStr,
              size: content.length,
            });
          }
          onUpdateFiles(updated);
        }}
        onExit={() => {
          onUpdateTab(tab.id, prev => ({
            ...prev,
            activeApp: 'none',
            activeAppFile: undefined,
            nanoContent: undefined,
          }));
        }}
      />
    );
  }

  if (tab.activeApp === 'htop') {
    return (
      <InteractiveHtop
        vps={vps}
        isRoot={tab.isRoot}
        user={tab.user}
        onExit={() => {
          onUpdateTab(tab.id, prev => ({
            ...prev,
            activeApp: 'none',
          }));
        }}
      />
    );
  }

  if (tab.activeApp === 'cmatrix') {
    return (
      <InteractiveCmatrix
        onExit={() => {
          onUpdateTab(tab.id, prev => ({
            ...prev,
            activeApp: 'none',
          }));
        }}
      />
    );
  }

  // Format prompt: e.g. admin@vps-ubuntu-01:~$ or root@vps-ubuntu-01:~#
  const displayCwd = tab.cwd.replace(tab.user === 'root' ? '/root' : '/home/admin', '~');
  const isSudoActive = tab.isRoot || tab.sudoAuthenticatedUntil > Date.now();

  return (
    <div
      onClick={handleTerminalClick}
      className={`relative flex flex-col h-full overflow-hidden terminal-font select-text ${
        crtEnabled ? 'crt-effect' : ''
      }`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontSize: `${fontSize}px`,
      }}
    >
      {/* Terminal Privilege / Status Ribbon */}
      <div className="flex items-center justify-between px-3 py-1 bg-black/40 border-b border-white/5 text-[11px] select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {tab.isRoot ? (
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>ROOT SHELL (UID 0)</span>
              </span>
            ) : isSudoActive ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SUDO ACTIVE (15m grace)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neutral-400">
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>User: {tab.user}</span>
              </span>
            )}
          </div>
          <span className="text-white/20">·</span>
          <span className="text-neutral-400">{vps.hostname} ({vps.ip})</span>
        </div>

        <div className="flex items-center gap-3 text-neutral-400">
          <span>Type <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px] text-white">help</kbd> for commands</span>
          <button
            onClick={e => {
              e.stopPropagation();
              onUpdateTab(tab.id, prev => ({ ...prev, history: [] }));
            }}
            className="hover:text-white transition-colors"
            title="Clear screen (Ctrl + L)"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-3 md:p-4 overflow-y-auto space-y-2">
        {/* Welcome Message Banner */}
        {tab.history.length === 0 && (
          <div className="pb-2 text-neutral-400 text-xs leading-relaxed space-y-1 select-none">
            <div className="text-white font-semibold flex items-center gap-2">
              <span className="text-cyan-400 font-bold">Ramim VPS</span>
              <span>· {vps.os}</span>
              <span className="text-neutral-500 font-normal">({vps.hostname})</span>
            </div>
            <div>Documentation: <span className="text-sky-400 underline cursor-pointer">https://help.ubuntu.com</span></div>
            <div>Management: <span className="text-neutral-300">Ramim VPS Web Console v2.4 (Dark Edition)</span></div>
            <div className="pt-1 text-neutral-300">
              * Dedicated cloud instance · Region: {vps.region} · IP: {vps.ip}
            </div>
            <div className="text-neutral-400">
              System load: 0.14 · Processes: 114 · Memory used: 24% · Storage: 160GB NVMe
            </div>
            <div className="text-emerald-400/90 pt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Sudo privileges granted. Run <code className="bg-white/10 px-1 py-0.5 rounded text-emerald-300">sudo &lt;command&gt;</code> or elevate with <code className="bg-white/10 px-1 py-0.5 rounded text-emerald-300">sudo -i</code>.</span>
            </div>
          </div>
        )}

        {/* History items */}
        {tab.history.map((item, idx) => {
          const itemDisplayCwd = item.cwd.replace(item.user === 'root' ? '/root' : '/home/admin', '~');
          return (
            <div key={item.id || idx} className="space-y-1 group">
              {/* Command line prompt */}
              {item.command && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ color: item.isRoot ? '#f43f5e' : theme.promptUser }} className="font-bold">
                      {item.user}@{vps.hostname}
                    </span>
                    <span className="text-neutral-400">:</span>
                    <span style={{ color: theme.promptPath }} className="font-medium">
                      {itemDisplayCwd}
                    </span>
                    <span className="text-neutral-300 font-bold">
                      {item.isRoot ? '#' : '$'}
                    </span>
                    <span className="text-neutral-100 font-mono pl-1">{item.command}</span>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] text-neutral-400 shrink-0">
                    {item.isAiGenerated && (
                      <span className="flex items-center gap-1 text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                        <Sparkles className="w-3 h-3" />
                        <span>AI Kernel</span>
                      </span>
                    )}
                    {item.output && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(item.output || '', item.id);
                        }}
                        className="hover:text-white p-1 rounded"
                        title="Copy command output"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              )}

              {/* Command Output */}
              {item.output && (
                <div className="whitespace-pre-wrap leading-relaxed text-neutral-200 pl-0 sm:pl-2 overflow-x-auto text-xs md:text-sm">
                  {parseAnsiToReact(item.output)}
                </div>
              )}
            </div>
          );
        })}

        {/* Live Active Command Execution Spinner */}
        {isExecuting && (
          <div className="flex items-center gap-2 text-neutral-400 text-xs py-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Executing command on {vps.hostname}...</span>
          </div>
        )}

        {/* Sudo Password Prompt (if command requires sudo auth) */}
        {pendingSudoCmd && (
          <form onSubmit={handleSudoPasswordSubmit} className="pt-1 flex flex-col gap-2 bg-[#120a10] p-3 rounded-lg border border-amber-500/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-400 font-bold">[sudo]</span>
              <span className="text-neutral-200">password for {tab.user}:</span>
              <input
                ref={sudoInputRef}
                type="password"
                value={sudoPasswordInput}
                onChange={e => setSudoPasswordInput(e.target.value)}
                className="flex-1 min-w-[120px] bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 font-mono tracking-widest outline-none focus:border-amber-400"
                autoFocus
                placeholder="••••••"
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
              <span>(Default root/sudo password: <strong className="text-neutral-200">admin</strong>)</span>
              <button
                type="button"
                onClick={() => {
                  setSudoPasswordInput('admin');
                  setTimeout(() => handleSudoPasswordSubmit({ preventDefault: () => {} } as any), 10);
                }}
                className="min-h-[36px] px-3 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded-md border border-amber-700/60 font-medium"
              >
                Auto-fill 'admin'
              </button>
            </div>
          </form>
        )}

        {/* Active Input Line Prompt */}
        {!pendingSudoCmd && (
          <form onSubmit={handleCommandSubmit} className="flex items-center gap-1.5 pt-1">
            <span style={{ color: tab.isRoot ? '#f43f5e' : theme.promptUser }} className="font-bold shrink-0 text-xs md:text-sm">
              {tab.user}@{vps.hostname}
            </span>
            <span className="text-neutral-400 shrink-0">:</span>
            <span style={{ color: theme.promptPath }} className="font-medium shrink-0 text-xs md:text-sm">
              {displayCwd}
            </span>
            <span className="text-neutral-300 font-bold shrink-0">
              {tab.isRoot ? '#' : '$'}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isExecuting}
                className="w-full bg-transparent border-none outline-none font-mono text-neutral-100 p-0 m-0 text-xs md:text-sm"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </form>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Mobile-Friendly Virtual Soft-Key Dock (Makes typing Linux commands on phones easy!) */}
      <div className="bg-[#0b0e14] border-t border-white/[0.08] px-2 py-1.5 flex items-center gap-1 overflow-x-auto select-none shrink-0 text-[11px]">
        {[
          { label: 'Tab ⇥', action: () => {
            const fakeEvent = { key: 'Tab', preventDefault: () => {} } as any;
            handleKeyDown(fakeEvent);
          }},
          { label: 'Ctrl+C', action: () => {
            const fakeEvent = { ctrlKey: true, key: 'c', preventDefault: () => {} } as any;
            handleKeyDown(fakeEvent);
          }},
          { label: '↑ Prev', action: () => {
            const fakeEvent = { key: 'ArrowUp', preventDefault: () => {} } as any;
            handleKeyDown(fakeEvent);
          }},
          { label: '↓ Next', action: () => {
            const fakeEvent = { key: 'ArrowDown', preventDefault: () => {} } as any;
            handleKeyDown(fakeEvent);
          }},
          { label: 'sudo', action: () => {
            setInputValue(prev => prev.startsWith('sudo ') ? prev : 'sudo ' + prev);
            inputRef.current?.focus();
          }},
          { label: 'clear', action: () => {
            onUpdateTab(tab.id, prev => ({ ...prev, history: [] }));
          }},
          { label: 'ls -la', action: () => {
            setInputValue('ls -la');
            inputRef.current?.focus();
          }},
          { label: '| pipe', action: () => {
            setInputValue(prev => prev + ' | ');
            inputRef.current?.focus();
          }},
          { label: 'cd ~', action: () => {
            setInputValue('cd ~');
            inputRef.current?.focus();
          }},
          { label: '/', action: () => {
            setInputValue(prev => prev + '/');
            inputRef.current?.focus();
          }},
          { label: '-', action: () => {
            setInputValue(prev => prev + '-');
            inputRef.current?.focus();
          }},
        ].map((k, i) => (
          <button
            key={i}
            type="button"
            onClick={e => {
              e.stopPropagation();
              k.action();
            }}
            className="min-h-[34px] px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-md border border-white/5 active:bg-cyan-900 active:text-cyan-200 transition-colors whitespace-nowrap font-mono text-[11px] shrink-0"
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
};
