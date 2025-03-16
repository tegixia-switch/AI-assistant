<template>
  <div class="chat-container">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <div class="new-chat" @click="createNewConversation">
        <el-button type="primary" class="new-chat-btn">
          <el-icon><Plus /></el-icon>
          新建对话
        </el-button>
      </div>

      <div class="history-list">
        <div class="history-header">
          <span>历史记录</span>
          <el-button
            v-if="conversations.length > 0"
            type="danger"
            size="small"
            plain
            @click="clearConversations"
          >
            <el-icon><Delete /></el-icon>
            清空记录
          </el-button>
        </div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="history-item"
          :class="{ active: currentConversation?.id === conv.id }"
          @click="setCurrentConversation(conv.id)"
        >
          <el-icon><ChatRound /></el-icon>
          <span class="history-title">{{ conv.title }}</span>
          <el-button
            class="delete-btn"
            type="danger"
            size="small"
            @click.stop="deleteConversation(conv.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="model-selector">
        <el-select v-model="selectedModel" size="large" class="model-select">
          <el-option
            v-for="model in availableModels"
            :key="model"
            :label="model"
            :value="model"
          />
        </el-select>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-messages" ref="messagesContainer">
        <template v-if="currentMessages.length > 0">
          <div
            v-for="msg in currentMessages"
            :key="msg.id"
            :class="['message', msg.role]"
          >
            <div class="message-content">
              <div class="avatar">
                <el-icon v-if="msg.role === 'user'"><User /></el-icon>
                <el-icon v-else><ChatRound /></el-icon>
              </div>
              <div class="text">
                {{ msg.content }}
                <div v-if="msg.role === 'assistant'" class="message-actions">
                  <el-button-group>
                    <el-button size="small" @click="handleCopy(msg.content)">
                      <el-icon><Document /></el-icon>
                      复制
                    </el-button>
                    <el-button size="small" @click="handleEdit(msg)">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button>
                  </el-button-group>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <el-icon class="empty-icon"><ChatRound /></el-icon>
          <h2>欢迎使用 AI 助手</h2>
          <p>有什么可以帮您？</p>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="question"
          type="textarea"
          :rows="3"
          placeholder="输入问题..."
          resize="none"
          @keydown.enter.exact.prevent="handleAsk"
          @keydown.enter.shift.exact="question += '\n'"
        />
        <div class="input-actions">
          <div class="input-tips">
            <span>按 Enter 发送</span>
            <span>Shift + Enter 换行</span>
          </div>
          <el-button
            type="primary"
            class="send-button"
            :loading="loading"
            @click="handleAsk"
          >
            发送 <el-icon class="el-icon--right"><Position /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 右侧信息栏 -->
    <div class="info-sidebar">
      <div class="info-section">
        <h3>关于 AI 助手</h3>
        <div class="info-content">
          <p>AI 助手是一个基于先进语言模型的智能问答系统，可以：</p>
          <ul>
            <li>回答各类技术问题</li>
            <li>提供编程建议和代码示例</li>
            <li>解释复杂概念</li>
            <li>协助问题排查</li>
          </ul>
          <p>支持多种 AI 模型，针对不同场景选择最适合的模型。</p>
        </div>
      </div>

      <div class="faq-section">
        <h3>常见问题</h3>
        <div class="faq-list">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="faq-item"
            @click="handleFaqClick(faq.question)"
          >
            <div class="faq-question">
              <el-icon><QuestionFilled /></el-icon>
              <span>{{ faq.question }}</span>
            </div>
            <div class="faq-preview">{{ faq.preview }}</div>
          </div>
        </div>
      </div>

      <div class="tips-section">
        <h3>使用技巧</h3>
        <div class="tips-list">
          <div class="tip-item">
            <el-icon><Sunny /></el-icon>
            <span>使用清晰、具体的描述获得更准确的回答</span>
          </div>
          <div class="tip-item">
            <el-icon><Edit /></el-icon>
            <span>可以随时编辑和改进您的问题</span>
          </div>
          <div class="tip-item">
            <el-icon><Star /></el-icon>
            <span>通过反馈帮助我们改进服务</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAIStore } from '../stores/aiStore'
import { ElMessage } from 'element-plus'
import {
  ChatRound,
  User,
  Plus,
  Position,
  Edit,
  Document,
  CaretTop,
  CaretBottom,
  Delete,
  QuestionFilled,
  Sunny,
  Star
} from '@element-plus/icons-vue'
import type { Message } from '../types/ai'

