import type {
  DrivingRemarkMarker,
  ELDDutyStatus,
  TimelineEvent,
  TimelineSegment,
} from '../types/eldTimeline'

type PlotPoint = {
  x: number
  y: number
}

type PlotPaths = {
  horizontalPath: string
  verticalPath: string
}

export const STATUS_ROW_INDEX: Record<ELDDutyStatus, number> = {
  off_duty: 0,
  sleeper_berth: 1,
  driving: 2,
  on_duty_not_driving: 3,
}

export function parseTimeToQuarter(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time)

  if (!match) {
    throw new Error(`Invalid time format: ${time}`)
  }

  const hour = Number(match[1])
  let minute = Number(match[2])

  if (!Number.isInteger(hour) || hour < 0 || hour > 24) {
    throw new Error(`Invalid hour: ${time}`)
  }

  // Tolerance: normalize non-quarter minutes to nearest quarter
  if (![0, 15, 30, 45].includes(minute)) {
    // Round to nearest quarter-hour
    const normalized = Math.round(minute / 15) * 15
    if (normalized === 60) {
      // Overflow: round down instead
      minute = 45
    } else {
      minute = normalized
    }
  }

  if (hour === 24 && minute !== 0) {
    throw new Error(`Invalid 24:xx time: ${time}`)
  }

  return hour * 4 + minute / 15
}

function formatQuarter(quarter: number): string {
  const hour = Math.floor(quarter / 4)
  const minute = (quarter % 4) * 15
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

export function normalizeEventsToSegments(events: TimelineEvent[]): TimelineSegment[] {
  if (events.length === 0) {
    return []
  }

  const sortedEvents = [...events].sort((a, b) => parseTimeToQuarter(a.time) - parseTimeToQuarter(b.time))
  const segments: TimelineSegment[] = []

  for (let index = 0; index < sortedEvents.length; index += 1) {
    const current = sortedEvents[index]
    const next = sortedEvents[index + 1]
    const startQuarter = parseTimeToQuarter(current.time)
    const endQuarter = next ? parseTimeToQuarter(next.time) : 96

    if (endQuarter <= startQuarter) {
      throw new Error(`Invalid timeline boundary at ${current.time}`)
    }

    const lastSegment = segments[segments.length - 1]
    if (lastSegment && lastSegment.status === current.status && lastSegment.endQuarter === startQuarter) {
      lastSegment.endQuarter = endQuarter
      if (!lastSegment.remark && current.remark) {
        lastSegment.remark = current.remark
      }
      continue
    }

    segments.push({
      startQuarter,
      endQuarter,
      status: current.status,
      city: current.city,
      remark: current.remark,
    })
  }

  return segments
}

function isDrivingStatus(status: ELDDutyStatus) {
  return status === 'driving'
}

function isNonDrivingStatus(status: ELDDutyStatus) {
  return status !== 'driving'
}

export function buildDrivingRemarkMarkers(segments: TimelineSegment[]): DrivingRemarkMarker[] {
  if (segments.length === 0) {
    return []
  }

  const markers: DrivingRemarkMarker[] = []

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index]
    const next = segments[index + 1]

    if (!isDrivingStatus(current.status) || !isNonDrivingStatus(next.status)) {
      continue
    }

    let returnIndex = -1
    for (let searchIndex = index + 2; searchIndex < segments.length; searchIndex += 1) {
      if (segments[searchIndex].status === 'driving') {
        returnIndex = searchIndex
        break
      }
    }

    if (returnIndex === -1) {
      markers.push({
        kind: 'line_only',
        startQuarter: current.endQuarter,
        endQuarter: next.startQuarter,
        city: next.city,
        remark: next.remark,
      })
      continue
    }

    const returnSegment = segments[returnIndex]
    markers.push({
      kind: 'boxed',
      startQuarter: current.endQuarter,
      endQuarter: returnSegment.startQuarter,
      city: next.city,
      remark: next.remark,
    })
  }

  return markers
}

