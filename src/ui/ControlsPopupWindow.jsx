import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_FEATURES =
  'popup=yes,width=560,height=900,left=80,top=80,resizable=yes,scrollbars=yes';

function getStyleNodeKey(node, index) {
  const tag = node.tagName.toLowerCase();
  if (tag === 'link') {
    return `link:${node.getAttribute('href') || index}`;
  }

  const id = node.getAttribute('id');
  if (id) return `style:${id}`;
  return `style:inline:${index}`;
}

function syncStylesToWindow(sourceDocument, targetDocument) {
  const copies = new Map();
  const syncNow = () => {
    const nodes = Array.from(
      sourceDocument.querySelectorAll('style, link[rel="stylesheet"]'),
    );
    const liveKeys = new Set();

    nodes.forEach((node, index) => {
      const key = getStyleNodeKey(node, index);
      liveKeys.add(key);

      let clone = copies.get(key);
      if (!clone || !targetDocument.head.contains(clone)) {
        clone = node.cloneNode(true);
        clone.setAttribute('data-popup-style-key', key);
        copies.set(key, clone);
        targetDocument.head.appendChild(clone);
        return;
      }

      if (node.tagName.toLowerCase() === 'style') {
        const text = node.textContent || '';
        if (clone.textContent !== text) {
          clone.textContent = text;
        }
      } else {
        const href = node.getAttribute('href') || '';
        if (clone.getAttribute('href') !== href) {
          clone.setAttribute('href', href);
        }
      }
    });

    copies.forEach((clone, key) => {
      if (liveKeys.has(key)) return;
      clone.remove();
      copies.delete(key);
    });
  };

  targetDocument.head
    .querySelectorAll('[data-popup-style-key]')
    .forEach((node) => node.remove());
  syncNow();

  const observer = new MutationObserver(syncNow);
  observer.observe(sourceDocument.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    copies.forEach((clone) => clone.remove());
    copies.clear();
  };
}

export function ControlsPopupWindow({
  isOpen,
  onRequestClose,
  title = 'Controls',
  windowName = 'signal-controls-window',
  features = DEFAULT_FEATURES,
  children,
}) {
  const popupRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      setPortalContainer(null);
      return;
    }

    if (popupRef.current && !popupRef.current.closed) {
      return;
    }

    const popup = window.open('', windowName, features);
    if (!popup) {
      onRequestClose?.();
      return;
    }

    popupRef.current = popup;
    popup.document.title = title;
    popup.document.body.innerHTML = '';
    popup.document.body.className = 'controls-popup-body';
    const stopStyleSync = syncStylesToWindow(window.document, popup.document);

    const container = popup.document.createElement('div');
    container.className = 'controls-popup-root';
    popup.document.body.appendChild(container);
    setPortalContainer(container);

    const handleWindowClose = () => {
      popupRef.current = null;
      setPortalContainer(null);
      onRequestClose?.();
    };

    popup.addEventListener('beforeunload', handleWindowClose);
    const closedPoll = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.clearInterval(closedPoll);
        handleWindowClose();
      }
    }, 300);

    return () => {
      stopStyleSync();
      popup.removeEventListener('beforeunload', handleWindowClose);
      window.clearInterval(closedPoll);
    };
  }, [features, isOpen, onRequestClose, title, windowName]);

  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!popupRef.current || popupRef.current.closed) return;
    popupRef.current.document.title = title;
  }, [title]);

  if (!portalContainer) return null;
  return createPortal(children, portalContainer);
}
