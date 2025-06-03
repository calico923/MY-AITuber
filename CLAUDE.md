# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a new MY-AITuber project that appears to be in the initial setup phase. The project name suggests it will be an AI-powered VTuber (Virtual YouTuber) application.

## Project Status

The project is currently empty with no codebase implemented yet. Only SpecStory configuration files are present for tracking AI chat history.

## Development Guidelines

Since this is a new project, when implementing features:

1. Consider the project will likely need:
   - AI/LLM integration for conversational capabilities
   - Text-to-speech (TTS) for voice synthesis
   - Avatar rendering/animation system
   - Streaming/broadcasting capabilities
   - Real-time chat interaction handling

2. Technology stack recommendations based on common AITuber implementations:
   - Frontend: Consider React/Vue/Angular for UI
   - Backend: Node.js/Python for AI integration
   - AI Services: OpenAI API, Claude API, or local LLMs
   - TTS: Consider services like ElevenLabs, Azure TTS, or VOICEVOX
   - Avatar: Live2D, VRM models, or custom 2D/3D rendering

3. Project structure suggestions:
   - `/src` or `/app` for main application code
   - `/public` or `/assets` for static resources
   - `/models` for AI model configurations
   - `/avatars` for avatar assets
   - `/config` for configuration files
   - `/tests` for test files

## Notes

- The `.specstory` directory contains AI chat history and should not be modified
- `.cursorindexingignore` excludes SpecStory files from indexing