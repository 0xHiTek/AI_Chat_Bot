# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Architecture

This is a client-side web application that provides a cyberpunk-themed chat interface for interacting with AI models via OpenRouter API. The application is built as a single-page application (SPA) using vanilla HTML, CSS, and JavaScript.

### Key Architecture Components

- **State Management**: Centralized application state stored in the `state` object (script.js:5-19) with localStorage persistence
- **OpenRouter Integration**: Direct API calls to OpenRouter's chat completions endpoint for AI model access
- **Client-Side Storage**: All data (API keys, chat history, settings) stored in browser localStorage
- **Responsive Design**: Mobile-first CSS with sidebar navigation that transforms into a mobile menu
- **Theme System**: Dark/light theme toggle with CSS custom properties for color management

### File Structure

- `index.html`: Main application markup with cyberpunk-themed UI components
- `script.js`: Core application logic, state management, and API integration  
- `style.css`: Complete styling with cyberpunk aesthetics, animations, and responsive design

## Development Setup

Since this is a static web application, no build process is required:

```bash
# Serve locally (any HTTP server)
python -m http.server 8000
# Or use Live Server extension in VS Code
```

## API Configuration

The application requires an OpenRouter API key for functionality:
- API endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Models endpoint: `https://openrouter.ai/api/v1/models`  
- API key format: `sk-or-v1-...`
- Keys are stored in localStorage as `openrouter_api_key`

## Core Features Implementation

### Chat System
- Messages stored in `state.messages` array with role/content structure
- Chat history persisted to localStorage with 50 chat limit
- Real-time token counting and usage tracking
- Export functionality generates JSON files of chat data

### Model Management
- Dynamic model loading from OpenRouter API with fallback to hardcoded list
- Model search and filtering capabilities
- Per-chat model selection persistence

### Settings System
- API key with visibility toggle
- Temperature and max_tokens configuration
- Display options (timestamps, sound effects)
- All settings auto-saved to localStorage

## Styling Architecture

The CSS uses a comprehensive custom property system for theming:
- Color scheme defined in `:root` with light theme overrides
- Cyberpunk aesthetic with glitch effects and grid animations
- Responsive breakpoints at 768px for mobile adaptation
- Consistent animation system using CSS keyframes

## Security Considerations

- API keys stored in localStorage (client-side only)
- HTML content properly escaped via `escapeHtml()` function
- No server-side components or backend dependencies
- CORS headers required for OpenRouter API access