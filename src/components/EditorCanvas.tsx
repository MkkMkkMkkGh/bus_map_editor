import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import {
  buildPathData,
  buildSegmentPathData,
  hasBundleLink,
} from '../editor/pathGeometry'
import { toWorld } from '../editor/useBusMapEditor'
import type { DragState, PathEntry, Vec2, Viewport } from '../types'

type Props = {
  canvasWidth: number
  canvasHeight: number
  viewport: Viewport
  paths: PathEntry[]
  selectedPathIndex: number
  selectedVertexIndex: number
  selectedSegmentStartIndex: number
  strokeWidth: number
  bundleGap: number
  preview: { start: Vec2; end: Vec2; bundle: boolean } | null
  snapGuide: { axis: 'x' | 'y'; value: number; pathIndex: number } | null
  drag: DragState
  onCreatePoint: (world: Vec2) => void
  onPreviewPoint: (world: Vec2) => void
  onBeginPan: (pointerId: number, client: Vec2) => void
  onUpdatePan: (pointerId: number, client: Vec2) => void
  onBeginSelectionDrag: (pointerId: number, world: Vec2) => void
  onUpdateDrag: (pointerId: number, world: Vec2) => void
  onEndDrag: (pointerId: number) => void
  onZoom: (screen: Vec2, deltaY: number) => void
  createMode: boolean
}

export function EditorCanvas({
  canvasWidth,
  canvasHeight,
  viewport,
  paths,
  selectedPathIndex,
  selectedVertexIndex,
  selectedSegmentStartIndex,
  strokeWidth,
  bundleGap,
  preview,
  snapGuide,
  drag,
  onCreatePoint,
  onPreviewPoint,
  onBeginPan,
  onUpdatePan,
  onBeginSelectionDrag,
  onUpdateDrag,
  onEndDrag,
  onZoom,
  createMode,
}: Props) {
  const frameRef = useRef<number | null>(null)
  const pendingMoveRef = useRef<{ pointerId: number; world: Vec2; mode: 'create' | 'edit' } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const getPoint = (event: ReactPointerEvent<SVGSVGElement> | ReactWheelEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const scheduleMove = (pointerId: number, world: Vec2, mode: 'create' | 'edit') => {
    pendingMoveRef.current = { pointerId, world, mode }
    if (frameRef.current !== null) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const pending = pendingMoveRef.current
      if (!pending) return

      if (pending.mode === 'create') {
        onPreviewPoint(pending.world)
      } else {
        onUpdateDrag(pending.pointerId, pending.world)
      }
    })
  }

  return (
    <svg
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none"
      className="h-full w-full rounded bg-[#1f1f1f]"
      onPointerDown={(event) => {
        const screen = getPoint(event)
        const world = toWorld(screen, viewport)
        if (event.button === 1 || event.shiftKey) {
          onBeginPan(event.pointerId, { x: event.clientX, y: event.clientY })
          return
        }
        if (createMode) {
          onCreatePoint(world)
          return
        }
        onBeginSelectionDrag(event.pointerId, world)
      }}
      onPointerMove={(event) => {
        const screen = getPoint(event)
        const world = toWorld(screen, viewport)
        if (drag.kind === 'pan') {
          onUpdatePan(event.pointerId, { x: event.clientX, y: event.clientY })
          return
        }
        if (createMode) {
          scheduleMove(event.pointerId, world, 'create')
          return
        }
        scheduleMove(event.pointerId, world, 'edit')
      }}
      onPointerUp={(event) => onEndDrag(event.pointerId)}
      onPointerLeave={(event) => onEndDrag(event.pointerId)}
      onWheel={(event) => {
        event.preventDefault()
        onZoom(getPoint(event), event.deltaY)
      }}
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2f2f2f" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />
      <g transform={`translate(${viewport.offset.x} ${viewport.offset.y}) scale(${viewport.scale})`}>
        {paths.map((entry, pathIndex) => (
          <g key={entry.id}>
            <path
              d={buildPathData(entry)}
              fill="none"
              stroke={entry.color}
              strokeWidth={pathIndex === selectedPathIndex ? strokeWidth + 2 : strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={pathIndex === selectedPathIndex ? 1 : 0.94}
            />

            {selectedPathIndex === pathIndex && selectedSegmentStartIndex >= 0 ? (
              <path
                d={buildSegmentPathData(entry, selectedSegmentStartIndex)}
                fill="none"
                stroke={hasBundleLink(entry, selectedSegmentStartIndex) ? '#ec4899' : '#22c55e'}
                strokeWidth={strokeWidth + 4}
                strokeLinecap="round"
              />
            ) : null}

            {entry.points.map((point, pointIndex) => (
              <circle
                key={`${entry.id}-${pointIndex}`}
                cx={point.position.x}
                cy={point.position.y}
                r={selectedPathIndex === pathIndex && selectedVertexIndex === pointIndex ? 8 : 5}
                fill={point.role === 'bundleJoinBoundary' ? '#d7ba7d' : '#ce9178'}
                stroke="#1e1e1e"
                strokeWidth="2"
              />
            ))}
          </g>
        ))}

        {preview ? (
          <path
            d={`M ${preview.start.x} ${preview.start.y} L ${preview.end.x} ${preview.end.y}`}
            fill="none"
            stroke={preview.bundle ? '#22c55e' : '#4fc1ff'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity="0.6"
          />
        ) : null}

        {snapGuide ? (
          <line
            x1={snapGuide.axis === 'x' ? snapGuide.value : -2000}
            y1={snapGuide.axis === 'x' ? -2000 : snapGuide.value}
            x2={snapGuide.axis === 'x' ? snapGuide.value : 4000}
            y2={snapGuide.axis === 'x' ? 4000 : snapGuide.value}
            stroke={paths[snapGuide.pathIndex]?.color ?? '#1b6ef3'}
            strokeWidth="1"
            strokeDasharray="10 8"
          />
        ) : null}
      </g>
    </svg>
  )
}
