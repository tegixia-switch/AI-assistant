export interface TicketInfo {
  ticketNumber: string
  userQuestion: string
  ticketType: string
  description: string
  ciInfo: string
  timestamp?: Date
}

export interface AIRecord {
  id: number
  ticketNumber: string
  ticketType: string
  guide: string
  report: string
  timestamp: Date
}

export interface FSEState {
  ticketInfo: TicketInfo | null
  ticketTypes: string[]
  repairGuide: string
  finalReport: string
  ticketHistory: TicketInfo[]
  aiHistory: AIRecord[]
} 