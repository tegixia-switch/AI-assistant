<template>
  <div class="fse-container" :class="{ 'fullscreen': isFullscreen }">
    <!-- 左侧历史记录 -->
    <div class="history-sidebar" :class="{ 'collapsed': isHistoryCollapsed, 'hidden': isFullscreen }">
      <div class="history-header">
        <div class="header-content">
          <h3>历史记录</h3>
          <el-button
            v-if="aiHistory.length > 0 && !isHistoryCollapsed"
            type="danger"
            size="small"
            plain
            @click="clearAIHistory"
          >
            <el-icon><Delete /></el-icon>
            清空记录
          </el-button>
        </div>
        <el-button
          class="collapse-btn"
          @click="toggleHistory"
        >
          <el-icon><ArrowLeft v-if="!isHistoryCollapsed" /><ArrowRight v-else /></el-icon>
        </el-button>
      </div>
      <div class="history-list" v-show="!isHistoryCollapsed">
        <div
          v-for="record in aiHistory"
          :key="record.id"
          class="history-item"
          :class="{ active: selectedRecord?.id === record.id }"
          @click="loadAIRecord(record)"
        >
          <div class="history-content">
            <div class="record-info">
              <span class="record-title">{{ record.ticketNumber }}</span>
              <el-tag size="small" :type="getTicketTypeTag(record.ticketType)">
                {{ record.ticketType }}
              </el-tag>
            </div>
            <div class="record-question">{{ record.userQuestion || '暂无用户问题' }}</div>
            <div class="record-time">{{ formatTime(record.timestamp) }}</div>
          </div>
          <el-button
            class="delete-btn"
            type="danger"
            size="small"
            @click.stop="deleteAIRecord(record.id)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <div v-if="aiHistory.length === 0" class="empty-history">
          暂无处理记录
        </div>
      </div>
    </div>

    <!-- 右侧主内容区 -->
    <div class="main-content" :class="{ 'fullscreen': isFullscreen }">
      <!-- 工单搜索 -->
      <div class="search-bar">
        <el-input
          v-model="ticketNumber"
          placeholder="输入工单号"
          class="ticket-input"
          clearable
        >
          <template #prefix>
            <el-icon><Document /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="fetchTicketInfo" :loading="loading">
          <el-icon><Search /></el-icon>
          获取工单信息
        </el-button>
      </div>

      <div class="content-wrapper">
        <!-- 工单详情 -->
        <div class="ticket-section">
          <div class="section-header">
            <div class="header-left">
              <h2>工单详情</h2>
              <el-tag v-if="ticketInfo?.ticketType" :type="getTicketTypeTag(ticketInfo.ticketType)">
                {{ ticketInfo.ticketType }}
              </el-tag>
            </div>
            <div class="model-selector">
              <span class="model-label">AI 模型：</span>
              <el-select v-model="selectedModel" size="default">
                <el-option
                  v-for="model in availableModels"
                  :key="model"
                  :label="model"
                  :value="model"
                />
              </el-select>
            </div>
          </div>

          <div class="ticket-form">
            <el-form 
              ref="ticketFormRef"
              :model="ticketInfo"
              :rules="ticketRules"
              label-position="top"
              @submit.prevent
            >
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="问题类型" prop="ticketType">
                    <el-select v-model="ticketInfo.ticketType" class="full-width" placeholder="请选择问题类型">
                      <el-option
                        v-for="type in ticketTypes"
                        :key="type"
                        :label="type"
                        :value="type"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="CI 信息" prop="ciInfo">
                    <el-input v-model="ticketInfo.ciInfo" placeholder="请输入CI信息" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="用户问题" prop="userQuestion">
                <el-input
                  v-model="ticketInfo.userQuestion"
                  type="textarea"
                  :rows="3"
                  resize="none"
                  placeholder="请输入用户问题"
                />
              </el-form-item>

              <el-form-item label="问题描述" prop="description">
                <el-input
                  v-model="ticketInfo.description"
                  type="textarea"
                  :rows="4"
                  resize="none"
                  placeholder="请输入问题描述"
                />
              </el-form-item>

              <div class="action-row">
                <el-button
                  type="primary"
                  class="action-btn"
                  @click="validateAndGenerateGuide"
                  :loading="generatingGuide"
                >
                  <el-icon><Reading /></el-icon>
                  生成处理指南
                </el-button>
              </div>
            </el-form>
          </div>
        </div>

        <!-- AI 处理指南和处理报告容器 -->
        <div class="ai-content-container" v-if="repairGuide">
          <div class="section-header">
            <div class="header-left">
              <h3>{{ currentView === 'guide' ? 'AI 处理指南' : '处理报告' }}</h3>
              <div class="view-switcher">
                <el-button
                  v-if="currentView === 'report'"
                  type="primary"
                  link
                  @click="currentView = 'guide'"
                  class="back-btn"
                >
                  <el-icon><ArrowLeft /></el-icon>
                  返回处理指南
                </el-button>
                <el-button
                  v-if="currentView === 'guide' && finalReport"
                  type="primary"
                  link
                  @click="currentView = 'report'"
                  class="view-report-btn"
                >
                  查看处理报告
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="guide-actions">
              <el-button type="primary" link @click="currentView === 'guide' ? editGuide() : editReport()">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="primary" link @click="currentView === 'guide' ? regenerateGuide() : regenerateReport()">
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
              <el-button type="primary" link @click="toggleFullscreen">
                <el-icon><FullScreen /></el-icon>
                {{ isFullscreen ? '退出全屏' : '全屏展示' }}
              </el-button>
            </div>
          </div>

          <div class="ai-content-wrapper">
            <div class="ai-content" :class="{ 'slide-left': currentView === 'report', 'slide-right': currentView === 'guide' }">
              <!-- AI 处理指南 -->
              <div class="guide-section" v-show="currentView === 'guide'">
                <div class="guide-content">
                  <div v-if="!editingGuide" class="markdown-preview" v-html="renderedGuide"></div>
                  <div v-else class="editor-wrapper">
                    <QuillEditor
                      v-model:content="editedGuide"
                      contentType="html"
                      theme="snow"
                      toolbar="full"
                      :options="editorOptions"
                    />
                  </div>
                </div>
                <div class="editor-actions" v-if="editingGuide">
                  <el-button type="primary" @click="saveGuide">完成</el-button>
                  <el-button @click="editingGuide = false">取消</el-button>
                </div>
              </div>

              <!-- 处理报告 -->
              <div class="report-section" v-show="currentView === 'report'">
                <div class="report-content">
                  <div v-if="!editingReport" class="markdown-preview" v-html="renderedReport"></div>
                  <div v-else class="editor-wrapper">
                    <QuillEditor
                      v-model:content="editedReport"
                      contentType="html"
                      theme="snow"
                      toolbar="full"
                      :options="editorOptions"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部操作按钮 -->
            <div class="bottom-actions" v-if="!editingGuide && !editingReport">
              <div class="action-buttons">
                <el-button
                  v-if="currentView === 'guide'"
                  type="primary"
                  class="action-btn"
                  @click="generateReport"
                  :loading="generatingReport"
                >
                  <el-icon><Document /></el-icon>
                  {{ finalReport ? '重新生成报告' : '生成处理报告' }}
                </el-button>
                <el-button
                  v-if="currentView === 'report'"
                  type="success"
                  class="action-btn"
                  @click="syncToTicket"
                  :loading="syncing"
                >
                  <el-icon><Upload /></el-icon>
                  同步至工单系统
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import {
  Document,
  Search,
  Reading,
  Upload,
  Delete,
  Refresh,
  Edit,
  ArrowLeft,
  ArrowRight,
  FullScreen
} from '@element-plus/icons-vue'
import type { TicketInfo, AIRecord } from '../types/fse'
import { useFSEStore } from '../stores/fseStore'
import { marked } from 'marked'
import type { FormInstance, FormRules } from 'element-plus'