const aiStore = useAIStore()
const question = ref('')
const loading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// 从 store 获取状态
const currentConversation = computed(() => aiStore.currentConversation)
const currentMessages = computed(() => aiStore.currentMessages)
const conversations = computed(() => aiStore.conversations)
const selectedModel = computed({
  get: () => aiStore.selectedModel,
  set: (value) => aiStore.setModel(value)
})
const availableModels = computed(() => aiStore.availableModels)

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const handleAsk = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请输入问题')
    return
  }

  const userMessage: Message = {
    id: Date.now(),
    role: 'user',
    content: question.value,
    timestamp: new Date()
  }
  
  aiStore.addMessage(userMessage)
  await scrollToBottom()

  loading.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const response = '这是AI的回复...'
    
    const assistantMessage: Message = {
      id: Date.now(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    }
    
    aiStore.addMessage(assistantMessage)
    question.value = ''
    await scrollToBottom()
  } catch (error) {
    ElMessage.error('获取回答失败')
  } finally {
    loading.value = false
  }
}

const handleCopy = (content: string) => {
  navigator.clipboard.writeText(content)
  ElMessage.success('已复制到剪贴板')
}

const handleEdit = (message: Message) => {
  const newContent = prompt('编辑消息', message.content)
  if (newContent !== null) {
    aiStore.updateMessage(message.id, newContent)
  }
}

const createNewConversation = () => {
  aiStore.createNewConversation()
}

const setCurrentConversation = (id: number) => {
  aiStore.setCurrentConversation(id)
}

const deleteConversation = (id: number) => {
  aiStore.deleteConversation(id)
}

const clearConversations = () => {
  aiStore.clearConversations()
}

// FAQ 数据
const faqs = [
  {
    question: '如何获得更准确的回答？',
    preview: '提供具体的上下文和清晰的问题描述...'
  },
  {
    question: '支持哪些编程语言？',
    preview: '支持所有主流编程语言，包括但不限于...'
  },
  {
    question: '如何保存对话记录？',
    preview: '所有对话会自动保存，可以在左侧历史记录中查看...'
  }
]

const handleFaqClick = (faqQuestion: string) => {
  // 自动填充问题
  question.value = faqQuestion
}

// 初始化时创建新对话
onMounted(() => {
  if (!currentConversation.value) {
    createNewConversation()
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: calc(100vh - 60px);
  background: linear-gradient(180deg, rgba(247,247,248,0.8) 0%, rgba(255,255,255,1) 100%);
  margin: -20px;
}

.sidebar {
  width: 260px;
  background-color: #ffffff;
  border-right: 1px solid rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
  z-index: 10;
}

.new-chat {
  margin-bottom: 24px;
}

.new-chat-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10a37f 0%, #2563eb 100%);
  border: none;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  margin: 0 -20px;
  padding: 0 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 16px;
}

.history-header span {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  position: relative;
}

.history-item:hover {
  background-color: rgba(16, 163, 127, 0.05);
  border-color: rgba(16, 163, 127, 0.1);
}

.history-item.active {
  background-color: rgba(16, 163, 127, 0.1);
  border-color: rgba(16, 163, 127, 0.2);
}

.history-item .el-icon {
  margin-right: 12px;
  font-size: 18px;
  color: #10a37f;
}

.history-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #374151;
  font-size: 14px;
}

.model-selector {
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(0,0,0,0.1);
}

.model-select {
  width: 100%;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  scroll-behavior: smooth;
  background: transparent;
}

.message {
  margin-bottom: 32px;
  opacity: 0;
  transform: translateY(20px);
  animation: messageIn 0.5s ease forwards;
}

@keyframes messageIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-content {
  display: flex;
  gap: 16px;
  padding: 0 40px;
}

