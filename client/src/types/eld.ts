export type ELDDutyStatus = 'off_duty' | 'sleeper' | 'driving' | 'on_duty'

export type ELDLogEvent = {
  time: string
  status: ELDDutyStatus
  location: string
  note?: string
}

export type ELDDailyLog = {
  date: string
  driverName: string
  carrierName: string
  truckNumber: string
  trailerNumber: string
  coDriverName?: string
  events: ELDLogEvent[]
}
