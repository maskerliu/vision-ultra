// src/shared/mcp.models.ts
export interface MCPChatRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
}

export interface MCPChatResponse {
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface MCPModelInfo {
  id: string
  name: string
  description: string
}