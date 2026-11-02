export interface VirtualFile {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
  permissions: string; // e.g., '0755', '0644'
  owner: 'root' | 'admin' | 'www-data';
  group: 'root' | 'admin' | 'sudo' | 'www-data';
  updatedAt: string;
  size: number;
}

export interface CommandHistoryItem {
  id: string;
  timestamp: string;
  command: string;
  output?: string;
  exitCode: number;
  cwd: string;
  user: 'admin' | 'root';
  isRoot: boolean;
  isSudoPrompt?: boolean;
  isAiGenerated?: boolean;
}

export interface VPSInstance {
  id: string;
  name: string;
  hostname: string;
  os: string;
  ip: string;
  vcpu: number;
  ramGb: number;
  diskGb: number;
  region: string;
  status: 'running' | 'rebooting' | 'stopped';
  uptimeSeconds: number;
  rootPassword: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  history: CommandHistoryItem[];
  cwd: string;
  user: 'admin' | 'root';
  isRoot: boolean;
  sudoAuthenticatedUntil: number; // timestamp ms
  currentInput: string;
  historyIndex: number;
  activeApp?: 'none' | 'nano' | 'htop' | 'cmatrix';
  activeAppFile?: string;
  nanoContent?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  port?: number;
  logs: string[];
}

export interface PortRule {
  port: number;
  protocol: 'tcp' | 'udp';
  action: 'ALLOW' | 'DENY';
  from: string;
  service: string;
}

export interface TerminalTheme {
  id: string;
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  promptUser: string;
  promptPath: string;
  accent: string;
  cursor: string;
}
