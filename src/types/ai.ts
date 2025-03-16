export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface Conversation {
  id: number
  title: string
  messages: Message[]
  model: string
  timestamp: Date
}

export interface AIState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  selectedModel: string
  availableModels: string[]
} 