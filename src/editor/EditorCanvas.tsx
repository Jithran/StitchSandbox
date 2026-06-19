import { useEffect, useRef } from 'react';
import { EditorEngine } from '../engine/editor';
import { ToolType } from '../model/types';

interface Props {
  engine: EditorEngine;
  tool: ToolType;
}

export function EditorCanvas({ engine, tool }: Props): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  const baseCursor = tool === ToolType.Pan ? 'grab' : 'crosshair';

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    engine.attach(canvas);

    const onRawMouseDown = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault(); // block OS middle-click autoscroll
    };
    canvas.addEventListener('mousedown', onRawMouseDown);

    const xy = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    const onDown = (e: PointerEvent) => {
      // Middle button would otherwise start the OS autoscroll, which makes
      // panning jump around.
      if (e.button === 1) e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = xy(e);
      // Hold Ctrl/Cmd to pan temporarily without switching tools.
      engine.pointerDown(x, y, e.button, e.ctrlKey || e.metaKey);
      if (engine.isPanning()) canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = xy(e);
      engine.pointerMove(x, y);
    };
    const onUp = () => {
      engine.pointerUp();
      canvas.style.cursor = '';
    };
    const onLeave = () => {
      if (!engine.isPanning()) canvas.style.cursor = '';
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      engine.view.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      engine.requestRender();
    };
    const onContext = (e: Event) => e.preventDefault();

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContext);

    const ro = new ResizeObserver(() => engine.resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      canvas.removeEventListener('mousedown', onRawMouseDown);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
      ro.disconnect();
    };
  }, [engine]);

  return <canvas ref={ref} className="editor-canvas" style={{ cursor: baseCursor }} />;
}