const fseStore = useFSEStore()
const loading = ref(false)
const generatingGuide = ref(false)
const generatingReport = ref(false)
const syncing = ref(false)
const ticketNumber = ref('')
const ticketInfo = ref<TicketInfo>({
  ticketNumber: '',
  ticketType: '',
  userQuestion: '',
  description: '',
  ciInfo: ''
})
const repairGuide = ref('')
const finalReport = ref('')
const editingGuide = ref(false)
const editedGuide = ref('')
const editingReport = ref(false)
const editedReport = ref('')
const selectedModel = ref('GPT-4')
const selectedRecord = ref<AIRecord | null>(null)
const isHistoryCollapsed = ref(false)
const currentView = ref<'guide' | 'report'>('guide')
const isFullscreen = ref(false)

const availableModels = ['GPT-3.5', 'GPT-4', 'Claude-3']
const ticketTypes = computed(() => fseStore.ticketTypes)
const aiHistory = computed(() => fseStore.aiHistory)

const ticketFormRef = ref<FormInstance>()

const ticketRules: FormRules = {
  ticketType: [
    { required: true, message: '请选择问题类型', trigger: 'change' }
  ],
  ciInfo: [
    { required: true, message: '请输入CI信息', trigger: 'blur' }
  ],
  userQuestion: [
    { required: true, message: '请输入用户问题', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入问题描述', trigger: 'blur' }
  ]
}

const getTicketTypeTag = (type: string): 'success' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
    '硬件故障': 'danger',
    '软件问题': 'warning',
    '网络问题': 'info',
    '系统配置': 'success'
  }
  return typeMap[type] || 'info'
}

