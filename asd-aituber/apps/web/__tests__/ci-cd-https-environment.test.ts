import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import fs from 'fs'
import https from 'https'
import path from 'path'

// Mock modules
vi.mock('fs')
vi.mock('https')

describe('CI/CD HTTPS Environment Tests', () => {
  const mockFs = fs as any
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('tdd-1.5: CI/CD environment with proper certificate import', () => {
    it('should use imported certificates instead of disabling validation', () => {
      // Set CI environment variable
      process.env.CI = 'true'
      process.env.CI_CERT_PATH = '/ci/certificates/ca-cert.pem'

      mockFs.existsSync = vi.fn((path: string) => {
        return path === process.env.CI_CERT_PATH
      })

      mockFs.readFileSync = vi.fn((path: string) => {
        if (path === process.env.CI_CERT_PATH) {
          return `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgIUJk7/6gA2PYYD1v8Y2Vhr7XgT+64wDQYJKoZIhvcNAQEL
... (CA certificate content) ...
-----END CERTIFICATE-----`
        }
        throw new Error('File not found')
      })

      const certPath = process.env.CI_CERT_PATH
      expect(certPath).toBeDefined()
      expect(fs.existsSync(certPath)).toBe(true)

      // Verify certificate is properly loaded
      const httpsAgent = new https.Agent({
        ca: fs.readFileSync(certPath!),
      })

      expect(httpsAgent.options.ca).toBeDefined()
      expect(fs.readFileSync).toHaveBeenCalledWith(certPath)
    })

    it('should NOT use NODE_TLS_REJECT_UNAUTHORIZED=0', () => {
      process.env.CI = 'true'
      
      // This should not be set in production CI/CD
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined()
      
      // If someone tries to set it, we should detect and prevent it
      const detectInsecureSettings = () => {
        if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
          throw new Error('Security Error: NODE_TLS_REJECT_UNAUTHORIZED=0 is not allowed in CI/CD')
        }
        return true
      }

      expect(detectInsecureSettings()).toBe(true)

      // Test that it throws when set
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      expect(() => detectInsecureSettings()).toThrow('Security Error')
    })

    it('should configure HTTPS agent with proper CA certificates for CI', () => {
      process.env.CI = 'true'
      process.env.CI_CERT_PATH = '/ci/certificates/ca-bundle.pem'

      const mockCertBundle = `-----BEGIN CERTIFICATE-----
... (Root CA) ...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
... (Intermediate CA) ...
-----END CERTIFICATE-----`

      mockFs.readFileSync = vi.fn(() => mockCertBundle)

      const createCIHttpsAgent = () => {
        const caCertPath = process.env.CI_CERT_PATH
        
        if (!caCertPath) {
          throw new Error('CI_CERT_PATH environment variable is required in CI')
        }

        const caBundle = fs.readFileSync(caCertPath, 'utf8')
        
        return new https.Agent({
          ca: caBundle,
          rejectUnauthorized: true, // Always true in CI
          minVersion: 'TLSv1.2', // Enforce minimum TLS version
        })
      }

      const agent = createCIHttpsAgent()
      
      expect(agent.options.ca).toBeDefined()
      expect(agent.options.rejectUnauthorized).toBe(true)
      expect(agent.options.minVersion).toBe('TLSv1.2')
    })

    it('should handle different CI environments', () => {
      const ciEnvironments = [
        { name: 'GitHub Actions', envVar: 'GITHUB_ACTIONS', certPath: '/etc/ssl/certs/ca-certificates.crt' },
        { name: 'GitLab CI', envVar: 'GITLAB_CI', certPath: '/etc/ssl/certs/ca-bundle.crt' },
        { name: 'Jenkins', envVar: 'JENKINS_URL', certPath: process.env.JENKINS_CA_BUNDLE || '/var/jenkins/ca-bundle.pem' },
        { name: 'CircleCI', envVar: 'CIRCLECI', certPath: '/etc/ssl/certs/ca-certificates.crt' },
      ]

      const detectCIEnvironment = () => {
        for (const ci of ciEnvironments) {
          if (process.env[ci.envVar]) {
            return {
              name: ci.name,
              certPath: ci.certPath,
            }
          }
        }
        return null
      }

      // Test GitHub Actions
      process.env.GITHUB_ACTIONS = 'true'
      let result = detectCIEnvironment()
      expect(result?.name).toBe('GitHub Actions')
      expect(result?.certPath).toBe('/etc/ssl/certs/ca-certificates.crt')

      // Test GitLab CI
      delete process.env.GITHUB_ACTIONS
      process.env.GITLAB_CI = 'true'
      result = detectCIEnvironment()
      expect(result?.name).toBe('GitLab CI')
    })

    it('should validate certificate chain in CI', () => {
      const validateCertificateChain = (certContent: string) => {
        const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
        const certs = certContent.match(certRegex) || []
        
        return {
          valid: certs.length > 0,
          certCount: certs.length,
          hasRootCA: certs.some(cert => cert.includes('CN=Root')),
          hasIntermediateCA: certs.some(cert => cert.includes('CN=Intermediate')),
        }
      }

      const validChain = `-----BEGIN CERTIFICATE-----
CN=Root CA
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
CN=Intermediate CA
-----END CERTIFICATE-----`

      const invalidChain = 'Not a valid certificate'

      expect(validateCertificateChain(validChain)).toEqual({
        valid: true,
        certCount: 2,
        hasRootCA: true,
        hasIntermediateCA: true,
      })

      expect(validateCertificateChain(invalidChain)).toEqual({
        valid: false,
        certCount: 0,
        hasRootCA: false,
        hasIntermediateCA: false,
      })
    })

    it('should provide fallback certificate paths for common CI systems', () => {
      const getCICertificatePath = () => {
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
        ]

        for (const path of possiblePaths) {
          if (path && fs.existsSync(path)) {
            return path
          }
        }

        throw new Error('No valid CA certificate bundle found in CI environment')
      }

      // Mock first path exists
      mockFs.existsSync = vi.fn((path: string) => {
        return path === '/etc/ssl/certs/ca-certificates.crt'
      })

      const certPath = getCICertificatePath()
      expect(certPath).toBe('/etc/ssl/certs/ca-certificates.crt')
    })

    it('should integrate with CI test runners properly', () => {
      process.env.CI = 'true'
      
      const configureCITests = () => {
        const config = {
          testEnvironment: 'jsdom',
          testEnvironmentOptions: {
            resources: 'usable',
            runScripts: 'dangerously',
            pretendToBeVisual: true,
            url: 'https://localhost:3000', // Use HTTPS URL in tests
          },
          globals: {
            'ts-jest': {
              isolatedModules: true,
            },
          },
          setupFilesAfterEnv: ['<rootDir>/test/setup-ci.ts'],
        }

        // Ensure HTTPS is used in test URLs
        if (!config.testEnvironmentOptions.url.startsWith('https://')) {
          throw new Error('CI tests must use HTTPS URLs')
        }

        return config
      }

      const config = configureCITests()
      expect(config.testEnvironmentOptions.url).toMatch(/^https:\/\//)
      expect(config.setupFilesAfterEnv).toContain('setup-ci.ts')
    })
  })
})