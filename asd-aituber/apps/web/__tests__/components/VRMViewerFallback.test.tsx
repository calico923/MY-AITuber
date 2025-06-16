import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VRMViewerFallback from '@/components/VRMViewerFallback'

describe('VRMViewerFallback Component', () => {
  it('should render fallback UI when VRM is not supported', () => {
    render(<VRMViewerFallback reason="WebGL not supported" />)
    expect(screen.getByText(/WebGL not supported/i)).toBeInTheDocument()
    expect(screen.getByTestId('vrm-fallback')).toBeInTheDocument()
  })
  
  it('should show loading state', () => {
    render(<VRMViewerFallback loading={true} />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    expect(screen.getByTestId('vrm-fallback-loading')).toBeInTheDocument()
  })
  
  it('should display error message', () => {
    render(<VRMViewerFallback error="Failed to load VRM file" />)
    expect(screen.getByText(/Failed to load VRM file/i)).toBeInTheDocument()
    expect(screen.getByTestId('vrm-fallback-error')).toBeInTheDocument()
  })

  it('should show retry button when error occurs', () => {
    const onRetry = vi.fn()
    render(<VRMViewerFallback error="Network error" onRetry={onRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should display WebGL not supported message with browser recommendations', () => {
    render(<VRMViewerFallback reason="WebGL not supported" />)
    
    expect(screen.getByText(/WebGL.*not supported/i)).toBeInTheDocument()
    expect(screen.getByText(/Chrome.*Edge.*Safari/i)).toBeInTheDocument()
  })

  it('should show file not found message', () => {
    render(<VRMViewerFallback reason="VRM file not found" />)
    
    expect(screen.getByText(/VRM file not found/i)).toBeInTheDocument()
    expect(screen.getByTestId('vrm-fallback-file-error')).toBeInTheDocument()
  })

  it('should render with custom className', () => {
    render(<VRMViewerFallback reason="test" className="custom-class" />)
    
    const fallback = screen.getByTestId('vrm-fallback')
    expect(fallback).toHaveClass('custom-class')
  })

  it('should show avatar placeholder', () => {
    render(<VRMViewerFallback reason="WebGL not supported" />)
    
    expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument()
  })

  it('should handle accessibility attributes', () => {
    render(<VRMViewerFallback error="Test error" />)
    
    const errorElement = screen.getByTestId('vrm-fallback-error')
    expect(errorElement).toHaveAttribute('role', 'alert')
    expect(errorElement).toHaveAttribute('aria-live', 'polite')
  })

  it('should show different fallback types', () => {
    const { rerender } = render(<VRMViewerFallback loading={true} />)
    expect(screen.getByTestId('vrm-fallback-loading')).toBeInTheDocument()

    rerender(<VRMViewerFallback error="Error message" />)
    expect(screen.getByTestId('vrm-fallback-error')).toBeInTheDocument()

    rerender(<VRMViewerFallback reason="Not supported" />)
    expect(screen.getByTestId('vrm-fallback')).toBeInTheDocument()
  })

  it('should render technical details when provided', () => {
    const technicalDetails = {
      webglSupported: false,
      threeJsVersion: '0.159.0',
      vrmLibVersion: '2.1.0'
    }
    
    render(
      <VRMViewerFallback 
        reason="WebGL not supported" 
        technicalDetails={technicalDetails}
        showTechnicalDetails={true}
      />
    )
    
    expect(screen.getByText(/Technical Details/i)).toBeInTheDocument()
    expect(screen.getByText(/Three\.js.*0\.159\.0/)).toBeInTheDocument()
  })
})