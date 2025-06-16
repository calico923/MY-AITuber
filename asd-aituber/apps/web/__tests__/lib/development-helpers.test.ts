import { vi, describe, test, expect, beforeEach } from 'vitest'
import { isDevelopmentEnvironment, showDevelopmentWarnings } from '@/lib/development-helpers'

// Globals mocking
const mockLocation = {
  hostname: 'localhost',
  protocol: 'http:'
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true
})

describe('isDevelopmentEnvironment', () => {
  beforeEach(() => {
    // Reset environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  test('localhost環境をtrueと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(true)
  })

  test('127.0.0.1環境をtrueと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.1', protocol: 'http:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(true)
  })

  test('file://プロトコルをtrueと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '', protocol: 'file:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(true)
  })

  test('NODE_ENV=developmentをtrueと判定', () => {
    process.env.NODE_ENV = 'development'
    
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', protocol: 'https:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(true)
  })

  test('HTTPS本番環境をfalseと判定', () => {
    process.env.NODE_ENV = 'production'
    
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', protocol: 'https:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(false)
  })

  test('HTTPSでもlocalhost以外のドメインならfalseと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'production.example.com', protocol: 'https:' },
      writable: true,
      configurable: true
    })
    
    expect(isDevelopmentEnvironment()).toBe(false)
  })

  test('window未定義（SSR環境）の場合はNODE_ENVベースで判定', () => {
    const originalWindow = global.window
    // @ts-ignore
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true
    })
    
    process.env.NODE_ENV = 'development'
    expect(isDevelopmentEnvironment()).toBe(true)
    
    process.env.NODE_ENV = 'production'
    expect(isDevelopmentEnvironment()).toBe(false)
    
    // Restore window
    global.window = originalWindow
  })
})

describe('showDevelopmentWarnings', () => {
  test('開発環境で警告をコンソールに出力', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      writable: true,
      configurable: true
    })
    
    showDevelopmentWarnings()
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '🚧 開発環境での注意事項',
      expect.stringContaining('マイクロフォンの権限')
    )
    
    consoleSpy.mockRestore()
  })

  test('本番環境では警告を出力しない', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    process.env.NODE_ENV = 'production'
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', protocol: 'https:' },
      writable: true,
      configurable: true
    })
    
    showDevelopmentWarnings()
    
    expect(consoleSpy).not.toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })

  test('特定の警告メッセージが含まれることを確認', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      writable: true,
      configurable: true
    })
    
    showDevelopmentWarnings()
    
    const allWarnings = consoleSpy.mock.calls.flat().join(' ')
    
    expect(allWarnings).toContain('HTTPSが必要')
    expect(allWarnings).toContain('localhost以外では動作しない')
    expect(allWarnings).toContain('ブラウザのセキュリティ')
    
    consoleSpy.mockRestore()
  })
})