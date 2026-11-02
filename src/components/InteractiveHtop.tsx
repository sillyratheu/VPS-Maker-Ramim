import React, { useState, useEffect } from 'react';
import { Power, Search, AlertCircle, RotateCcw } from 'lucide-react';
import { VPSInstance } from '../types/terminal';

interface Props {
  vps: VPSInstance;
  isRoot: boolean;
  user: string;
  onExit: () => void;
}

interface ProcessRow {
  pid: number;
  user: string;
  pri: number;
  ni: number;
  virt: string;
  res: string;
  shr: string;
  s: string;
  cpu: number;
  mem: number;
  time: string;
  command: string;
}

const INITIAL_PROCESSES: ProcessRow[] = [
  { pid: 1, user: 'root', pri: 20, ni: 0, virt: '168M', res: '12M', shr: '8.4M', s: 'S', cpu: 0.0, mem: 0.1, time: '0:04.12', command: '/sbin/init' },
  { pid: 410, user: 'root', pri: 20, ni: 0, virt: '24M', res: '8.4M', shr: '6.2M', s: 'S', cpu: 0.0, mem: 0.1, time: '0:00.82', command: '/lib/systemd/systemd-udevd' },
  { pid: 842, user: 'root', pri: 20, ni: 0, virt: '15.8M', res: '6.7M', shr: '5.2M', s: 'S', cpu: 0.1, mem: 0.1, time: '0:01.40', command: 'sshd: /usr/sbin/sshd -D [listener]' },
  { pid: 890, user: 'root', pri: 20, ni: 0, virt: '142M', res: '16.8M', shr: '12M', s: 'S', cpu: 0.2, mem: 0.2, time: '0:02.15', command: 'nginx: master process /usr/sbin/nginx -g daemon on;' },
  { pid: 891, user: 'www-data', pri: 20, ni: 0, virt: '142M', res: '8.9M', shr: '6.4M', s: 'S', cpu: 0.1, mem: 0.1, time: '0:00.64', command: 'nginx: worker process' },
  { pid: 912, user: 'root', pri: 20, ni: 0, virt: '748M', res: '65.4M', shr: '38M', s: 'S', cpu: 0.8, mem: 0.8, time: '2:14.30', command: '/usr/bin/dockerd -H fd://' },
  { pid: 980, user: 'root', pri: 20, ni: 0, virt: '412M', res: '32.1M', shr: '18M', s: 'S', cpu: 0.4, mem: 0.4, time: '1:08.12', command: 'containerd --config /run/containerd/containerd.toml' },
  { pid: 1044, user: 'root', pri: 20, ni: 0, virt: '18.9M', res: '7.2M', shr: '5.8M', s: 'S', cpu: 0.0, mem: 0.1, time: '0:00.18', command: 'sshd: admin [priv]' },
  { pid: 1050, user: 'admin', pri: 20, ni: 0, virt: '18.9M', res: '4.8M', shr: '3.9M', s: 'S', cpu: 0.0, mem: 0.1, time: '0:00.22', command: 'sshd: admin@pts/0' },
  { pid: 1051, user: 'admin', pri: 20, ni: 0, virt: '9.8M', res: '4.2M', shr: '3.1M', s: 'S', cpu: 0.0, mem: 0.0, time: '0:00.45', command: '-bash' },
  { pid: 1240, user: 'root', pri: 20, ni: 0, virt: '8.2M', res: '3.1M', shr: '2.4M', s: 'S', cpu: 0.0, mem: 0.0, time: '0:00.08', command: '/usr/sbin/cron -f -P' },
  { pid: 1420, user: 'admin', pri: 20, ni: 0, virt: '124M', res: '38.4M', shr: '22M', s: 'S', cpu: 1.2, mem: 0.5, time: '0:14.88', command: 'node /home/admin/projects/app.js' },
  { pid: 1512, user: 'admin', pri: 20, ni: 0, virt: '22M', res: '5.8M', shr: '4.1M', s: 'R', cpu: 3.4, mem: 0.1, time: '0:00.92', command: 'htop' },
];

