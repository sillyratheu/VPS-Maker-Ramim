import React, { useState } from 'react';
import { Shield, ShieldAlert, Terminal as TerminalIcon, Menu, X, Server, Activity, FileText, Cpu } from 'lucide-react';
import { VPSInstance } from '../types/terminal';

interface Props {
  vpsList: VPSInstance[];
  activeVps: VPSInstance;
  onSelectVps: (vps: VPSInstance) => void;
  isRoot: boolean;
  onToggleRoot: () => void;
  onQuickAction: (action: string) => void;
  activeView: 'terminal' | 'htop' | 'nano' | 'files' | 'firewall';
  setActiveView: (view: 'terminal' | 'htop' | 'nano' | 'files' | 'firewall') => void;
}

export const TopNav: React.FC<Props> = ({
  vpsList,
  activeVps,
  onSelectVps,
  isRoot,
  onToggleRoot,
  activeView,
  setActiveView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-2.5 bg-[#07090e] border-b border-white/[0.08] shrink-0 z-30 shadow-lg shadow-black/40">
        {/* Zone 1: Brand Wordmark (Single text element with dark cyber aesthetic) */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-700 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.35)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">
              <div className="w-full h-full bg-[#090d16] rounded-[6px] flex items-center justify-center text-cyan-400">
                <TerminalIcon className="w-4 h-4" />
              </div>
            </div>
            <span className="bg-gradient-to-r from-white via-neutral-100 to-cyan-200 bg-clip-text text-transparent font-extrabold tracking-tight">
              Ramim VPS
            </span>
          </a>

          {/* VPS Instance Selector (Desktop) */}
          <div className="hidden sm:block relative">
            <select
              value={activeVps.id}
              onChange={e => {
                const selected = vpsList.find(v => v.id === e.target.value);
                if (selected) onSelectVps(selected);
              }}
              aria-label="Select VPS Instance"
              className="bg-[#0b0f17] border border-white/10 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 outline-none hover:border-cyan-500/50 focus:border-cyan-500 transition-colors font-mono cursor-pointer"
            >
              {vpsList.map(v => (
                <option key={v.id} value={v.id} className="bg-neutral-900 text-white">
                  {v.name} ({v.ip})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: 4-5 Single-Line Clean Navigation Links (PC) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-neutral-400">
          <button
            onClick={() => setActiveView('terminal')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'terminal' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
            }`}
          >
            Terminal Console
          </button>
          <button
            onClick={() => setActiveView('htop')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'htop' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
            }`}
          >
            Live Processes
          </button>
          <button
            onClick={() => setActiveView('nano')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'nano' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
            }`}
          >
            Nano Editor
          </button>
          <button
            onClick={() => setActiveView('files')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'files' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
            }`}
          >
            Filesystem Tree
          </button>
          <button
            onClick={() => setActiveView('firewall')}
            className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'firewall' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : ''
            }`}
          >
            Firewall (UFW)
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Elevate Root / User toggle) & Mobile Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sudo / Root Privilege Switch */}
          <button
            onClick={onToggleRoot}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isRoot
                ? 'bg-rose-950/80 text-rose-200 hover:bg-rose-900 border border-rose-700/80 shadow-[0_0_15px_rgba(225,29,72,0.3)]'
                : 'bg-[#0f172a] text-emerald-300 hover:bg-[#1e293b] border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            }`}
            title={isRoot ? 'Click to drop back to admin user' : 'Click to elevate to root (sudo -i)'}
          >
            {isRoot ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="font-bold tracking-wide">ROOT ACCESS</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">SUDO ACCESS</span>
              </>
            )}
          </button>

          {/* Mobile Menu Toggle Button (Visible on Mobile/Tablet) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-h-[38px] min-w-[38px] flex items-center justify-center p-2 rounded-lg bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu (Responsive Overlay for Mobile Viewports) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-[#0c1019] border-t border-white/10 rounded-t-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Header in Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-white">
                  <TerminalIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-white text-sm">Ramim VPS Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-neutral-400 hover:text-white rounded-lg bg-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile VPS Selector */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Select Active VPS Instance
              </span>
              <select
                value={activeVps.id}
                onChange={e => {
                  const selected = vpsList.find(v => v.id === e.target.value);
                  if (selected) {
                    onSelectVps(selected);
                    setMobileMenuOpen(false);
                  }
                }}
                className="w-full bg-[#131b2a] border border-white/10 text-neutral-200 text-sm rounded-lg p-3 font-mono outline-none"
              >
                {vpsList.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.ip} ({v.region})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile View Switches */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Console Views
              </span>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'terminal', label: 'Terminal Console', icon: TerminalIcon, desc: 'Interactive Linux bash shell' },
                  { id: 'htop', label: 'Live htop', icon: Activity, desc: 'CPU meters & process killer' },
                  { id: 'nano', label: 'Nano Editor', icon: FileText, desc: 'In-terminal text editor' },
                  { id: 'files', label: 'Filesystem Tree', icon: Server, desc: 'Explore virtual filesystem' },
                  { id: 'firewall', label: 'Firewall (UFW)', icon: Shield, desc: 'Port rules & network security' },
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`min-h-[48px] flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        isActive
                          ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
                          : 'bg-neutral-900/60 border-white/5 text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-neutral-400'}`} />
                      <div>
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="text-xs text-neutral-500">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privilege Switch button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  onToggleRoot();
                  setMobileMenuOpen(false);
                }}
                className={`w-full min-h-[48px] py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border ${
                  isRoot
                    ? 'bg-rose-950 text-rose-200 border-rose-700'
                    : 'bg-emerald-950 text-emerald-200 border-emerald-700'
                }`}
              >
                {isRoot ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : <Shield className="w-5 h-5 text-emerald-400" />}
                <span>{isRoot ? 'Drop Root Shell to User (admin)' : 'Elevate to Root Shell (sudo -i)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
