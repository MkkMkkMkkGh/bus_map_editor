import type { Dispatch, SetStateAction } from 'react'
import { hasSelectedSegment } from '../editor/pathSelection'
import { getBusStopConstraintLength, pointCount, segmentLength } from '../editor/pathGeometry'
import type { ActiveEndpoint, PathEntry, SelectionState } from '../types'

type Props = {
  mode: 'pathCreation' | 'pathSelection'
  setMode: (mode: 'pathCreation' | 'pathSelection') => void
  paths: PathEntry[]
  selection: SelectionState
  selectedVertex?: { position: { x: number; y: number } }
  selectedPath?: PathEntry
  settings: {
    strokeWidth: number
    bundleGap: number
    routeColor: string
    bundleMode: boolean
    busStopSpacing: number
  }
  setSettings: Dispatch<
    SetStateAction<{
      strokeWidth: number
      bundleGap: number
      routeColor: string
      bundleMode: boolean
      busStopSpacing: number
    }>
  >
  updatePathColor: (value: string) => void
  startNewPath: () => void
  clearSelection: () => void
  clearPaths: () => void
  activeEndpoint: ActiveEndpoint
  setActiveEndpoint: (value: ActiveEndpoint) => void
  useSelectedSegmentAsBundleHost: () => void
  addBusStopToSelectedSegment: () => void
  updateSelectedVertex: (axis: 'x' | 'y', value: number) => void
  removePath: (index: number) => void
  selectPath: (index: number) => void
}

