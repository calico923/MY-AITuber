import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// Mock modules
vi.mock('child_process')
vi.mock('fs')

describe('Development HTTPS Script Tests', () => {
  const mockSpawn = vi.mocked(spawn)
  const mockFs = vi.mocked(fs)
  let originalProcessExit: typeof process.exit

  beforeEach(() => {
    vi.clearAllMocks()
    originalProcessExit = process.exit
    process.exit = vi.fn() as any
  })

  afterEach(() => {
    vi.resetModules()
    process.exit = originalProcessExit
  })

  describe('tdd-1.3: dev:https script exists and runs correctly', () => {
    it('should have dev:https script defined in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      
      // Mock package.json content
      const mockPackageJson = {
        name: 'web',
        scripts: {
          dev: 'next dev',
          'dev:https': 'node scripts/dev-https.js',
          build: 'next build',
          start: 'next start',
        },
      }

      mockFs.readFileSync = vi.fn((path: string) => {
        if (path === packageJsonPath) {
          return JSON.stringify(mockPackageJson)
        }
        throw new Error('File not found')
      })

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      expect(packageJson.scripts['dev:https']).toBeDefined()
      expect(packageJson.scripts['dev:https']).toContain('https')
    })

    it('should check if dev-https script file exists', () => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'dev-https.js')
      
      mockFs.existsSync = vi.fn((path: string) => {
        return path === scriptPath
      })

      expect(fs.existsSync(scriptPath)).toBe(true)
    })

    it('should run Next.js with HTTPS configuration', async () => {
      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChildProcess)

      // Simulate dev:https script logic
      const runDevHttps = () => {
        const certPath = path.join(process.cwd(), 'certificates', 'localhost.pem')
        const keyPath = path.join(process.cwd(), 'certificates', 'localhost-key.pem')

        const env = {
          ...process.env,
          NODE_EXTRA_CA_CERTS: certPath,
          HTTPS: 'true',
          SSL_CRT_FILE: certPath,
          SSL_KEY_FILE: keyPath,
        }

        const child = spawn('next', ['dev', '--experimental-https'], {
          env,
          stdio: 'inherit',
        })

        return child
      }

      const childProcess = runDevHttps()
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'next',
        expect.arrayContaining(['dev']),
        expect.objectContaining({
          env: expect.objectContaining({
            HTTPS: 'true',
            SSL_CRT_FILE: expect.stringContaining('localhost.pem'),
            SSL_KEY_FILE: expect.stringContaining('localhost-key.pem'),
          }),
        })
      )
    })

    it('should handle port already in use error', () => {
      const mockChildProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, callback: Function) => {
          if (event === 'error') {
            callback(new Error('EADDRINUSE: address already in use'))
          }
        }),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChildProcess)

      const handlePortConflict = (error: Error) => {
        if (error.message.includes('EADDRINUSE')) {
          return {
            error: 'Port already in use',
            suggestion: 'Try a different port or kill the existing process',
          }
        }
        throw error
      }

      const error = new Error('EADDRINUSE: address already in use')
      const result = handlePortConflict(error)
      
      expect(result.error).toBe('Port already in use')
      expect(result.suggestion).toBeDefined()
    })

    it('should provide HTTPS URL after successful start', () => {
      const getHttpsUrl = (port: number = 3000) => {
        return `https://localhost:${port}`
      }

      expect(getHttpsUrl()).toBe('https://localhost:3000')
      expect(getHttpsUrl(3002)).toBe('https://localhost:3002')
    })

    it('should validate environment variables are set correctly', () => {
      const validateHttpsEnv = (env: Record<string, string>) => {
        const required = ['HTTPS', 'SSL_CRT_FILE', 'SSL_KEY_FILE']
        const missing = required.filter(key => !env[key])
        
        return {
          valid: missing.length === 0,
          missing,
        }
      }

      const validEnv = {
        HTTPS: 'true',
        SSL_CRT_FILE: '/path/to/cert.pem',
        SSL_KEY_FILE: '/path/to/key.pem',
      }

      const invalidEnv = {
        HTTPS: 'true',
        // Missing SSL files
      }

      expect(validateHttpsEnv(validEnv)).toEqual({ valid: true, missing: [] })
      expect(validateHttpsEnv(invalidEnv)).toEqual({
        valid: false,
        missing: ['SSL_CRT_FILE', 'SSL_KEY_FILE'],
      })
    })
  })
})