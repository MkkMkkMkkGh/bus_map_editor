import type { PathEntry, SelectionState, Vec2 } from '../types'
import { pointAt, pointCount, squaredDistanceToSegment } from './pathGeometry'
import { vec } from './vector'

const PATH_SELECTION_PADDING = 10
const VERTEX_SELECTION_RADIUS = 16
const VERTEX_PRIORITY_RADIUS = 8

export function hasSelectedSegment(paths: PathEntry[], selection: SelectionState) {
  const entry = paths[selection.pathIndex]
  return !!entry && selection.segmentStartIndex >= 0 && selection.segmentStartIndex < pointCount(entry) - 1
}

export function isSelectedVertexEndpoint(paths: PathEntry[], selection: SelectionState) {
  const entry = paths[selection.pathIndex]
  if (!entry || pointCount(entry) === 0) return false
  return selection.vertexIndex === 0 || selection.vertexIndex === pointCount(entry) - 1
}

export function findPathIndexAtPosition(paths: PathEntry[], position: Vec2, strokeWidth: number) {
  let bestIndex = -1
  let bestDistanceSquared = (strokeWidth + PATH_SELECTION_PADDING) ** 2

  paths.forEach((entry, pathIndex) => {
    if (entry.points.length === 1) {
      const distanceSquared = vec.distanceSquared(position, entry.points[0].position)
      if (distanceSquared <= bestDistanceSquared) {
        bestIndex = pathIndex
        bestDistanceSquared = distanceSquared
      }
      return
    }

    for (let pointIndex = 0; pointIndex < entry.points.length - 1; pointIndex += 1) {
      const distanceSquared = squaredDistanceToSegment(
        position,
        pointAt(entry, pointIndex),
        pointAt(entry, pointIndex + 1),
      )
      if (distanceSquared <= bestDistanceSquared) {
        bestIndex = pathIndex
        bestDistanceSquared = distanceSquared
      }
    }
  })

  return bestIndex
}

export function findSegmentStartIndexAtPosition(entry: PathEntry, position: Vec2, strokeWidth: number) {
  let bestIndex = -1
  let bestDistanceSquared = (strokeWidth + PATH_SELECTION_PADDING) ** 2

  for (let pointIndex = 0; pointIndex < entry.points.length - 1; pointIndex += 1) {
    const distanceSquared = squaredDistanceToSegment(position, pointAt(entry, pointIndex), pointAt(entry, pointIndex + 1))
    if (distanceSquared <= bestDistanceSquared) {
      bestIndex = pointIndex
      bestDistanceSquared = distanceSquared
    }
  }

  return bestIndex
}

export function findVertexIndexWithinRadius(entry: PathEntry, position: Vec2, radius: number) {
  let bestIndex = -1
  let bestDistanceSquared = radius * radius
  entry.points.forEach((point, pointIndex) => {
    const distanceSquared = vec.distanceSquared(position, point.position)
    if (distanceSquared <= bestDistanceSquared) {
      bestIndex = pointIndex
      bestDistanceSquared = distanceSquared
    }
  })
  return bestIndex
}

export function findVertexIndexAtPosition(entry: PathEntry, position: Vec2) {
  return findVertexIndexWithinRadius(entry, position, VERTEX_SELECTION_RADIUS)
}

export function resolveSelection(
  paths: PathEntry[],
  position: Vec2,
  current: SelectionState,
  strokeWidth: number,
): SelectionState {
  if (current.pathIndex < 0) {
    return {
      pathIndex: findPathIndexAtPosition(paths, position, strokeWidth),
      vertexIndex: -1,
      segmentStartIndex: -1,
    }
  }

  const entry = paths[current.pathIndex]
  if (!entry) return { pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 }

  const segmentIndex = findSegmentStartIndexAtPosition(entry, position, strokeWidth)
  const vertexIndex =
    segmentIndex >= 0
      ? findVertexIndexWithinRadius(entry, position, VERTEX_PRIORITY_RADIUS)
      : findVertexIndexAtPosition(entry, position)

  if (vertexIndex >= 0) {
    return { pathIndex: current.pathIndex, vertexIndex, segmentStartIndex: -1 }
  }
  if (segmentIndex >= 0) {
    return { pathIndex: current.pathIndex, vertexIndex: -1, segmentStartIndex: segmentIndex }
  }

  return {
    pathIndex: findPathIndexAtPosition(paths, position, strokeWidth),
    vertexIndex: -1,
    segmentStartIndex: -1,
  }
}
