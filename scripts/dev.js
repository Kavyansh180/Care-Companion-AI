const { spawn, exec, execSync } = require('child_process');

console.log('Checking port 3000...');

if (process.platform === 'win32') {
  try {
    const stdout = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' }).trim();
    if (stdout) {
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            console.log(`Port 3000 is occupied by PID ${pid}. Terminating process to free the port...`);
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`Process ${pid} terminated.`);
          }
        }
      }
    }
  } catch {
    // Port 3000 is free or check failed.
  }
} else {
  // Unix-like systems (macOS / Linux)
  try {
    const stdout = execSync('lsof -t -i:3000', { encoding: 'utf8' }).trim();
    if (stdout) {
      const pids = stdout.split('\n').filter(Boolean);
      for (const pid of pids) {
        console.log(`Port 3000 is occupied by PID ${pid}. Terminating process to free the port...`);
        execSync(`kill -9 ${pid}`);
        console.log(`Process ${pid} terminated.`);
      }
    }
  } catch {
    // Port 3000 is free or check failed.
  }
}

console.log('Starting CareCompanion AI dev server...');

// Start the Next.js development server
const nextDev = spawn('npx', ['next', 'dev', '--webpack'], {
  shell: true,
  stdio: 'inherit'
});

// Wait 1.5 seconds and open the browser
setTimeout(() => {
  console.log('Opening website at http://localhost:3000 ...');
  const url = 'http://localhost:3000';
  const startCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(startCmd, (err) => {
    if (err) {
      console.error('Failed to open browser automatically:', err.message);
    }
  });
}, 1500);

nextDev.on('close', (code) => {
  process.exit(code);
});
