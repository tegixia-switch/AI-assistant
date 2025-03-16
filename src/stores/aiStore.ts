import { defineStore } from 'pinia'
import type { AIState, Message, Conversation } from '../types/ai'

export const useAIStore = defineStore('ai', {
  state: (): AIState => ({
    conversations: [],
    currentConversation: null,
    selectedModel: 'GPT-4',
    availableModels: ['GPT-3.5', 'GPT-4', 'Claude-3']
  }),

  getters: {
    currentMessages: (state) => state.currentConversation?.messages || [],
    conversationById: (state) => {
      return (id: number) => state.conversations.find(conv => conv.id === id)
    }
  },

  actions: {
    createNewConversation() {
      const conversation: Conversation = {
        id: Date.now(),
        title: '新对话',
        messages: [],
        model: this.selectedModel,
        timestamp: new Date()
      }
      this.conversations.unshift(conversation)
      this.currentConversation = conversation
    },

    addMessage(message: Message) {
      if (!this.currentConversation) {
        this.createNewConversation()
      }
      
      if (this.currentConversation) {
        this.currentConversation.messages.push(message)
        // 更新对话标题为第一条用户消息的前20个字符
        if (message.role === 'user' && this.currentConversation.messages.length === 1) {
          this.currentConversation.title = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
        }
      }
    },

    updateMessage(messageId: number, content: string) {
      if (this.currentConversation) {
        const message = this.currentConversation.messages.find(msg => msg.id === messageId)
        if (message) {
          message.content = content
        }
      }
    },

    deleteMessage(messageId: number) {
      if (this.currentConversation) {
        const index = this.currentConversation.messages.findIndex(msg => msg.id === messageId)
        if (index !== -1) {
          this.currentConversation.messages.splice(index, 1)
        }
      }
    },

    setCurrentConversation(conversationId: number) {
      const conversation = this.conversations.find(conv => conv.id === conversationId)
      if (conversation) {
        this.currentConversation = conversation
      }
    },

    deleteConversation(conversationId: number) {
      const index = this.conversations.findIndex(conv => conv.id === conversationId)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        if (this.currentConversation?.id === conversationId) {
          this.currentConversation = this.conversations[0] || null
        }
      }
    },

    clearConversations() {
      this.conversations = []
      this.currentConversation = null
    },

    setModel(model: string) {
      this.selectedModel = model
      if (this.currentConversation) {
        this.currentConversation.model = model
      }
    }
  }
}) 