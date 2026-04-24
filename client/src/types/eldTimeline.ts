export type ELDDutyStatus =
  | 'off_duty'
  | 'sleeper_berth'
  | 'driving'
  | 'on_duty_not_driving'

export type TimelineEvent = {
  time: string
  status: ELDDutyStatus
  city?: string
  remark?: string
}

export type TimelineSegment = {
  startQuarter: number
  endQuarter: number
  status: ELDDutyStatus
  city?: string
  remark?: string
}

export type DrivingRemarkMarker = {
  kind: 'boxed' | 'line_only'
  startQuarter: number
  endQuarter: number
  city?: string
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
  { time: '00:00', status: 'off_duty', city: 'Depot', remark: 'Off shift' },
  { time: '06:00', status: 'on_duty_not_driving', city: 'Green Bay, WI', remark: 'Pre-trip inspection' },
  { time: '06:45', status: 'driving', city: 'Green Bay, WI', remark: 'Depart terminal' },
  { time: '11:30', status: 'on_duty_not_driving', city: 'Fond du Lac, WI', remark: 'Fuel stop' },
  { time: '12:00', status: 'sleeper_berth', city: 'Fond du Lac, WI', remark: '30 min break' },
  { time: '12:45', status: 'driving', city: 'Fond du Lac, WI', remark: 'Resume route' },
  { time: '18:15', status: 'off_duty', city: 'Edwardsville, IL', remark: 'End of day' },
]