const fetchTicketInfo = async () => {
  if (!ticketNumber.value) {
    ElMessage.warning('请输入工单号')
    return
  }

  loading.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ticketInfo.value = {
      ticketNumber: ticketNumber.value,
      ticketType: '硬件故障',
      userQuestion: '服务器无法启动',
      description: '服务器在例行维护后无法正常启动，显示硬件检测错误。',
      ciInfo: 'Server-01'
    }
    ElMessage.success('工单信息获取成功')
  } catch (error) {
    ElMessage.error('获取工单信息失败')
  } finally {
    loading.value = false
  }
}

const validateAndGenerateGuide = async () => {
  if (!ticketFormRef.value) return
  
  try {
    await ticketFormRef.value.validate()
    await generateGuide()
  } catch (error) {
    ElMessage.warning('请填写完整的工单信息')
  }
}

const generateGuide = async () => {
  if (!ticketInfo.value) return
  
  generatingGuide.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const guide = `# 服务器故障处理指南

## 问题概述
服务器在例行维护后无法正常启动，显示硬件检测错误。根据用户反馈，服务器在重启后出现以下症状：
- 无法进入系统
- 显示硬件检测错误
- 电源指示灯正常

## 处理步骤

### 1. 初步检查
1. 检查服务器电源连接状态
   - 确认电源线连接牢固
   - 验证电源指示灯状态
   - 检查电源供应是否稳定

2. 检查服务器状态指示灯
   - 系统状态指示灯
   - 硬盘状态指示灯
   - 网络状态指示灯

### 2. 硬件检测
1. 执行硬件自检
   - 进入BIOS界面
   - 运行硬件诊断程序
   - 检查错误日志

2. 检查关键组件
   - CPU状态
   - 内存状态
   - 主板状态
   - 硬盘状态

### 3. 系统日志分析
1. 收集系统日志
   - 系统启动日志
   - 硬件检测日志
   - 错误报告

2. 分析日志内容
   - 识别错误代码
   - 定位问题原因
   - 确定解决方案

### 4. 故障处理
1. 根据检测结果采取相应措施
   - 更换故障硬件
   - 更新固件
   - 重置BIOS设置

2. 验证修复效果
   - 重启服务器
   - 检查系统状态
   - 确认服务恢复

## 注意事项
- 操作前请确保已备份重要数据
- 更换硬件时注意防静电
- 记录所有操作步骤
- 保持与用户的及时沟通

## 后续建议
1. 定期进行硬件检查
2. 建立硬件维护计划
3. 完善故障处理文档
4. 优化维护流程`
    fseStore.setRepairGuide(guide)
    repairGuide.value = guide

    // 保存历史记录
    const record: AIRecord = {
      id: Date.now(),
      ticketNumber: ticketInfo.value.ticketNumber,
      ticketType: ticketInfo.value.ticketType,
      userQuestion: ticketInfo.value.userQuestion,
      guide: guide,
      report: finalReport.value || '',
      timestamp: new Date()
    }
    fseStore.addAIHistory(record)
    selectedRecord.value = record

    ElMessage.success('处理指南生成成功')
  } catch (error) {
    ElMessage.error('生成处理指南失败')
  } finally {
    generatingGuide.value = false
  }
}

