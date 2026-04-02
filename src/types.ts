export type Vec2 = {
  x: number
  y: number
}

export type PathPoint = {
  position: Vec2
  role: 'normal' | 'bundleJoinBoundary'
  bundleFollowDirection: number
  bundleOffsetSign: number
}

export type BundleLink = {
  segmentStartIndex: number
  segmentEndIndex: number
  otherPathIndex: number
  otherSegmentStartIndex: number
  otherSegmentEndIndex: number
}

export type PathEntry = {
  id: string
  routeId?: string
  label: string
  color: string
  points: PathPoint[]
  bundleLinks: BundleLink[]
}

export type EditorMode = 'pathCreation' | 'pathSelection'
export type ActiveEndpoint = 'start' | 'end'

export type SelectionState = {
  pathIndex: number
  vertexIndex: number
  segmentStartIndex: number
}

export type Viewport = {
  scale: number
  offset: Vec2
}

export type SnapResult = {
  snapped: boolean
  axis?: 'x' | 'y'
  value: number
  guideKind?: 'centerline' | 'bundleParallel'
  pathIndex?: number
  segmentStartIndex?: number
}

export type EditorSettings = {
  strokeWidth: number
  bundleGap: number
  routeColor: string
  bundleMode: boolean
}

export type DragState =
  | {
      kind: 'none'
    }
  | {
      kind: 'pan'
      pointerId: number
      startClient: Vec2
      startOffset: Vec2
    }
  | {
      kind: 'segment'
      pointerId: number
      pathIndex: number
      segmentStartIndex: number
      pointerOffset: number
    }