.message.assistant .message-content {
  background-color: rgba(247,247,248,0.7);
  margin: 0 -40px;
  padding: 32px 40px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10a37f 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.message.user .avatar {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
}

.text {
  flex: 1;
  font-size: 15px;
  line-height: 1.6;
  color: #1f2937;
  position: relative;
  padding: 4px 0;
}

.message.assistant .text {
  color: #374151;
}

.message-actions {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.text:hover .message-actions {
  opacity: 1;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  padding: 48px 0;
  text-align: center;
  background: radial-gradient(circle at center, rgba(16,163,127,0.05) 0%, transparent 70%);
  border-radius: 20px;
  margin: 0 40px;
}

.empty-state .el-icon {
  font-size: 64px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #10a37f 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px;
  background: linear-gradient(135deg, #10a37f 0%, #2563eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.empty-state p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.chat-input {
  border-top: 1px solid rgba(0,0,0,0.1);
  background-color: #ffffff;
  padding: 20px 40px;
  position: relative;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.input-tips {
  display: flex;
  gap: 16px;
}

.input-tips span {
  color: #6b7280;
  font-size: 13px;
}

:deep(.el-textarea__inner) {
  min-height: 24px !important;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.6;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 12px;
  background-color: #f9fafb;
  transition: all 0.3s ease;
  resize: none !important;
}

:deep(.el-textarea__inner:hover) {
  border-color: rgba(16,163,127,0.4);
}

:deep(.el-textarea__inner:focus) {
  border-color: #10a37f;
  box-shadow: 0 0 0 2px rgba(16,163,127,0.2);
  background-color: #ffffff;
}

.send-button {
  height: 40px;
  padding: 0 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10a37f 0%, #2563eb 100%);
  border: none;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
}

.send-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 自定义滚动条 */
.history-list::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track,
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.history-list::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover,
.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.2);
}

/* Element Plus 组件样式覆盖 */
:deep(.el-button) {
  --el-button-hover-border-color: transparent;
  --el-button-active-border-color: transparent;
}

:deep(.el-button-group .el-button) {
  border-radius: 6px;
  margin: 0 4px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-select .el-input__wrapper) {
  background-color: #f9fafb;
  border-radius: 10px;
  box-shadow: none;
  border: 1px solid rgba(0,0,0,0.1);
}

:deep(.el-select .el-input__wrapper:hover) {
  border-color: rgba(16,163,127,0.4);
}

:deep(.el-select .el-input__wrapper.is-focus) {
  border-color: #10a37f;
  box-shadow: 0 0 0 2px rgba(16,163,127,0.2);
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .main-content {
    max-width: 100%;
  }
  
  .message-content {
    padding: 0 20px;
  }
  
  .message.assistant .message-content {
    margin: 0 -20px;
    padding: 24px 20px;
  }
  
  .chat-input {
    padding: 20px;
  }
  
  .empty-state {
    margin: 0 20px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .chat-messages {
    padding: 20px 0;
  }

  .message-content {
    padding: 0 16px;
    gap: 12px;
  }

  .message.assistant .message-content {
    margin: 0 -16px;
    padding: 20px 16px;
  }

  .avatar {
    width: 36px;
    height: 36px;
  }

  .text {
    font-size: 14px;
  }

  .chat-input {
    padding: 16px;
  }

  .input-actions {
    flex-direction: column;
    gap: 12px;
  }

  .input-tips {
    order: 2;
    width: 100%;
    justify-content: center;
  }

  .send-button {
    width: 100%;
  }
}

.delete-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

:deep(.el-button--danger.is-plain) {
  --el-button-hover-bg-color: var(--el-color-danger-light-3);
  --el-button-hover-border-color: var(--el-color-danger);
}

.info-sidebar {
  width: 300px;
  background-color: #ffffff;
  border-left: 1px solid rgba(0,0,0,0.1);
  padding: 24px;
  overflow-y: auto;
}

.info-section,
.faq-section,
.tips-section {
  margin-bottom: 32px;
}

.info-section h3,
.faq-section h3,
.tips-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(16,163,127,0.1);
}

.info-content {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.info-content ul {
  margin: 12px 0;
  padding-left: 20px;
}

.info-content li {
  margin-bottom: 8px;
  position: relative;
}

.info-content li::before {
  content: '•';
  color: #10a37f;
  font-weight: bold;
  position: absolute;
  left: -15px;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(247,247,248,0.7);
  border: 1px solid rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.2s ease;
}

.faq-item:hover {
  background: rgba(16,163,127,0.05);
  border-color: rgba(16,163,127,0.1);
  transform: translateY(-1px);
}

.faq-question {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 4px;
}

.faq-question .el-icon {
  color: #10a37f;
}

.faq-preview {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(247,247,248,0.7);
  border: 1px solid rgba(0,0,0,0.06);
}

.tip-item .el-icon {
  color: #10a37f;
  font-size: 18px;
}

.tip-item span {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

/* 响应式调整 */
@media (max-width: 1400px) {
  .info-sidebar {
    width: 280px;
  }
}

@media (max-width: 1200px) {
  .info-sidebar {
    display: none;
  }
}
</style> 