const generateReport = async () => {
  if (!ticketInfo.value) return

  generatingReport.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const report = '问题原因：服务器主板故障\n处理过程：更换主板并重新配置系统\n解决方案：完成硬件更换和系统恢复'
    fseStore.setFinalReport(report)
    finalReport.value = report

    // 保存历史记录
    const record: AIRecord = {
      id: Date.now(),
      ticketNumber: ticketInfo.value.ticketNumber,
      ticketType: ticketInfo.value.ticketType,
      userQuestion: ticketInfo.value.userQuestion,
      guide: repairGuide.value || '',
      report: report,
      timestamp: new Date()
    }
    fseStore.addAIHistory(record)
    selectedRecord.value = record

    // 如果当前在指南视图，自动切换到报告视图
    if (currentView.value === 'guide') {
      currentView.value = 'report'
    }

    ElMessage.success('处理报告生成成功')
  } catch (error) {
    ElMessage.error('生成处理报告失败')
  } finally {
    generatingReport.value = false
  }
}

const syncToTicket = async () => {
  if (!ticketInfo.value) return

  syncing.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 保存历史记录
    const record: AIRecord = {
      id: Date.now(),
      ticketNumber: ticketInfo.value.ticketNumber,
      ticketType: ticketInfo.value.ticketType,
      userQuestion: ticketInfo.value.userQuestion,
      guide: repairGuide.value || '',
      report: finalReport.value || '',
      timestamp: new Date()
    }
    fseStore.addAIHistory(record)
    selectedRecord.value = record

    ElMessage.success('同步至工单系统成功')
  } catch (error) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

const regenerateGuide = async () => {
  generatingGuide.value = true
  try {
    await generateGuide()
  } finally {
    generatingGuide.value = false
  }
}

const regenerateReport = async () => {
  generatingReport.value = true
  try {
    await generateReport()
  } finally {
    generatingReport.value = false
  }
}

const editGuide = () => {
  editedGuide.value = repairGuide.value
  editingGuide.value = true
}

const saveGuide = () => {
  const guide = editedGuide.value
  repairGuide.value = guide
  fseStore.setRepairGuide(guide)
  editingGuide.value = false
}

const editReport = () => {
  editedReport.value = finalReport.value
  editingReport.value = true
}

const saveReport = () => {
  const report = editedReport.value
  finalReport.value = report
  fseStore.setFinalReport(report)
  editingReport.value = false
}

const loadAIRecord = (record: AIRecord) => {
  selectedRecord.value = record
  repairGuide.value = record.guide
  finalReport.value = record.report
  
  // 如果有工单信息，也加载工单信息
  if (record.ticketNumber) {
    ticketNumber.value = record.ticketNumber
    ticketInfo.value = {
      ticketNumber: record.ticketNumber,
      ticketType: record.ticketType,
      userQuestion: '',
      description: '',
      ciInfo: '',
      timestamp: record.timestamp
    }
  }
}

const deleteAIRecord = (id: number) => {
  fseStore.deleteAIHistory(id)
  if (selectedRecord.value?.id === id) {
    selectedRecord.value = null
    repairGuide.value = ''
    finalReport.value = ''
  }
}

const clearAIHistory = () => {
  fseStore.clearAIHistory()
  selectedRecord.value = null
  repairGuide.value = ''
  finalReport.value = ''
}

const formatTime = (timestamp?: Date) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const renderedGuide = computed(() => {
  return marked(repairGuide.value || '')
})

const renderedReport = computed(() => {
  return marked(finalReport.value || '')
})

const toggleHistory = () => {
  isHistoryCollapsed.value = !isHistoryCollapsed.value
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const editorOptions = {
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean']
    ],
    syntax: true
  },
  placeholder: '请输入内容...',
  readOnly: false,
  debug: 'warn'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap');

.fse-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow: hidden;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.3s ease;
}

.fse-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #fff;
}

.history-sidebar {
  width: 320px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 24px 24px 0;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.05);
  height: calc(100vh - 48px);
}

.history-sidebar.collapsed {
  width: 60px;
}

.history-sidebar.hidden {
  display: none;
}

.history-header {
  padding: 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, rgba(248, 250, 252, 0.8), rgba(255, 255, 255, 0.8));
  border-radius: 0 24px 0 0;
  backdrop-filter: blur(12px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-right: 16px;
}

.header-content h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
  height: calc(100% - 72px); /* 减去header的高度 */
}

.history-list::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.history-list::-webkit-scrollbar-thumb {
  background-color: #94a3b8;
  border-radius: 2px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid transparent;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.95);
}

