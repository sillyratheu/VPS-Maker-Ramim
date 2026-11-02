import { VirtualFile, VPSInstance, ServiceItem, PortRule } from '../types/terminal';

export interface ExecResult {
  output: string;
  exitCode: number;
  newCwd?: string;
  newFiles?: VirtualFile[];
  newUser?: 'admin' | 'root';
  newIsRoot?: boolean;
  needsSudoPassword?: boolean;
  pendingSudoCommand?: string;
  sudoAuthSuccess?: boolean;
  startInteractiveApp?: 'nano' | 'htop' | 'cmatrix';
  interactiveAppFile?: string;
  rebootTriggered?: boolean;
  isAiGenerated?: boolean;
}

// Helper to normalize path
export function normalizePath(path: string, cwd: string): string {
  if (!path || path === '.') return cwd;
  let target = path.trim();
  if (target === '~') return '/home/admin';
  if (target.startsWith('~/')) target = '/home/admin' + target.slice(1);
  if (!target.startsWith('/')) {
    target = (cwd === '/' ? '' : cwd) + '/' + target;
  }

  const parts = target.split('/').filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (resolved.length > 0) resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  return '/' + resolved.join('/');
}

export function getFileByPath(files: VirtualFile[], path: string): VirtualFile | undefined {
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  return files.find(f => f.path === cleanPath);
}

export function canAccess(file: VirtualFile, isRoot: boolean, user: string, mode: 'r' | 'w' | 'x'): boolean {
  if (isRoot) return true;
  if (file.path.startsWith('/root')) return false;
  if (file.path.startsWith('/etc/shadow')) return false;

  const perms = file.permissions;
  const isOwner = file.owner === user;

  if (isOwner) {
    if (mode === 'r') return true;
    if (mode === 'w') return perms[1] === '6' || perms[1] === '7' || perms[1] === '2';
    if (mode === 'x') return perms[1] === '7' || perms[1] === '5' || perms[1] === '1';
  }

  // World / other permissions
  if (mode === 'r') return perms[3] === '4' || perms[3] === '5' || perms[3] === '6' || perms[3] === '7';
  if (mode === 'w') return perms[3] === '2' || perms[3] === '6' || perms[3] === '7';
  if (mode === 'x') return perms[3] === '1' || perms[3] === '5' || perms[3] === '7';

  return true;
}

