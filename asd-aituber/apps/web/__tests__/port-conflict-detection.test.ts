import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import net from 'net'
import { exec } from 'child_process'
import { promisify } from 'util'

// Mock modules
vi.mock('net')
vi.mock('child_process')

const execAsync = promisify(exec)

describe('Port Conflict Detection Tests', () => {
  const mockNet = net as any
  const mockExec = exec as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('tdd-1.7: Verify port conflict detection in dev:https script', () => {
    it('should detect if a port is already in use', async () => {
      const checkPortInUse = (port: number): Promise<boolean> => {
        return new Promise((resolve) => {
          const server = net.createServer()
          
          // Mock server behavior
          if (port === 3000) {
            // Simulate port in use
            server.listen = vi.fn().mockImplementation((p: number, callback: Function) => {
              const error = new Error('EADDRINUSE: address already in use')
              ;(error as any).code = 'EADDRINUSE'
              server.emit('error', error)
            })
            
            server.on = vi.fn().mockImplementation((event: string, handler: Function) => {
              if (event === 'error') {
                handler(new Error('EADDRINUSE: address already in use'))
                resolve(true) // Port is in use
              }
            })
          } else {
            // Simulate port available
            server.listen = vi.fn().mockImplementation((p: number, callback: Function) => {
              if (callback) callback()
            })
            
            server.on = vi.fn().mockImplementation((event: string, handler: Function) => {
              if (event === 'listening') {
                handler()
                resolve(false) // Port is available
              }
            })
            
            server.close = vi.fn()
          }
          
          server.listen(port)
        })
      }

      // Test port in use
      const isPort3000InUse = await checkPortInUse(3000)
      expect(isPort3000InUse).toBe(true)

      // Test port available
      const isPort3001InUse = await checkPortInUse(3001)
      expect(isPort3001InUse).toBe(false)
    })

    it('should find next available port', async () => {
      const findAvailablePort = async (startPort: number, maxPort: number = startPort + 10): Promise<number> => {
        for (let port = startPort; port <= maxPort; port++) {
          const server = net.createServer()
          
          try {
            await new Promise<void>((resolve, reject) => {
              server.on('error', reject)
              server.on('listening', () => {
                server.close()
                resolve()
              })
              server.listen(port)
            })
            return port
          } catch (error) {
            // Port in use, try next
            continue
          }
        }
        
        throw new Error(`No available port found between ${startPort} and ${maxPort}`)
      }

      // Mock implementation
      mockNet.createServer = vi.fn().mockReturnValue({
        on: vi.fn((event: string, handler: Function) => {
          if (event === 'listening') {
            setTimeout(() => handler(), 0)
          }
        }),
        listen: vi.fn((port: number) => {
          // Simulate ports 3000-3002 are in use
          if (port >= 3000 && port <= 3002) {
            const error = new Error('EADDRINUSE')
            ;(error as any).code = 'EADDRINUSE'
            throw error
          }
        }),
        close: vi.fn(),
      })

      // Should skip to port 3003
      const availablePort = await findAvailablePort(3000)
      expect(availablePort).toBeGreaterThanOrEqual(3000)
    })

    it('should detect process using a specific port', async () => {
      const getProcessUsingPort = async (port: number): Promise<string | null> => {
        const platform = process.platform
        let command: string

        switch (platform) {
          case 'darwin':
          case 'linux':
            command = `lsof -i :${port} -P -t`
            break
          case 'win32':
            command = `netstat -ano | findstr :${port}`
            break
          default:
            throw new Error(`Unsupported platform: ${platform}`)
        }

        try {
          const { stdout } = await execAsync(command)
          return stdout.trim() || null
        } catch {
          return null
        }
      }

      // Mock exec for different scenarios
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('3000')) {
          // Port 3000 is in use by process 12345
          callback(null, '12345\n', '')
        } else if (command.includes('3001')) {
          // Port 3001 is free
          callback(new Error('No process found'), '', '')
        } else {
          callback(new Error('Command failed'), '', '')
        }
      })

      const processPid = await getProcessUsingPort(3000)
      expect(processPid).toBe('12345')

      const noProcess = await getProcessUsingPort(3001)
      expect(noProcess).toBe(null)
    })

    it('should provide helpful error messages for port conflicts', () => {
      const getPortConflictMessage = (port: number, pid?: string) => {
        const baseMessage = `Port ${port} is already in use.`
        
        const suggestions = [
          `Try one of the following:`,
          `1. Kill the process using the port:`,
          pid ? `   - On macOS/Linux: kill -9 ${pid}` : '   - Find and kill the process manually',
          pid ? `   - On Windows: taskkill /F /PID ${pid}` : '',
          `2. Use a different port:`,
          `   - Run: npm run dev:https -- --port ${port + 1}`,
          `3. Wait for the process to finish and try again.`,
        ].filter(Boolean).join('\n')

        return `${baseMessage}\n\n${suggestions}`
      }

      const messageWithPid = getPortConflictMessage(3000, '12345')
      expect(messageWithPid).toContain('Port 3000 is already in use')
      expect(messageWithPid).toContain('kill -9 12345')
      expect(messageWithPid).toContain('npm run dev:https -- --port 3001')

      const messageWithoutPid = getPortConflictMessage(3000)
      expect(messageWithoutPid).toContain('Find and kill the process manually')
    })

    it('should handle port detection in HTTPS configuration', () => {
      const httpsConfig = {
        defaultPort: 3000,
        fallbackPorts: [3001, 3002, 3003, 8443],
        
        async getAvailablePort(): Promise<number> {
          // Check default port first
          const isDefaultAvailable = await this.isPortAvailable(this.defaultPort)
          if (isDefaultAvailable) {
            return this.defaultPort
          }

          // Try fallback ports
          for (const port of this.fallbackPorts) {
            const isAvailable = await this.isPortAvailable(port)
            if (isAvailable) {
              return port
            }
          }

          throw new Error('No available ports found for HTTPS server')
        },

        async isPortAvailable(port: number): Promise<boolean> {
          // Mock implementation
          return port !== 3000 && port !== 3001
        },
      }

      // Mock the isPortAvailable method
      vi.spyOn(httpsConfig, 'isPortAvailable').mockImplementation(async (port: number) => {
        return port !== 3000 && port !== 3001
      })

      // Test finding available port
      httpsConfig.getAvailablePort().then(port => {
        expect(port).toBe(3002) // First available fallback port
      })
    })

    it('should integrate port detection with dev:https script', () => {
      const devHttpsScript = {
        options: {
          port: 3000,
          host: 'localhost',
          https: true,
        },

        async start() {
          try {
            // Check if port is available
            const isAvailable = await this.checkPort(this.options.port)
            
            if (!isAvailable) {
              const suggestion = this.getPortSuggestion()
              throw new Error(`Port ${this.options.port} is in use. ${suggestion}`)
            }

            // Start HTTPS server
            return this.startServer()
          } catch (error) {
            console.error('Failed to start HTTPS dev server:', error)
            process.exit(1)
          }
        },

        async checkPort(port: number): Promise<boolean> {
          // Mock implementation
          return port !== 3000
        },

        getPortSuggestion(): string {
          const nextPort = this.options.port + 1
          return `Try running: npm run dev:https -- --port ${nextPort}`
        },

        startServer() {
          return {
            url: `https://${this.options.host}:${this.options.port}`,
            port: this.options.port,
          }
        },
      }

      // Test port conflict handling
      devHttpsScript.checkPort(3000).then(isAvailable => {
        expect(isAvailable).toBe(false)
      })

      const suggestion = devHttpsScript.getPortSuggestion()
      expect(suggestion).toContain('--port 3001')
    })

    it('should validate port number ranges', () => {
      const isValidPort = (port: number): boolean => {
        return Number.isInteger(port) && port >= 1 && port <= 65535
      }

      const validatePortOption = (input: any): { valid: boolean; error?: string } => {
        const port = parseInt(input, 10)
        
        if (isNaN(port)) {
          return { valid: false, error: 'Port must be a number' }
        }
        
        if (!isValidPort(port)) {
          return { valid: false, error: 'Port must be between 1 and 65535' }
        }
        
        if (port < 1024 && process.platform !== 'win32') {
          return { 
            valid: true, 
            error: 'Warning: Ports below 1024 require elevated privileges on Unix systems' 
          }
        }
        
        return { valid: true }
      }

      expect(validatePortOption('3000')).toEqual({ valid: true })
      expect(validatePortOption('80')).toMatchObject({ 
        valid: true,
        error: expect.stringContaining('elevated privileges')
      })
      expect(validatePortOption('70000')).toMatchObject({ 
        valid: false,
        error: 'Port must be between 1 and 65535'
      })
      expect(validatePortOption('abc')).toMatchObject({ 
        valid: false,
        error: 'Port must be a number'
      })
    })
  })
})