#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

class CICertificateManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.isCI = process.env.CI === 'true';
    
    // CI environment detection
    this.ciEnvironments = [
      { name: 'GitHub Actions', envVar: 'GITHUB_ACTIONS', certPath: '/etc/ssl/certs/ca-certificates.crt' },
      { name: 'GitLab CI', envVar: 'GITLAB_CI', certPath: '/etc/ssl/certs/ca-bundle.crt' },
      { name: 'Jenkins', envVar: 'JENKINS_URL', certPath: process.env.JENKINS_CA_BUNDLE || '/var/jenkins/ca-bundle.pem' },
      { name: 'CircleCI', envVar: 'CIRCLECI', certPath: '/etc/ssl/certs/ca-certificates.crt' },
      { name: 'Travis CI', envVar: 'TRAVIS', certPath: '/etc/ssl/certs/ca-certificates.crt' },
      { name: 'Azure DevOps', envVar: 'AZURE_HTTP_USER_AGENT', certPath: '/etc/ssl/certs/ca-certificates.crt' },
    ];
  }

  log(message) {
    console.log(`[CI Certificates] ${message}`);
  }

  error(message) {
    console.error(`[CI Certificates Error] ${message}`);
  }

  detectInsecureSettings() {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      throw new Error('Security Error: NODE_TLS_REJECT_UNAUTHORIZED=0 is not allowed in CI/CD environment');
    }
    return true;
  }

  detectCIEnvironment() {
    for (const ci of this.ciEnvironments) {
      if (process.env[ci.envVar]) {
        return {
          name: ci.name,
          certPath: ci.certPath,
        };
      }
    }
    return null;
  }

  getCICertificatePath() {
    // Priority order for certificate locations
    const possiblePaths = [
      process.env.CI_CERT_PATH,
      process.env.SSL_CERT_FILE,
      process.env.CA_BUNDLE,
      process.env.NODE_EXTRA_CA_CERTS,
      '/etc/ssl/certs/ca-certificates.crt', // Debian/Ubuntu
      '/etc/ssl/certs/ca-bundle.crt', // RedHat/CentOS
      '/etc/pki/tls/certs/ca-bundle.crt', // Fedora
      '/usr/local/share/ca-certificates/ca-bundle.crt', // Custom
      '/etc/ssl/cert.pem', // macOS/OpenSSL
    ];

    for (const certPath of possiblePaths) {
      if (certPath && fs.existsSync(certPath)) {
        return certPath;
      }
    }

    throw new Error('No valid CA certificate bundle found in CI environment');
  }

  validateCertificateChain(certContent) {
    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;
    const certs = certContent.match(certRegex) || [];
    
    return {
      valid: certs.length > 0,
      certCount: certs.length,
      hasRootCA: certs.some(cert => cert.includes('CN=Root')),
      hasIntermediateCA: certs.some(cert => cert.includes('CN=Intermediate')),
      certificates: certs,
    };
  }

  createCIHttpsAgent() {
    if (!this.isCI) {
      throw new Error('This function should only be used in CI environments');
    }

    // Ensure secure settings
    this.detectInsecureSettings();

    const caCertPath = this.getCICertificatePath();
    this.log(`Using CA certificate bundle: ${caCertPath}`);

    const caBundle = fs.readFileSync(caCertPath, 'utf8');
    
    // Validate certificate chain
    const validation = this.validateCertificateChain(caBundle);
    if (!validation.valid) {
      throw new Error(`Invalid certificate bundle: ${caCertPath}`);
    }

    this.log(`Certificate bundle loaded: ${validation.certCount} certificates`);

    return new https.Agent({
      ca: caBundle,
      rejectUnauthorized: true, // Always true in CI
      minVersion: 'TLSv1.2', // Enforce minimum TLS version
      maxVersion: 'TLSv1.3', // Allow TLS 1.3
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
      ].join(':'),
    });
  }

  configureCITestEnvironment() {
    if (!this.isCI) {
      this.log('Not in CI environment, skipping CI-specific configuration');
      return null;
    }

    const ciEnv = this.detectCIEnvironment();
    if (ciEnv) {
      this.log(`Detected CI environment: ${ciEnv.name}`);
    }

    const config = {
      testEnvironment: 'jsdom',
      testEnvironmentOptions: {
        resources: 'usable',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://localhost:3000', // Always use HTTPS in CI tests
      },
      globals: {
        'ts-jest': {
          isolatedModules: true,
        },
      },
      setupFilesAfterEnv: [path.join(__dirname, '..', 'test', 'setup-ci.ts')],
    };

    // Ensure HTTPS is used in test URLs
    if (!config.testEnvironmentOptions.url.startsWith('https://')) {
      throw new Error('CI tests must use HTTPS URLs');
    }

    return config;
  }

  async setupCIEnvironment() {
    if (!this.isCI) {
      this.log('Not in CI environment, no setup needed');
      return { success: true, message: 'Not in CI environment' };
    }

    try {
      // Detect CI environment
      const ciEnv = this.detectCIEnvironment();
      this.log(`Setting up CI environment: ${ciEnv ? ciEnv.name : 'Generic CI'}`);

      // Check for insecure settings
      this.detectInsecureSettings();
      this.log('Security check passed');

      // Validate certificate bundle
      const certPath = this.getCICertificatePath();
      const certContent = fs.readFileSync(certPath, 'utf8');
      const validation = this.validateCertificateChain(certContent);
      
      if (!validation.valid) {
        throw new Error(`Invalid certificate bundle: ${certPath}`);
      }

      this.log(`Certificate validation passed: ${validation.certCount} certificates`);

      // Create HTTPS agent for testing
      const httpsAgent = this.createCIHttpsAgent();
      this.log('HTTPS agent configured successfully');

      // Set environment variables for consistency
      process.env.NODE_EXTRA_CA_CERTS = certPath;
      process.env.CI_HTTPS_CONFIGURED = 'true';

      return {
        success: true,
        environment: ciEnv?.name || 'Generic CI',
        certificatePath: certPath,
        certificateCount: validation.certCount,
        httpsAgent,
      };

    } catch (error) {
      this.error(`CI setup failed: ${error.message}`);
      throw error;
    }
  }

  generateCIDockerfile() {
    return `# CI/CD Dockerfile with proper HTTPS setup
FROM node:18-alpine

# Install CA certificates
RUN apk add --no-cache ca-certificates

# Create app directory
WORKDIR /app

# Copy certificate bundle if provided
ARG CA_BUNDLE_PATH
COPY \${CA_BUNDLE_PATH:-/etc/ssl/certs/ca-certificates.crt} /etc/ssl/certs/ca-bundle.crt

# Set environment variables
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-bundle.crt
ENV CI=true
ENV NODE_ENV=production

# Security: Ensure TLS validation is enabled
ENV NODE_TLS_REJECT_UNAUTHORIZED=1

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check with HTTPS
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f https://localhost:3000/health || exit 1

# Start application
CMD ["pnpm", "start"]
`;
  }

  generateCIConfig() {
    const githubActions = `name: CI/CD with HTTPS
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Setup HTTPS certificates
        run: |
          sudo apt-get update
          sudo apt-get install -y ca-certificates
          node scripts/ci-certificates.js setup
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests with HTTPS
        run: pnpm test
        env:
          CI: true
          NODE_EXTRA_CA_CERTS: /etc/ssl/certs/ca-certificates.crt
      
      - name: Build application
        run: pnpm build
`;

    const gitlabCI = `stages:
  - test
  - build

variables:
  NODE_VERSION: "18"
  CI_CERT_PATH: "/etc/ssl/certs/ca-bundle.crt"

test:
  stage: test
  image: node:\${NODE_VERSION}-alpine
  before_script:
    - apk add --no-cache ca-certificates curl
    - npm install -g pnpm
    - node scripts/ci-certificates.js setup
  script:
    - pnpm install --frozen-lockfile
    - pnpm test
  environment:
    name: test
    url: https://localhost:3000

build:
  stage: build
  image: node:\${NODE_VERSION}-alpine
  script:
    - pnpm install --frozen-lockfile
    - pnpm build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
`;

    return {
      'github-actions': githubActions,
      'gitlab-ci': gitlabCI,
    };
  }
}

