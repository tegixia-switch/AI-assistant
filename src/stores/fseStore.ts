import { defineStore } from 'pinia'
import type { FSEState, TicketInfo, AIRecord } from '../types/fse'

export const useFSEStore = defineStore('fse', {
  state: (): FSEState => ({
    ticketInfo: null,
    ticketTypes: ['硬件故障', '软件问题', '网络问题', '系统配置'],
    repairGuide: '',
    finalReport: '',
    ticketHistory: [],
    aiHistory: []
  }),

  getters: {
    getTicketById: (state) => {
      return (ticketNumber: string) => state.ticketHistory.find((item) => item.ticketNumber === ticketNumber)
    },
    getAIRecordById: (state) => {
      return (id: number) => state.aiHistory.find((item) => item.id === id)
    }
  },

  actions: {
    setTicketInfo(info: TicketInfo) {
      this.ticketInfo = info
      // 添加到历史记录
      const existingIndex = this.ticketHistory.findIndex(item => item.ticketNumber === info.ticketNumber)
      if (existingIndex !== -1) {
        // 更新现有记录
        this.ticketHistory[existingIndex] = {
          ...info,
          timestamp: new Date()
        }
      } else {
        // 添加新记录
        this.ticketHistory.unshift({
          ...info,
          timestamp: new Date()
        })
      }
    },

    setRepairGuide(guide: string) {
      this.repairGuide = guide
      if (this.ticketInfo) {
        this.addOrUpdateAIRecord()
      }
    },

    setFinalReport(report: string) {
      this.finalReport = report
      if (this.ticketInfo) {
        this.addOrUpdateAIRecord()
      }
    },

    addOrUpdateAIRecord() {
      if (!this.ticketInfo) return

      const existingIndex = this.aiHistory.findIndex(
        item => item.ticketNumber === this.ticketInfo?.ticketNumber
      )

      const record: AIRecord = {
        id: Date.now(),
        ticketNumber: this.ticketInfo.ticketNumber,
        ticketType: this.ticketInfo.ticketType,
        guide: this.repairGuide,
        report: this.finalReport,
        timestamp: new Date()
      }

      if (existingIndex !== -1) {
        // 更新现有记录，但保持原始 ID
        record.id = this.aiHistory[existingIndex].id
        this.aiHistory[existingIndex] = record
      } else {
        this.aiHistory.unshift(record)
      }
    },

    deleteTicketHistory(ticketNumber: string) {
      const index = this.ticketHistory.findIndex(item => item.ticketNumber === ticketNumber)
      if (index !== -1) {
        this.ticketHistory.splice(index, 1)
        if (this.ticketInfo?.ticketNumber === ticketNumber) {
          this.ticketInfo = null
          this.repairGuide = ''
          this.finalReport = ''
        }
      }
    },

    deleteAIHistory(id: number) {
      const index = this.aiHistory.findIndex(item => item.id === id)
      if (index !== -1) {
        this.aiHistory.splice(index, 1)
      }
    },

    clearTicketHistory() {
      this.ticketHistory = []
      this.ticketInfo = null
      this.repairGuide = ''
      this.finalReport = ''
    },

    clearAIHistory() {
      this.aiHistory = []
      this.repairGuide = ''
      this.finalReport = ''
    },

    addAIHistory(record: AIRecord) {
      // 检查是否已存在相同工单号的记录
      const existingIndex = this.aiHistory.findIndex(r => r.ticketNumber === record.ticketNumber)
      if (existingIndex !== -1) {
        // 如果存在，更新该记录
        this.aiHistory[existingIndex] = record
      } else {
        // 如果不存在，添加新记录
        this.aiHistory.unshift(record)
      }
    }
  }
}) 