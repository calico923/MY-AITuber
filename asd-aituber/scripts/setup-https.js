#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class CertificateManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.certsDirectory = path.join(this.projectRoot, 'certificates');
    this.certPath = path.join(this.certsDirectory, 'localhost.pem');
    this.keyPath = path.join(this.certsDirectory, 'localhost-key.pem');
    
    // Legacy paths for backward compatibility
    this.legacyCertPath = path.join(this.projectRoot, 'apps', 'web', 'cert.pem');
    this.legacyKeyPath = path.join(this.projectRoot, 'apps', 'web', 'key.pem');
  }

  log(message) {
    console.log(`[HTTPS Setup] ${message}`);
  }

  error(message) {
    console.error(`[HTTPS Setup Error] ${message}`);
  }

  async checkMkcert() {
    try {
      const command = process.platform === 'win32' ? 'where mkcert' : 'which mkcert';
      const result = await execAsync(command);
      return result.stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  getMkcertInstallInstructions() {
    const platform = process.platform;
    const instructions = {
      darwin: 'brew install mkcert',
      linux: 'brew install mkcert or download from https://github.com/FiloSottile/mkcert',
      win32: 'choco install mkcert or download from https://github.com/FiloSottile/mkcert',
    };
    
    return instructions[platform] || 'Please install mkcert from https://github.com/FiloSottile/mkcert';
  }

  certificatesExist() {
    return fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
  }

  legacyCertificatesExist() {
    return fs.existsSync(this.legacyCertPath) && fs.existsSync(this.legacyKeyPath);
  }

  validateCertificate(certPath) {
    try {
      const content = fs.readFileSync(certPath, 'utf8');
      const hasBegin = content.includes('-----BEGIN CERTIFICATE-----');
      const hasEnd = content.includes('-----END CERTIFICATE-----');
      const hasContent = content.replace(/-----.*-----/g, '').trim().length > 0;
      
      return {
        valid: hasBegin && hasEnd && hasContent,
        format: 'PEM',
      };
    } catch {
      return { valid: false, format: null };
    }
  }

  async generateCertificates() {
    this.log('Generating SSL certificates...');
    
    // Create certificates directory if it doesn't exist
    if (!fs.existsSync(this.certsDirectory)) {
      fs.mkdirSync(this.certsDirectory, { recursive: true });
      this.log(`Created certificates directory: ${this.certsDirectory}`);
    }

    // Generate certificates using mkcert
    const command = `mkcert -cert-file ${this.certPath} -key-file ${this.keyPath} localhost 127.0.0.1 ::1`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.projectRoot });
      this.log('Certificates generated successfully');
      
      if (stdout) this.log(`mkcert output: ${stdout}`);
      if (stderr) this.log(`mkcert stderr: ${stderr}`);
      
      return true;
    } catch (error) {
      this.error(`Failed to generate certificates: ${error.message}`);
      throw error;
    }
  }

  async copyToLegacyLocations() {
    try {
      // Copy certificates to legacy locations for backward compatibility
      fs.copyFileSync(this.certPath, this.legacyCertPath);
      fs.copyFileSync(this.keyPath, this.legacyKeyPath);
      this.log('Certificates copied to legacy locations (apps/web/)');
    } catch (error) {
      this.error(`Failed to copy to legacy locations: ${error.message}`);
    }
  }

  async ensureCertificates() {
    this.log('Checking SSL certificates...');
    
    // Check if certificates already exist
    if (this.certificatesExist()) {
      const validation = this.validateCertificate(this.certPath);
      if (validation.valid) {
        this.log('Valid certificates already exist');
        
        // Ensure legacy locations have copies
        if (!this.legacyCertificatesExist()) {
          await this.copyToLegacyLocations();
        }
        
        return {
          cert: this.certPath,
          key: this.keyPath,
          generated: false,
        };
      } else {
        this.log('Existing certificates are invalid, regenerating...');
      }
    }

    // Check if mkcert is installed
    const mkcertInstalled = await this.checkMkcert();
    
    if (!mkcertInstalled) {
      const instructions = this.getMkcertInstallInstructions();
      this.error('mkcert is not installed');
      this.error(`Please install mkcert first: ${instructions}`);
      throw new Error('mkcert is not installed. Please install it first.');
    }

    // Generate new certificates
    await this.generateCertificates();
    
    // Validate generated certificates
    const validation = this.validateCertificate(this.certPath);
    if (!validation.valid) {
      throw new Error('Generated certificates are invalid');
    }

    // Copy to legacy locations
    await this.copyToLegacyLocations();
    
    this.log('SSL setup completed successfully');
    
    return {
      cert: this.certPath,
      key: this.keyPath,
      generated: true,
    };
  }

  async checkCertificateExpiry() {
    if (!this.certificatesExist()) {
      return { expired: true, daysLeft: 0 };
    }

    try {
      const command = `openssl x509 -in ${this.certPath} -noout -dates`;
      const { stdout } = await execAsync(command);
      
      const notAfterMatch = stdout.match(/notAfter=(.+)/);
      if (notAfterMatch) {
        const expiryDate = new Date(notAfterMatch[1]);
        const now = new Date();
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        return {
          expired: daysLeft <= 0,
          daysLeft: Math.max(0, daysLeft),
          expiryDate,
        };
      }
    } catch (error) {
      this.error(`Failed to check certificate expiry: ${error.message}`);
    }

    return { expired: true, daysLeft: 0 };
  }

  async renewCertificatesIfNeeded(warningDays = 30) {
    const expiry = await this.checkCertificateExpiry();
    
    if (expiry.expired || expiry.daysLeft <= warningDays) {
      this.log(`Certificates expire in ${expiry.daysLeft} days, renewing...`);
      await this.generateCertificates();
      await this.copyToLegacyLocations();
      return true;
    }
    
    this.log(`Certificates are valid for ${expiry.daysLeft} more days`);
    return false;
  }
}

// CLI interface
async function main() {
  const certificateManager = new CertificateManager();
  
  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'check':
        const expiry = await certificateManager.checkCertificateExpiry();
        console.log(`Certificates ${expiry.expired ? 'expired' : `valid for ${expiry.daysLeft} days`}`);
        break;
        
      case 'renew':
        await certificateManager.generateCertificates();
        await certificateManager.copyToLegacyLocations();
        console.log('Certificates renewed successfully');
        break;
        
      case 'setup':
      default:
        const result = await certificateManager.ensureCertificates();
        console.log(`Certificates ready at:`);
        console.log(`  - Certificate: ${result.cert}`);
        console.log(`  - Private Key: ${result.key}`);
        console.log(`  - Generated: ${result.generated ? 'Yes' : 'No (existing valid certificates)'}`);
        break;
    }
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = { CertificateManager };

// Run if called directly
if (require.main === module) {
  main();
}