// CLI interface
async function main() {
  const ciManager = new CICertificateManager();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
        const result = await ciManager.setupCIEnvironment();
        console.log('CI environment setup completed:');
        console.log(`  - Success: ${result.success}`);
        console.log(`  - Environment: ${result.environment || 'Not detected'}`);
        console.log(`  - Certificate Path: ${result.certificatePath || 'Not found'}`);
        console.log(`  - Certificate Count: ${result.certificateCount || 0}`);
        break;
        
      case 'validate':
        ciManager.detectInsecureSettings();
        const certPath = ciManager.getCICertificatePath();
        const certContent = fs.readFileSync(certPath, 'utf8');
        const validation = ciManager.validateCertificateChain(certContent);
        console.log('Certificate validation result:');
        console.log(`  - Valid: ${validation.valid}`);
        console.log(`  - Certificate Count: ${validation.certCount}`);
        console.log(`  - Path: ${certPath}`);
        break;
        
      case 'config':
        const configs = ciManager.generateCIConfig();
        console.log('Generated CI configurations:');
        console.log('\n--- GitHub Actions ---');
        console.log(configs['github-actions']);
        console.log('\n--- GitLab CI ---');
        console.log(configs['gitlab-ci']);
        break;
        
      case 'dockerfile':
        const dockerfile = ciManager.generateCIDockerfile();
        console.log('Generated Dockerfile:');
        console.log(dockerfile);
        break;
        
      default:
        console.log(`
Usage: node scripts/ci-certificates.js <command>

Commands:
  setup      - Setup CI environment with proper HTTPS certificates
  validate   - Validate existing certificate configuration
  config     - Generate CI/CD configuration files
  dockerfile - Generate Dockerfile with HTTPS setup

Environment Variables:
  CI_CERT_PATH           - Custom path to CA certificate bundle
  SSL_CERT_FILE          - SSL certificate file path
  CA_BUNDLE              - CA bundle file path
  NODE_EXTRA_CA_CERTS    - Additional CA certificates

Examples:
  node scripts/ci-certificates.js setup
  CI_CERT_PATH=/custom/ca-bundle.pem node scripts/ci-certificates.js validate
`);
        break;
    }
  } catch (error) {
    console.error('CI certificate setup failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = { CICertificateManager };

// Run if called directly
if (require.main === module) {
  main();
}