export const InteractiveHtop: React.FC<Props> = ({ vps, isRoot, onExit }) => {
  const [processes, setProcesses] = useState<ProcessRow[]>(INITIAL_PROCESSES);
  const [selectedPid, setSelectedPid] = useState<number>(1512);
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<keyof ProcessRow>('cpu');
  const [sortAsc, setSortAsc] = useState(false);
  const [message, setMessage] = useState('');
  const [coreLoads, setCoreLoads] = useState([24.5, 18.2, 31.0, 14.8]);
  const [memUsed, setMemUsed] = useState(1.84);

  // Fluctuating CPU and memory readings
  useEffect(() => {
    const timer = setInterval(() => {
      setCoreLoads(prev =>
        prev.map(load => {
          const delta = (Math.random() - 0.5) * 8;
          return Math.max(3, Math.min(96, +(load + delta).toFixed(1)));
        })
      );
      setMemUsed(prev => +(prev + (Math.random() - 0.5) * 0.04).toFixed(2));

      setProcesses(prev =>
        prev.map(p => {
          if (p.pid === 1512) {
            return { ...p, cpu: +(2.5 + Math.random() * 2.5).toFixed(1) };
          }
          if (p.pid === 1420) {
            return { ...p, cpu: +(0.8 + Math.random() * 1.5).toFixed(1) };
          }
          return p;
        })
      );
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const handleKill = (pid: number) => {
    const target = processes.find(p => p.pid === pid);
    if (!target) return;

    if (target.user === 'root' && !isRoot) {
      setMessage(`htop: kill (${pid}): Operation not permitted. You need sudo/root privileges.`);
      return;
    }

    setProcesses(prev => prev.filter(p => p.pid !== pid));
    setMessage(`Sent SIGTERM (15) to PID ${pid} (${target.command}).`);
  };

  const handleSort = (field: keyof ProcessRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filtered = processes.filter(p =>
    p.command.toLowerCase().includes(filterText.toLowerCase()) ||
    p.user.toLowerCase().includes(filterText.toLowerCase()) ||
    String(p.pid).includes(filterText)
  );

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-neutral-100 font-mono text-xs select-none">
      {/* Top Header - System Gauges */}
      <div className="bg-[#0f172a] p-3 border-b border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {/* Left Column: CPU Cores */}
        <div className="space-y-1">
          {coreLoads.slice(0, vps.vcpu).map((load, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px]">
              <span className="w-5 text-sky-400 font-bold">{idx + 1}</span>
              <div className="flex-1 bg-neutral-900 h-3 rounded overflow-hidden flex border border-neutral-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    load > 80 ? 'bg-red-500' : load > 50 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${load}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono tabular-nums text-neutral-300">
                {load}%
              </span>
            </div>
          ))}
        </div>

        {/* Right Column: Memory & System Stats */}
        <div className="space-y-1 text-[11px]">
          {/* Mem Bar */}
          <div className="flex items-center gap-2">
            <span className="w-10 text-emerald-400 font-bold">Mem</span>
            <div className="flex-1 bg-neutral-900 h-3 rounded overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(memUsed / vps.ramGb) * 100}%` }}
              />
            </div>
            <span className="text-right font-mono tabular-nums text-neutral-300 text-[10px]">
              {memUsed}G/{vps.ramGb}.00G
            </span>
          </div>

          {/* Swap Bar */}
          <div className="flex items-center gap-2">
            <span className="w-10 text-red-400 font-bold">Swp</span>
            <div className="flex-1 bg-neutral-900 h-3 rounded overflow-hidden border border-neutral-800">
              <div className="bg-red-500 h-full" style={{ width: '0%' }} />
            </div>
            <span className="text-right font-mono tabular-nums text-neutral-400 text-[10px]">
              0K/2.00G
            </span>
          </div>

          {/* Tasks & Load Avg */}
          <div className="pt-1 flex items-center justify-between text-neutral-400 text-[10px]">
            <span>Tasks: <strong className="text-neutral-200">{processes.length}</strong>, 1 running</span>
            <span>Load avg: <strong className="text-neutral-200">0.14 0.09 0.06</strong></span>
            <span>Uptime: <strong className="text-neutral-200">4d 16:24:01</strong></span>
          </div>
        </div>
      </div>

      {/* Filter / Notification Bar */}
      <div className="bg-[#131b2e] px-3 py-1.5 flex items-center justify-between border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Filter processes (e.g. nginx, node, root)..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-sky-500"
          />
        </div>

        {message && (
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] truncate px-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Process Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead className="bg-[#1e293b] text-neutral-300 sticky top-0 select-none">
            <tr>
              <th onClick={() => handleSort('pid')} className="py-1 px-2 cursor-pointer hover:text-white">
                PID {sortField === 'pid' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('user')} className="py-1 px-2 cursor-pointer hover:text-white">
                USER {sortField === 'user' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="py-1 px-1 text-center">PRI</th>
              <th className="py-1 px-1 text-center">NI</th>
              <th className="py-1 px-2">VIRT</th>
              <th className="py-1 px-2">RES</th>
              <th className="py-1 px-2">SHR</th>
              <th className="py-1 px-1 text-center">S</th>
              <th onClick={() => handleSort('cpu')} className="py-1 px-2 text-right cursor-pointer hover:text-white">
                CPU% {sortField === 'cpu' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('mem')} className="py-1 px-2 text-right cursor-pointer hover:text-white">
                MEM% {sortField === 'mem' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th className="py-1 px-2">TIME+</th>
              <th onClick={() => handleSort('command')} className="py-1 px-2 cursor-pointer hover:text-white">
                Command
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900/60">
            {sorted.map(p => {
              const isSelected = selectedPid === p.pid;
              return (
                <tr
                  key={p.pid}
                  onClick={() => setSelectedPid(p.pid)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-900/50 text-white font-medium'
                      : 'hover:bg-neutral-800/40 text-neutral-300'
                  }`}
                >
                  <td className="py-0.5 px-2 font-mono tabular-nums text-neutral-400">{p.pid}</td>
                  <td className={`py-0.5 px-2 ${p.user === 'root' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {p.user}
                  </td>
                  <td className="py-0.5 px-1 text-center text-neutral-400">{p.pri}</td>
                  <td className="py-0.5 px-1 text-center text-neutral-400">{p.ni}</td>
                  <td className="py-0.5 px-2 text-neutral-400">{p.virt}</td>
                  <td className="py-0.5 px-2 text-neutral-300">{p.res}</td>
                  <td className="py-0.5 px-2 text-neutral-400">{p.shr}</td>
                  <td className="py-0.5 px-1 text-center font-bold text-emerald-400">{p.s}</td>
                  <td className="py-0.5 px-2 text-right font-mono tabular-nums font-semibold text-neutral-200">
                    {p.cpu.toFixed(1)}
                  </td>
                  <td className="py-0.5 px-2 text-right font-mono tabular-nums text-neutral-300">
                    {p.mem.toFixed(1)}
                  </td>
                  <td className="py-0.5 px-2 text-neutral-400">{p.time}</td>
                  <td className="py-0.5 px-2 font-mono text-neutral-100 truncate max-w-xs md:max-w-md">
                    {p.command}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Functional Hotkeys Bar */}
      <div className="bg-[#0f172a] px-3 py-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleKill(selectedPid)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded border border-red-700 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span>F9 Kill (PID {selectedPid})</span>
          </button>

          <button
            onClick={() => {
              setProcesses(INITIAL_PROCESSES);
              setMessage('Processes refreshed.');
            }}
            className="flex items-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 font-medium"
          >
            <span className="font-bold text-amber-400">F10 / Q</span>
            <span>Quit htop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
