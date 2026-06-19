import { useEffect, useRef } from 'react';
import { EditorEngine } from '../engine/editor';
import { ToolType } from '../model/types';

interface Props {
  engine: EditorEngine;
  tool: ToolType;
  pasting: boolean;
}

export function EditorCanvas({ engine, tool, pasting }: Props): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  const baseCursor = pasting ? 'move' : tool === ToolType.Pan ? 'grab' : 'crosshair';

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

    // Multi-touch state for pinch-to-zoom + two-finger pan.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinching = false;
    let lastDist = 0;
    let lastMid = { x: 0, y: 0 };

    const twoFingerMetrics = () => {
      const [a, b] = [...pointers.values()];
      return {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const onDown = (e: PointerEvent) => {
      // Middle button would otherwise start the OS autoscroll, which makes
      // panning jump around.
      if (e.button === 1) e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Some browsers reject capture for certain pointer types; harmless.
      }
      const [x, y] = xy(e);
      pointers.set(e.pointerId, { x, y });

      if (pointers.size >= 2) {
        // Second finger down: cancel any in-progress stroke and start pinching.
        if (!pinching) engine.beginPinch();
        pinching = true;
        const m = twoFingerMetrics();
        lastDist = m.dist;
        lastMid = m.mid;
        canvas.style.cursor = '';
        return;
      }

      // Hold Ctrl/Cmd to pan temporarily without switching tools.
      engine.pointerDown(x, y, e.button, e.ctrlKey || e.metaKey);
      if (engine.isPanning()) canvas.style.cursor = 'grabbing';
    };

    const onMove = (e: PointerEvent) => {
      const [x, y] = xy(e);
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y });

      if (pinching && pointers.size >= 2) {
        const m = twoFingerMetrics();
        const factor = lastDist > 0 ? m.dist / lastDist : 1;
        engine.pinchZoom(m.mid.x, m.mid.y, factor, m.mid.x - lastMid.x, m.mid.y - lastMid.y);
        lastDist = m.dist;
        lastMid = m.mid;
        return;
      }
      if (!pinching) engine.pointerMove(x, y);
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pinching) {
        if (pointers.size === 0) {
          pinching = false;
          engine.pointerUp();
        } else if (pointers.size >= 2) {
          const m = twoFingerMetrics();
          lastDist = m.dist;
          lastMid = m.mid;
        }
        // With exactly one finger left we wait for it to lift rather than
        // resuming a draw stroke.
        canvas.style.cursor = '';
        return;
      }
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
