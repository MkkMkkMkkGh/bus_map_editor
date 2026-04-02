import type { PathEntry, PathPoint, Vec2 } from '../types'
import { vec } from './vector'

export function createPoint(position: Vec2): PathPoint {
  return {
    position,
    role: 'normal',
    bundleFollowDirection: 0,
    bundleOffsetSign: 0,
  }
}

export function createBundleJoinBoundary(
  position: Vec2,
  followDirection: number,
  offsetSign: number,
): PathPoint {
  return {
    position,
    role: 'bundleJoinBoundary',
    bundleFollowDirection: followDirection,
    bundleOffsetSign: offsetSign,
  }
}

export function createEntry(label: string, color: string, routeId?: string): PathEntry {
  return {
    id: `${label}-${Math.random().toString(36).slice(2, 9)}`,
    routeId,
    label,
    color,
    points: [],
    bundleLinks: [],
  }
}

export function pointCount(entry: PathEntry): number {
  return entry.points.length
}

export function isEmpty(entry: PathEntry): boolean {
  return entry.points.length === 0
}

export function firstPoint(entry: PathEntry): Vec2 {
  return entry.points[0].position
}

export function lastPoint(entry: PathEntry): Vec2 {
  return entry.points[entry.points.length - 1].position
}

export function pointAt(entry: PathEntry, index: number): Vec2 {
  return entry.points[index].position
}

export function setPointPosition(entry: PathEntry, index: number, position: Vec2) {
  entry.points[index].position = position
}

export function isSegmentHorizontal(entry: PathEntry, segmentStartIndex: number): boolean {
  const start = pointAt(entry, segmentStartIndex)
  const end = pointAt(entry, segmentStartIndex + 1)
  return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
}

export function segmentDirection(entry: PathEntry, segmentStartIndex: number): Vec2 {
  const start = pointAt(entry, segmentStartIndex)
  const end = pointAt(entry, segmentStartIndex + 1)
  const delta = vec.sub(end, start)

  if (Math.abs(delta.x) >= Math.abs(delta.y)) {
    return vec.xy(delta.x >= 0 ? 1 : -1, 0)
  }

  return vec.xy(0, delta.y >= 0 ? 1 : -1)
}

export function squaredDistanceToSegment(point: Vec2, a: Vec2, b: Vec2): number {
  const ab = vec.sub(b, a)
  const abLengthSquared = vec.lengthSquared(ab)
  if (abLengthSquared === 0) {
    return vec.distanceSquared(point, a)
  }

  const ap = vec.sub(point, a)
  const t = Math.max(0, Math.min(1, vec.dot(ap, ab) / abLengthSquared))
  const closest = vec.add(a, vec.scale(ab, t))
  return vec.distanceSquared(point, closest)
}

export function snapPointToAxis(anchor: Vec2, point: Vec2): Vec2 {
  const delta = vec.sub(point, anchor)
  if (Math.abs(delta.x) >= Math.abs(delta.y)) {
    return vec.xy(point.x, anchor.y)
  }
  return vec.xy(anchor.x, point.y)
}

export function areSegmentsCollinear(entry: PathEntry, firstIndex: number, secondIndex: number): boolean {
  if (
    firstIndex < 0 ||
    secondIndex < 0 ||
    firstIndex >= pointCount(entry) - 1 ||
    secondIndex >= pointCount(entry) - 1
  ) {
    return false
  }

  const firstHorizontal = isSegmentHorizontal(entry, firstIndex)
  if (isSegmentHorizontal(entry, secondIndex) !== firstHorizontal) {
    return false
  }

  const first = pointAt(entry, firstIndex)
  const second = pointAt(entry, secondIndex)
  return firstHorizontal
    ? Math.abs(first.y - second.y) < 0.001
    : Math.abs(first.x - second.x) < 0.001
}

export function getCollinearRunBounds(entry: PathEntry, segmentStartIndex: number): [number, number] {
  if (segmentStartIndex < 0 || segmentStartIndex >= pointCount(entry) - 1) {
    return [0, 0]
  }

  let start = segmentStartIndex
  while (start > 0 && areSegmentsCollinear(entry, start - 1, start)) {
    start -= 1
  }

  let end = segmentStartIndex
  while (end + 1 < pointCount(entry) - 1 && areSegmentsCollinear(entry, end, end + 1)) {
    end += 1
  }

  return [start, end]
}

export function upsertBundleLink(
  entry: PathEntry,
  segmentStartIndex: number,
  otherPathIndex: number,
  otherSegmentStartIndex: number,
  otherSegmentEndIndex: number,
): [number, number] {
  const [runStart, runEnd] = getCollinearRunBounds(entry, segmentStartIndex)

  entry.bundleLinks = entry.bundleLinks.filter((link) => {
    const overlapsRun = link.segmentStartIndex <= runEnd && link.segmentEndIndex >= runStart
    return !(link.otherPathIndex === otherPathIndex && overlapsRun)
  })

  entry.bundleLinks.push({
    segmentStartIndex: runStart,
    segmentEndIndex: runEnd,
    otherPathIndex,
    otherSegmentStartIndex,
    otherSegmentEndIndex,
  })

  return [runStart, runEnd]
}

export function hasBundleLink(entry: PathEntry, segmentStartIndex: number): boolean {
  return entry.bundleLinks.some(
    (link) => segmentStartIndex >= link.segmentStartIndex && segmentStartIndex <= link.segmentEndIndex,
  )
}

function canRemoveIntermediatePoint(entry: PathEntry, pointIndex: number): boolean {
  const totalPoints = pointCount(entry)
  if (pointIndex <= 0 || pointIndex >= totalPoints - 1) {
    return false
  }

  const point = entry.points[pointIndex]
  if (point.role === 'bundleJoinBoundary') {
    return false
  }

  const previous = pointAt(entry, pointIndex - 1)
  const current = pointAt(entry, pointIndex)
  const next = pointAt(entry, pointIndex + 1)

  const previousEqualsCurrent = vec.distanceSquared(previous, current) < 0.001
  const currentEqualsNext = vec.distanceSquared(current, next) < 0.001
  if (previousEqualsCurrent || currentEqualsNext) {
    return true
  }

  const incomingHorizontal = Math.abs(previous.y - current.y) < 0.001
  const outgoingHorizontal = Math.abs(current.y - next.y) < 0.001
  if (incomingHorizontal !== outgoingHorizontal) {
    return false
  }

  if (incomingHorizontal) {
    return Math.abs(previous.y - next.y) < 0.001
  }

  return Math.abs(previous.x - next.x) < 0.001
}

export function normalizeEntry(entry: PathEntry) {
  let index = 1
  while (index < entry.points.length - 1) {
    if (canRemoveIntermediatePoint(entry, index)) {
      entry.points.splice(index, 1)
      continue
    }
    index += 1
  }
}

export function buildPathData(entry: PathEntry): string {
  const points = entry.points.map((point) => point.position)
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  return `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')}`
}

export function buildSegmentPathData(entry: PathEntry, segmentStartIndex: number): string {
  const a = pointAt(entry, segmentStartIndex)
  const b = pointAt(entry, segmentStartIndex + 1)
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
}
