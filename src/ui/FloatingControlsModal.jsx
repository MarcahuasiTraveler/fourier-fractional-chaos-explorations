import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MIN_WIDTH = 420;
const MIN_HEIGHT = 320;
const INITIAL_RECT = {
  x: 24,
  y: 72,
  width: 520,
  height: 760,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeResizeRect(startRect, direction, dx, dy) {
  let { x, y, width, height } = startRect;

  if (direction.includes('right')) {
    width = startRect.width + dx;
  }
  if (direction.includes('left')) {
    width = startRect.width - dx;
    x = startRect.x + dx;
  }
  if (direction.includes('bottom')) {
    height = startRect.height + dy;
  }
  if (direction.includes('top')) {
    height = startRect.height - dy;
    y = startRect.y + dy;
  }

  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - 12);
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - 12);

  if (width < MIN_WIDTH) {
    if (direction.includes('left')) {
      x -= MIN_WIDTH - width;
    }
    width = MIN_WIDTH;
  } else if (width > maxWidth) {
    if (direction.includes('left')) {
      x += width - maxWidth;
    }
    width = maxWidth;
  }

  if (height < MIN_HEIGHT) {
    if (direction.includes('top')) {
      y -= MIN_HEIGHT - height;
    }
    height = MIN_HEIGHT;
  } else if (height > maxHeight) {
    if (direction.includes('top')) {
      y += height - maxHeight;
    }
    height = maxHeight;
  }

  const minVisibleX = -width + 80;
  const maxVisibleX = window.innerWidth - 80;
  const maxVisibleY = window.innerHeight - 48;

  x = clamp(x, minVisibleX, maxVisibleX);
  y = clamp(y, 0, maxVisibleY);

  return { x, y, width, height };
}

export function FloatingControlsModal({
  isOpen,
  onClose,
  title = 'Controls',
  children,
}) {
  const [rect, setRect] = useState(INITIAL_RECT);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);

  const endInteraction = useCallback(() => {
    dragStateRef.current = null;
    resizeStateRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handlePointerMove = useCallback((event) => {
    const drag = dragStateRef.current;
    if (drag) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const width = drag.startRect.width;
      const height = drag.startRect.height;

      const minVisibleX = -width + 80;
      const maxVisibleX = window.innerWidth - 80;
      const maxVisibleY = window.innerHeight - 48;

      const nextX = clamp(drag.startRect.x + dx, minVisibleX, maxVisibleX);
      const nextY = clamp(drag.startRect.y + dy, 0, maxVisibleY);

      setRect((prev) => ({ ...prev, x: nextX, y: nextY }));
      return;
    }

    const resize = resizeStateRef.current;
    if (!resize) return;

    const dx = event.clientX - resize.startX;
    const dy = event.clientY - resize.startY;
    setRect(computeResizeRect(resize.startRect, resize.direction, dx, dy));
  }, []);

  const handlePointerUp = useCallback(() => {
    endInteraction();
  }, [endInteraction]);

  useEffect(() => {
    if (!isOpen) {
      endInteraction();
      return;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      endInteraction();
    };
  }, [endInteraction, handlePointerMove, handlePointerUp, isOpen]);

  useEffect(() => {
    const handleWindowResize = () => {
      setRect((prev) =>
        computeResizeRect(prev, 'right-bottom', 0, 0),
      );
    };

    handleWindowResize();
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  const startDrag = useCallback(
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();

      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startRect: rect,
      };
      resizeStateRef.current = null;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    },
    [rect],
  );

  const startResize = useCallback(
    (direction) => (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        direction,
        startX: event.clientX,
        startY: event.clientY,
        startRect: rect,
      };
      dragStateRef.current = null;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = '';
    },
    [rect],
  );

  if (!isOpen) return null;

  const modal = (
    <section
      className="floating-controls-modal"
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
      aria-label={title}
    >
      <header className="floating-controls-modal__header" onPointerDown={startDrag}>
        <span className="floating-controls-modal__title">{title}</span>
        <button
          type="button"
          className="floating-controls-modal__close"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Hide controls"
        >
          Hide
        </button>
      </header>

      <div className="floating-controls-modal__body">{children}</div>

      <div className="floating-controls-modal__resize floating-controls-modal__resize--top" onPointerDown={startResize('top')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--right" onPointerDown={startResize('right')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--bottom" onPointerDown={startResize('bottom')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--left" onPointerDown={startResize('left')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--top-left" onPointerDown={startResize('top-left')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--top-right" onPointerDown={startResize('top-right')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--bottom-right" onPointerDown={startResize('bottom-right')} />
      <div className="floating-controls-modal__resize floating-controls-modal__resize--bottom-left" onPointerDown={startResize('bottom-left')} />
    </section>
  );

  return createPortal(modal, document.body);
}