export async function executeCommand(
  rawCommand: string,
  cwd: string,
  user: 'admin' | 'root',
  isRoot: boolean,
  sudoAuthUntil: number,
  files: VirtualFile[],
  vps: VPSInstance,
  services: ServiceItem[],
  updateServices: (updater: (prev: ServiceItem[]) => ServiceItem[]) => void,
  ports: PortRule[],
  updatePorts: (updater: (prev: PortRule[]) => PortRule[]) => void
): Promise<ExecResult> {
  const trimmed = rawCommand.trim();
  if (!trimmed) {
    return { output: '', exitCode: 0 };
  }

  // Handle sudo prefix
  if (trimmed.startsWith('sudo ')) {
    const subCommand = trimmed.slice(5).trim();

    // Check if sudo authentication is active
    const now = Date.now();
    const isAuthed = isRoot || sudoAuthUntil > now;

    if (!isAuthed) {
      return {
        output: `[sudo] password for ${user}: `,
        exitCode: 0,
        needsSudoPassword: true,
        pendingSudoCommand: subCommand,
      };
    }

    // Authenticated: log to /var/log/auth.log and run with isRoot = true
    const authLogFile = getFileByPath(files, '/var/log/auth.log');
    if (authLogFile) {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      authLogFile.content += `${timestamp} ${vps.hostname} sudo:    ${user} : TTY=pts/0 ; PWD=${cwd} ; USER=root ; COMMAND=${subCommand}\n`;
    }

    // Special case: sudo -i or sudo su
    if (subCommand === '-i' || subCommand === 'su' || subCommand === '-s' || subCommand === 'bash' || subCommand === 'sh') {
      return {
        output: '',
        exitCode: 0,
        newUser: 'root',
        newIsRoot: true,
        newCwd: '/root',
      };
    }

    // Run the subCommand with isRoot = true and user = 'root'
    return executeCommand(subCommand, cwd, 'root', true, sudoAuthUntil, files, vps, services, updateServices, ports, updatePorts);
  }

  // Handle direct su / su root
  if (trimmed === 'su' || trimmed === 'su root' || trimmed === 'su -') {
    if (!isRoot && sudoAuthUntil <= Date.now()) {
      return {
        output: 'Password: ',
        exitCode: 0,
        needsSudoPassword: true,
        pendingSudoCommand: 'switch_to_root',
      };
    }
    return {
      output: '',
      exitCode: 0,
      newUser: 'root',
      newIsRoot: true,
      newCwd: '/root',
    };
  }

  // Handle exit / logout
  if (trimmed === 'exit' || trimmed === 'logout') {
    if (isRoot && user === 'root') {
      return {
        output: 'exit\nDropping back to non-root shell.',
        exitCode: 0,
        newUser: 'admin',
        newIsRoot: false,
        newCwd: '/home/admin',
      };
    }
    return {
      output: 'logout\nConnection to ' + vps.ip + ' closed.\n[Session kept open for web console]',
      exitCode: 0,
    };
  }

  // Parsing tokens (handles simple redirection > and >>)
  let cmdLine = trimmed;
  let redirectFile: string | null = null;
  let redirectAppend = false;

  if (cmdLine.includes('>>')) {
    const parts = cmdLine.split('>>');
    cmdLine = parts[0].trim();
    redirectFile = parts[1].trim();
    redirectAppend = true;
  } else if (cmdLine.includes('>')) {
    const parts = cmdLine.split('>');
    cmdLine = parts[0].trim();
    redirectFile = parts[1].trim();
    redirectAppend = false;
  }

  // Split into arguments
  const tokens = cmdLine.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cmd = tokens[0]?.replace(/^['"]|['"]$/g, '');
  const args = tokens.slice(1).map(a => a.replace(/^['"]|['"]$/g, ''));

  let resultOutput = '';
  let exitCode = 0;
  let newCwd: string | undefined;
  let newFilesList: VirtualFile[] | undefined;
  let startApp: 'nano' | 'htop' | 'cmatrix' | undefined;
  let appFile: string | undefined;

  switch (cmd) {
    case 'pwd': {
      resultOutput = cwd;
      break;
    }

    case 'cd': {
      const targetArg = args[0] || '~';
      const targetPath = normalizePath(targetArg, cwd);
      const targetDir = getFileByPath(files, targetPath);

      if (!targetDir) {
        resultOutput = `bash: cd: ${targetArg}: No such file or directory`;
        exitCode = 1;
      } else if (!targetDir.isDirectory) {
        resultOutput = `bash: cd: ${targetArg}: Not a directory`;
        exitCode = 1;
      } else if (!canAccess(targetDir, isRoot, user, 'x')) {
        resultOutput = `bash: cd: ${targetArg}: Permission denied`;
        exitCode = 1;
      } else {
        newCwd = targetPath;
      }
      break;
    }

    case 'ls':
    case 'dir': {
      const showAll = args.some(a => a.startsWith('-') && a.includes('a'));
      const showLong = args.some(a => a.startsWith('-') && a.includes('l'));
      const nonFlagArgs = args.filter(a => !a.startsWith('-'));
      const targetArg = nonFlagArgs[0] || '.';
      const targetPath = normalizePath(targetArg, cwd);
      const targetFile = getFileByPath(files, targetPath);

      if (!targetFile) {
        resultOutput = `ls: cannot access '${targetArg}': No such file or directory`;
        exitCode = 2;
        break;
      }

      if (!targetFile.isDirectory) {
        resultOutput = targetFile.name;
        break;
      }

      // Check read permission on directory
      if (!canAccess(targetFile, isRoot, user, 'r')) {
        resultOutput = `ls: cannot open directory '${targetArg}': Permission denied`;
        exitCode = 2;
        break;
      }

      // Find children of this directory
      const children = files.filter(f => {
        if (targetPath === '/') {
          return f.path !== '/' && f.path.split('/').length === 2;
        }
        const parent = f.path.substring(0, f.path.lastIndexOf('/')) || '/';
        return parent === targetPath;
      });

      const filtered = children.filter(c => showAll || !c.name.startsWith('.'));
      filtered.sort((a, b) => a.name.localeCompare(b.name));

      if (showLong) {
        const rows = filtered.map(f => {
          const typeChar = f.isDirectory ? 'd' : '-';
          const permsStr = typeChar + (f.permissions === '0755' ? 'rwxr-xr-x' : f.permissions === '0644' ? 'rw-r--r--' : f.permissions === '0700' ? 'rwx------' : 'rw-------');
          const ownerPad = f.owner.padEnd(8);
          const groupPad = f.group.padEnd(8);
          const sizePad = String(f.size).padStart(6);
          const dateStr = f.updatedAt;
          const nameColor = f.isDirectory ? `\x1b[1;34m${f.name}\x1b[0m` : (f.permissions.includes('7') ? `\x1b[1;32m${f.name}\x1b[0m` : f.name);
          return `${permsStr} 1 ${ownerPad} ${groupPad} ${sizePad} ${dateStr} ${nameColor}`;
        });
        const totalBlocks = Math.ceil(filtered.reduce((acc, f) => acc + f.size, 0) / 1024);
        resultOutput = `total ${totalBlocks}\n` + rows.join('\n');
      } else {
        resultOutput = filtered.map(f => f.name + (f.isDirectory ? '/' : '')).join('  ');
      }
      break;
    }

    case 'cat': {
      if (args.length === 0) {
        resultOutput = 'cat: missing file operand\nTry \'cat --help\' for more information.';
        exitCode = 1;
        break;
      }

      const outputs: string[] = [];
      for (const arg of args) {
        const filePath = normalizePath(arg, cwd);
        const file = getFileByPath(files, filePath);

        if (!file) {
          outputs.push(`cat: ${arg}: No such file or directory`);
          exitCode = 1;
        } else if (file.isDirectory) {
          outputs.push(`cat: ${arg}: Is a directory`);
          exitCode = 1;
        } else if (!canAccess(file, isRoot, user, 'r')) {
          outputs.push(`cat: ${arg}: Permission denied`);
          exitCode = 1;
        } else {
          outputs.push(file.content.replace(/\n$/, ''));
        }
      }
      resultOutput = outputs.join('\n');
      break;
    }

    case 'echo': {
      // Evaluate variables like $USER, $HOME, $HOSTNAME, $PWD
      let text = args.join(' ');
      text = text
        .replace(/\$USER/g, user)
        .replace(/\$HOME/g, user === 'root' ? '/root' : '/home/admin')
        .replace(/\$HOSTNAME/g, vps.hostname)
        .replace(/\$PWD/g, cwd);

      resultOutput = text;
      break;
    }

    case 'touch': {
      if (args.length === 0) {
        resultOutput = 'touch: missing file operand';
        exitCode = 1;
        break;
      }

      const updatedFiles = [...files];
      for (const arg of args) {
        const filePath = normalizePath(arg, cwd);
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
        const parentDir = getFileByPath(files, parentPath);

        if (!parentDir || !parentDir.isDirectory) {
          resultOutput = `touch: cannot touch '${arg}': No such file or directory`;
          exitCode = 1;
          continue;
        }

        if (!canAccess(parentDir, isRoot, user, 'w')) {
          resultOutput = `touch: cannot touch '${arg}': Permission denied`;
          exitCode = 1;
          continue;
        }

        const existing = getFileByPath(updatedFiles, filePath);
        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

        if (existing) {
          existing.updatedAt = nowStr;
        } else {
          const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
          updatedFiles.push({
            name: fileName,
            path: filePath,
            content: '',
            isDirectory: false,
            permissions: isRoot ? '0644' : '0664',
            owner: user,
            group: user,
            updatedAt: nowStr,
            size: 0,
          });
        }
      }
      newFilesList = updatedFiles;
      break;
    }

    case 'mkdir': {
      if (args.length === 0) {
        resultOutput = 'mkdir: missing operand';
        exitCode = 1;
        break;
      }

      const makeParents = args.includes('-p');
      const targetPaths = args.filter(a => !a.startsWith('-'));
      const updatedFiles = [...files];

      for (const target of targetPaths) {
        const fullPath = normalizePath(target, cwd);
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        const parentDir = getFileByPath(updatedFiles, parentPath);

        if (!parentDir && !makeParents) {
          resultOutput = `mkdir: cannot create directory '${target}': No such file or directory`;
          exitCode = 1;
          continue;
        }

        if (parentDir && !canAccess(parentDir, isRoot, user, 'w')) {
          resultOutput = `mkdir: cannot create directory '${target}': Permission denied`;
          exitCode = 1;
          continue;
        }

        const existing = getFileByPath(updatedFiles, fullPath);
        if (existing) {
          if (!makeParents) {
            resultOutput = `mkdir: cannot create directory '${target}': File exists`;
            exitCode = 1;
          }
          continue;
        }

        const dirName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

        updatedFiles.push({
          name: dirName,
          path: fullPath,
          content: '',
          isDirectory: true,
          permissions: '0755',
          owner: user,
          group: user,
          updatedAt: nowStr,
          size: 4096,
        });
      }

      newFilesList = updatedFiles;
      break;
    }

    case 'rm': {
      if (args.length === 0) {
        resultOutput = 'rm: missing operand';
        exitCode = 1;
        break;
      }

      const recursive = args.some(a => a.startsWith('-') && (a.includes('r') || a.includes('R')));
      const force = args.some(a => a.startsWith('-') && a.includes('f'));
      const targets = args.filter(a => !a.startsWith('-'));

      let updatedFiles = [...files];

      for (const target of targets) {
        const fullPath = normalizePath(target, cwd);
        if (fullPath === '/') {
          resultOutput = 'rm: it is dangerous to operate recursively on \'/\'\nrm: use --no-preserve-root to override this failsafe';
          exitCode = 1;
          continue;
        }

        const file = getFileByPath(updatedFiles, fullPath);
        if (!file) {
          if (!force) {
            resultOutput = `rm: cannot remove '${target}': No such file or directory`;
            exitCode = 1;
          }
          continue;
        }

        const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
        const parentDir = getFileByPath(updatedFiles, parentPath);

        if (parentDir && !canAccess(parentDir, isRoot, user, 'w')) {
          resultOutput = `rm: cannot remove '${target}': Permission denied`;
          exitCode = 1;
          continue;
        }

        if (file.isDirectory && !recursive) {
          resultOutput = `rm: cannot remove '${target}': Is a directory`;
          exitCode = 1;
          continue;
        }

        // Delete file and any sub-files if recursive
        updatedFiles = updatedFiles.filter(f => {
          if (f.path === fullPath) return false;
          if (recursive && f.path.startsWith(fullPath + '/')) return false;
          return true;
        });
      }

      newFilesList = updatedFiles;
      break;
    }

    case 'cp': {
      if (args.length < 2) {
        resultOutput = 'cp: missing file operand';
        exitCode = 1;
        break;
      }
      const srcArg = args[0];
      const destArg = args[1];
      const srcPath = normalizePath(srcArg, cwd);
      const destPath = normalizePath(destArg, cwd);
      const srcFile = getFileByPath(files, srcPath);

      if (!srcFile) {
        resultOutput = `cp: cannot stat '${srcArg}': No such file or directory`;
        exitCode = 1;
        break;
      }

      const updatedFiles = [...files];
      let targetFilepath = destPath;
      const destFile = getFileByPath(files, destPath);

      if (destFile && destFile.isDirectory) {
        targetFilepath = (destPath === '/' ? '' : destPath) + '/' + srcFile.name;
      }

      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const existing = getFileByPath(updatedFiles, targetFilepath);

      if (existing) {
        existing.content = srcFile.content;
        existing.updatedAt = nowStr;
      } else {
        const destName = targetFilepath.substring(targetFilepath.lastIndexOf('/') + 1);
        updatedFiles.push({
          ...srcFile,
          name: destName,
          path: targetFilepath,
          updatedAt: nowStr,
        });
      }

      newFilesList = updatedFiles;
      break;
    }

    case 'mv': {
      if (args.length < 2) {
        resultOutput = 'mv: missing file operand';
        exitCode = 1;
        break;
      }
      const srcArg = args[0];
      const destArg = args[1];
      const srcPath = normalizePath(srcArg, cwd);
      const destPath = normalizePath(destArg, cwd);
      const srcFile = getFileByPath(files, srcPath);

      if (!srcFile) {
        resultOutput = `mv: cannot stat '${srcArg}': No such file or directory`;
        exitCode = 1;
        break;
      }

      let targetFilepath = destPath;
      const destFile = getFileByPath(files, destPath);

      if (destFile && destFile.isDirectory) {
        targetFilepath = (destPath === '/' ? '' : destPath) + '/' + srcFile.name;
      }

      const updatedFiles = files.filter(f => f.path !== srcPath);
      const destName = targetFilepath.substring(targetFilepath.lastIndexOf('/') + 1);
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      updatedFiles.push({
        ...srcFile,
        name: destName,
        path: targetFilepath,
        updatedAt: nowStr,
      });

      newFilesList = updatedFiles;
      break;
    }

    case 'chmod': {
      if (args.length < 2) {
        resultOutput = 'chmod: missing operand';
        exitCode = 1;
        break;
      }
      const mode = args[0];
      const targetArg = args[1];
      const targetPath = normalizePath(targetArg, cwd);
      const file = getFileByPath(files, targetPath);

      if (!file) {
        resultOutput = `chmod: cannot access '${targetArg}': No such file or directory`;
        exitCode = 1;
        break;
      }

      if (!isRoot && file.owner !== user) {
        resultOutput = `chmod: changing permissions of '${targetArg}': Operation not permitted`;
        exitCode = 1;
        break;
      }

      const updatedFiles = [...files];
      const matchFile = getFileByPath(updatedFiles, targetPath)!;

      if (mode.startsWith('0') || /^\d{3,4}$/.test(mode)) {
        matchFile.permissions = mode.length === 3 ? '0' + mode : mode;
      } else if (mode.includes('+x')) {
        matchFile.permissions = '0755';
      }
      newFilesList = updatedFiles;
      break;
    }

    case 'chown': {
      if (args.length < 2) {
        resultOutput = 'chown: missing operand';
        exitCode = 1;
        break;
      }
      if (!isRoot) {
        resultOutput = 'chown: changing ownership: Operation not permitted';
        exitCode = 1;
        break;
      }

      const ownerStr = args[0];
      const targetPath = normalizePath(args[1], cwd);
      const file = getFileByPath(files, targetPath);

      if (!file) {
        resultOutput = `chown: cannot access '${args[1]}': No such file or directory`;
        exitCode = 1;
        break;
      }

      const [newOwner, newGroup] = ownerStr.split(':');
      const updatedFiles = [...files];
      const matchFile = getFileByPath(updatedFiles, targetPath)!;
      if (newOwner === 'root' || newOwner === 'admin' || newOwner === 'www-data') {
        matchFile.owner = newOwner;
      }
      if (newGroup === 'root' || newGroup === 'admin' || newGroup === 'sudo' || newGroup === 'www-data') {
        matchFile.group = newGroup;
      }
      newFilesList = updatedFiles;
      break;
    }

    case 'whoami': {
      resultOutput = user;
      break;
    }

    case 'id': {
      if (user === 'root') {
        resultOutput = 'uid=0(root) gid=0(root) groups=0(root)';
      } else {
        resultOutput = 'uid=1000(admin) gid=1000(admin) groups=1000(admin),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),110(lxd),998(docker)';
      }
      break;
    }

    case 'uname': {
      if (args.includes('-a')) {
        resultOutput = `Linux ${vps.hostname} 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Sep  6 12:00:00 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux`;
      } else if (args.includes('-r')) {
        resultOutput = '6.8.0-45-generic';
      } else {
        resultOutput = 'Linux';
      }
      break;
    }

    case 'hostname': {
      resultOutput = vps.hostname;
      break;
    }

    case 'uptime': {
      const upDays = Math.floor(vps.uptimeSeconds / 86400);
      const upHours = Math.floor((vps.uptimeSeconds % 86400) / 3600);
      const upMins = Math.floor((vps.uptimeSeconds % 3600) / 60);
      resultOutput = ` 12:48:39 up ${upDays} days, ${upHours}:${upMins < 10 ? '0' : ''}${upMins},  2 users,  load average: 0.14, 0.09, 0.06`;
      break;
    }

    case 'date': {
      resultOutput = new Date().toUTCString();
      break;
    }

    case 'df': {
      const isHuman = args.includes('-h');
      resultOutput = `Filesystem      ${isHuman ? 'Size  Used Avail Use%' : '1K-blocks     Used Available Use%'} Mounted on
udev             ${isHuman ? '3.9G     0  3.9G   0%' : ' 4001244        0   4001244   0%'} /dev
tmpfs            ${isHuman ? '796M  1.4M  794M   1%' : '  814420     1432    812988   1%'} /run
/dev/nvme0n1p1   ${isHuman ? ' 158G   24G  134G  15%' : '16515072 25165824 139984896  15%'} /
tmpfs            ${isHuman ? '3.9G     0  3.9G   0%' : ' 4001244        0   4001244   0%'} /dev/shm
tmpfs            ${isHuman ? '5.0M     0  5.0M   0%' : '    5120        0      5120   0%'} /run/lock`;
      break;
    }

    case 'free': {
      const isHuman = args.includes('-h') || args.includes('-m');
      resultOutput = `               total        used        free      shared  buff/cache   available
Mem:            ${isHuman ? '7.8Gi       1.8Gi       4.2Gi        64Mi       1.8Gi       5.8Gi' : '8192000     1887436     4404019       65536     1900545     6082496'}
Swap:           ${isHuman ? '2.0Gi          0B       2.0Gi' : '2097152           0     2097152'}`;
      break;
    }

    case 'ps': {
      if (args.includes('aux') || args.includes('-ef')) {
        resultOutput = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1 168420 12840 ?        Ss   Oct28   0:04 /sbin/init
root         410  0.0  0.1  24120  8400 ?        Ss   Oct28   0:00 /lib/systemd/systemd-udevd
root         842  0.0  0.1  15890  6700 ?        Ss   Oct28   0:01 sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups
root         890  0.0  0.2 142100 16800 ?        Ss   Oct28   0:02 nginx: master process /usr/sbin/nginx -g daemon on;
www-data     891  0.0  0.1 142640  8900 ?        S    Oct28   0:00 nginx: worker process
root         912  0.1  0.8 748900 65400 ?        Ssl  Oct28   2:14 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
root        1044  0.0  0.1  18900  7200 ?        Ss   12:00   0:00 sshd: admin [priv]
admin       1050  0.0  0.1  18900  4800 ?        S    12:00   0:00 sshd: admin@pts/0
admin       1051  0.0  0.0   9800  4200 pts/0    Ss   12:00   0:00 -bash
admin       1420  0.0  0.0  12400  3800 pts/0    R+   12:48   0:00 ps aux`;
      } else {
        resultOutput = `    PID TTY          TIME CMD
   1051 pts/0    00:00:00 bash
   1422 pts/0    00:00:00 ps`;
      }
      break;
    }

    case 'neofetch':
    case 'fastfetch': {
      resultOutput = `\x1b[38;5;45m       .---.                     \x1b[1;37m${user}\x1b[0m@\x1b[1;36m${vps.hostname}\x1b[0m
\x1b[38;5;45m      /     \\                    \x1b[37m--------------------\x1b[0m
\x1b[38;5;45m     | () () |   \x1b[1;35mRAMIM VPS\x1b[0m       \x1b[38;5;45mOS:\x1b[0m ${vps.os}
\x1b[38;5;45m      \\  _  /    \x1b[38;5;244mEnterprise\x1b[0m      \x1b[38;5;45mHost:\x1b[0m Ramim VPS Cloud KVM (${vps.region})
\x1b[38;5;45m       \`---'                     \x1b[38;5;45mKernel:\x1b[0m 6.8.0-45-generic
\x1b[38;5;45m     /|     |\\                   \x1b[38;5;45mUptime:\x1b[0m 4 days, 16 hours, 24 mins
\x1b[38;5;45m    / |     | \\                  \x1b[38;5;45mPackages:\x1b[0m 742 (dpkg), 1 (snap)
\x1b[38;5;45m   /  |     |  \\                 \x1b[38;5;45mShell:\x1b[0m bash 5.2.21
\x1b[38;5;45m      |     |                    \x1b[38;5;45mTerminal:\x1b[0m Ramim VPS Web-TTY (xterm-256color)
\x1b[38;5;45m      |_____|                    \x1b[38;5;45mCPU:\x1b[0m AMD EPYC 7763 (${vps.vcpu} vCPU) @ 3.4GHz
\x1b[38;5;45m                                 \x1b[38;5;45mMemory:\x1b[0m 1842MiB / ${vps.ramGb * 1024}MiB (DDR5)
\x1b[38;5;45m                                 \x1b[38;5;45mDisk (/):\x1b[0m 24G / ${vps.diskGb}G NVMe (15%)
\x1b[38;5;45m                                 \x1b[38;5;45mIP:\x1b[0m ${vps.ip} (Dedicated IPv4)
\x1b[38;5;45m                                 \x1b[38;5;45mPrivileges:\x1b[0m ${isRoot ? 'ROOT ACCESS (UID 0)' : 'SUDO GRANTED (admin)'}
\x1b[40m   \x1b[41m   \x1b[42m   \x1b[43m   \x1b[44m   \x1b[45m   \x1b[46m   \x1b[47m   \x1b[0m
\x1b[100m   \x1b[101m   \x1b[102m   \x1b[103m   \x1b[104m   \x1b[105m   \x1b[106m   \x1b[107m   \x1b[0m`;
      break;
    }

    case 'apt':
    case 'apt-get': {
      const subAction = args[0];

      if (!isRoot) {
        resultOutput = `E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)
E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?`;
        exitCode = 100;
        break;
      }

      if (subAction === 'update') {
        resultOutput = `Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease
Get:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
Get:3 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Get:4 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [482 kB]
Get:5 http://archive.ubuntu.com/ubuntu noble-updates/universe amd64 Packages [612 kB]
Fetched 1,346 kB in 1s (1,120 kB/s)
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
All packages are up to date.`;
      } else if (subAction === 'install') {
        const pkg = args[1];
        if (!pkg) {
          resultOutput = 'apt install: missing package name operand.';
          exitCode = 1;
          break;
        }
        resultOutput = `Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following NEW packages will be installed:
  ${pkg}
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 1,420 kB of archives.
After this operation, 4,820 kB of additional disk space will be used.
Get:1 http://archive.ubuntu.com/ubuntu noble/main amd64 ${pkg} [1,420 kB]
Fetched 1,420 kB in 0s (3,410 kB/s)
Selecting previously unselected package ${pkg}.
(Reading database ... 74218 files and directories currently installed.)
Preparing to unpack .../${pkg}_amd64.deb ...
Unpacking ${pkg} ...
Setting up ${pkg} ...
Processing triggers for man-db (2.12.0-4build2) ...
Setting up binary symlinks in /usr/bin/${pkg} ...
Done.`;
      } else if (subAction === 'remove' || subAction === 'purge') {
        const pkg = args[1] || 'package';
        resultOutput = `Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following packages will be REMOVED:
  ${pkg}
0 upgraded, 0 newly installed, 1 to remove and 0 not upgraded.
After this operation, 4,820 kB disk space will be freed.
(Reading database ... 74218 files and directories currently installed.)
Removing ${pkg} ...
Processing triggers for man-db (2.12.0-4build2) ...
Done.`;
      } else {
        resultOutput = `apt 2.7.14 (amd64)
Usage: apt [options] command

Commands:
  update - Retrieve new lists of packages
  upgrade - Perform an upgrade
  install - Install new packages (requires sudo)
  remove - Remove packages (requires sudo)
  list - List packages based on package names`;
      }
      break;
    }

    case 'systemctl':
    case 'service': {
      let action = args[0];
      let serviceName = args[1];

      // Handle 'service nginx status' format
      if (cmd === 'service') {
        serviceName = args[0];
        action = args[1];
      }

      if (!action || !serviceName) {
        resultOutput = 'Usage: systemctl [status|start|stop|restart|enable|disable] <service>';
        exitCode = 1;
        break;
      }

      const cleanService = serviceName.replace(/\.service$/, '');
      const sItem = services.find(s => s.id === cleanService || s.name.startsWith(cleanService));

      if (action === 'status') {
        if (!sItem) {
          resultOutput = `Unit ${serviceName}.service could not be found.`;
          exitCode = 4;
        } else {
          resultOutput = `● ${sItem.name} - ${sItem.description}
     Loaded: loaded (/lib/systemd/system/${sItem.name}; enabled; preset: enabled)
     Active: ${sItem.active ? '\x1b[1;32mactive (running)\x1b[0m' : '\x1b[1;31minactive (dead)\x1b[0m'} since Mon 2026-10-28 04:00:12 UTC; 4 days ago
   Main PID: ${sItem.active ? '890 (' + cleanService + ')' : '-'}
      Tasks: ${sItem.active ? '2 (limit: 9512)' : '0'}
     Memory: ${sItem.active ? '14.2M' : '0B'}
        CPU: 124ms
     CGroup: /system.slice/${sItem.name}
             └─${sItem.active ? '890 /usr/sbin/' + cleanService : ''}

${sItem.logs.slice(-4).join('\n')}`;
        }
      } else if (action === 'start' || action === 'stop' || action === 'restart') {
        if (!isRoot) {
          resultOutput = `Failed to ${action} ${serviceName}.service: Access denied\nSee system logs and 'systemctl status ${serviceName}.service' for details.`;
          exitCode = 1;
          break;
        }

        if (!sItem) {
          resultOutput = `Failed to ${action} ${serviceName}.service: Unit not found.`;
          exitCode = 4;
          break;
        }

        const newActive = action === 'start' ? true : action === 'stop' ? false : true;
        updateServices(prev =>
          prev.map(s => {
            if (s.id === sItem.id) {
              const logEntry = `systemd[1]: ${action === 'restart' ? 'Restarted' : action === 'start' ? 'Started' : 'Stopped'} ${s.description}.`;
              return { ...s, active: newActive, logs: [...s.logs, logEntry] };
            }
            return s;
          })
        );
        resultOutput = '';
      } else {
        resultOutput = `systemctl: operation '${action}' completed.`;
      }
      break;
    }

    case 'ufw': {
      const subAction = args[0];
      if (!isRoot) {
        resultOutput = 'ERROR: You need to be root to run this script';
        exitCode = 1;
        break;
      }

      if (subAction === 'status') {
        const isVerbose = args.includes('verbose');
        const rows = ports.map(
          p => `${(p.port + '/' + p.protocol).padEnd(20)} ${p.action.padEnd(10)} ${p.from.padEnd(15)} # ${p.service}`
        );
        resultOutput = `Status: active\nLogging: on (low)\nDefault: deny (incoming), allow (outgoing), disabled (routed)\nNew profiles: skip\n\nTo                         Action      From\n--                         ------      ----\n` + rows.join('\n');
      } else if (subAction === 'allow' || subAction === 'deny') {
        const portStr = args[1];
        if (!portStr) {
          resultOutput = 'ERROR: Need port specification';
          exitCode = 1;
          break;
        }
        const portNum = parseInt(portStr.replace(/\/.*$/, ''), 10);
        const action = subAction.toUpperCase() as 'ALLOW' | 'DENY';
        updatePorts(prev => {
          const exists = prev.find(p => p.port === portNum);
          if (exists) {
            return prev.map(p => (p.port === portNum ? { ...p, action } : p));
          }
          return [...prev, { port: portNum, protocol: 'tcp', action, from: 'Anywhere', service: 'Custom' }];
        });
        resultOutput = `Rule ${subAction === 'allow' ? 'added' : 'updated'}\nRule added (v6)`;
      } else if (subAction === 'enable') {
        resultOutput = 'Firewall is active and enabled on system startup';
      } else if (subAction === 'disable') {
        resultOutput = 'Firewall stopped and disabled on system startup';
      } else {
        resultOutput = 'Usage: ufw status [verbose] | allow <port> | deny <port> | enable | disable';
      }
      break;
    }

    case 'ifconfig':
    case 'ip': {
      if (cmd === 'ifconfig') {
        resultOutput = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${vps.ip}  netmask 255.255.240.0  broadcast 164.92.143.255
        inet6 fe80::a00:27ff:fe4e:6612  prefixlen 64  scopeid 0x20<link>
        ether 00:16:3e:fa:12:44  txqueuelen 1000  (Ethernet)
        RX packets 2451092  bytes 1894210492 (1.8 GB)
        TX packets 1984210  bytes 1294819204 (1.2 GB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 45102  bytes 4210920 (4.2 MB)
        TX packets 45102  bytes 4210920 (4.2 MB)`;
      } else {
        resultOutput = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:16:3e:fa:12:44 brd ff:ff:ff:ff:ff:ff
    altname enp0s3
    inet ${vps.ip}/20 metric 100 brd 164.92.143.255 scope global dynamic eth0
       valid_lft 86120sec preferred_lft 86120sec`;
      }
      break;
    }

    case 'netstat':
    case 'ss': {
      resultOutput = `State    Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process
LISTEN   0       128            0.0.0.0:22          0.0.0.0:*      users:(("sshd",pid=842,fd=3))
LISTEN   0       511            0.0.0.0:80          0.0.0.0:*      users:(("nginx",pid=890,fd=6))
LISTEN   0       511            0.0.0.0:443         0.0.0.0:*      users:(("nginx",pid=890,fd=7))
LISTEN   0       4096         127.0.0.1:3000        0.0.0.0:*      users:(("node",pid=1420,fd=18))
LISTEN   0       128               [::]:22             [::]:*      users:(("sshd",pid=842,fd=4))`;
      break;
    }

    case 'ping': {
      const target = args.find(a => !a.startsWith('-')) || '8.8.8.8';
      resultOutput = `PING ${target} (${target}) 56(84) bytes of data.
64 bytes from ${target}: icmp_seq=1 ttl=118 time=9.42 ms
64 bytes from ${target}: icmp_seq=2 ttl=118 time=8.81 ms
64 bytes from ${target}: icmp_seq=3 ttl=118 time=9.14 ms
64 bytes from ${target}: icmp_seq=4 ttl=118 time=8.95 ms

--- ${target} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 8.810/9.080/9.420/0.228 ms`;
      break;
    }

    case 'curl': {
      const isHeader = args.includes('-I') || args.includes('-i');
      const target = args.find(a => !a.startsWith('-')) || 'http://localhost';
      if (target.includes('localhost') || target.includes('127.0.0.1') || target.includes(vps.ip)) {
        if (isHeader) {
          resultOutput = `HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: ${new Date().toUTCString()}
Content-Type: text/html
Content-Length: 320
Last-Modified: Wed, 16 Oct 2026 09:12:00 GMT
Connection: keep-alive
ETag: "670f80b0-140"
Accept-Ranges: bytes`;
        } else {
          resultOutput = `<!DOCTYPE html>
<html>
<head><title>Welcome to Nginx on Ramim VPS</title></head>
<body>
  <h1>Welcome to Ramim VPS!</h1>
  <p>The nginx web server is successfully running on ${vps.hostname}.</p>
</body>
</html>`;
        }
      } else {
        resultOutput = `HTTP/2 200 
date: ${new Date().toUTCString()}
content-type: text/html; charset=UTF-8
server: cloud-edge-vps
cache-control: max-age=3600

[Response from ${target} received successfully: 1240 bytes]`;
      }
      break;
    }

    case 'docker': {
      const subAction = args[0] || 'ps';
      if (subAction === 'ps') {
        resultOutput = `CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS          PORTS                  NAMES
a4f91c80b2e1   redis:7-alpine "docker-entrypoint.s…"   3 days ago     Up 3 days       0.0.0.0:6379->6379/tcp redis-cache
c189b20e98fa   postgres:16    "docker-entrypoint.s…"   5 days ago     Up 5 days       0.0.0.0:5432->5432/tcp app-postgres`;
      } else if (subAction === 'images') {
        resultOutput = `REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
ubuntu       24.04     2d2c73c88e99   2 weeks ago    77.8MB
redis        7-alpine  e914fb0284ae   3 weeks ago    38.4MB
postgres     16        789104bc12fa   4 weeks ago    379MB
node         20-slim   4b21901a88df   1 month ago    188MB`;
      } else if (subAction === 'version') {
        resultOutput = `Client: Docker Engine - Community
 Version:           26.1.4
 API version:       1.45
 Go version:        go1.21.11
 Git commit:        5650f9b
 Built:             Wed Jun  5 18:00:20 2026
 OS/Arch:           linux/amd64

Server: Docker Engine - Community
 Engine:
  Version:          26.1.4
  API version:      1.45 (minimum version 1.24)
  Go version:       go1.21.11
  Git commit:       de5c9cf
  Built:            Wed Jun  5 18:00:20 2026
  OS/Arch:          linux/amd64`;
      } else {
        resultOutput = `docker: '${subAction}' is not a built-in simulated shortcut. Try 'docker ps' or 'docker images'.`;
      }
      break;
    }

    case 'nano': {
      const targetArg = args[0] || 'untitled.txt';
      const targetPath = normalizePath(targetArg, cwd);
      const existing = getFileByPath(files, targetPath);

      if (existing && existing.isDirectory) {
        resultOutput = `nano: '${targetArg}' is a directory`;
        exitCode = 1;
        break;
      }

      startApp = 'nano';
      appFile = targetPath;
      break;
    }

    case 'vim':
    case 'vi': {
      // Directs user to nano or opens nano with message
      resultOutput = 'Tip: Switching to GNU nano for graphical in-browser buffer.\nLaunching nano...';
      const targetArg = args[0] || 'untitled.txt';
      const targetPath = normalizePath(targetArg, cwd);
      startApp = 'nano';
      appFile = targetPath;
      break;
    }

    case 'htop':
    case 'top': {
      startApp = 'htop';
      break;
    }

    case 'cmatrix': {
      startApp = 'cmatrix';
      break;
    }

    case 'reboot': {
      if (!isRoot) {
        resultOutput = 'reboot: Need to be root.';
        exitCode = 1;
        break;
      }
      return {
        output: 'Broadcast message from root@' + vps.hostname + ' (pts/0) (' + new Date().toUTCString() + '):\n\nThe system is going down for reboot NOW!',
        exitCode: 0,
        rebootTriggered: true,
      };
    }

    case 'shutdown': {
      if (!isRoot) {
        resultOutput = 'shutdown: Need to be root.';
        exitCode = 1;
        break;
      }
      return {
        output: 'Shutdown scheduled. Triggering VPS power cycle.',
        exitCode: 0,
        rebootTriggered: true,
      };
    }

    case 'clear': {
      return {
        output: '__CLEAR_SCREEN__',
        exitCode: 0,
      };
    }

    case 'history': {
      resultOutput = `  1  sudo apt update
  2  sudo apt install -y nginx docker.io htop
  3  sudo systemctl status nginx
  4  curl -I http://localhost
  5  sudo ufw status verbose
  6  df -h
  7  free -m
  8  neofetch
  9  cat /etc/os-release
 10  whoami`;
      break;
    }

    case 'help':
    case 'man': {
      resultOutput = `\x1b[1;36mRamim VPS Linux Shell Environment\x1b[0m
VPS Host: \x1b[1m${vps.hostname}\x1b[0m | IP: \x1b[1m${vps.ip}\x1b[0m | Access: \x1b[1m${isRoot ? 'ROOT (superuser)' : 'User (admin with sudoers)'}\x1b[0m

\x1b[1;33mPrivilege & Administration:\x1b[0m
  \x1b[32msudo <command>\x1b[0m       Execute any command with root privileges (default password: admin)
  \x1b[32msudo -i\x1b[0m / \x1b[32msudo su\x1b[0m     Switch directly to persistent interactive root shell (root@vps:~#)
  \x1b[32msu -\x1b[0m                 Switch to superuser root
  \x1b[32mexit\x1b[0m / \x1b[32mlogout\x1b[0m         Drop back to unprivileged user or close subshell
  \x1b[32mreboot\x1b[0m               Reboot the virtual server (requires sudo)

\x1b[1;33mInteractive Applications:\x1b[0m
  \x1b[32mnano <filename>\x1b[0m      Interactive text editor with real file save (Ctrl+O) & exit (Ctrl+X)
  \x1b[32mhtop\x1b[0m / \x1b[32mtop\x1b[0m          Interactive live system monitor (live CPU meters, kill processes)
  \x1b[32mcmatrix\x1b[0m              Matrix green digital rain animation (press 'q' to exit)

\x1b[1;33mSystem, Services & Packages:\x1b[0m
  \x1b[32msudo apt update\x1b[0m      Update package repositories
  \x1b[32msudo apt install <p>\x1b[0m Install Ubuntu deb packages (e.g. nginx, docker, tree, python3)
  \x1b[32msudo systemctl ...\x1b[0m   status, start, stop, restart services (nginx, ssh, docker, postgres)
  \x1b[32msudo ufw status\x1b[0m      Manage firewall rules and open ports (allow/deny)
  \x1b[32mneofetch\x1b[0m             Display colorful ASCII distro banner and hardware specs
  \x1b[32mdf -h\x1b[0m / \x1b[32mfree -m\x1b[0m      Check disk filesystem space and memory usage
  \x1b[32mps aux\x1b[0m               List all running processes and PIDs
  \x1b[32mping <host>\x1b[0m          Ping external server or IP (e.g. google.com, 8.8.8.8)
  \x1b[32mcurl -I <url>\x1b[0m        Fetch HTTP response headers or web content
  \x1b[32mifconfig\x1b[0m / \x1b[32mip a\x1b[0m      Display network interfaces and public IP address
  \x1b[32mdocker ps\x1b[0m            Check active Docker containers

\x1b[1;33mFilesystem Navigation:\x1b[0m
  \x1b[32mls -la\x1b[0m, \x1b[32mcd <dir>\x1b[0m, \x1b[32mpwd\x1b[0m, \x1b[32mcat <file>\x1b[0m, \x1b[32mtouch <file>\x1b[0m, \x1b[32mmkdir -p\x1b[0m, \x1b[32mrm -rf\x1b[0m, \x1b[32mcp\x1b[0m, \x1b[32mmv\x1b[0m, \x1b[32mchmod\x1b[0m, \x1b[32mchown\x1b[0m
  Redirection: \x1b[32mecho "text" > file\x1b[0m or \x1b[32mecho "line" >> file\x1b[0m

\x1b[1;35mAI Fallback Integration:\x1b[0m
  Any custom or unhandled Linux command (python, awk, sed, compilers, bash scripts)
  is automatically sent to the Gemini 3.8 Flash kernel engine for authentic emulation!`;
      break;
    }

    default: {
      // Not a recognized built-in command: forward to server.ts /api/terminal/exec
      try {
        const fileSummary = files.map(f => ({ path: f.path, isDir: f.isDirectory, size: f.size }));
        const response = await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: trimmed,
            cwd,
            user,
            isRoot,
            vpsInfo: {
              hostname: vps.hostname,
              os: vps.os,
              ip: vps.ip,
            },
            fileContext: fileSummary.slice(0, 30),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          resultOutput = data.stdout || data.stderr || '';
          exitCode = data.exitCode ?? (data.stderr ? 1 : 0);

          let updatedFiles = [...files];
          if (data.filesCreated && Array.isArray(data.filesCreated)) {
            for (const item of data.filesCreated) {
              const fullPath = normalizePath(item.path, cwd);
              const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
              const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
              const existing = getFileByPath(updatedFiles, fullPath);
              if (existing) {
                existing.content = item.content;
                existing.updatedAt = nowStr;
              } else {
                updatedFiles.push({
                  name: fileName,
                  path: fullPath,
                  content: item.content,
                  isDirectory: false,
                  permissions: isRoot ? '0644' : '0664',
                  owner: user,
                  group: user,
                  updatedAt: nowStr,
                  size: item.content.length,
                });
              }
            }
            newFilesList = updatedFiles;
          }

          return {
            output: resultOutput,
            exitCode,
            newCwd: data.newCwd || newCwd,
            newFiles: newFilesList,
            isAiGenerated: true,
          };
        }
      } catch (e) {
        console.warn('AI fallback failed, returning standard command not found', e);
      }

      resultOutput = `bash: ${cmd}: command not found\nDid you mean: 'sudo apt install ${cmd}' or type 'help' for available commands?`;
      exitCode = 127;
      break;
    }
  }

  // Handle file redirection (> or >>)
  if (redirectFile && exitCode === 0) {
    const fullPath = normalizePath(redirectFile, cwd);
    const parentPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
    const parentDir = getFileByPath(files, parentPath);

    if (!parentDir || !parentDir.isDirectory) {
      resultOutput = `bash: ${redirectFile}: No such file or directory`;
      exitCode = 1;
    } else if (!canAccess(parentDir, isRoot, user, 'w')) {
      resultOutput = `bash: ${redirectFile}: Permission denied`;
      exitCode = 1;
    } else {
      const updatedFiles = newFilesList ? [...newFilesList] : [...files];
      const existing = getFileByPath(updatedFiles, fullPath);
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const contentToWrite = resultOutput + '\n';

      if (existing) {
        if (!canAccess(existing, isRoot, user, 'w')) {
          resultOutput = `bash: ${redirectFile}: Permission denied`;
          exitCode = 1;
        } else {
          existing.content = redirectAppend ? existing.content + contentToWrite : contentToWrite;
          existing.updatedAt = nowStr;
          existing.size = existing.content.length;
          newFilesList = updatedFiles;
          resultOutput = ''; // Output redirected to file
        }
      } else {
        const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
        updatedFiles.push({
          name: fileName,
          path: fullPath,
          content: contentToWrite,
          isDirectory: false,
          permissions: isRoot ? '0644' : '0664',
          owner: user,
          group: user,
          updatedAt: nowStr,
          size: contentToWrite.length,
        });
        newFilesList = updatedFiles;
        resultOutput = ''; // Output redirected to file
      }
    }
  }

  return {
    output: resultOutput,
    exitCode,
    newCwd,
    newFiles: newFilesList,
    startInteractiveApp: startApp,
    interactiveAppFile: appFile,
  };
}
