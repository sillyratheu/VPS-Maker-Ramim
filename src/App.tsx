import React, { useState, useEffect } from 'react';
import {
  INITIAL_VPS_INSTANCES,
  INITIAL_FILES,
  INITIAL_SERVICES,
  INITIAL_PORTS,
  TERMINAL_THEMES,
} from './lib/vpsData';
import { VPSInstance, VirtualFile, ServiceItem, PortRule, TerminalTab, TerminalTheme } from './types/terminal';
import { TerminalView } from './components/TerminalView';
import { VPSControlPanel } from './components/VPSControlPanel';
import { TopNav } from './components/TopNav';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Columns,
  Rows,
  Maximize2,
  Settings,
  Key,
  RotateCw,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';

export default function App() {
  const [vpsList, setVpsList] = useState<VPSInstance[]>(INITIAL_VPS_INSTANCES);
  const [activeVpsId, setActiveVpsId] = useState<string>(INITIAL_VPS_INSTANCES[0].id);
  const [files, setFiles] = useState<VirtualFile[]>(() => {
    const saved = localStorage.getItem('termina_vps_files');
    return saved ? JSON.parse(saved) : INITIAL_FILES;
  });
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [ports, setPorts] = useState<PortRule[]>(INITIAL_PORTS);

  // Terminal Tabs state
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: 'pts/0 (admin)',
      history: [],
      cwd: '/home/admin',
      user: 'admin',
      isRoot: false,
      sudoAuthenticatedUntil: 0,
      currentInput: '',
      historyIndex: -1,
      activeApp: 'none',
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null);

  // Terminal Layout & Customization
  const [layoutMode, setLayoutMode] = useState<'single' | 'split-h' | 'split-v'>('single');
  const [activeTheme, setActiveTheme] = useState<TerminalTheme>(TERMINAL_THEMES[0]);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSshModal, setShowSshModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootMsg, setRebootMsg] = useState('');
  const [activeView, setActiveView] = useState<'terminal' | 'htop' | 'nano' | 'files' | 'firewall'>('terminal');

  // Sync files to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('termina_vps_files', JSON.stringify(files));
    } catch {
      // ignore storage quota issues
    }
  }, [files]);

  const activeVps = vpsList.find(v => v.id === activeVpsId) || vpsList[0];
  const primaryTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const secondaryTab = tabs.find(t => t.id === secondaryTabId) || (tabs.length > 1 ? tabs[1] : null);

  // Update specific tab
  const handleUpdateTab = (tabId: string, updater: (prev: TerminalTab) => TerminalTab) => {
    setTabs(prev => prev.map(t => (t.id === tabId ? updater(t) : t)));
  };

  // Add new tab
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      title: `pts/${tabs.length} (${primaryTab.isRoot ? 'root' : 'admin'})`,
      history: [],
      cwd: primaryTab.isRoot ? '/root' : '/home/admin',
      user: primaryTab.user,
      isRoot: primaryTab.isRoot,
      sudoAuthenticatedUntil: primaryTab.sudoAuthenticatedUntil,
      currentInput: '',
      historyIndex: -1,
      activeApp: 'none',
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
    if (secondaryTabId === tabId) {
      setSecondaryTabId(null);
      setLayoutMode('single');
    }
  };

  // Toggle Root / User mode for active tab
  const handleToggleRoot = () => {
    handleUpdateTab(activeTabId, prev => {
      const nextIsRoot = !prev.isRoot;
      return {
        ...prev,
        isRoot: nextIsRoot,
        user: nextIsRoot ? 'root' : 'admin',
        cwd: nextIsRoot ? '/root' : '/home/admin',
        title: `pts/${tabs.indexOf(prev)} (${nextIsRoot ? 'root' : 'admin'})`,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: nextIsRoot ? 'sudo -i' : 'exit',
            output: nextIsRoot
              ? 'Switched to root shell (UID 0). Sudo elevated.'
              : 'Dropped back to non-root user (admin).',
            exitCode: 0,
            cwd: nextIsRoot ? '/root' : '/home/admin',
            user: nextIsRoot ? 'root' : 'admin',
            isRoot: nextIsRoot,
          },
        ],
      };
    });
  };

  // Quick run command from buttons/panel
  const handleRunCommandOnActiveTab = (commandText: string) => {
    // If it's launching an interactive view
    if (commandText.startsWith('nano')) {
      const parts = commandText.split(' ');
      const targetFile = parts[1] || '/home/admin/deploy.sh';
      handleOpenFileInNano(targetFile);
      return;
    }
    if (commandText === 'htop' || commandText === 'top') {
      handleUpdateTab(activeTabId, prev => ({ ...prev, activeApp: 'htop' }));
      return;
    }
    if (commandText === 'cmatrix') {
      handleUpdateTab(activeTabId, prev => ({ ...prev, activeApp: 'cmatrix' }));
      return;
    }

    // Set command in active tab history & run
    handleUpdateTab(activeTabId, prev => {
      return {
        ...prev,
        history: [
          ...prev.history,
          {
            id: Math.random().toString(),
            timestamp: new Date().toLocaleTimeString(),
            command: commandText,
            exitCode: 0,
            cwd: prev.cwd,
            user: prev.user,
            isRoot: prev.isRoot,
          },
        ],
      };
    });

    // Execute via synthetic key submission or direct execution
    import('./lib/linuxKernel').then(m => {
      m.executeCommand(
        commandText,
        primaryTab.cwd,
        primaryTab.user,
        primaryTab.isRoot,
        primaryTab.sudoAuthenticatedUntil,
        files,
        activeVps,
        services,
        setServices,
        ports,
        setPorts
      ).then(res => {
        if (res.rebootTriggered) {
          handleReboot();
          return;
        }
        if (res.newFiles) setFiles(res.newFiles);

        handleUpdateTab(activeTabId, prev => ({
          ...prev,
          cwd: res.newCwd || prev.cwd,
          user: res.newUser || prev.user,
          isRoot: res.newIsRoot !== undefined ? res.newIsRoot : prev.isRoot,
          activeApp: res.startInteractiveApp || prev.activeApp,
          activeAppFile: res.interactiveAppFile || prev.activeAppFile,
          history: [
            ...prev.history.slice(0, -1),
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              command: commandText,
              output: res.output,
              exitCode: res.exitCode,
              cwd: prev.cwd,
              user: prev.user,
              isRoot: prev.isRoot,
              isAiGenerated: res.isAiGenerated,
            },
          ],
        }));
      });
    });
  };

  const handleOpenFileInNano = (filePath: string) => {
    const file = files.find(f => f.path === filePath);
    const content = file ? file.content : '';
    handleUpdateTab(activeTabId, prev => ({
      ...prev,
      activeApp: 'nano',
      activeAppFile: filePath,
      nanoContent: content,
    }));
  };

  const handleToggleService = (serviceId: string, activate: boolean) => {
    if (!primaryTab.isRoot) {
      handleRunCommandOnActiveTab(`sudo systemctl ${activate ? 'start' : 'stop'} ${serviceId}`);
    } else {
      handleRunCommandOnActiveTab(`systemctl ${activate ? 'start' : 'stop'} ${serviceId}`);
    }
  };

  // Simulated VPS Reboot
  const handleReboot = () => {
    setIsRebooting(true);
    setRebootMsg('Broadcasting reboot signal to all services...');

    setTimeout(() => {
      setRebootMsg('Unmounting virtual filesystems & restarting kernel...');
    }, 1000);

    setTimeout(() => {
      setRebootMsg(`Booting Linux 6.8.0 on ${activeVps.hostname}...`);
    }, 2000);

    setTimeout(() => {
      setIsRebooting(false);
      setTabs([
        {
          id: 'tab-rebooted',
          title: 'pts/0 (admin)',
          history: [
            {
              id: Math.random().toString(),
              timestamp: new Date().toLocaleTimeString(),
              command: '',
              output: `[SYSTEM REBOOT COMPLETED]\n${activeVps.os} (${activeVps.hostname}) is up and running.\nDefault login: admin`,
              exitCode: 0,
              cwd: '/home/admin',
              user: 'admin',
              isRoot: false,
            },
          ],
          cwd: '/home/admin',
          user: 'admin',
          isRoot: false,
          sudoAuthenticatedUntil: 0,
          currentInput: '',
          historyIndex: -1,
          activeApp: 'none',
        },
      ]);
      setActiveTabId('tab-rebooted');
    }, 3200);
  };

  // Nav View Handler
  const handleNavViewSelect = (view: 'terminal' | 'htop' | 'nano' | 'files' | 'firewall') => {
    setActiveView(view);
    if (view === 'htop') {
      handleUpdateTab(activeTabId, prev => ({ ...prev, activeApp: 'htop' }));
    } else if (view === 'nano') {
      handleOpenFileInNano('/home/admin/deploy.sh');
    } else if (view === 'files') {
      setIsSidebarOpen(true);
    } else if (view === 'firewall') {
      handleRunCommandOnActiveTab('sudo ufw status verbose');
    } else if (view === 'terminal') {
      handleUpdateTab(activeTabId, prev => ({ ...prev, activeApp: 'none' }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <TopNav
        vpsList={vpsList}
        activeVps={activeVps}
        onSelectVps={vps => setActiveVpsId(vps.id)}
        isRoot={primaryTab.isRoot}
        onToggleRoot={handleToggleRoot}
        onQuickAction={cmd => handleRunCommandOnActiveTab(cmd)}
        activeView={activeView}
        setActiveView={handleNavViewSelect}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Terminal Section (Left/Center) */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 overflow-hidden">
          {/* Terminal Tabs & Window Controls Header */}
          <div className="bg-neutral-950 border-b border-neutral-800 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none">
            {/* Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto min-w-0">
              {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono cursor-pointer transition-colors shrink-0 ${
                      isActive
                        ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${tab.isRoot ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="truncate max-w-[120px]">{tab.title}</span>
                    {tabs.length > 1 && (
                      <button
                        onClick={e => handleCloseTab(tab.id, e)}
                        className="hover:text-red-400 p-0.5 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={handleAddTab}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors shrink-0"
                title="New Terminal Session (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layout & Utility Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Split layout modes */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5">
                <button
                  onClick={() => {
                    setLayoutMode('single');
                    setSecondaryTabId(null);
                  }}
                  className={`p-1 rounded text-xs transition-colors ${
                    layoutMode === 'single' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Single Terminal"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (tabs.length === 1) handleAddTab();
                    setLayoutMode('split-h');
                    setSecondaryTabId(tabs[1]?.id || tabs[0].id);
                  }}
                  className={`p-1 rounded text-xs transition-colors ${
                    layoutMode === 'split-h' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Split Horizontal"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (tabs.length === 1) handleAddTab();
                    setLayoutMode('split-v');
                    setSecondaryTabId(tabs[1]?.id || tabs[0].id);
                  }}
                  className={`p-1 rounded text-xs transition-colors ${
                    layoutMode === 'split-v' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Split Vertical"
                >
                  <Rows className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* SSH Credentials button */}
              <button
                onClick={() => setShowSshModal(true)}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 text-xs flex items-center gap-1 transition-colors"
                title="SSH Connection Details"
              >
                <Key className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">SSH</span>
              </button>

              {/* Terminal Appearance Settings */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
                title="Terminal Theme & Font Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Toggle Sidebar */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
                title={isSidebarOpen ? 'Hide Server Panel' : 'Show Server Panel'}
              >
                {isSidebarOpen ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Command Snippets Bar */}
          <div className="bg-neutral-950/80 px-3 py-1 border-b border-neutral-800 flex items-center gap-1.5 overflow-x-auto select-none shrink-0 text-[11px] font-mono">
            <span className="text-neutral-500 uppercase tracking-wider text-[10px] shrink-0 font-sans">
              Quick:
            </span>
            {[
              { label: 'sudo apt update', cmd: 'sudo apt update' },
              { label: 'htop', cmd: 'htop' },
              { label: 'neofetch', cmd: 'neofetch' },
              { label: 'cmatrix', cmd: 'cmatrix' },
              { label: 'docker ps', cmd: 'docker ps' },
              { label: 'systemctl status nginx', cmd: 'sudo systemctl status nginx' },
              { label: 'df -h', cmd: 'df -h' },
              { label: 'free -m', cmd: 'free -m' },
              { label: 'sudo -i', cmd: 'sudo -i' },
            ].map((snippet, idx) => (
              <button
                key={idx}
                onClick={() => handleRunCommandOnActiveTab(snippet.cmd)}
                className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded border border-neutral-800/80 transition-colors whitespace-nowrap shrink-0"
              >
                {snippet.label}
              </button>
            ))}
          </div>

          {/* Terminal Main Viewport */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            {isRebooting ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black text-center space-y-4 font-mono">
                <RotateCw className="w-10 h-10 text-cyan-400 animate-spin" />
                <div className="text-lg font-semibold text-white">Rebooting {activeVps.name}...</div>
                <div className="text-xs text-neutral-400 max-w-sm">{rebootMsg}</div>
                <div className="text-[11px] text-neutral-500">Ramim VPS Kernel re-initialization in ~3s</div>
              </div>
            ) : layoutMode === 'single' ? (
              <TerminalView
                tab={primaryTab}
                vps={activeVps}
                files={files}
                theme={activeTheme}
                crtEnabled={crtEnabled}
                fontSize={fontSize}
                services={services}
                ports={ports}
                onUpdateTab={handleUpdateTab}
                onUpdateFiles={setFiles}
                onUpdateServices={setServices}
                onUpdatePorts={setPorts}
                onReboot={handleReboot}
              />
            ) : (
              <div
                className={`flex-1 flex ${
                  layoutMode === 'split-h' ? 'flex-col md:flex-row' : 'flex-col'
                } divide-neutral-800 divide-x-0 md:divide-x divide-y md:divide-y-0 overflow-hidden`}
              >
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <TerminalView
                    tab={primaryTab}
                    vps={activeVps}
                    files={files}
                    theme={activeTheme}
                    crtEnabled={crtEnabled}
                    fontSize={fontSize}
                    services={services}
                    ports={ports}
                    onUpdateTab={handleUpdateTab}
                    onUpdateFiles={setFiles}
                    onUpdateServices={setServices}
                    onUpdatePorts={setPorts}
                    onReboot={handleReboot}
                  />
                </div>
                {secondaryTab && (
                  <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                    <TerminalView
                      tab={secondaryTab}
                      vps={activeVps}
                      files={files}
                      theme={activeTheme}
                      crtEnabled={crtEnabled}
                      fontSize={fontSize}
                      services={services}
                      ports={ports}
                      onUpdateTab={handleUpdateTab}
                      onUpdateFiles={setFiles}
                      onUpdateServices={setServices}
                      onUpdatePorts={setPorts}
                      onReboot={handleReboot}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Companion Sidebar (Responsive: Slide-out drawer on Mobile, Inline on Desktop PC) */}
        {isSidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md lg:static lg:w-80 xl:w-96 shrink-0 h-full overflow-hidden shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-200">
              <VPSControlPanel
                vps={activeVps}
                files={files}
                services={services}
                ports={ports}
                activeTabUser={primaryTab.user}
                isRoot={primaryTab.isRoot}
                onRunCommand={handleRunCommandOnActiveTab}
                onOpenFileInNano={handleOpenFileInNano}
                onToggleService={handleToggleService}
                onReboot={handleReboot}
                onUpdateFiles={setFiles}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Terminal Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-semibold text-sm text-white">Terminal Customization</span>
              <button onClick={() => setShowSettingsModal(false)} className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Themes */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-neutral-300">Color Theme</span>
              <div className="grid grid-cols-2 gap-2">
                {TERMINAL_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setActiveTheme(theme)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all ${
                      activeTheme.id === theme.id
                        ? 'border-sky-500 bg-sky-950/30 text-white ring-1 ring-sky-500'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>{theme.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full border border-black/50" style={{ backgroundColor: theme.bg }} />
                      <span className="w-3 h-3 rounded-full border border-black/50" style={{ backgroundColor: theme.promptUser }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-300">Font Size ({fontSize}px)</span>
              </div>
              <div className="flex items-center gap-2">
                {[11, 12, 13, 14, 16].map(size => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-1 rounded text-xs font-mono border ${
                      fontSize === size
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* CRT Scanline Toggle */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-xs font-medium text-neutral-200">CRT Phosphor Scanlines</div>
                <div className="text-[11px] text-neutral-400">Authentic retro scanline overlay</div>
              </div>
              <button
                onClick={() => setCrtEnabled(!crtEnabled)}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  crtEnabled ? 'bg-sky-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    crtEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SSH Connection Details Modal */}
      {showSshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-sm text-white">Ramim VPS · SSH Access</span>
              </div>
              <button onClick={() => setShowSshModal(false)} className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px] pb-1 font-sans">SSH Connect Command (admin)</span>
                <div className="p-2.5 bg-[#07090e] rounded-lg border border-white/10 text-cyan-300 select-all flex items-center justify-between">
                  <span>ssh admin@{activeVps.ip}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`ssh admin@${activeVps.ip}`)}
                    className="min-h-[32px] px-2.5 py-1 text-neutral-400 hover:text-white text-xs font-sans rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block text-[11px] pb-1 font-sans">Root Direct Command (superuser)</span>
                <div className="p-2.5 bg-[#07090e] rounded-lg border border-white/10 text-rose-300 select-all flex items-center justify-between">
                  <span>ssh root@{activeVps.ip}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(`ssh root@${activeVps.ip}`)}
                    className="min-h-[32px] px-2.5 py-1 text-neutral-400 hover:text-white text-xs font-sans rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-neutral-300 bg-[#07090e] p-3 rounded-lg border border-white/10 text-[11px]">
                <div>Port: <strong className="text-white">22 (TCP)</strong></div>
                <div>Auth: <strong className="text-cyan-400">Sudoers Active</strong></div>
                <div>Default User: <strong className="text-white">admin</strong></div>
                <div>Default Pass: <strong className="text-emerald-400">admin</strong></div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowSshModal(false)}
                className="min-h-[40px] px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-cyan-600/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
