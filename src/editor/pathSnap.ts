import type { PathEntry, SnapResult } from '../types'
import { isSegmentHorizontal, pointAt, snapPointToAxis } from './pathGeometry'

type SnapRange = {
  pathIndex: number
  startIndex: number
  endIndex: number
}

type SnapGuide = {
  axis: 'x' | 'y'
  value: number
  kind: 'centerline' | 'bundleParallel'
  pathIndex: number
  segmentStartIndex: number
}

function isSegmentExcluded(pathIndex: number, segmentStartIndex: number, excludeRanges?: SnapRange[]) {
  return excludeRanges?.some(
    (range) =>
      range.pathIndex === pathIndex &&
      segmentStartIndex >= range.startIndex &&
      segmentStartIndex <= range.endIndex,
  )
}

function collectGuides(paths: PathEntry[], bundleGap: number, excludeRanges?: SnapRange[]) {
  const guides: SnapGuide[] = []

  paths.forEach((entry, pathIndex) => {
    for (let segmentStartIndex = 0; segmentStartIndex < entry.points.length - 1; segmentStartIndex += 1) {
      if (isSegmentExcluded(pathIndex, segmentStartIndex, excludeRanges)) continue
      const point = pointAt(entry, segmentStartIndex)
      if (isSegmentHorizontal(entry, segmentStartIndex)) {
        guides.push({ axis: 'y', value: point.y, kind: 'centerline', pathIndex, segmentStartIndex })
        guides.push({ axis: 'y', value: point.y + bundleGap, kind: 'bundleParallel', pathIndex, segmentStartIndex })
        guides.push({ axis: 'y', value: point.y - bundleGap, kind: 'bundleParallel', pathIndex, segmentStartIndex })
      } else {
        guides.push({ axis: 'x', value: point.x, kind: 'centerline', pathIndex, segmentStartIndex })
        guides.push({ axis: 'x', value: point.x + bundleGap, kind: 'bundleParallel', pathIndex, segmentStartIndex })
        guides.push({ axis: 'x', value: point.x - bundleGap, kind: 'bundleParallel', pathIndex, segmentStartIndex })
      }
    }
  })

  return guides
}

function snapAxis(
  paths: PathEntry[],
  bundleGap: number,
  axis: 'x' | 'y',
  rawValue: number,
  threshold: number,
  excludeRanges?: SnapRange[],
): SnapResult {
  const guides = collectGuides(paths, bundleGap, excludeRanges)
  let bestGuide: SnapGuide | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  guides.forEach((guide) => {
    if (guide.axis !== axis) return

    const distance = Math.abs(guide.value - rawValue)
    const guideThreshold = guide.kind === 'centerline' ? threshold : Math.max(4, threshold * 0.5)
    const priority = guide.kind === 'centerline' ? 2 : 1
    const bestPriority = bestGuide?.kind === 'centerline' ? 2 : 1

    if (
      distance <= guideThreshold &&
      (distance < bestDistance - 0.001 ||
        (Math.abs(distance - bestDistance) <= 0.001 && priority > bestPriority))
    ) {
      bestDistance = distance
      bestGuide = guide
    }
  })

  if (!bestGuide) {
    return { snapped: false, axis, value: rawValue }
  }

  return {
    snapped: true,
    axis: bestGuide.axis,
    value: bestGuide.value,
    guideKind: bestGuide.kind,
    pathIndex: bestGuide.pathIndex,
    segmentStartIndex: bestGuide.segmentStartIndex,
  }
}

export function snapSingleSegmentEndpoint(
  paths: PathEntry[],
  bundleGap: number,
  anchor: { x: number; y: number },
  point: { x: number; y: number },
  threshold: number,
  excludeRanges?: SnapRange[],
): [{ x: number; y: number }, SnapResult] {
  const deltaX = Math.abs(point.x - anchor.x)
  const deltaY = Math.abs(point.y - anchor.y)

  if (deltaX >= deltaY) {
    const result = snapAxis(paths, bundleGap, 'x', point.x, threshold, excludeRanges)
    return [{ x: result.value, y: anchor.y }, result]
  }

  const result = snapAxis(paths, bundleGap, 'y', point.y, threshold, excludeRanges)
  return [{ x: anchor.x, y: result.value }, result]
}

export function snapOrthogonalPoint(
  paths: PathEntry[],
  bundleGap: number,
  anchor: { x: number; y: number },
  point: { x: number; y: number },
  threshold: number,
  excludeRanges?: SnapRange[],
): { x: number; y: number } {
  const axisAligned = snapPointToAxis(anchor, point)
  if (Math.abs(point.x - anchor.x) >= Math.abs(point.y - anchor.y)) {
    const result = snapAxis(paths, bundleGap, 'y', axisAligned.y, threshold, excludeRanges)
    return { x: axisAligned.x, y: result.value }
  }

  const result = snapAxis(paths, bundleGap, 'x', axisAligned.x, threshold, excludeRanges)
  return { x: result.value, y: axisAligned.y }
}

export function snapAxisValue(
  paths: PathEntry[],
  bundleGap: number,
  axis: 'x' | 'y',
  rawValue: number,
  threshold: number,
  excludeRanges?: SnapRange[],
) {
  return snapAxis(paths, bundleGap, axis, rawValue, threshold, excludeRanges)
}
