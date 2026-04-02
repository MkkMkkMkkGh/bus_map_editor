import { useEffect, useMemo, useState } from 'react'
import type {
  ActiveEndpoint,
  DragState,
  EditorMode,
  EditorSettings,
  PathEntry,
  SelectionState,
  Vec2,
  Viewport,
} from '../types'
import {
  createBundleJoinBoundary,
  createEntry,
  createPoint,
  firstPoint,
  isEmpty,
  isSegmentHorizontal,
  lastPoint,
  normalizeEntry,
  hasSegmentAt,
  pointAt,
  segmentDirection,
  setPointPosition,
  upsertBundleLink,
} from './pathGeometry'
import { findSegmentStartIndexAtPosition, findVertexIndexAtPosition, isSelectedVertexEndpoint } from './pathSelection'
import { snapAxisValue, snapSingleSegmentEndpoint } from './pathSnap'

export const CANVAS_WIDTH = 1400
export const CANVAS_HEIGHT = 920
export const DEFAULT_COLOR = '#1B6EF3'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.toUpperCase()}`
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed
      .split('')
      .map((part) => part + part)
      .join('')
      .toUpperCase()}`
  }
  return DEFAULT_COLOR
}

export function toWorld(point: Vec2, viewport: Viewport): Vec2 {
  return {
    x: (point.x - viewport.offset.x) / viewport.scale,
    y: (point.y - viewport.offset.y) / viewport.scale,
  }
}

function getSelectedPath(paths: PathEntry[], selection: SelectionState) {
  return selection.pathIndex >= 0 ? paths[selection.pathIndex] : undefined
}

