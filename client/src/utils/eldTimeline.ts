import type { ELDDutyStatus, TimelineEvent, TimelineSegment } from '../types/eldTimeline'

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
  const minute = Number(match[2])

  if (!Number.isInteger(hour) || hour < 0 || hour > 24) {
    throw new Error(`Invalid hour: ${time}`)
  }

  if (![0, 15, 30, 45].includes(minute)) {
    throw new Error(`Invalid minute increment: ${time}`)
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
      remark: current.remark,
    })
  }

  return segments
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
