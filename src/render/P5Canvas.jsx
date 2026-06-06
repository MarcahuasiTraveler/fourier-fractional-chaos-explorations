import { useEffect, useRef } from 'react';
import { createP5Instance, createP5Sketch } from './createP5Sketch.js';

export function P5Canvas({ engine, onSnapshot, apiRef, onLayoutChange, children }) {
  const hostRef = useRef(null);
  const mountRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || !mountRef.current) return undefined;

    const host = hostRef.current;
    const mount = mountRef.current;
    const sketch = createP5Sketch({ engine, onSnapshot, apiRef });
    const instance = createP5Instance(mount, sketch);
    const reportLayout = () => {
      if (typeof onLayoutChange !== 'function') return;

      const canvas = host.querySelector('canvas');
      const hostRect = host.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();

      onLayoutChange({
        hostWidth: hostRect.width,
        hostHeight: hostRect.height,
        canvasWidth: canvasRect?.width ?? 0,
        canvasHeight: canvasRect?.height ?? 0,
      });
    };

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        reportLayout();
      });
      resizeObserver.observe(host);

      const canvas = host.querySelector('canvas');
      if (canvas) {
        resizeObserver.observe(canvas);
      }
    }

    const rafId = window.requestAnimationFrame(() => {
      reportLayout();
    });
    window.addEventListener('resize', reportLayout);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', reportLayout);
      resizeObserver?.disconnect();
      instance.remove();
    };
  }, [apiRef, engine, onLayoutChange, onSnapshot]);

  return (
    <div className="canvas-host" ref={hostRef}>
      <div className="canvas-mount" ref={mountRef} />
      {children ? <div className="canvas-overlay">{children}</div> : null}
    </div>
  );
}