.history-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.history-content {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.record-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.record-title {
  font-weight: 600;
  color: #1e293b;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-question {
  color: #475569;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-height: 3em;
}

.record-time {
  font-size: 12px;
  color: #94a3b8;
}

.delete-btn {
  opacity: 0;
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  gap: 16px;
  max-height: calc(100vh - 48px);
  transition: all 0.3s ease;
}

.main-content.fullscreen {
  padding: 0;
  max-height: 100vh;
}

.main-content.fullscreen .search-bar {
  display: none;
}

.main-content.fullscreen .ticket-section {
  display: none;
}

.main-content.fullscreen .ai-content-container {
  height: 100vh;
  border-radius: 0;
  margin: 0;
}

.main-content.fullscreen .section-header {
  border-radius: 0;
}

.main-content.fullscreen .ai-content-wrapper {
  border-radius: 0;
}

.main-content.fullscreen .guide-content,
.main-content.fullscreen .report-content {
  padding: 32px;
  background: #fff;
}

.main-content.fullscreen .markdown-preview {
  max-width: 800px;
  margin: 0 auto;
}

.search-bar {
  display: inline-flex;
  align-items: center;
  margin-bottom: 16px;
  animation: slideDown 0.3s ease-out;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: fit-content;
  transition: all 0.3s ease;
}

.search-bar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.ticket-input {
  width: 240px;
}

.ticket-input :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  border-radius: 8px;
  padding: 8px 12px;
}

.ticket-input :deep(.el-input__inner) {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
}

.search-bar .el-button {
  margin-left: 8px;
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  border: none;
  color: white;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 14px;
}

.search-bar .el-button:hover {
  background: linear-gradient(135deg, #4338ca, #3730a3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

/* 输入框样式优化 */
:deep(.el-input__wrapper),
:deep(.el-textarea__wrapper) {
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  padding: 8px 12px;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__wrapper:hover) {
  border-color: rgba(79, 70, 229, 0.5);
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.1);
  transform: translateY(-1px);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__wrapper.is-focus) {
  border-color: #4f46e5;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  transform: translateY(-1px);
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: #1e293b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'Noto Sans SC', sans-serif;
}

:deep(.el-input__prefix),
:deep(.el-textarea__prefix) {
  color: #64748b;
}

:deep(.el-form-item__label) {
  color: #475569;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.5px;
  font-family: 'Noto Sans SC', sans-serif;
}

/* 选择器样式优化 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-select .el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.8);
}

:deep(.el-select-dropdown) {
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

:deep(.el-select-dropdown__item) {
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-family: 'Noto Sans SC', sans-serif;
}

:deep(.el-select-dropdown__item:hover) {
  background-color: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}

:deep(.el-select-dropdown__item.selected) {
  color: #4f46e5;
  font-weight: 600;
  background-color: rgba(79, 70, 229, 0.1);
}

/* 文本域样式优化 */
:deep(.el-textarea__inner) {
  min-height: 80px;
  line-height: 1.6;
  padding: 12px;
  font-family: 'Noto Sans SC', sans-serif;
}

/* 标题样式优化 */
.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, rgba(248, 250, 252, 0.8), rgba(255, 255, 255, 0.8));
  border-radius: 24px 24px 0 0;
  backdrop-filter: blur(12px);
}

.section-header h2,
.section-header h3 {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
}

/* 按钮文字样式优化 */
.action-btn,
.back-btn,
.view-report-btn,
.guide-actions .el-button {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 历史记录头部样式 */
.history-header {
  padding: 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to right, rgba(248, 250, 252, 0.8), rgba(255, 255, 255, 0.8));
  border-radius: 0 24px 0 0;
  backdrop-filter: blur(12px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-right: 16px;
}

.header-content h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
}

