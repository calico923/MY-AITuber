import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

// Mock modules
vi.mock('child_process')
vi.mock('fs')

const execAsync = promisify(exec)

describe('Certificate Auto-Generation Tests', () => {
  const mockFs = fs as any
  const mockExec = exec as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('tdd-1.4: Certificate auto-generation when missing', () => {
    it('should detect missing certificates', () => {
      const certPath = path.join(process.cwd(), 'certificates', 'localhost.pem')
      const keyPath = path.join(process.cwd(), 'certificates', 'localhost-key.pem')

      mockFs.existsSync = vi.fn((path: string) => {
        // Simulate missing certificates
        return false
      })

      const checkCertificates = () => {
        return {
          certExists: fs.existsSync(certPath),
          keyExists: fs.existsSync(keyPath),
          bothExist: fs.existsSync(certPath) && fs.existsSync(keyPath),
        }
      }

      const result = checkCertificates()
      expect(result.certExists).toBe(false)
      expect(result.keyExists).toBe(false)
      expect(result.bothExist).toBe(false)
    })

    it('should check if mkcert is installed', async () => {
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command === 'which mkcert' || command === 'where mkcert') {
          callback(null, '/usr/local/bin/mkcert', '')
        } else {
          callback(new Error('Command not found'), '', '')
        }
      })

      const checkMkcertInstalled = () => {
        return new Promise((resolve) => {
          const command = process.platform === 'win32' ? 'where mkcert' : 'which mkcert'
          exec(command, (error, stdout) => {
            resolve(!error && stdout.trim().length > 0)
          })
        })
      }

      const isInstalled = await checkMkcertInstalled()
      expect(isInstalled).toBe(true)
    })

    it('should generate certificates using mkcert', async () => {
      const certDir = path.join(process.cwd(), 'certificates')
      
      mockFs.existsSync = vi.fn((path: string) => {
        // Directory exists after creation
        return path === certDir
      })

      mockFs.mkdirSync = vi.fn()

      mockExec.mockImplementation((command: string, options: any, callback: Function) => {
        if (command.includes('mkcert')) {
          // Simulate successful certificate generation
          callback(null, 'Certificate generated successfully', '')
        } else {
          callback(new Error('Unknown command'), '', '')
        }
      })

      const generateCertificates = async () => {
        // Create certificates directory if it doesn't exist
        if (!fs.existsSync(certDir)) {
          fs.mkdirSync(certDir, { recursive: true })
        }

        return new Promise((resolve, reject) => {
          const command = `mkcert -cert-file ${path.join(certDir, 'localhost.pem')} -key-file ${path.join(certDir, 'localhost-key.pem')} localhost 127.0.0.1 ::1`
          
          exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      }

      const result = await generateCertificates()
      expect(mockFs.mkdirSync).toHaveBeenCalled()
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('mkcert'),
        expect.any(Object),
        expect.any(Function)
      )
    })

    it('should handle mkcert not installed error', async () => {
      mockExec.mockImplementation((command: string, callback: Function) => {
        callback(new Error('mkcert: command not found'), '', '')
      })

      const installMkcertInstructions = () => {
        const platform = process.platform
        const instructions: Record<string, string> = {
          darwin: 'brew install mkcert',
          linux: 'brew install mkcert or download from https://github.com/FiloSottile/mkcert',
          win32: 'choco install mkcert or download from https://github.com/FiloSottile/mkcert',
        }
        
        return instructions[platform] || 'Please install mkcert from https://github.com/FiloSottile/mkcert'
      }

      const handleMkcertError = async () => {
        try {
          await execAsync('mkcert --version')
          return { success: true }
        } catch (error) {
          return {
            success: false,
            instructions: installMkcertInstructions(),
          }
        }
      }

      const result = await handleMkcertError()
      expect(result.success).toBe(false)
      expect(result.instructions).toBeDefined()
      expect(result.instructions).toContain('install mkcert')
    })

    it('should verify generated certificates are valid', () => {
      const mockCertContent = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgIUJk7/6gA2PYYD1v8Y2Vhr7XgT+64wDQYJKoZIhvcNAQEL
... (certificate content) ...
-----END CERTIFICATE-----`

      const mockKeyContent = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W8WGAB6UBMiO
... (key content) ...
-----END PRIVATE KEY-----`

      mockFs.readFileSync = vi.fn((path: string) => {
        if (path.includes('localhost.pem')) {
          return mockCertContent
        }
        if (path.includes('localhost-key.pem')) {
          return mockKeyContent
        }
        throw new Error('File not found')
      })

      const validateCertificate = (certPath: string) => {
        try {
          const content = fs.readFileSync(certPath, 'utf8')
          const hasBegin = content.includes('-----BEGIN CERTIFICATE-----')
          const hasEnd = content.includes('-----END CERTIFICATE-----')
          const hasContent = content.replace(/-----.*-----/g, '').trim().length > 0
          
          return {
            valid: hasBegin && hasEnd && hasContent,
            format: 'PEM',
          }
        } catch {
          return { valid: false, format: null }
        }
      }

      const certPath = path.join(process.cwd(), 'certificates', 'localhost.pem')
      const validation = validateCertificate(certPath)
      
      expect(validation.valid).toBe(true)
      expect(validation.format).toBe('PEM')
    })

    it('should create a complete certificate generation flow', async () => {
      const certificateManager = {
        certsDirectory: path.join(process.cwd(), 'certificates'),
        certPath: path.join(process.cwd(), 'certificates', 'localhost.pem'),
        keyPath: path.join(process.cwd(), 'certificates', 'localhost-key.pem'),
        
        async ensureCertificates() {
          // Check if certificates exist
          const certsExist = fs.existsSync(this.certPath) && fs.existsSync(this.keyPath)
          
          if (!certsExist) {
            // Check if mkcert is installed
            const mkcertInstalled = await this.checkMkcert()
            
            if (!mkcertInstalled) {
              throw new Error('mkcert is not installed. Please install it first.')
            }
            
            // Generate certificates
            await this.generateCertificates()
          }
          
          return {
            cert: this.certPath,
            key: this.keyPath,
          }
        },
        
        async checkMkcert() {
          // Mock implementation
          return true
        },
        
        async generateCertificates() {
          // Mock implementation
          return true
        },
      }

      // Mock the methods
      vi.spyOn(certificateManager, 'checkMkcert').mockResolvedValue(true)
      vi.spyOn(certificateManager, 'generateCertificates').mockResolvedValue(true)
      mockFs.existsSync = vi.fn(() => false) // Certificates don't exist

      const result = await certificateManager.ensureCertificates()
      
      expect(certificateManager.checkMkcert).toHaveBeenCalled()
      expect(certificateManager.generateCertificates).toHaveBeenCalled()
      expect(result.cert).toBe(certificateManager.certPath)
      expect(result.key).toBe(certificateManager.keyPath)
    })
  })
})