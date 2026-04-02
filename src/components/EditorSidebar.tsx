import type { Dispatch, SetStateAction } from 'react'
import { hasSelectedSegment } from '../editor/pathSelection'
import { pointCount } from '../editor/pathGeometry'
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
  }
  setSettings: Dispatch<
    SetStateAction<{
      strokeWidth: number
      bundleGap: number
      routeColor: string
      bundleMode: boolean
    }>
  >
  updatePathColor: (value: string) => void
  startNewPath: () => void
  clearSelection: () => void
  clearPaths: () => void
  activeEndpoint: ActiveEndpoint
  setActiveEndpoint: (value: ActiveEndpoint) => void
  useSelectedSegmentAsBundleHost: () => void
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
  updateSelectedVertex,
  removePath,
  selectPath,
}: Props) {
  return (
    <div className="flex w-[320px] flex-col gap-4">
      <aside className="flex w-[320px] shrink-0 flex-col gap-4 rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-panel backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Bus Map Editor</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Editor controls made for the web</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Route selectors, drag handles, numeric inputs, shortcut keys, wheel zoom and bundle actions replace the old
            left-click-only workflow.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Tools</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className={`rounded-2xl px-3 py-2 text-sm font-medium ${mode === 'pathCreation' ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => setMode('pathCreation')}
            >
              Create (C)
            </button>
            <button
              className={`rounded-2xl px-3 py-2 text-sm font-medium ${mode === 'pathSelection' ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => setMode('pathSelection')}
            >
              Select (V)
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2">
            <span className="text-sm text-slate-700">Bundle mode</span>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.bundleMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'}`}
              onClick={() => setSettings((current) => ({ ...current, bundleMode: !current.bundleMode }))}
            >
              {settings.bundleMode ? 'On (B)' : 'Off (B)'}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={startNewPath}>
              Start New Path
            </button>
            <button className="flex-1 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-700" onClick={clearSelection}>
              Deselect
            </button>
          </div>
          <div className="mt-2">
            <button
              className="w-full rounded-2xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              onClick={clearPaths}
            >
              Clear Paths
            </button>
          </div>
          <div className="mt-3 rounded-2xl bg-white px-3 py-2">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span>Active endpoint</span>
              <span className="font-medium capitalize">{activeEndpoint}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                className={`rounded-2xl px-3 py-2 text-sm font-medium ${activeEndpoint === 'start' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setActiveEndpoint('start')}
              >
                Start
              </button>
              <button
                className={`rounded-2xl px-3 py-2 text-sm font-medium ${activeEndpoint === 'end' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setActiveEndpoint('end')}
              >
                End
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
              Route color
              <div className="mt-2 flex gap-2">
                <input type="color" className="h-11 w-14 rounded-xl border border-slate-200 bg-white" value={settings.routeColor} onChange={(event) => updatePathColor(event.target.value)} />
                <input type="text" className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" value={settings.routeColor} onChange={(event) => updatePathColor(event.target.value)} />
              </div>
            </label>

            {[
              ['Stroke width', settings.strokeWidth, 4, 20, (value: number) => setSettings((current) => ({ ...current, strokeWidth: value }))],
              ['Bundle gap', settings.bundleGap, 6, 40, (value: number) => setSettings((current) => ({ ...current, bundleGap: value }))],
            ].map(([label, value, min, max, onChange]) => (
              <label key={label as string} className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                {label as string}
                <div className="mt-2 flex items-center gap-3">
                  <input type="range" className="flex-1" min={min as number} max={max as number} value={value as number} onChange={(event) => (onChange as (value: number) => void)(Number(event.target.value))} />
                  <input type="number" className="w-20 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" min={min as number} max={max as number} value={value as number} onChange={(event) => (onChange as (value: number) => void)(Number(event.target.value))} />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Selection</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>Path: {selectedPath?.label ?? 'None'}</p>
            <p>Vertex: {selection.vertexIndex >= 0 ? selection.vertexIndex + 1 : 'None'}</p>
            <p>Segment: {selection.segmentStartIndex >= 0 ? selection.segmentStartIndex + 1 : 'None'}</p>
          </div>

          {selectedVertex ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                X
                <input type="number" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" value={Math.round(selectedVertex.position.x)} onChange={(event) => updateSelectedVertex('x', Number(event.target.value))} />
              </label>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Y
                <input type="number" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" value={Math.round(selectedVertex.position.y)} onChange={(event) => updateSelectedVertex('y', Number(event.target.value))} />
              </label>
            </div>
          ) : null}

          {hasSelectedSegment(paths, selection) ? (
            <button className="mt-3 w-full rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={useSelectedSegmentAsBundleHost}>
              Use Segment As Bundle Host
            </button>
          ) : null}
        </section>
      </aside>

      <section className="flex max-h-[38vh] flex-col gap-4 overflow-hidden rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-panel backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Paths</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{paths.length} editable routes</h3>
        </div>

        <div className="space-y-2 overflow-auto">
          {paths.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              Import a route or start drawing a path.
            </div>
          ) : (
            paths.map((entry, index) => (
              <div
                key={entry.id}
                className={`w-full rounded-2xl border px-3 py-3 text-left ${selection.pathIndex === index ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white'}`}
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
                      <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                      <p className="text-xs text-slate-500">
                        {pointCount(entry)} points, {entry.bundleLinks.length} links
                      </p>
                    </div>
                  </div>
                  <button
                    className="rounded-xl bg-slate-100 px-2 py-1 text-xs text-slate-600"
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Copy JSON from the top bar when you need an export. The live preview was removed to keep the editor responsive.
        </div>
      </section>
    </div>
  )
}