export function useBusMapEditor() {
  const [paths, setPaths] = useState<PathEntry[]>([])
  const [mode, setMode] = useState<EditorMode>('pathCreation')
  const [selection, setSelection] = useState<SelectionState>({ pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 })
  const [settings, setSettings] = useState<EditorSettings>({
    strokeWidth: 8,
    bundleGap: 14,
    routeColor: DEFAULT_COLOR,
    bundleMode: false,
  })
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, offset: { x: 0, y: 0 } })
  const [drag, setDrag] = useState<DragState>({ kind: 'none' })
  const [preview, setPreview] = useState<{ start: Vec2; end: Vec2; bundle: boolean } | null>(null)
  const [snapGuide, setSnapGuide] = useState<{ axis: 'x' | 'y'; value: number; pathIndex: number } | null>(null)
  const [bundleAnchor, setBundleAnchor] = useState<{ pathIndex: number; segmentStartIndex: number; offsetSign: number } | null>(null)
  const [activeEndpoint, setActiveEndpoint] = useState<ActiveEndpoint>('end')

  const selectedPath = getSelectedPath(paths, selection)
  const selectedVertex = selectedPath && selection.vertexIndex >= 0 ? selectedPath.points[selection.vertexIndex] : undefined
  const exportJson = useMemo(() => JSON.stringify({ settings, paths }, null, 2), [settings, paths])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.key.toLowerCase() === 'c') setMode('pathCreation')
      if (event.key.toLowerCase() === 'v') setMode('pathSelection')
      if (event.key.toLowerCase() === 'b') setSettings((current) => ({ ...current, bundleMode: !current.bundleMode }))
      if (event.key === 'Escape') {
        setPreview(null)
        setSnapGuide(null)
        setBundleAnchor(null)
      }
      if (event.key === 'Delete' && selection.pathIndex >= 0 && selection.vertexIndex >= 0) {
        setPaths((current) =>
          current.map((entry, pathIndex) => {
            if (pathIndex !== selection.pathIndex || entry.points.length <= 2) return entry
            return { ...entry, points: entry.points.filter((_, pointIndex) => pointIndex !== selection.vertexIndex) }
          }),
        )
        setSelection((current) => ({ ...current, vertexIndex: -1 }))
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selection])

  useEffect(() => {
    setSelection((current) => {
      if (current.pathIndex < 0) return current

      const entry = paths[current.pathIndex]
      if (!entry) {
        return { pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 }
      }

      const nextVertexIndex =
        current.vertexIndex >= 0 && current.vertexIndex < entry.points.length ? current.vertexIndex : -1
      const nextSegmentStartIndex = hasSegmentAt(entry, current.segmentStartIndex) ? current.segmentStartIndex : -1

      if (nextVertexIndex === current.vertexIndex && nextSegmentStartIndex === current.segmentStartIndex) {
        return current
      }

      return {
        pathIndex: current.pathIndex,
        vertexIndex: nextVertexIndex,
        segmentStartIndex: nextSegmentStartIndex,
      }
    })
  }, [paths])

  const updatePathColor = (color: string) => {
    const normalized = normalizeHexColor(color)
    setSettings((current) => ({ ...current, routeColor: normalized }))
    if (selection.pathIndex >= 0) {
      setPaths((current) =>
        current.map((entry, index) => (index === selection.pathIndex ? { ...entry, color: normalized } : entry)),
      )
    }
  }

  const startNewPath = () => {
    setPaths((current) => [...current, createEntry(`Custom ${current.length + 1}`, settings.routeColor)])
    setMode('pathCreation')
    setActiveEndpoint('end')
  }

  const clearSelection = () => {
    setSelection({ pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 })
    setPreview(null)
    setSnapGuide(null)
    setBundleAnchor(null)
    setActiveEndpoint('end')
  }

  const clearPaths = () => {
    setPaths([])
    setSelection({ pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 })
    setPreview(null)
    setSnapGuide(null)
    setBundleAnchor(null)
    setActiveEndpoint('end')
  }

  const getCreateTarget = (currentPaths: PathEntry[], currentSelection: SelectionState) => {
    const selected = getSelectedPath(currentPaths, currentSelection)
    if (selected && isSelectedVertexEndpoint(currentPaths, currentSelection)) {
      return { entry: selected, pathIndex: currentSelection.pathIndex, insertAtStart: activeEndpoint === 'start' }
    }
    const current = currentPaths[currentPaths.length - 1]
    if (current && isEmpty(current)) {
      return { entry: current, pathIndex: currentPaths.length - 1, insertAtStart: false }
    }
    return { entry: null, pathIndex: -1, insertAtStart: false }
  }

  const resolveCreatePlacement = (world: Vec2, currentPaths: PathEntry[], currentSelection: SelectionState) => {
    const target = getCreateTarget(currentPaths, currentSelection)
    const entry = target.entry
    if (!entry || isEmpty(entry)) {
      return null
    }

    const anchor = target.insertAtStart ? firstPoint(entry) : lastPoint(entry)

    if (settings.bundleMode && bundleAnchor) {
      const hostPath = currentPaths[bundleAnchor.pathIndex]
      if (!hostPath) return null

      const segmentIndex = bundleAnchor.segmentStartIndex
      const start = pointAt(hostPath, segmentIndex)
      const end = pointAt(hostPath, segmentIndex + 1)
      const direction = segmentDirection(hostPath, segmentIndex)
      const normal = { x: direction.y, y: -direction.x }
      const projected = isSegmentHorizontal(hostPath, segmentIndex)
        ? { x: clamp(world.x, Math.min(start.x, end.x), Math.max(start.x, end.x)), y: start.y }
        : { x: start.x, y: clamp(world.y, Math.min(start.y, end.y), Math.max(start.y, end.y)) }
      const endPoint = {
        x: projected.x + normal.x * settings.bundleGap * bundleAnchor.offsetSign,
        y: projected.y + normal.y * settings.bundleGap * bundleAnchor.offsetSign,
      }

      return {
        ...target,
        anchor,
        endPoint,
        bundle: true as const,
      }
    }

    const [endPoint, snapResult] = snapSingleSegmentEndpoint(
      currentPaths,
      settings.bundleGap,
      anchor,
      world,
      settings.strokeWidth + 8,
    )

    return {
      ...target,
      anchor,
      endPoint,
      bundle: false as const,
      snapResult,
    }
  }

  const updatePreviewForWorldPoint = (world: Vec2) => {
    const placement = resolveCreatePlacement(world, paths, selection)
    if (!placement) {
      setPreview(null)
      setSnapGuide(null)
      return
    }

    setPreview({ start: placement.anchor, end: placement.endPoint, bundle: placement.bundle })
    setSnapGuide(
      !placement.bundle &&
        placement.snapResult?.snapped &&
        placement.snapResult.axis &&
        placement.snapResult.pathIndex !== undefined
        ? {
            axis: placement.snapResult.axis,
            value: placement.snapResult.value,
            pathIndex: placement.snapResult.pathIndex,
          }
        : null,
    )
  }

  const commitCreatePoint = (world: Vec2) => {
    const target = getCreateTarget(paths, selection)
    let pathIndex = target.pathIndex

    setPaths((current) => {
      const next = [...current]
      let entry = target.entry
      if (!entry) {
        entry = createEntry(`Custom ${current.length + 1}`, settings.routeColor)
        next.push(entry)
        pathIndex = next.length - 1
      } else {
        entry = next[pathIndex]
      }

      if (isEmpty(entry)) {
        entry.points.push(createPoint(world))
        setSelection({ pathIndex, vertexIndex: 0, segmentStartIndex: -1 })
        setActiveEndpoint('end')
        setPreview(null)
        return next
      }

      const placement = resolveCreatePlacement(world, next, selection)
      if (!placement) {
        return next
      }

      if (settings.bundleMode && bundleAnchor) {
        const hostEntry = next[bundleAnchor.pathIndex]
        if (hostEntry) {
          const hostSegmentStartIndex = bundleAnchor.segmentStartIndex
          const point = hostEntry.bundleLinks.length === 0
            ? createBundleJoinBoundary(placement.endPoint, target.insertAtStart ? -1 : 1, bundleAnchor.offsetSign)
            : createPoint(placement.endPoint)

          if (target.insertAtStart) {
            entry.points.unshift(point)
            normalizeEntry(entry)
            setSelection({ pathIndex, vertexIndex: 0, segmentStartIndex: -1 })
            setActiveEndpoint('start')
          } else {
            entry.points.push(point)
            normalizeEntry(entry)
            const createdSegmentStartIndex = entry.points.length - 2
            setSelection({ pathIndex, vertexIndex: entry.points.length - 1, segmentStartIndex: -1 })
            setActiveEndpoint('end')
            const [targetRunStart, targetRunEnd] = upsertBundleLink(
              entry,
              createdSegmentStartIndex,
              bundleAnchor.pathIndex,
              hostSegmentStartIndex,
              hostSegmentStartIndex,
            )
            upsertBundleLink(hostEntry, hostSegmentStartIndex, pathIndex, targetRunStart, targetRunEnd)
          }

          setPreview(null)
          return next
        }
      }

      if (target.insertAtStart) {
        entry.points.unshift(createPoint(placement.endPoint))
        normalizeEntry(entry)
        setSelection({ pathIndex, vertexIndex: 0, segmentStartIndex: -1 })
        setActiveEndpoint('start')
      } else {
        entry.points.push(createPoint(placement.endPoint))
        normalizeEntry(entry)
        setSelection({ pathIndex, vertexIndex: entry.points.length - 1, segmentStartIndex: -1 })
        setActiveEndpoint('end')
      }

      setPreview(null)
      return next
    })
  }

  const selectAtWorldPoint = (world: Vec2) => {
    let nextSelection: SelectionState = { pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 }

    const hitPathIndex = paths.findIndex(
      (entry) =>
        findVertexIndexAtPosition(entry, world) >= 0 ||
        findSegmentStartIndexAtPosition(entry, world, settings.strokeWidth) >= 0,
    )

    if (hitPathIndex >= 0) {
      const entry = paths[hitPathIndex]
      const vertexIndex = findVertexIndexAtPosition(entry, world)
      const segmentStartIndex = findSegmentStartIndexAtPosition(entry, world, settings.strokeWidth)
      nextSelection =
        vertexIndex >= 0
          ? { pathIndex: hitPathIndex, vertexIndex, segmentStartIndex: -1 }
          : { pathIndex: hitPathIndex, vertexIndex: -1, segmentStartIndex }
    }

    setSelection(nextSelection)
    if (nextSelection.pathIndex >= 0 && nextSelection.vertexIndex >= 0) {
      const entry = paths[nextSelection.pathIndex]
      if (entry) {
        if (nextSelection.vertexIndex === 0) {
          setActiveEndpoint('start')
        } else if (nextSelection.vertexIndex === entry.points.length - 1) {
          setActiveEndpoint('end')
        }
      }
    }
    return nextSelection
  }

  const useSelectedSegmentAsBundleHost = () => {
    if (selection.pathIndex < 0 || selection.segmentStartIndex < 0) return
    const entry = paths[selection.pathIndex]
    const direction = segmentDirection(entry, selection.segmentStartIndex)
    const normal = { x: direction.y, y: -direction.x }
    const midpoint = {
      x: (pointAt(entry, selection.segmentStartIndex).x + pointAt(entry, selection.segmentStartIndex + 1).x) / 2,
      y: (pointAt(entry, selection.segmentStartIndex).y + pointAt(entry, selection.segmentStartIndex + 1).y) / 2,
    }
    const offsetSign = normal.x !== 0 ? (midpoint.x < CANVAS_WIDTH / 2 ? -1 : 1) : midpoint.y < CANVAS_HEIGHT / 2 ? -1 : 1
    setBundleAnchor({ pathIndex: selection.pathIndex, segmentStartIndex: selection.segmentStartIndex, offsetSign })
    setMode('pathCreation')
    setSettings((current) => ({ ...current, bundleMode: true }))
  }

  const updateSelectedVertex = (axis: 'x' | 'y', value: number) => {
    if (selection.pathIndex < 0 || selection.vertexIndex < 0) return
    setPaths((current) =>
      current.map((entry, pathIndex) => {
        if (pathIndex !== selection.pathIndex) return entry
        const points = [...entry.points]
        points[selection.vertexIndex] = {
          ...points[selection.vertexIndex],
          position: { ...points[selection.vertexIndex].position, [axis]: value },
        }
        const nextEntry = { ...entry, points }
        normalizeEntry(nextEntry)
        return nextEntry
      }),
    )
  }

  const removePath = (index: number) => {
    setPaths((current) => current.filter((_, pathIndex) => pathIndex !== index))
    setSelection({ pathIndex: -1, vertexIndex: -1, segmentStartIndex: -1 })
    setActiveEndpoint('end')
  }

  const selectPath = (index: number) => {
    setSelection({ pathIndex: index, vertexIndex: -1, segmentStartIndex: -1 })
    setMode('pathSelection')
    setActiveEndpoint('end')
  }

  const beginPan = (pointerId: number, startClient: Vec2) => {
    setDrag({ kind: 'pan', pointerId, startClient, startOffset: viewport.offset })
  }

  const updatePan = (pointerId: number, client: Vec2) => {
    if (drag.kind !== 'pan' || drag.pointerId !== pointerId) return
    const delta = { x: client.x - drag.startClient.x, y: client.y - drag.startClient.y }
    setViewport((current) => ({ ...current, offset: { x: drag.startOffset.x + delta.x, y: drag.startOffset.y + delta.y } }))
  }

  const beginDragSelection = (pointerId: number, world: Vec2) => {
    const nextSelection = selectAtWorldPoint(world)
    if (nextSelection.pathIndex < 0) return
    const entry = paths[nextSelection.pathIndex]

    if (nextSelection.segmentStartIndex >= 0) {
      const segmentStart = pointAt(entry, nextSelection.segmentStartIndex)
      setDrag({
        kind: 'segment',
        pointerId,
        pathIndex: nextSelection.pathIndex,
        segmentStartIndex: nextSelection.segmentStartIndex,
        pointerOffset: isSegmentHorizontal(entry, nextSelection.segmentStartIndex)
          ? segmentStart.y - world.y
          : segmentStart.x - world.x,
      })
    }
  }

  const updateDrag = (pointerId: number, world: Vec2) => {
    if (drag.kind === 'segment' && drag.pointerId === pointerId) {
      const entry = paths[drag.pathIndex]
      if (!entry || !hasSegmentAt(entry, drag.segmentStartIndex)) {
        setDrag({ kind: 'none' })
        setSnapGuide(null)
        setSelection((current) =>
          current.pathIndex === drag.pathIndex
            ? { pathIndex: drag.pathIndex, vertexIndex: -1, segmentStartIndex: -1 }
            : current,
        )
        return
      }

      const axis = isSegmentHorizontal(entry, drag.segmentStartIndex) ? 'y' : 'x'
      const rawValue = axis === 'y' ? world.y + drag.pointerOffset : world.x + drag.pointerOffset
      const snapResult = snapAxisValue(
        paths,
        settings.bundleGap,
        axis,
        rawValue,
        settings.strokeWidth + 8,
        [{ pathIndex: drag.pathIndex, startIndex: drag.segmentStartIndex, endIndex: drag.segmentStartIndex }],
      )

      setSnapGuide(
        snapResult.snapped && snapResult.axis && snapResult.pathIndex !== undefined
          ? { axis: snapResult.axis, value: snapResult.value, pathIndex: snapResult.pathIndex }
          : null,
      )

      setPaths((current) =>
        current.map((candidate, pathIndex) => {
          if (pathIndex !== drag.pathIndex) return candidate
          const next = { ...candidate, points: candidate.points.map((point) => ({ ...point })) }
          const axisValue = snapResult.value
          if (axis === 'y') {
            setPointPosition(next, drag.segmentStartIndex, { ...pointAt(next, drag.segmentStartIndex), y: axisValue })
            setPointPosition(next, drag.segmentStartIndex + 1, { ...pointAt(next, drag.segmentStartIndex + 1), y: axisValue })
          } else {
            setPointPosition(next, drag.segmentStartIndex, { ...pointAt(next, drag.segmentStartIndex), x: axisValue })
            setPointPosition(next, drag.segmentStartIndex + 1, { ...pointAt(next, drag.segmentStartIndex + 1), x: axisValue })
          }
          normalizeEntry(next)
          return next
        }),
      )
    }
  }

  const endDrag = (pointerId: number) => {
    if (drag.kind !== 'none' && drag.pointerId === pointerId) {
      setDrag({ kind: 'none' })
      setSnapGuide(null)
    }
  }

  const zoomAtPoint = (screen: Vec2, deltaY: number) => {
    const worldBefore = toWorld(screen, viewport)
    const nextScale = clamp(viewport.scale * (deltaY < 0 ? 1.08 : 0.92), 0.45, 2.8)
    setViewport({
      scale: nextScale,
      offset: { x: screen.x - worldBefore.x * nextScale, y: screen.y - worldBefore.y * nextScale },
    })
  }

  return {
    paths,
    mode,
    selection,
    settings,
    viewport,
    preview,
    snapGuide,
    selectedPath,
    selectedVertex,
    activeEndpoint,
    exportJson,
    drag,
    setMode,
    setSettings,
    setViewport,
    setActiveEndpoint,
    updatePathColor,
    startNewPath,
    clearSelection,
    clearPaths,
    updatePreviewForWorldPoint,
    commitCreatePoint,
    useSelectedSegmentAsBundleHost,
    updateSelectedVertex,
    removePath,
    selectPath,
    beginPan,
    updatePan,
    beginDragSelection,
    updateDrag,
    endDrag,
    zoomAtPoint,
  }
}
