import { VPSInstance, VirtualFile, ServiceItem, PortRule, TerminalTheme } from '../types/terminal';

export const SHAHAJJO_LOGO = '/src/assets/images/shahajjo_vps_logo_1793627304958.jpg';

export const INITIAL_VPS_INSTANCES: VPSInstance[] = [
  {
    id: 'shahajjo-vps-01',
    name: 'shahajjo-vps-prod',
    hostname: 'shahajjo-vps-01',
    os: 'Ubuntu 24.04.1 LTS (Noble Numbat)',
    ip: '164.92.128.45',
    vcpu: 4,
    ramGb: 8,
    diskGb: 160,
    region: 'us-east-1 (N. Virginia)',
    status: 'running',
    uptimeSeconds: 384500,
    rootPassword: 'ramim123@Q',
  },
  {
    id: 'shahajjo-vps-db',
    name: 'shahajjo-vps-db-cluster',
    hostname: 'shahajjo-vps-db',
    os: 'Debian GNU/Linux 12 (bookworm)',
    ip: '198.51.100.22',
    vcpu: 2,
    ramGb: 4,
    diskGb: 80,
    region: 'eu-central-1 (Frankfurt)',
    status: 'running',
    uptimeSeconds: 192300,
    rootPassword: 'ramim123@Q',
  },
  {
    id: 'shahajjo-vps-edge',
    name: 'shahajjo-vps-edge-sg',
    hostname: 'shahajjo-vps-edge',
    os: 'Alpine Linux v3.20',
    ip: '203.0.113.89',
    vcpu: 1,
    ramGb: 2,
    diskGb: 40,
    region: 'ap-southeast-1 (Singapore)',
    status: 'running',
    uptimeSeconds: 84200,
    rootPassword: 'ramim123@Q',
  },
];

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'ssh',
    name: 'sshd.service',
    description: 'OpenSSH server daemon for remote management',
    active: true,
    port: 22,
    logs: [
      'systemd[1]: Started OpenSSH server daemon.',
      'sshd[842]: Server listening on 0.0.0.0 port 22.',
      'sshd[842]: Server listening on [::] port 22.',
      'sshd[1044]: Accepted publickey for admin from 192.168.1.10 port 54120 ssh2',
    ],
  },
  {
    id: 'nginx',
    name: 'nginx.service',
    description: 'Nginx High Performance Web Server & Reverse Proxy',
    active: true,
    port: 80,
    logs: [
      'systemd[1]: Starting A high performance web server and a reverse proxy server...',
      'systemd[1]: Started A high performance web server and a reverse proxy server.',
      'nginx[890]: 192.168.1.10 - - "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0"',
    ],
  },
  {
    id: 'docker',
    name: 'docker.service',
    description: 'Docker Application Container Engine',
    active: true,
    logs: [
      'dockerd[912]: Starting up',
      'dockerd[912]: API listen on /var/run/docker.sock',
      'dockerd[912]: Daemon has completed initialization',
    ],
  },
  {
    id: 'ufw',
    name: 'ufw.service',
    description: 'Uncomplicated Firewall (iptables frontend)',
    active: true,
    logs: [
      'systemd[1]: Started Uncomplicated firewall.',
      'ufw[410]: Status: active',
    ],
  },
  {
    id: 'postgresql',
    name: 'postgresql@16-main.service',
    description: 'PostgreSQL RDBMS Cluster 16-main',
    active: false,
    port: 5432,
    logs: [
      'systemd[1]: postgresql.service is inactive (dead).',
    ],
  },
  {
    id: 'redis',
    name: 'redis-server.service',
    description: 'Advanced key-value in-memory store',
    active: false,
    port: 6379,
    logs: [
      'systemd[1]: redis-server.service is inactive (dead).',
    ],
  },
];

