const { spawn } = require('child_process');

console.log('🚀 Démarrage de TaskFlow (Frontend + Backend)...');

// Start json-server on port 3000
const backend = spawn('npx', ['json-server', 'db.json', '--port', '3000', '--host', '127.0.0.1'], {
  shell: true,
  stdio: 'inherit'
});

// Start Angular Dev Server
const frontend = spawn('npx', ['ng', 'serve', '--host', '127.0.0.1'], {
  shell: true,
  stdio: 'inherit'
});

// Clean up processes on exit
const cleanUp = () => {
  console.log('\nStopping servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
process.on('exit', cleanUp);
