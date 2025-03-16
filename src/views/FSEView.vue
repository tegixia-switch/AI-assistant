<template>
  <div class="fse-container">
    <!-- 左侧历史记录 -->
    <div class="history-sidebar">
      <div class="history-header">
        <h3>历史记录</h3>
        <el-button
          v-if="aiHistory.length > 0"
          type="danger"
          size="small"
          plain
          @click="clearAIHistory"
        >
          <el-icon><Delete /></el-icon>
          清空记录
        </el-button>
      </div>
      <div class="history-list">
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
    <div class="main-content">
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
        <!-- 左侧内容 -->
        <div class="left-content">
          <!-- 工单详情 -->
          <div class="ticket-section" v-if="ticketInfo">
            <div class="section-header">
              <div class="header-left">
                <h2>工单详情</h2>
                <el-tag :type="getTicketTypeTag(ticketInfo.ticketType)">
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
              <el-form label-position="top" :model="ticketInfo">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="问题类型">
                      <el-select v-model="ticketInfo.ticketType" class="full-width">
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
                    <el-form-item label="CI 信息">
                      <el-input v-model="ticketInfo.ciInfo" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="用户问题">
                  <el-input
                    v-model="ticketInfo.userQuestion"
                    type="textarea"
                    :rows="3"
                    resize="none"
                  />
                </el-form-item>

                <el-form-item label="问题描述">
                  <el-input
                    v-model="ticketInfo.description"
                    type="textarea"
                    :rows="4"
                    resize="none"
                  />
                </el-form-item>

                <div class="action-row">
                  <el-button
                    type="primary"
                    class="action-btn"
                    @click="generateGuide"
                    :loading="generatingGuide"
                  >
                    <el-icon><Reading /></el-icon>
                    生成处理指南
                  </el-button>

                  <el-button
                    type="success"
                    class="action-btn"
                    @click="generateReport"
                    :loading="generatingReport"
                  >
                    <el-icon><Document /></el-icon>
                    生成处理报告
                  </el-button>

                  <el-button
                    type="warning"
                    class="action-btn"
                    @click="syncToTicket"
                    :loading="syncing"
                  >
                    <el-icon><Upload /></el-icon>
                    同步至工单系统
                  </el-button>
                </div>
              </el-form>
            </div>
          </div>

          <!-- AI 处理指南 -->
          <div class="guide-section" v-if="repairGuide">
            <div class="section-header">
              <h3>AI 处理指南</h3>
              <div class="guide-actions">
                <el-button type="primary" link @click="editGuide">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button type="primary" link @click="regenerateGuide">
                  <el-icon><Refresh /></el-icon>
                  重新生成
                </el-button>
              </div>
            </div>
            <div class="guide-content">
              <div v-if="!editingGuide" class="markdown-preview" v-html="renderedGuide"></div>
              <div v-else class="editor-wrapper">
                <QuillEditor
                  v-model:content="editedGuide"
                  contentType="html"
                  theme="snow"
                  toolbar="full"
                  :options="{
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
                  }"
                />
                <div class="editor-actions">
                  <el-button type="primary" @click="saveGuide">完成</el-button>
                  <el-button @click="editingGuide = false">取消</el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div class="empty-state" v-else>
            <el-icon><Document /></el-icon>
            <p>请输入工单号获取工单信息</p>
          </div>
        </div>

        <!-- 右侧处理报告 -->
        <div class="right-content" v-if="finalReport">
          <div class="section-header">
            <h3>处理报告</h3>
            <div class="report-actions">
              <el-button type="primary" link @click="editReport">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="primary" link @click="regenerateReport">
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
            </div>
          </div>
          <div class="report-content">
            <div v-if="!editingReport" class="markdown-preview" v-html="renderedReport"></div>
            <div v-else class="editor-wrapper">
              <QuillEditor
                v-model:content="editedReport"
                contentType="html"
                theme="snow"
                toolbar="full"
                :options="{
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
                }"
              />
              <div class="editor-actions">
                <el-button type="primary" @click="saveReport">完成</el-button>
                <el-button @click="editingReport = false">取消</el-button>
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
  Edit
} from '@element-plus/icons-vue'
import type { TicketInfo, AIRecord } from '../types/fse'
import { useFSEStore } from '../stores/fseStore'
import { marked } from 'marked'

const fseStore = useFSEStore()
const loading = ref(false)
const generatingGuide = ref(false)
const generatingReport = ref(false)
const syncing = ref(false)
const ticketNumber = ref('')
const ticketInfo = ref<TicketInfo | null>(null)
const repairGuide = ref('')
const finalReport = ref('')
const editingGuide = ref(false)
const editedGuide = ref('')
const editingReport = ref(false)
const editedReport = ref('')
const selectedModel = ref('GPT-4')
const selectedRecord = ref<AIRecord | null>(null)

const availableModels = ['GPT-3.5', 'GPT-4', 'Claude-3']
const ticketTypes = computed(() => fseStore.ticketTypes)
const aiHistory = computed(() => fseStore.aiHistory)

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

const generateGuide = async () => {
  if (!ticketInfo.value) return
  
  generatingGuide.value = true
  try {
    // TODO: 实现实际的API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const guide = '1. 检查服务器电源连接\n2. 验证硬件组件状态\n3. 检查系统日志\n4. 尝试重启服务器'
    fseStore.setRepairGuide(guide)
    repairGuide.value = guide

    // 保存历史记录
    const record: AIRecord = {
      id: Date.now(),
      ticketNumber: ticketInfo.value.ticketNumber,
      ticketType: ticketInfo.value.ticketType,
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
      guide: repairGuide.value || '',
      report: report,
      timestamp: new Date()
    }
    fseStore.addAIHistory(record)
    selectedRecord.value = record

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
</script>

<style scoped>
.fse-container {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
  overflow: hidden;
}

.history-sidebar {
  width: 300px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.history-item:hover {
  background-color: #f5f7fa;
}

.history-item.active {
  background-color: #ecf5ff;
}

.history-content {
  flex: 1;
  min-width: 0;
}

.record-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.record-title {
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-time {
  font-size: 12px;
  color: #909399;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
  gap: 24px;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.ticket-input {
  width: 300px;
}

.content-wrapper {
  display: flex;
  gap: 24px;
  flex: 1;
  overflow: hidden;
}

.left-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.right-content {
  width: 400px;
  flex-shrink: 0;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.report-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.report-content .markdown-preview {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.ticket-section,
.guide-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2,
.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
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
  color: #606266;
  font-size: 14px;
}

.ticket-form {
  padding: 24px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.guide-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

.guide-content {
  padding: 24px;
}

.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-history {
  text-align: center;
  color: #909399;
  padding: 24px;
}

@media screen and (max-width: 768px) {
  .fse-container {
    flex-direction: column;
  }

  .history-sidebar {
    width: 100%;
    height: 200px;
  }

  .search-bar {
    flex-direction: column;
  }

  .ticket-input {
    width: 100%;
  }

  .action-row {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}

:deep(.ql-container) {
  height: 300px !important;
  max-height: 300px !important;
}

:deep(.ql-editor) {
  height: 300px !important;
  max-height: 300px !important;
}
</style> 