export const INITIAL_PORTS: PortRule[] = [
  { port: 22, protocol: 'tcp', action: 'ALLOW', from: 'Anywhere', service: 'SSH' },
  { port: 80, protocol: 'tcp', action: 'ALLOW', from: 'Anywhere', service: 'HTTP' },
  { port: 443, protocol: 'tcp', action: 'ALLOW', from: 'Anywhere', service: 'HTTPS' },
  { port: 3000, protocol: 'tcp', action: 'ALLOW', from: 'Anywhere', service: 'Node.js App' },
  { port: 8080, protocol: 'tcp', action: 'DENY', from: 'Anywhere', service: 'Internal Proxy' },
];

export const TERMINAL_THEMES: TerminalTheme[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    bg: '#07090e',
    cardBg: '#0b0f17',
    text: '#e2e8f0',
    promptUser: '#00f0ff',
    promptPath: '#38bdf8',
    accent: '#00f0ff',
    cursor: '#00f0ff',
  },
  {
    id: 'dracula',
    name: 'Dracula Noir',
    bg: '#181926',
    cardBg: '#12131d',
    text: '#f8f8f2',
    promptUser: '#50fa7b',
    promptPath: '#8be9fd',
    accent: '#bd93f9',
    cursor: '#ff79c6',
  },
  {
    id: 'matrix',
    name: 'Cyber Matrix',
    bg: '#040905',
    cardBg: '#020502',
    text: '#22c55e',
    promptUser: '#4ade80',
    promptPath: '#16a34a',
    accent: '#22c55e',
    cursor: '#4ade80',
  },
  {
    id: 'tokyo',
    name: 'Neon Tokyo',
    bg: '#0a0914',
    cardBg: '#07060e',
    text: '#c0caf5',
    promptUser: '#f7768e',
    promptPath: '#7aa2f7',
    accent: '#bb9af7',
    cursor: '#bb9af7',
  },
  {
    id: 'nord',
    name: 'Nordic Night',
    bg: '#1e222a',
    cardBg: '#181b21',
    text: '#eceff4',
    promptUser: '#a3be8c',
    promptPath: '#88c0d0',
    accent: '#81a1c1',
    cursor: '#d8dee9',
  },
  {
    id: 'amber',
    name: 'Amber Glow',
    bg: '#0f0a04',
    cardBg: '#090602',
    text: '#fbbf24',
    promptUser: '#f59e0b',
    promptPath: '#d97706',
    accent: '#f59e0b',
    cursor: '#fef3c7',
  },
];