export function EditorSidebar({
  mode,
  setMode,
  paths,
  selection,
  selectedVertex,
  selectedPath,
  settings,
  setSettings,
  updatePathColor,
  startNewPath,
  clearSelection,
  clearPaths,
  activeEndpoint,
  setActiveEndpoint,
  useSelectedSegmentAsBundleHost,
  addBusStopToSelectedSegment,
  updateSelectedVertex,
  removePath,
  selectPath,
}: Props) {
  const selectedSegmentBusStopCount =
    selectedPath && selection.segmentStartIndex >= 0
      ? (selectedPath.segmentPoints ?? []).filter(
          (point) => point.kind === 'busStop' && point.segmentStartIndex === selection.segmentStartIndex,
        ).length
      : 0
  const selectedSegmentLength =
    selectedPath && selection.segmentStartIndex >= 0 ? segmentLength(selectedPath, selection.segmentStartIndex) : 0
  const selectedSegmentBusStopConstraint =
    selectedPath && selection.segmentStartIndex >= 0
      ? getBusStopConstraintLength(selectedPath, selection.segmentStartIndex, settings.busStopSpacing)
      : 0
  const nextBusStopConstraint = Math.max(0, selectedSegmentBusStopCount * settings.busStopSpacing)
  const canAddBusStop =
    !!selectedPath &&
    selection.segmentStartIndex >= 0 &&
    selectedSegmentLength + 0.001 >= nextBusStopConstraint

  return (
    <div className="flex h-full min-h-0 flex-col text-[#cccccc]">
      <div className="border-b border-[#3c3c3c] px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d9d9d]">Properties</p>
        <h2 className="mt-1 text-sm font-semibold text-[#f3f3f3]">
          {selectedPath ? selectedPath.label : 'No Selection'}
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <section className="rounded border border-[#3c3c3c] bg-[#2d2d30]">
          <div className="border-b border-[#3c3c3c] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d]">
            Selection
          </div>
          <div className="space-y-3 px-3 py-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2">
                <div className="text-[11px] uppercase tracking-wide text-[#9d9d9d]">Mode</div>
                <div className="mt-1 text-[#f3f3f3]">{mode === 'pathCreation' ? 'Draw' : 'Select'}</div>
              </div>
              <div className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2">
                <div className="text-[11px] uppercase tracking-wide text-[#9d9d9d]">Vertex</div>
                <div className="mt-1 text-[#f3f3f3]">{selection.vertexIndex >= 0 ? selection.vertexIndex + 1 : 'None'}</div>
              </div>
              <div className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2">
                <div className="text-[11px] uppercase tracking-wide text-[#9d9d9d]">Segment</div>
                <div className="mt-1 text-[#f3f3f3]">{selection.segmentStartIndex >= 0 ? selection.segmentStartIndex + 1 : 'None'}</div>
              </div>
            </div>

            <div className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#cccccc]">Active endpoint</span>
                <span className="capitalize text-[#f3f3f3]">{activeEndpoint}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className={`rounded px-3 py-2 text-sm ${activeEndpoint === 'start' ? 'bg-[#0e639c] text-white' : 'bg-[#37373d] text-[#cccccc]'}`}
                  onClick={() => setActiveEndpoint('start')}
                >
                  Start
                </button>
                <button
                  className={`rounded px-3 py-2 text-sm ${activeEndpoint === 'end' ? 'bg-[#0e639c] text-white' : 'bg-[#37373d] text-[#cccccc]'}`}
                  onClick={() => setActiveEndpoint('end')}
                >
                  End
                </button>
              </div>
            </div>

            {selectedVertex ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-medium uppercase tracking-wide text-[#9d9d9d]">
                  X
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#f3f3f3]"
                    value={Math.round(selectedVertex.position.x)}
                    onChange={(event) => updateSelectedVertex('x', Number(event.target.value))}
                  />
                </label>
                <label className="block text-xs font-medium uppercase tracking-wide text-[#9d9d9d]">
                  Y
                  <input
                    type="number"
                    className="mt-1 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#f3f3f3]"
                    value={Math.round(selectedVertex.position.y)}
                    onChange={(event) => updateSelectedVertex('y', Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}

            {hasSelectedSegment(paths, selection) ? (
              <>
                <button
                  className={`w-full rounded px-3 py-2 text-sm ${canAddBusStop ? 'bg-[#0e639c] text-white' : 'bg-[#37373d] text-[#9d9d9d]'}`}
                  onClick={addBusStopToSelectedSegment}
                  disabled={!canAddBusStop}
                >
                  Add Bus Stop
                </button>
                <button className="w-full rounded bg-[#0e639c] px-3 py-2 text-sm text-white" onClick={useSelectedSegmentAsBundleHost}>
                  Use Segment As Bundle Host
                </button>
                <div className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-xs text-[#9d9d9d]">
                  {selectedSegmentBusStopCount} bus stops. Segment length {Math.round(selectedSegmentLength)} px. Reserved for bus stops {Math.round(selectedSegmentBusStopConstraint)} px.
                </div>
              </>
            ) : null}
          </div>
        </section>

        <section className="rounded border border-[#3c3c3c] bg-[#2d2d30]">
          <div className="border-b border-[#3c3c3c] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d]">
            Path Settings
          </div>
          <div className="space-y-3 px-3 py-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-[#9d9d9d]">
              Route color
              <div className="mt-2 flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 rounded border border-[#3c3c3c] bg-[#1e1e1e]"
                  value={settings.routeColor}
                  onChange={(event) => updatePathColor(event.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#f3f3f3]"
                  value={settings.routeColor}
                  onChange={(event) => updatePathColor(event.target.value)}
                />
              </div>
            </label>

            {[
              ['Stroke width', settings.strokeWidth, 4, 20, (value: number) => setSettings((current) => ({ ...current, strokeWidth: value }))],
              ['Bundle gap', settings.bundleGap, 6, 40, (value: number) => setSettings((current) => ({ ...current, bundleGap: value }))],
              ['Bus stop gap', settings.busStopSpacing, 10, 80, (value: number) => setSettings((current) => ({ ...current, busStopSpacing: value }))],
            ].map(([label, value, min, max, onChange]) => (
              <label key={label as string} className="block text-xs font-medium uppercase tracking-wide text-[#9d9d9d]">
                {label as string}
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    className="flex-1 accent-[#0e639c]"
                    min={min as number}
                    max={max as number}
                    value={value as number}
                    onChange={(event) => (onChange as (value: number) => void)(Number(event.target.value))}
                  />
                  <input
                    type="number"
                    className="w-20 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#f3f3f3]"
                    min={min as number}
                    max={max as number}
                    value={value as number}
                    onChange={(event) => (onChange as (value: number) => void)(Number(event.target.value))}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded border border-[#3c3c3c] bg-[#2d2d30]">
          <div className="border-b border-[#3c3c3c] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d]">
            Paths
          </div>
          <div className="space-y-2 px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded bg-[#0e639c] px-3 py-2 text-sm text-white" onClick={startNewPath}>
                New Path
              </button>
              <button className="rounded bg-[#37373d] px-3 py-2 text-sm text-[#cccccc]" onClick={clearSelection}>
                Deselect
              </button>
            </div>
            <button className="w-full rounded bg-[#4d1f24] px-3 py-2 text-sm text-[#f48771]" onClick={clearPaths}>
              Clear All Paths
            </button>
          </div>

          <div className="max-h-[38vh] space-y-2 overflow-auto border-t border-[#3c3c3c] px-3 py-3">
            {paths.length === 0 ? (
              <div className="rounded border border-dashed border-[#3c3c3c] bg-[#252526] px-4 py-5 text-sm text-[#9d9d9d]">
                No editable paths yet.
              </div>
            ) : (
              paths.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`w-full rounded border px-3 py-3 text-left ${selection.pathIndex === index ? 'border-[#0e639c] bg-[#094771]' : 'border-[#3c3c3c] bg-[#252526]'}`}
                  onClick={() => selectPath(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectPath(index)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: entry.color }} />
                      <div>
                        <p className="text-sm font-semibold text-[#f3f3f3]">{entry.label}</p>
                        <p className="text-xs text-[#9d9d9d]">
                          {pointCount(entry)} points, {entry.bundleLinks.length} links
                        </p>
                      </div>
                    </div>
                    <button
                      className="rounded bg-[#37373d] px-2 py-1 text-xs text-[#cccccc]"
                      onClick={(event) => {
                        event.stopPropagation()
                        removePath(index)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded border border-[#3c3c3c] bg-[#2d2d30] px-3 py-3 text-sm text-[#9d9d9d]">
          The right panel is limited to selected-item properties and path management. Primary tools stay in the top bar.
        </section>
      </div>
    </div>
  )
}
