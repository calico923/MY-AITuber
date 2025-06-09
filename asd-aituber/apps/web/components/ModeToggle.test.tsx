import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ModeToggle } from './ModeToggle'
import type { ASDNTMode } from '@asd-aituber/types'

describe('ModeToggle', () => {
  it('renders with ASD mode selected', () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    expect(screen.getByLabelText(/現在のモード: ASD/)).toBeInTheDocument()
    expect(screen.getByText('直接的で字義通りの解釈')).toBeInTheDocument()
    expect(screen.getByText('ASDモード')).toHaveClass('text-blue-700')
  })

  it('renders with NT mode selected', () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="NT" 
        onModeChange={mockOnModeChange} 
      />
    )

    expect(screen.getByLabelText(/現在のモード: NT/)).toBeInTheDocument()
    expect(screen.getByText('文脈と社会的手がかりを考慮')).toBeInTheDocument()
    expect(screen.getByText('NTモード')).toHaveClass('text-green-700')
  })

  it('calls onModeChange when clicked from ASD to NT', async () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    const toggleButton = screen.getByRole('switch')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('NT')
    }, { timeout: 200 })
  })

  it('calls onModeChange when clicked from NT to ASD', async () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="NT" 
        onModeChange={mockOnModeChange} 
      />
    )

    const toggleButton = screen.getByRole('switch')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(mockOnModeChange).toHaveBeenCalledWith('ASD')
    }, { timeout: 200 })
  })

  it('disables button during toggle animation', async () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    const toggleButton = screen.getByRole('switch')
    fireEvent.click(toggleButton)

    // Button should be disabled immediately after click
    expect(toggleButton).toBeDisabled()

    // Wait for animation to complete
    await waitFor(() => {
      expect(toggleButton).not.toBeDisabled()
    }, { timeout: 200 })
  })

  it('has proper accessibility attributes', () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    const toggleButton = screen.getByRole('switch')
    
    expect(toggleButton).toHaveAttribute('aria-checked', 'false') // ASD mode = not checked (NT would be checked)
    expect(toggleButton).toHaveAttribute('aria-label')
    expect(toggleButton).toHaveAttribute('id', 'mode-toggle')
    
    const label = screen.getByLabelText('コミュニケーションモード')
    expect(label).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const mockOnModeChange = vi.fn()
    
    const { container } = render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has screen reader friendly text', () => {
    const mockOnModeChange = vi.fn()
    
    render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    // Check for screen reader text
    expect(screen.getByText(/現在のコミュニケーションモードはASDです/)).toHaveClass('sr-only')
    expect(screen.getByText(/このモードでは、直接的で字義通りの解釈を行います/)).toHaveClass('sr-only')
  })

  it('shows correct visual styles for each mode', () => {
    const mockOnModeChange = vi.fn()
    
    const { rerender } = render(
      <ModeToggle 
        currentMode="ASD" 
        onModeChange={mockOnModeChange} 
      />
    )

    const toggleButton = screen.getByRole('switch')
    
    // ASD mode styles
    expect(toggleButton).toHaveClass('bg-blue-100', 'border-blue-300')
    
    // Switch to NT mode
    rerender(
      <ModeToggle 
        currentMode="NT" 
        onModeChange={mockOnModeChange} 
      />
    )
    
    // NT mode styles
    expect(toggleButton).toHaveClass('bg-green-100', 'border-green-300')
  })
})