import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatPanel from './ChatPanel'
import type { ChatMessage } from '@asd-aituber/types'

describe('ChatPanel', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2024-01-01T10:00:00'),
      emotion: 'neutral',
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there! How can I help you?',
      timestamp: new Date('2024-01-01T10:00:10'),
      emotion: 'joy',
    },
  ]

  it('renders chat messages', () => {
    render(<ChatPanel messages={mockMessages} onSendMessage={vi.fn()} />)
    
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there! How can I help you?')).toBeInTheDocument()
  })

  it('displays empty state when no messages', () => {
    render(<ChatPanel messages={[]} onSendMessage={vi.fn()} />)
    
    expect(screen.getByText('Start a conversation!')).toBeInTheDocument()
  })

  it('sends message on form submit', async () => {
    const onSendMessage = vi.fn()
    const user = userEvent.setup()
    
    render(<ChatPanel messages={[]} onSendMessage={onSendMessage} />)
    
    const input = screen.getByPlaceholderText('Type a message...')
    const button = screen.getByRole('button', { name: 'Send' })
    
    await user.type(input, 'Test message')
    await user.click(button)
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message')
    expect(input).toHaveValue('')
  })

  it('sends message on enter key', async () => {
    const onSendMessage = vi.fn()
    const user = userEvent.setup()
    
    render(<ChatPanel messages={[]} onSendMessage={onSendMessage} />)
    
    const input = screen.getByPlaceholderText('Type a message...')
    
    await user.type(input, 'Test message{enter}')
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message')
    expect(input).toHaveValue('')
  })

  it('disables send when loading', () => {
    render(<ChatPanel messages={[]} onSendMessage={vi.fn()} isLoading />)
    
    const button = screen.getByRole('button', { name: 'Send' })
    const input = screen.getByPlaceholderText('Type a message...')
    
    expect(button).toBeDisabled()
    expect(input).toBeDisabled()
  })

  it('shows loading indicator', () => {
    render(<ChatPanel messages={[]} onSendMessage={vi.fn()} isLoading />)
    
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('scrolls to bottom on new message', async () => {
    const { rerender } = render(
      <ChatPanel messages={mockMessages} onSendMessage={vi.fn()} />
    )
    
    const scrollContainer = screen.getByTestId('messages-container')
    const scrollSpy = vi.spyOn(scrollContainer, 'scrollTop', 'set')
    
    const newMessage: ChatMessage = {
      id: '3',
      role: 'user',
      content: 'New message',
      timestamp: new Date(),
      emotion: 'neutral',
    }
    
    rerender(
      <ChatPanel messages={[...mockMessages, newMessage]} onSendMessage={vi.fn()} />
    )
    
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled()
    })
  })
})