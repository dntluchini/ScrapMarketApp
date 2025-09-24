# MCP (Model Context Protocol) Setup

## MCP Configuration Overview

This project uses two MCPs:
1. **Context7 MCP** - Real-time documentation and examples
2. **n8n MCP** - Workflow automation and API integration

## Context7 MCP Configuration

### Libraries Configured
- **react-native** - Core React Native framework
- **expo** - Expo development platform
- **supabase** - Backend-as-a-Service
- **typescript** - TypeScript language support
- **react-navigation** - Navigation library
- **@expo/vector-icons** - Icon library
- **expo-constants** - Expo constants
- **expo-secure-store** - Secure storage

## n8n MCP Configuration

### Endpoints Configured
- **Base URL**: `http://192.168.0.158:5678` (development)
- **Webhook**: `/webhook`
- **MCP**: `/mcp`

### Workflows Configured
- **Products**: `/webhook/products` (GET, query: `q`)
- **Prices**: `/webhook/products-per-market` (GET, query: `canonname`)
- **Alerts**: `/webhook/user-alert` (POST)
- **History**: `/webhook/historial` (GET, path: `canonid`)

### Configuration Options
- **Timeout**: 30 seconds
- **Retries**: 3 attempts
- **CORS**: Enabled
- **Logging**: Enabled

## Features Enabled

### Context7 MCP Features
- âœ… Auto-update documentation
- âœ… Include code examples
- âœ… Include best practices
- âœ… Include type definitions

### n8n MCP Features
- âœ… Retry logic with exponential backoff
- âœ… CORS support for cross-origin requests
- âœ… Comprehensive logging
- âœ… Timeout handling
- âœ… Error recovery

## Usage

### Context7 MCP
Automatically provides:
- Up-to-date documentation
- Code examples
- Best practices
- Type definitions
- Integration guides

### n8n MCP
Provides:
- Workflow automation
- API integration
- Error handling
- Retry mechanisms
- Connection testing

## Files Structure
- `.mcp-config.json` - MCP configuration
- `src/services/n8nMcpService.ts` - n8n MCP service
- `src/services/alertService.ts` - Alert management
- `src/services/historyService.ts` - Price history
- `.mcp-cache/` - Cached documentation (ignored in git)
- `.mcp-logs/` - MCP logs (ignored in git)

## Benefits
1. **Real-time Documentation** - Always up-to-date
2. **Code Examples** - Practical implementation examples
3. **Best Practices** - Industry-standard patterns
4. **Type Safety** - TypeScript definitions
5. **Integration Guides** - Step-by-step setup instructions
6. **Workflow Automation** - n8n integration
7. **Error Handling** - Robust retry mechanisms
8. **Connection Testing** - Health checks

## Maintenance
- Configuration is automatically maintained
- Documentation updates automatically
- No manual intervention required
- Cache is automatically managed
- n8n workflows are version controlled


