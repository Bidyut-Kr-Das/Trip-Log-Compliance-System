export type ELDDutyStatus =
  | 'off_duty'
  | 'sleeper_berth'
  | 'driving'
  | 'on_duty_not_driving'

export type TimelineEvent = {
  time: string
  status: ELDDutyStatus
  remark?: string
}

export type TimelineSegment = {
  startQuarter: number
  endQuarter: number
  status: ELDDutyStatus
  remark?: string
}

export type ELDTimeline = {
  date: string
  timezone: string
  source: 'manual' | 'eld' | 'imported'
  segments: TimelineSegment[]
  remarks?: string[]
}

export const EXAMPLE_TIMELINE_EVENTS: TimelineEvent[] = [
  { time: '00:00', status: 'off_duty', remark: 'Off shift' },
  { time: '06:00', status: 'on_duty_not_driving', remark: 'Pre-trip inspection' },
  { time: '06:45', status: 'driving', remark: 'Depart terminal' },
  { time: '11:30', status: 'on_duty_not_driving', remark: 'Fuel stop' },
  { time: '12:00', status: 'sleeper_berth', remark: 'Break' },
  { time: '12:45', status: 'driving', remark: 'Resume route' },
  { time: '18:15', status: 'off_duty', remark: 'End of day' },
]
