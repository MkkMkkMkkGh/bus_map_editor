import { EditorCanvas } from './components/EditorCanvas'
import { EditorSidebar } from './components/EditorSidebar'
import { CANVAS_HEIGHT, CANVAS_WIDTH, useBusMapEditor } from './editor/useBusMapEditor'

function App() {
  const editor = useBusMapEditor()

  return (
    <div className="min-h-screen overflow-hidden bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex h-screen flex-col">
        <header className="border-b border-[#3c3c3c] bg-[#2d2d30]">
          <div className="flex h-9 items-center justify-between px-3">
            <div className="flex items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d9d9d]">Bus Map Editor</p>
              <span className="text-xs text-[#6f6f6f]">Rectilinear Route Editor</span>
            </div>
            <div className="text-xs text-[#9d9d9d]">
              {editor.mode === 'pathCreation' ? 'Draw Mode' : 'Select Mode'}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#252526] px-3 py-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="px-2 text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d]">Tools</span>
                <button
                  className={`rounded border px-3 py-1.5 text-sm ${editor.mode === 'pathSelection' ? 'border-[#0e639c] bg-[#094771] text-white' : 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'}`}
                  onClick={() => editor.setMode('pathSelection')}
                >
                  Select
                </button>
                <button
                  className={`rounded border px-3 py-1.5 text-sm ${editor.mode === 'pathCreation' ? 'border-[#0e639c] bg-[#094771] text-white' : 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'}`}
                  onClick={() => editor.setMode('pathCreation')}
                >
                  Draw
                </button>
                <button
                  className={`rounded border px-3 py-1.5 text-sm ${editor.settings.bundleMode ? 'border-[#0e639c] bg-[#094771] text-white' : 'border-[#3c3c3c] bg-[#252526] text-[#cccccc]'}`}
                  onClick={() => editor.setSettings((current) => ({ ...current, bundleMode: !current.bundleMode }))}
                >
                  Bundle
                </button>
              </div>

              <div className="h-6 w-px bg-[#3c3c3c]" />

              <div className="flex items-center gap-1">
                <span className="px-2 text-[11px] uppercase tracking-[0.14em] text-[#9d9d9d]">Actions</span>
                <button className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-sm text-[#cccccc]" onClick={editor.startNewPath}>
                  New Path
                </button>
                <button className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-sm text-[#cccccc]" onClick={editor.clearSelection}>
                  Deselect
                </button>
                <button
                  className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-sm text-[#cccccc]"
                  onClick={() => editor.setViewport({ scale: 1, offset: { x: 0, y: 0 } })}
                >
                  Reset View
                </button>
              </div>
            </div>

            <button
              className="rounded border border-[#0e639c] bg-[#0e639c] px-3 py-1.5 text-sm text-white"
              onClick={() => navigator.clipboard.writeText(editor.exportJson)}
            >
              Copy JSON
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <div className="flex h-full min-h-0">
            <section className="min-w-0 flex-1 border-r border-[#3c3c3c] bg-[#1e1e1e] p-3">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded border border-[#3c3c3c] bg-[#252526]">
                <div className="flex h-8 items-center justify-between border-b border-[#3c3c3c] bg-[#2d2d30] px-3 text-xs text-[#9d9d9d]">
                  <span>Map Canvas</span>
                  <span>Shift + Drag to Pan, Wheel to Zoom</span>
                </div>
                <div className="min-h-0 flex-1 bg-[#1e1e1e]">
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
            </section>

            <aside className="flex h-full w-[320px] shrink-0 flex-col bg-[#252526]">
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
                addBusStopToSelectedSegment={editor.addBusStopToSelectedSegment}
                updateSelectedVertex={editor.updateSelectedVertex}
                removePath={editor.removePath}
                selectPath={editor.selectPath}
              />
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