export function buildTimelinePathPoints(
  segments: TimelineSegment[],
  getRowCenter: (status: ELDDutyStatus) => number,
  getQuarterX: (quarter: number) => number,
): PlotPoint[] {
  if (segments.length === 0) {
    return []
  }

  const points: PlotPoint[] = []

  const firstSegment = segments[0]
  points.push({ x: getQuarterX(firstSegment.startQuarter), y: getRowCenter(firstSegment.status) })

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const nextSegment = segments[index + 1]
    const endX = getQuarterX(segment.endQuarter)
    const currentY = getRowCenter(segment.status)

    points.push({ x: endX, y: currentY })

    if (nextSegment && nextSegment.status !== segment.status) {
      points.push({ x: endX, y: getRowCenter(nextSegment.status) })
    }
  }

  return points
}

export function buildTimelinePlotPaths(
  segments: TimelineSegment[],
  getRowCenter: (status: ELDDutyStatus) => number,
  getQuarterX: (quarter: number) => number,
): PlotPaths {
  if (segments.length === 0) {
    return { horizontalPath: '', verticalPath: '' }
  }

  const horizontalParts: string[] = []
  const verticalParts: string[] = []

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const nextSegment = segments[index + 1]
    const startX = getQuarterX(segment.startQuarter)
    const endX = getQuarterX(segment.endQuarter)
    const y = getRowCenter(segment.status)

    horizontalParts.push(`M ${startX} ${y} L ${endX} ${y}`)

    if (nextSegment && nextSegment.status !== segment.status) {
      verticalParts.push(`M ${endX} ${y} L ${endX} ${getRowCenter(nextSegment.status)}`)
    }
  }

  return {
    horizontalPath: horizontalParts.join(' '),
    verticalPath: verticalParts.join(' '),
  }
}

export function buildPathFromPoints(points: PlotPoint[]): string {
  if (points.length === 0) {
    return ''
  }

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function createPlotGridWidth(totalQuarters: number, quarterWidth: number): number {
  return totalQuarters * quarterWidth
}

export function createQuarterToTimeLabel(quarter: number): string {
  return formatQuarter(quarter)
}

/**
 * Inject continuity event at 00:00 if not already present.
 * - If day already has a real 00:00 event, use that (no synthetic injection).
 * - Otherwise, inject synthetic 00:00 with provided startStatus.
 * - Day 1 default start status: 'off_duty'
 * - Day N (N > 1) default start status: derived from previous day's last event status
 */
export function injectContinuityEvent(
  events: TimelineEvent[],
  startStatus: ELDDutyStatus,
): TimelineEvent[] {
  if (events.length === 0) {
    return [{ time: '00:00', status: startStatus }]
  }

  // Check if 00:00 event already exists
  const hasStartEvent = events.some((e) => e.time === '00:00')

  if (hasStartEvent) {
    // Trust the real 00:00 event; return as-is
    return events
  }

  // Inject synthetic 00:00 with startStatus
  return [{ time: '00:00', status: startStatus }, ...events]
}

/**
 * Extract the final status from a day's events.
 * Used to derive the start status for the next day.
 */
export function getLastEventStatus(events: TimelineEvent[]): ELDDutyStatus {
  if (events.length === 0) {
    return 'off_duty'
  }

  // Sort by time to find the last event chronologically
  const sorted = [...events].sort((a, b) => parseTimeToQuarter(a.time) - parseTimeToQuarter(b.time))
  return sorted[sorted.length - 1].status
}

/**
 * Apply continuity injection to all days in a timeline.
 * Returns a new array of days with synthetic 00:00 events injected where needed.
 */
export function applyGlobalContinuity(timelineDays: any[]): any[] {
  if (!timelineDays || timelineDays.length === 0) {
    return []
  }

  return timelineDays.map((day, dayIndex) => {
    const isFirstDay = dayIndex === 0
    let startStatus: ELDDutyStatus

    if (isFirstDay) {
      startStatus = 'off_duty'
    } else {
      const previousDay = timelineDays[dayIndex - 1]
      startStatus = getLastEventStatus(previousDay.events || [])
    }

    const eventsWithContinuity = injectContinuityEvent(day.events || [], startStatus)

    return {
      ...day,
      events: eventsWithContinuity,
    }
  })
}