/* 编辑器按钮样式 */
.editor-wrapper {
  position: relative;
  height: calc(100vh - 300px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.editor-wrapper :deep(.ql-container) {
  height: calc(100% - 42px); /* 减去工具栏的高度 */
  overflow-y: auto;
  border: none;
  border-radius: 0 0 12px 12px;
  background: #fff;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #1e293b;
}

.editor-wrapper :deep(.ql-toolbar) {
  border: none;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  border-radius: 12px 12px 0 0;
  padding: 8px;
}

.editor-wrapper :deep(.ql-editor) {
  padding: 24px;
  min-height: 100%;
}

.editor-actions {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  z-index: 100;
}

.editor-actions .el-button {
  min-width: 120px;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.editor-actions .el-button--primary {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
  border: none;
  color: white;
}

.editor-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #4338ca, #3730a3);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
}

.editor-actions .el-button--default {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  backdrop-filter: blur(8px);
}

.editor-actions .el-button--default:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
}

/* 全屏模式下的编辑器按钮 */
.fse-container.fullscreen .editor-actions {
  bottom: 32px;
  right: 32px;
}

/* 编辑器滚动条样式 */
.editor-wrapper :deep(.ql-container::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

.editor-wrapper :deep(.ql-container::-webkit-scrollbar-track) {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 3px;
}

.editor-wrapper :deep(.ql-container::-webkit-scrollbar-thumb) {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.editor-wrapper :deep(.ql-container::-webkit-scrollbar-thumb:hover) {
  background: rgba(148, 163, 184, 0.8);
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow: hidden;
  max-height: calc(100vh - 180px);
}

.ticket-section,
.ai-content-container {
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.3s ease-out;
}

.ai-content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-content-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0 0 24px 24px;
}

.ai-content {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.guide-section,
.report-section {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s ease;
}

.guide-section {
  left: 0;
}

.report-section {
  left: 100%;
}

.ai-content.slide-left {
  transform: translateX(-100%);
}

.ai-content.slide-right {
  transform: translateX(0);
}

.guide-content,
.report-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%);
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
  position: relative;
  padding-bottom: 80px; /* 为底部按钮留出空间 */
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 240px;
}

.model-selector :deep(.el-select) {
  width: 180px;
}

.model-label {
  color: #64748b;
  font-size: 14px;
}

.ticket-form {
  padding: 24px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  padding: 14px 28px;
  border: none;
  color: white;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

/* 生成处理指南按钮 */
.action-btn:has(.el-icon-reading) {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
}

.action-btn:has(.el-icon-reading):hover {
  background: linear-gradient(135deg, #4338ca, #3730a3);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
}

/* 生成处理报告按钮 */
.action-btn:has(.el-icon-document) {
  background: linear-gradient(135deg, #10b981, #059669);
}

.action-btn:has(.el-icon-document):hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

/* 同步至工单系统按钮 */
.action-btn:has(.el-icon-upload) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.action-btn:has(.el-icon-upload):hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-btn .el-icon {
  font-size: 18px;
}

/* 视图切换按钮样式 */
.back-btn,
.view-report-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 15px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid;
}

.back-btn {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
}

.back-btn:hover {
  color: #4338ca;
  background: rgba(79, 70, 229, 0.15);
  border-color: rgba(79, 70, 229, 0.3);
}

.view-report-btn {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.view-report-btn:hover {
  color: #059669;
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
}

.view-report-btn .el-icon {
  margin-left: 8px;
}

/* 编辑和重新生成按钮样式 */
.guide-actions .el-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.guide-actions .el-button:has(.el-icon-edit) {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
}

.guide-actions .el-button:has(.el-icon-edit):hover {
  color: #4338ca;
  background: rgba(79, 70, 229, 0.15);
}

.guide-actions .el-button:has(.el-icon-refresh) {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.guide-actions .el-button:has(.el-icon-refresh):hover {
  color: #059669;
  background: rgba(16, 185, 129, 0.15);
}

/* 清空记录按钮样式 */
.header-content .el-button {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-weight: 600;
  transition: all 0.3s ease;
}

.header-content .el-button:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

/* 删除按钮样式 */
.delete-btn {
  opacity: 0;
  transition: all 0.3s ease;
  padding: 6px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

/* 折叠按钮样式 */
.collapse-btn {
  padding: 8px;
  border-radius: 8px;
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
  border: 1px solid rgba(79, 70, 229, 0.2);
  transition: all 0.3s ease;
}

.collapse-btn:hover {
  background: rgba(79, 70, 229, 0.15);
  border-color: rgba(79, 70, 229, 0.3);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 底部操作按钮 */
.bottom-actions {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 10;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 160px;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  padding: 12px 24px;
  border: none;
  color: white;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
}

/* 生成处理报告按钮 */
.action-btn:has(.el-icon-document) {
  background: linear-gradient(135deg, #10b981, #059669);
}

.action-btn:has(.el-icon-document):hover {
  background: linear-gradient(135deg, #059669, #047857);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}

/* 同步至工单系统按钮 */
.action-btn:has(.el-icon-upload) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.action-btn:has(.el-icon-upload):hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
}
</style> 