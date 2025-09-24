#!/usr/bin/env node

/**
 * MCP Verification Script
 * Verifies that Context7 MCP is properly configured and working
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying MCP Configuration (Context7 + n8n)...\n');

// Check if .mcp-config.json exists
const configPath = path.join(__dirname, '..', '.mcp-config.json');
if (fs.existsSync(configPath)) {
  console.log('✅ .mcp-config.json found');
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Configuration is valid JSON');
    
    if (config.mcp) {
      // Check Context7 MCP
      if (config.mcp.context7) {
        console.log('✅ Context7 MCP configuration found');
        console.log(`📚 Libraries configured: ${config.mcp.context7.libraries.length}`);
        config.mcp.context7.libraries.forEach(lib => {
          console.log(`   - ${lib}`);
        });
      } else {
        console.log('❌ Context7 MCP configuration not found');
      }

      // Check n8n MCP
      if (config.mcp.n8n) {
        console.log('✅ n8n MCP configuration found');
        console.log(`🔗 Base URL: ${config.mcp.n8n.endpoints.baseUrl}`);
        console.log(`📋 Workflows configured: ${Object.keys(config.mcp.n8n.workflows).length}`);
        Object.keys(config.mcp.n8n.workflows).forEach(workflow => {
          console.log(`   - ${workflow}: ${config.mcp.n8n.workflows[workflow].endpoint}`);
        });
      } else {
        console.log('❌ n8n MCP configuration not found');
      }
    } else {
      console.log('❌ MCP configuration not found');
    }
  } catch (error) {
    console.log('❌ Invalid JSON in .mcp-config.json');
    console.log(`   Error: ${error.message}`);
  }
} else {
  console.log('❌ .mcp-config.json not found');
}

// Check if docs directory exists
const docsPath = path.join(__dirname, '..', 'docs');
if (fs.existsSync(docsPath)) {
  console.log('✅ docs/ directory found');
  
  const mcpSetupPath = path.join(docsPath, 'MCP_SETUP.md');
  if (fs.existsSync(mcpSetupPath)) {
    console.log('✅ MCP_SETUP.md documentation found');
  } else {
    console.log('❌ MCP_SETUP.md documentation not found');
  }
} else {
  console.log('❌ docs/ directory not found');
}

// Check if .gitignore includes MCP cache
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (gitignoreContent.includes('.mcp-cache/')) {
    console.log('✅ .gitignore includes MCP cache exclusions');
  } else {
    console.log('❌ .gitignore missing MCP cache exclusions');
  }
} else {
  console.log('❌ .gitignore not found');
}

console.log('\n🎉 MCP verification complete!');
console.log('\n📖 For more information, see: docs/MCP_SETUP.md');
