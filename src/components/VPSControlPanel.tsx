import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Activity,
  Server,
  Shield,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  Play,
  RotateCw,
  Power,
  ChevronRight,
  ChevronDown,
  Download,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Zap,
  Package,
  ArrowDownToLine,
  Globe,
} from 'lucide-react';
import { VPSInstance, VirtualFile, ServiceItem, PortRule } from '../types/terminal';

interface Props {
  vps: VPSInstance;
  files: VirtualFile[];
  services: ServiceItem[];
  ports: PortRule[];
  activeTabUser: 'admin' | 'root';
  isRoot: boolean;
  onRunCommand: (cmd: string) => void;
  onOpenFileInNano: (filePath: string) => void;
  onToggleService: (serviceId: string, activate: boolean) => void;
  onReboot: () => void;
  onUpdateFiles: (files: VirtualFile[]) => void;
  onClose?: () => void;
}

type PanelTab = 'telemetry' | 'files' | 'downloads' | 'services' | 'firewall' | 'snippets';

export const VPSControlPanel: React.FC<Props> = ({
  vps,
  files,
  services,
  ports,
  activeTabUser,
  isRoot,
  onRunCommand,
  onOpenFileInNano,
  onToggleService,
  onReboot,
  onUpdateFiles,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('telemetry');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/', '/home', '/home/admin', '/etc']));
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Dynamic telemetry metrics
  const [cpuLoad, setCpuLoad] = useState(22);
  const [ramUsedGb, setRamUsedGb] = useState(1.84);
  const [netInKb, setNetInKb] = useState(342);
  const [netOutKb, setNetOutKb] = useState(189);

  useEffect(() => {
    const timer = setInterval(() => {
      setCpuLoad(prev => Math.max(5, Math.min(94, Math.floor(prev + (Math.random() - 0.5) * 12))));
      setRamUsedGb(prev => +(prev + (Math.random() - 0.5) * 0.03).toFixed(2));
      setNetInKb(prev => Math.max(20, Math.floor(prev + (Math.random() - 0.5) * 80)));
      setNetOutKb(prev => Math.max(10, Math.floor(prev + (Math.random() - 0.5) * 50)));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Real download to user's PC using browser Blob
  const handleDownloadToPC = (file: VirtualFile) => {
    try {
      const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    }
  };

  // Remote download to VPS state
  const [downloadUrl, setDownloadUrl] = useState('https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py');
  const [downloadDestPath, setDownloadDestPath] = useState('/home/admin/speedtest.py');
  const [isDownloadingToVPS, setIsDownloadingToVPS] = useState(false);
  const [downloadStatusMsg, setDownloadStatusMsg] = useState<string | null>(null);

  const handleDownloadFromUrlToVPS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl.trim()) return;
    setIsDownloadingToVPS(true);
    setDownloadStatusMsg('Fetching from remote server via proxy...');

    try {
      const res = await fetch('/api/terminal/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setDownloadStatusMsg(`Error: ${data.error || 'Failed to download'}`);
        return;
      }

      const content = data.body || '';
      const targetPath = downloadDestPath.trim() || `/home/admin/${downloadUrl.split('/').pop() || 'download.txt'}`;
      const fileName = targetPath.split('/').pop() || 'download.txt';
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      const existingIndex = files.findIndex(f => f.path === targetPath);
      let updated: VirtualFile[];
      const newFileObj: VirtualFile = {
        name: fileName,
        path: targetPath,
        content: content,
        isDirectory: false,
        permissions: isRoot ? '0755' : '0644',
        owner: activeTabUser,
        group: activeTabUser,
        updatedAt: nowStr,
        size: content.length,
      };

      if (existingIndex >= 0) {
        updated = files.map((f, i) => (i === existingIndex ? newFileObj : f));
      } else {
        updated = [...files, newFileObj];
      }

      onUpdateFiles(updated);
      setSelectedFile(newFileObj);
      setDownloadStatusMsg(`Successfully downloaded ${content.length} bytes to ${targetPath}`);
    } catch (err: unknown) {
      setDownloadStatusMsg(`Download failed: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setIsDownloadingToVPS(false);
    }
  };

  // Build tree from files
  const renderFileTree = (currentPath: string, depth = 0) => {
    const children = files.filter(f => {
      if (currentPath === '/') {
        return f.path !== '/' && f.path.split('/').length === 2;
      }
      const parent = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
      return parent === currentPath;
    });

    children.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-0.5">
        {children.map(file => {
          const isExpanded = expandedFolders.has(file.path);
          const isSelected = selectedFile?.path === file.path;

          if (file.isDirectory) {
            return (
              <div key={file.path}>
                <div
                  onClick={() => toggleFolder(file.path)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs font-mono select-none transition-colors ${
                    isSelected ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-900 text-neutral-300'
                  }`}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                {isExpanded && renderFileTree(file.path, depth + 1)}
              </div>
            );
          }

          return (
            <div
              key={file.path}
              onClick={() => setSelectedFile(file)}
              className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded cursor-pointer text-xs font-mono select-none transition-colors group ${
                isSelected ? 'bg-sky-950/60 text-sky-200 border border-sky-800/60' : 'hover:bg-neutral-900 text-neutral-400'
              }`}
              style={{ paddingLeft: `${depth * 12 + 20}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0 group-hover:text-neutral-300" />
                <span className="truncate">{file.name}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{file.permissions}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCreateNewFile = () => {
    const fileName = prompt('Enter new filename (e.g., test.txt or script.sh):', 'notes.txt');
    if (!fileName) return;
    const parent = selectedFile?.isDirectory ? selectedFile.path : '/home/admin';
    const fullPath = (parent === '/' ? '' : parent) + '/' + fileName;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newFiles = [
      ...files,
      {
        name: fileName,
        path: fullPath,
        content: '# New file created via TerminaVPS Explorer\n',
        isDirectory: false,
        permissions: isRoot ? '0644' : '0664',
        owner: activeTabUser,
        group: activeTabUser,
        updatedAt: nowStr,
        size: 42,
      },
    ];
    onUpdateFiles(newFiles);
  };

  return (
    <div className="flex flex-col h-full bg-[#080b12] border-l border-white/[0.08] text-neutral-200 text-xs select-none">
      {/* Panel Tab Navigation Bar */}
      <div className="bg-[#0c101a] border-b border-white/[0.08] p-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'telemetry'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'files'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span>Files</span>
          </button>

          <button
            onClick={() => setActiveTab('downloads')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'downloads'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Downloads</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'services'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span>Services</span>
          </button>

          <button
            onClick={() => setActiveTab('firewall')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'firewall'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Ports</span>
          </button>

          <button
            onClick={() => setActiveTab('snippets')}
            className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'snippets'
                ? 'bg-neutral-800 text-white shadow-sm border border-white/10'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Snippets</span>
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors ml-1 shrink-0"
            title="Close Panel"
          >
            <Power className="w-4 h-4 rotate-90 text-rose-400" />
          </button>
        )}
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB 1: TELEMETRY & HARDWARE GAUGES */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            {/* Quick Sudo / Root Status Banner */}
            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-[11px] font-medium">Privilege State</span>
                {isRoot ? (
                  <span className="px-2 py-0.5 bg-red-950 text-red-300 rounded border border-red-800 font-bold text-[10px]">
                    SUPERUSER ROOT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-medium text-[10px]">
                    SUDO CAPABLE (admin)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isRoot ? (
                  <button
                    onClick={() => onRunCommand('exit')}
                    className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition-colors border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <span>Drop to User Shell</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onRunCommand('sudo -i')}
                    className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded text-xs font-medium transition-colors border border-red-800 flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Elevate to Root (sudo -i)</span>
                  </button>
                )}
                <button
                  onClick={onReboot}
                  className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs transition-colors border border-neutral-700 flex items-center gap-1"
                  title="Reboot VPS"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reboot</span>
                </button>
              </div>
            </div>

            {/* Hardware Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* CPU Gauge */}
              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    <span>vCPU Usage</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-white">{cpuLoad}%</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      cpuLoad > 80 ? 'bg-red-500' : cpuLoad > 50 ? 'bg-amber-400' : 'bg-sky-500'
                    }`}
                    style={{ width: `${cpuLoad}%` }}
                  />
                </div>
                <div className="text-[10px] text-neutral-500 font-mono">
                  {vps.vcpu} Cores @ 3.4 GHz (EPYC)
                </div>
              </div>

              {/* Memory Gauge */}
              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Memory</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {Math.round((ramUsedGb / vps.ramGb) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(ramUsedGb / vps.ramGb) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-neutral-500 font-mono tabular-nums">
                  {ramUsedGb} GB / {vps.ramGb} GB DDR5
                </div>
              </div>

              {/* Disk Storage */}
              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    <span>NVMe Disk</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-white">15%</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: '15%' }} />
                </div>
                <div className="text-[10px] text-neutral-500 font-mono tabular-nums">
                  24 GB / {vps.diskGb} GB (/dev/nvme0n1)
                </div>
              </div>

              {/* Network Throughput */}
              <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-purple-400" />
                    <span>Network</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-white">1 Gbps</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                  <span>↓ {netInKb} KB/s</span>
                  <span>↑ {netOutKb} KB/s</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-mono truncate">
                  IP: {vps.ip}
                </div>
              </div>
            </div>

            {/* Server Connection Info */}
            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
              <span className="text-neutral-400 text-[11px] font-medium">SSH Connection Access</span>
              <div className="flex items-center justify-between gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 font-mono text-xs">
                <span className="truncate text-sky-300">ssh admin@{vps.ip}</span>
                <button
                  onClick={() => copyToClipboard(`ssh admin@${vps.ip}`, 'ssh-cmd')}
                  className="hover:text-white p-1 rounded transition-colors shrink-0"
                  title="Copy SSH command"
                >
                  {copiedText === 'ssh-cmd' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
                <span>Location: {vps.region}</span>
                <span>OS: {vps.os.split(' ')[0]} {vps.os.split(' ')[1]}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIRTUAL FILESYSTEM EXPLORER */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-xs font-medium">Virtual Linux Tree</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNewFile}
                  className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs border border-neutral-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>New File</span>
                </button>
              </div>
            </div>

            {/* Filesystem Tree */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 max-h-72 overflow-y-auto">
              {renderFileTree('/')}
            </div>

            {/* Selected File Details / Preview Card */}
            {selectedFile && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-neutral-200 truncate">
                    <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{selectedFile.path}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDownloadToPC(selectedFile)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded text-xs font-mono transition-colors shrink-0"
                      title="Download this file to your computer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => onOpenFileInNano(selectedFile.path)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-800 rounded text-xs font-mono transition-colors shrink-0"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit in Nano</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-400 font-mono grid grid-cols-2 gap-1 pt-1 border-t border-neutral-800">
                  <span>Size: {selectedFile.size} bytes</span>
                  <span>Perms: {selectedFile.permissions}</span>
                  <span>Owner: {selectedFile.owner}:{selectedFile.group}</span>
                  <span>Modified: {selectedFile.updatedAt}</span>
                </div>

                {/* File Preview */}
                <div className="bg-neutral-950 p-2 rounded border border-neutral-800 font-mono text-[11px] text-neutral-300 max-h-36 overflow-auto whitespace-pre">
                  {selectedFile.content || '(Empty file)'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: DOWNLOADS & PACKAGE MANAGER */}
        {activeTab === 'downloads' && (
          <div className="space-y-4">
            {/* Download Remote URL to VPS */}
            <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold text-xs">Download to VPS from URL</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Fetch any public script, file, or asset over HTTP/HTTPS directly into your Shahajjo VPS.
              </p>

              <form onSubmit={handleDownloadFromUrlToVPS} className="space-y-2.5 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 font-sans block pb-1">Target URL</label>
                  <input
                    type="url"
                    value={downloadUrl}
                    onChange={e => setDownloadUrl(e.target.value)}
                    placeholder="https://example.com/script.sh"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-100 outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-sans block pb-1">Destination VPS Path</label>
                  <input
                    type="text"
                    value={downloadDestPath}
                    onChange={e => setDownloadDestPath(e.target.value)}
                    placeholder="/home/admin/file.txt"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-100 outline-none focus:border-cyan-500 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isDownloadingToVPS}
                    className="min-h-[38px] flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 text-white rounded-lg text-xs font-medium font-sans transition-all active:scale-95 shadow-md shadow-cyan-600/20"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloadingToVPS ? 'animate-bounce' : ''}`} />
                    <span>{isDownloadingToVPS ? 'Downloading...' : 'Download to VPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDownloadUrl('https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py');
                      setDownloadDestPath('/home/admin/speedtest.py');
                    }}
                    className="min-h-[38px] px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-sans transition-colors"
                    title="Load Speedtest CLI URL"
                  >
                    Preset
                  </button>
                </div>

                {downloadStatusMsg && (
                  <div className="text-[11px] p-2 rounded bg-neutral-950 border border-neutral-800 text-cyan-300 font-sans">
                    {downloadStatusMsg}
                  </div>
                )}
              </form>
            </div>

            {/* 1-Click Linux Package Downloader */}
            <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-semibold text-xs">One-Click Package Installer</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">apt / dpkg</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Quickly download and install authentic Linux packages into your VPS terminal.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                {[
                  { name: 'Git', cmd: 'sudo apt install -y git', desc: 'VCS & cloning' },
                  { name: 'Python 3', cmd: 'sudo apt install -y python3 python3-pip', desc: 'Python & pip' },
                  { name: 'Node.js', cmd: 'sudo apt install -y nodejs npm', desc: 'JS Runtime & NPM' },
                  { name: 'Docker', cmd: 'sudo apt install -y docker.io docker-compose', desc: 'Containers' },
                  { name: 'Nginx', cmd: 'sudo apt install -y nginx', desc: 'Web Server' },
                  { name: 'FFmpeg', cmd: 'sudo apt install -y ffmpeg', desc: 'Media codec' },
                  { name: 'PostgreSQL', cmd: 'sudo apt install -y postgresql', desc: 'SQL Database' },
                  { name: 'Redis', cmd: 'sudo apt install -y redis-server', desc: 'In-memory cache' },
                  { name: 'Htop / Neo', cmd: 'sudo apt install -y htop neofetch', desc: 'System tools' },
                  { name: 'Build Tools', cmd: 'sudo apt install -y build-essential', desc: 'GCC, Make' },
                ].map((pkg, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 flex flex-col justify-between gap-1.5 transition-colors"
                  >
                    <div>
                      <div className="text-white font-semibold text-xs font-sans flex items-center justify-between">
                        <span>{pkg.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{pkg.desc}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate pt-0.5">{pkg.cmd}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRunCommand(pkg.cmd)}
                      className="min-h-[32px] w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-800 text-[11px] font-sans font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-purple-300" />
                      <span>Install Package</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Download VPS Files to PC */}
            <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-semibold text-xs">Download VPS Files to Local PC</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Export and save any file stored inside the Shahajjo VPS straight to your local PC.
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {files
                  .filter(f => !f.isDirectory)
                  .map(file => (
                    <div
                      key={file.path}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 text-xs font-mono transition-colors"
                    >
                      <div className="truncate flex-1">
                        <div className="text-neutral-200 truncate">{file.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{file.path} ({file.size} B)</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadToPC(file)}
                        className="min-h-[32px] px-2.5 py-1 flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 rounded text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer"
                        title={`Download ${file.name} to PC`}
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>To PC</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES & SYSTEMD DAEMONS */}
        {activeTab === 'services' && (
          <div className="space-y-3">
            <div className="text-neutral-400 text-xs font-medium">Systemd Services</div>
            <div className="space-y-2">
              {services.map(s => (
                <div
                  key={s.id}
                  className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                        <span>{s.name}</span>
                        {s.port && <span className="text-[10px] text-sky-400">(:{s.port})</span>}
                      </div>
                      <div className="text-[11px] text-neutral-400 pt-0.5">{s.description}</div>
                    </div>

                    <button
                      onClick={() => onToggleService(s.id, !s.active)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                        s.active
                          ? 'bg-red-950/60 hover:bg-red-900 text-red-200 border-red-800'
                          : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border-emerald-800'
                      }`}
                    >
                      {s.active ? 'Stop' : 'Start'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onRunCommand(`sudo systemctl status ${s.id}`)}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] border border-neutral-700 transition-colors"
                    >
                      systemctl status
                    </button>
                    <button
                      onClick={() => onRunCommand(`sudo systemctl restart ${s.id}`)}
                      className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] border border-neutral-700 transition-colors"
                    >
                      systemctl restart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FIREWALL & PORT RULES (UFW) */}
        {activeTab === 'firewall' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-xs font-medium">UFW Firewall Rules</span>
              <button
                onClick={() => onRunCommand('sudo ufw status verbose')}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs border border-neutral-700 transition-colors"
              >
                Check Status
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-800/80 text-neutral-300 border-b border-neutral-700">
                  <tr>
                    <th className="py-1.5 px-3">Port</th>
                    <th className="py-1.5 px-2">Action</th>
                    <th className="py-1.5 px-2">From</th>
                    <th className="py-1.5 px-3">Service</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {ports.map((rule, idx) => (
                    <tr key={idx} className="hover:bg-neutral-850">
                      <td className="py-1.5 px-3 font-semibold text-neutral-200">
                        {rule.port}/{rule.protocol}
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            rule.action === 'ALLOW'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {rule.action}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-neutral-400">{rule.from}</td>
                      <td className="py-1.5 px-3 text-neutral-400">{rule.service}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg space-y-2">
              <span className="text-neutral-400 text-[11px] font-medium">Quick Open Ports</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onRunCommand('sudo ufw allow 8080/tcp')}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs border border-neutral-700"
                >
                  + Open Port 8080
                </button>
                <button
                  onClick={() => onRunCommand('sudo ufw allow 5432/tcp')}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs border border-neutral-700"
                >
                  + Open Port 5432 (Postgres)
                </button>
                <button
                  onClick={() => onRunCommand('sudo ufw allow 6379/tcp')}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs border border-neutral-700"
                >
                  + Open Port 6379 (Redis)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QUICK COMMAND SNIPPETS & CHEATSHEET */}
        {activeTab === 'snippets' && (
          <div className="space-y-3">
            <div className="text-neutral-400 text-xs font-medium">Sysadmin Command Presets</div>
            <div className="space-y-2">
              {[
                { label: 'Update System Packages', cmd: 'sudo apt update && sudo apt upgrade -y', desc: 'Refresh repositories & patch packages' },
                { label: 'Launch Interactive Nano', cmd: 'nano /home/admin/deploy.sh', desc: 'Open text editor with keyboard buffer' },
                { label: 'Launch Interactive Htop', cmd: 'htop', desc: 'Live CPU cores & process killer' },
                { label: 'Matrix Rain Simulation', cmd: 'cmatrix', desc: 'Terminal digital rain visualizer' },
                { label: 'Show Hardware Specs', cmd: 'neofetch', desc: 'Display ASCII logo & VPS telemetry' },
                { label: 'Check Disk Space', cmd: 'df -h', desc: 'Inspect mount points & NVMe utilization' },
                { label: 'Check Memory Usage', cmd: 'free -m', desc: 'View RAM total, used, and swap' },
                { label: 'Inspect System Log', cmd: 'cat /var/log/syslog', desc: 'Read kernel & daemon events' },
                { label: 'Check Sudo Audit Log', cmd: 'sudo cat /var/log/auth.log', desc: 'Audit root & sudo executions' },
                { label: 'Check Docker Containers', cmd: 'docker ps', desc: 'List active Docker containers' },
                { label: 'Ping Google DNS', cmd: 'ping -c 4 8.8.8.8', desc: 'Test ICMP network round-trip time' },
                { label: 'Restart Nginx Web Server', cmd: 'sudo systemctl restart nginx', desc: 'Reload reverse proxy & web server' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg flex items-center justify-between gap-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="truncate">
                    <div className="font-medium text-xs text-neutral-200">{item.label}</div>
                    <div className="font-mono text-[11px] text-sky-400 truncate pt-0.5">{item.cmd}</div>
                    <div className="text-[10px] text-neutral-500">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => onRunCommand(item.cmd)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-200 rounded border border-sky-800 text-xs font-medium transition-colors shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
