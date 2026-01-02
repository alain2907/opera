import React, { useRef, useState, useEffect } from 'react';
import { WindowState, useWindows } from '../contexts/WindowContext';

interface WindowProps {
  window: WindowState;
}

export default function Window({ window }: WindowProps) {
  const { closeWindow, minimizeWindow, bringToFront, updatePosition, updateSize } = useWindows();
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'e' | 's'>('se');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Gestion du drag
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;

    bringToFront(window.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - window.x,
      y: e.clientY - window.y,
    });
  };

  const handleMouseDownResize = (e: React.MouseEvent, direction: 'se' | 'e' | 's' = 'se') => {
    e.stopPropagation();
    bringToFront(window.id);
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: window.width,
      height: window.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        updatePosition(window.id, Math.max(0, newX), Math.max(0, newY));
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;

        // Redimensionnement selon la direction
        if (resizeDirection === 'se' || resizeDirection === 'e') {
          newWidth = Math.max(400, resizeStart.width + deltaX);
        }
        if (resizeDirection === 'se' || resizeDirection === 's') {
          newHeight = Math.max(300, resizeStart.height + deltaY);
        }

        updateSize(window.id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, window.id, updatePosition, updateSize]);

  if (window.minimized) {
    return null;
  }

  return (
    <div
      ref={windowRef}
      className="absolute bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{
        left: `${window.x}px`,
        top: `${window.y}px`,
        width: `${window.width}px`,
        height: `${window.height}px`,
        zIndex: window.zIndex,
      }}
      onMouseDown={() => bringToFront(window.id)}
    >
      {/* Barre de titre */}
      <div
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDownDrag}
      >
        <span className="font-medium text-sm">{window.title}</span>
        <div className="window-controls flex items-center gap-2">
          <button
            onClick={() => minimizeWindow(window.id)}
            className="w-6 h-6 rounded hover:bg-blue-500 flex items-center justify-center transition-colors"
            title="Réduire"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => closeWindow(window.id)}
            className="w-6 h-6 rounded hover:bg-red-500 flex items-center justify-center transition-colors"
            title="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto">
        {window.component}
      </div>

      {/* Poignée de redimensionnement - Plus visible */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
        onMouseDown={handleMouseDownResize}
        title="Redimensionner"
      >
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-gray-300 to-transparent group-hover:from-blue-400 transition-colors opacity-50 group-hover:opacity-100">
          <svg className="absolute bottom-0 right-0 w-5 h-5 text-gray-600 group-hover:text-blue-700" viewBox="0 0 16 16">
            <path
              fill="currentColor"
              d="M16 16V14h-2v2h2zm0-4V8h-2v4h2zm-4 4v-2h-2v2h2zM8 16v-2H6v2h2zm8-8V4h-2v4h2zm-4 0V4h-2v4h2z"
            />
          </svg>
        </div>
      </div>

      {/* Bordures de redimensionnement - Droite */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-400 transition-colors"
        onMouseDown={(e) => handleMouseDownResize(e, 'e')}
        title="Redimensionner horizontalement"
      />

      {/* Bordures de redimensionnement - Bas */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-400 transition-colors"
        onMouseDown={(e) => handleMouseDownResize(e, 's')}
        title="Redimensionner verticalement"
      />
    </div>
  );
}
