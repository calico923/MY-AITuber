# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MY-AITuber contains two distinct projects:

1. **ChatVRM** (Archived) - A browser-based 3D character chat demo using VRM models and OpenAI API
2. **asd-aituber** (Active) - An educational AITuber platform that demonstrates communication differences between ASD (Autism Spectrum Disorder) and NT (neurotypical) patterns

## ASD-AITuber Architecture

The active project uses a hybrid architecture:
- **Frontend**: Next.js 14 (App Router), TypeScript, Three.js + @pixiv/three-vrm, Socket.IO, Tailwind CSS + shadcn/ui
- **Backend**: Python FastAPI for NLP and emotion analysis
- **Real-time**: WebSocket connections between frontend and backend
- **Voice**: VOICEVOX integration for Japanese voice synthesis
- **AI**: Claude 3.5 Sonnet / GPT-4 for conversational responses

Key architectural patterns:
- Monorepo structure using pnpm workspaces
- Separation of NLP processing (Python) from UI/UX (TypeScript)
- Real-time emotion analysis with internal vs external state tracking
- VRM avatar system with emotion-driven animations

## Development Commands

### ChatVRM (if working with archived project)
```bash
cd ChatVRM
npm install
npm run dev      # Development server on port 3000
npm run build    # Production build
npm run lint     # ESLint
```

### ASD-AITuber (main project)
```bash
cd asd-aituber

# Initial setup
./scripts/setup.sh   # Complete environment setup

# Development
pnpm dev            # Start all services (web + api)
pnpm dev:web        # Frontend only (port 3000)
pnpm dev:api        # Backend only (port 8000)
./scripts/dev.sh    # Start with tmux support

# Building and testing
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages

# Docker
docker-compose up   # Run in containers
```

**Prerequisites**:
- Node.js 18+
- Python 3.10+
- pnpm v8+
- VOICEVOX running on port 50021 (for voice synthesis)

## Key Technical Considerations

### ASD/NT Mode System
The core feature switches between two communication modes:
- **ASD Mode**: Literal interpretation, direct responses, pattern-based processing
- **NT Mode**: Context-aware, indirect communication, social cue processing

### Emotion System
- **Internal emotions**: Actual emotional state (shown in ASD mode)
- **External expressions**: Displayed emotions (may differ in NT mode)
- Emotions: 喜び (joy), 怒り (anger), 悲しみ (sadness), 驚き (surprise), 恐れ (fear), 嫌悪 (disgust)

### Japanese NLP Pipeline
1. Text analysis using asari/oseti for emotion detection
2. Response generation via LLM (Claude/GPT-4)
3. Voice synthesis through VOICEVOX
4. Lip sync and avatar animation

### Performance Targets
- Page load: < 3 seconds
- Interaction response: < 100ms
- Voice synthesis: < 500ms per phrase

## Development Guidelines

### When implementing features:
1. Follow the 6-phase development plan in `docs/development-phases.md`
2. Maintain separation between Python NLP backend and TypeScript frontend
3. Use WebSocket for all real-time communication
4. Ensure WCAG 2.1 Level AA accessibility compliance
5. Add scenarios to the learning system following the existing pattern

### Code Organization:
- `/apps/web/`: Next.js frontend application
- `/apps/api/`: Python FastAPI backend
- `/packages/`: Shared TypeScript packages
- `/services/`: Microservices (emotion analyzer, PCM engine)
- `/models/`: VRM models, animations, voice data

### Testing Approach:
- Unit tests for individual components
- Integration tests for WebSocket communication
- E2E tests for complete scenarios
- Accessibility testing with automated tools

## Important Notes

- This project is developed by someone with ASD/ADHD with medical supervision
- The goal is educational: helping NT individuals understand ASD communication patterns
- Always respect the "Nothing About Us Without Us" principle
- Individual differences exist within ASD - the system represents common patterns, not absolutes
- Ensure all features include appropriate disclaimers about individual variability