export const INITIAL_FILES: VirtualFile[] = [
  // Root /
  { name: 'bin', path: '/bin', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'boot', path: '/boot', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'dev', path: '/dev', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'etc', path: '/etc', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'home', path: '/home', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'lib', path: '/lib', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'proc', path: '/proc', content: '', isDirectory: true, permissions: '0555', owner: 'root', group: 'root', updatedAt: '2026-11-01 12:00', size: 0 },
  { name: 'root', path: '/root', content: '', isDirectory: true, permissions: '0700', owner: 'root', group: 'root', updatedAt: '2026-10-20 18:30', size: 4096 },
  { name: 'sbin', path: '/sbin', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'tmp', path: '/tmp', content: '', isDirectory: true, permissions: '1777', owner: 'root', group: 'root', updatedAt: '2026-11-01 12:40', size: 4096 },
  { name: 'usr', path: '/usr', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },
  { name: 'var', path: '/var', content: '', isDirectory: true, permissions: '0755', owner: 'root', group: 'root', updatedAt: '2026-10-15 04:00', size: 4096 },

  // /etc
  {
    name: 'hostname',
    path: '/etc/hostname',
    content: 'shahajjo-vps-01\n',
    isDirectory: false,
    permissions: '0644',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-15 04:12',
    size: 16,
  },
  {
    name: 'os-release',
    path: '/etc/os-release',
    content: `PRETTY_NAME="Ubuntu 24.04.1 LTS (Noble Numbat)"
NAME="Ubuntu"
VERSION_ID="24.04"
VERSION="24.04.1 LTS (Noble Numbat)"
VERSION_CODENAME=noble
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=noble
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-15 04:00',
    size: 382,
  },
  {
    name: 'passwd',
    path: '/etc/passwd',
    content: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
sshd:x:107:65534::/run/sshd:/usr/sbin/nologin
admin:x:1000:1000:Admin User,,,:/home/admin:/bin/bash
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-15 04:30',
    size: 340,
  },
  {
    name: 'shadow',
    path: '/etc/shadow',
    content: `root:$6$vps$uYgZ81GkPqA5yvjF3m0eF0s:19820:0:99999:7:::
admin:$6$vps$mK1a9xZ8vL3bQ4fH8o0wT1r:19820:0:99999:7:::
www-data:*:19820:0:99999:7:::
`,
    isDirectory: false,
    permissions: '0600', // Root only!
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-15 04:30',
    size: 168,
  },
  {
    name: 'sudoers',
    path: '/etc/sudoers',
    content: `# /etc/sudoers - Sudoers configuration file
Defaults	env_reset
Defaults	mail_badpass
Defaults	secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# User privilege specification
root	ALL=(ALL:ALL) ALL

# Members of the admin group may gain root privileges
%admin ALL=(ALL) ALL

# Allow members of group sudo to execute any command
%sudo	ALL=(ALL:ALL) ALL

# Admin user full access
admin ALL=(ALL:ALL) ALL
`,
    isDirectory: false,
    permissions: '0440',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-15 04:30',
    size: 394,
  },
  {
    name: 'nginx',
    path: '/etc/nginx',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-16 09:12',
    size: 4096,
  },
  {
    name: 'nginx.conf',
    path: '/etc/nginx/nginx.conf',
    content: `user www-data;
worker_processes auto;
pid /run/nginx.pid;
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80 default_server;
        server_name _;
        root /var/www/html;
        index index.html index.htm;
        location / {
            try_files $uri $uri/ =404;
        }
    }
}
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-16 09:15',
    size: 430,
  },

  // /home/admin
  {
    name: 'admin',
    path: '/home/admin',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-11-01 12:00',
    size: 4096,
  },
  {
    name: '.bashrc',
    path: '/home/admin/.bashrc',
    content: `# ~/.bashrc: executed by bash(1) for non-login shells.
export PS1='\\[\\e[32m\\]\\u@\\h\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ '
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias update='sudo apt update && sudo apt upgrade'
alias status='sudo systemctl status'
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-10-15 04:35',
    size: 245,
  },
  {
    name: 'deploy.sh',
    path: '/home/admin/deploy.sh',
    content: `#!/bin/bash
# Production Deployment Script
echo "[+] Starting VPS Production Deployment..."
echo "[+] Checking system resources..."
free -m
echo "[+] Checking Nginx status..."
sudo systemctl is-active --quiet nginx && echo "Nginx is running" || sudo systemctl restart nginx
echo "[+] Deployment completed successfully!"
`,
    isDirectory: false,
    permissions: '0755',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-10-25 14:10',
    size: 320,
  },
  {
    name: 'server_info.txt',
    path: '/home/admin/server_info.txt',
    content: `VPS Instance: shahajjo-vps-prod
Hostname: shahajjo-vps-01
Provider: Shahajjo VPS Cloud Infrastructure
IP Address: 164.92.128.45
vCPU: 4 Cores @ 3.4 GHz (EPYC)
RAM: 8192 MB DDR5
Storage: 160 GB NVMe PCIe Gen4
OS: Ubuntu 24.04.1 LTS Noble
Access Level: sudo (Full Privileges)
Sudo / Root Password: ramim123@Q
Default SSH Port: 22
Web Ports: 80, 443, 3000, 8080
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-11-02 05:50',
    size: 360,
  },
  {
    name: 'projects',
    path: '/home/admin/projects',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-10-22 16:00',
    size: 4096,
  },
  {
    name: 'app.js',
    path: '/home/admin/projects/app.js',
    content: `// Sample Node.js microservice
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', vps: 'ubuntu-noble-prod', uptime: process.uptime() }));
});
server.listen(3000, () => {
  console.log('App listening on port 3000');
});
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'admin',
    group: 'admin',
    updatedAt: '2026-10-22 16:05',
    size: 342,
  },

  // /root
  {
    name: 'root-secrets.env',
    path: '/root/root-secrets.env',
    content: `DATABASE_URL="postgres://postgres:SuperSecretP@ss@127.0.0.1:5432/production"
REDIS_KEY="e8f49a2b91c045b8a9ef38"
ENCRYPTION_SALT="vps_salt_98457239"
API_MASTER_TOKEN="vps_live_8914ba73ec99"
`,
    isDirectory: false,
    permissions: '0600', // Root only!
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-18 22:15',
    size: 198,
  },
  {
    name: 'backup.sh',
    path: '/root/backup.sh',
    content: `#!/bin/bash
# VPS System Backup Script
tar -czf /tmp/backup-\$(date +%F).tar.gz /var/www /etc/nginx /home/admin
echo "[+] Backup created in /tmp"
`,
    isDirectory: false,
    permissions: '0700',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-10-18 22:20',
    size: 140,
  },

  // /var/www/html
  {
    name: 'www',
    path: '/var/www',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'www-data',
    group: 'www-data',
    updatedAt: '2026-10-16 09:10',
    size: 4096,
  },
  {
    name: 'html',
    path: '/var/www/html',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'www-data',
    group: 'www-data',
    updatedAt: '2026-10-16 09:10',
    size: 4096,
  },
  {
    name: 'index.html',
    path: '/var/www/html/index.html',
    content: `<!DOCTYPE html>
<html>
<head><title>Welcome to Nginx on TerminaVPS</title></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
  <h1>Welcome to your Cloud VPS!</h1>
  <p>If you see this page, the nginx web server is successfully installed and working.</p>
</body>
</html>
`,
    isDirectory: false,
    permissions: '0644',
    owner: 'www-data',
    group: 'www-data',
    updatedAt: '2026-10-16 09:12',
    size: 320,
  },

  // /var/log
  {
    name: 'log',
    path: '/var/log',
    content: '',
    isDirectory: true,
    permissions: '0755',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-11-01 12:00',
    size: 4096,
  },
  {
    name: 'syslog',
    path: '/var/log/syslog',
    content: `Nov  1 12:00:01 vps-ubuntu-01 CRON[1240]: (root) CMD (/usr/local/bin/metrics-collector.sh)
Nov  1 12:15:02 vps-ubuntu-01 systemd[1]: Starting Daily apt download activities...
Nov  1 12:15:10 vps-ubuntu-01 systemd[1]: apt-daily.service: Deactivated successfully.
Nov  1 12:30:00 vps-ubuntu-01 systemd[1]: Time has been changed to 2026-11-01 12:30:00 UTC.
Nov  1 12:45:22 vps-ubuntu-01 kernel: [ 3845.120] [UFW BLOCK] IN=eth0 OUT= MAC=00:16:3e:fa:12 SRC=198.51.100.99 DST=164.92.128.45 PROTO=TCP SPT=48210 DPT=23
`,
    isDirectory: false,
    permissions: '0640',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-11-01 12:45',
    size: 412,
  },
  {
    name: 'auth.log',
    path: '/var/log/auth.log',
    content: `Nov  1 12:00:15 vps-ubuntu-01 sshd[1044]: Accepted publickey for admin from 192.168.1.10 port 54120 ssh2
Nov  1 12:00:15 vps-ubuntu-01 systemd-logind[412]: New session 1 of user admin.
Nov  1 12:01:04 vps-ubuntu-01 sudo:    admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/usr/bin/apt update
`,
    isDirectory: false,
    permissions: '0640',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-11-01 12:01',
    size: 260,
  },

  // /proc
  {
    name: 'version',
    path: '/proc/version',
    content: 'Linux version 6.8.0-45-generic (buildd@lcy02-amd64-082) (gcc version 13.2.0 (Ubuntu 13.2.0-23ubuntu4)) #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Sep  6 12:00:00 UTC 2026\n',
    isDirectory: false,
    permissions: '0444',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-11-01 12:00',
    size: 160,
  },
  {
    name: 'uptime',
    path: '/proc/uptime',
    content: '384500.12 1538000.48\n',
    isDirectory: false,
    permissions: '0444',
    owner: 'root',
    group: 'root',
    updatedAt: '2026-11-01 12:00',
    size: 24,
  },
];
