#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevHttpsManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.certsDirectory = path.join(this.projectRoot, 'certificates');
    this.certPath = path.join(this.certsDirectory, 'localhost.pem');
    this.keyPath = path.join(this.certsDirectory, 'localhost-key.pem');
    
    // Legacy paths for backward compatibility
    this.legacyCertPath = path.join(this.projectRoot, 'apps', 'web', 'cert.pem');
    this.legacyKeyPath = path.join(this.projectRoot, 'apps', 'web', 'key.pem');
    
    this.defaultPort = 3000;
    this.httpsPort = 3002;
  }

  log(message) {
    console.log(`[Dev HTTPS] ${message}`);
  }

  error(message) {
    console.error(`[Dev HTTPS Error] ${message}`);
  }

  certificatesExist() {
    return fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
  }

  legacyCertificatesExist() {
    return fs.existsSync(this.legacyCertPath) && fs.existsSync(this.legacyKeyPath);
  }

  validateHttpsEnv(env) {
    const required = ['HTTPS', 'SSL_CRT_FILE', 'SSL_KEY_FILE'];
    const missing = required.filter(key => !env[key]);
    
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  async ensureCertificates() {
    if (this.certificatesExist()) {
      return { cert: this.certPath, key: this.keyPath };
    }

    if (this.legacyCertificatesExist()) {
      this.log('Using legacy certificates from apps/web/');
      return { cert: this.legacyCertPath, key: this.legacyKeyPath };
    }

    this.error('No SSL certificates found');
    this.log('Please run the HTTPS setup first:');
    this.log('  node scripts/setup-https.js');
    throw new Error('SSL certificates not found');
  }

  getHttpsUrl(port = this.httpsPort) {
    return `https://localhost:${port}`;
  }

  handlePortConflict(error) {
    if (error.message.includes('EADDRINUSE')) {
      return {
        error: 'Port already in use',
        suggestion: 'Try a different port or kill the existing process',
      };
    }
    throw error;
  }

  async startDevServer(options = {}) {
    const { port = this.httpsPort, useLegacyMode = false } = options;
    
    try {
      // Ensure certificates exist
      const certs = await this.ensureCertificates();
      
      // Prepare environment variables
      const env = {
        ...process.env,
        HTTPS: 'true',
        SSL_CRT_FILE: certs.cert,
        SSL_KEY_FILE: certs.key,
        PORT: port.toString(),
      };

      // Validate environment
      const validation = this.validateHttpsEnv(env);
      if (!validation.valid) {
        throw new Error(`Missing environment variables: ${validation.missing.join(', ')}`);
      }

      this.log(`Starting HTTPS development server on port ${port}...`);
      this.log(`Certificate: ${certs.cert}`);
      this.log(`Private Key: ${certs.key}`);

      // Determine the command based on the mode
      let command, args, cwd;
      
      if (useLegacyMode) {
        // Use the legacy Next.js approach
        command = 'npm';
        args = ['run', 'dev:https'];
        cwd = path.join(this.projectRoot, 'apps', 'web');
      } else {
        // Use Next.js 14+ experimental HTTPS
        command = 'next';
        args = ['dev', '--experimental-https', '--port', port.toString()];
        cwd = path.join(this.projectRoot, 'apps', 'web');
      }

      // Spawn the development server
      const child = spawn(command, args, {
        env,
        stdio: 'inherit',
        cwd,
      });

      // Handle process events
      child.on('error', (error) => {
        try {
          const conflict = this.handlePortConflict(error);
          this.error(conflict.error);
          this.log(conflict.suggestion);
        } catch (e) {
          this.error(`Failed to start development server: ${error.message}`);
        }
        process.exit(1);
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          this.error(`Development server exited with code ${code}`);
        }
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.log('Shutting down development server...');
        child.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        this.log('Shutting down development server...');
        child.kill('SIGTERM');
      });

      // Show success message after a short delay
      setTimeout(() => {
        this.log('HTTPS development server started successfully!');
        this.log(`🚀 Server running at: ${this.getHttpsUrl(port)}`);
        this.log('');
        this.log('Note: You may see a security warning in your browser');
        this.log('This is normal for self-signed certificates in development');
        this.log('Click "Advanced" and "Proceed to localhost" to continue');
      }, 2000);

      return child;

    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const devManager = new DevHttpsManager();
  
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10) || devManager.httpsPort;
    } else if (arg === '--legacy') {
      options.useLegacyMode = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/dev-https.js [options]

Options:
  --port, -p <port>    Port to run the server on (default: ${devManager.httpsPort})
  --legacy             Use legacy Next.js HTTPS mode
  --help, -h           Show this help message

Examples:
  node scripts/dev-https.js                    # Start on default port (${devManager.httpsPort})
  node scripts/dev-https.js --port 3001        # Start on port 3001
  node scripts/dev-https.js --legacy           # Use legacy mode

Before running this script, make sure to set up SSL certificates:
  node scripts/setup-https.js
`);
      process.exit(0);
    }
  }

  try {
    await devManager.startDevServer(options);
  } catch (error) {
    console.error('Failed to start development server:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = { DevHttpsManager };

// Run if called directly
if (require.main === module) {
  main();
}