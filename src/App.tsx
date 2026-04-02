import { EditorCanvas } from './components/EditorCanvas'
import { EditorSidebar } from './components/EditorSidebar'
import { CANVAS_HEIGHT, CANVAS_WIDTH, useBusMapEditor } from './editor/useBusMapEditor'

function App() {
  const editor = useBusMapEditor()

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.13),transparent_26%),linear-gradient(180deg,#f7fbfd_0%,#ecf4f8_100%)] text-slate-900">
      <div className="flex h-screen flex-col p-4">
        <header className="mb-4 flex items-center justify-between rounded-[24px] border border-white/80 bg-white/88 px-5 py-4 shadow-panel backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Bus Map Editor</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Canvas-first route editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => editor.setViewport({ scale: 1, offset: { x: 0, y: 0 } })}
            >
              Reset View
            </button>
            <button
              className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              onClick={() => navigator.clipboard.writeText(editor.exportJson)}
            >
              Copy JSON
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden rounded-[30px] border border-white/70 bg-white/35 shadow-panel">
          <div className="absolute inset-0 p-3">
            <div className="h-full w-full rounded-[26px] border border-white/60 bg-white/45 p-2 backdrop-blur-sm">
              <EditorCanvas
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                viewport={editor.viewport}
                paths={editor.paths}
                selectedPathIndex={editor.selection.pathIndex}
                selectedVertexIndex={editor.selection.vertexIndex}
                selectedSegmentStartIndex={editor.selection.segmentStartIndex}
                strokeWidth={editor.settings.strokeWidth}
                bundleGap={editor.settings.bundleGap}
                preview={editor.preview}
                snapGuide={editor.snapGuide}
                drag={editor.drag}
                onCreatePoint={editor.commitCreatePoint}
                onPreviewPoint={editor.updatePreviewForWorldPoint}
                onBeginPan={editor.beginPan}
                onUpdatePan={editor.updatePan}
                onBeginSelectionDrag={editor.beginDragSelection}
                onUpdateDrag={editor.updateDrag}
                onEndDrag={editor.endDrag}
                onZoom={editor.zoomAtPoint}
                createMode={editor.mode === 'pathCreation'}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto absolute left-4 top-4 max-h-[calc(100%-2rem)] overflow-auto">
              <EditorSidebar
                mode={editor.mode}
                setMode={editor.setMode}
                paths={editor.paths}
                selection={editor.selection}
                selectedVertex={editor.selectedVertex}
                selectedPath={editor.selectedPath}
                settings={editor.settings}
                setSettings={editor.setSettings}
                updatePathColor={editor.updatePathColor}
                startNewPath={editor.startNewPath}
                clearSelection={editor.clearSelection}
                clearPaths={editor.clearPaths}
                activeEndpoint={editor.activeEndpoint}
                setActiveEndpoint={editor.setActiveEndpoint}
                useSelectedSegmentAsBundleHost={editor.useSelectedSegmentAsBundleHost}
                updateSelectedVertex={editor.updateSelectedVertex}
                removePath={editor.removePath}
                selectPath={editor.selectPath}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
