import React from 'react';
import Window from './Window';
import { useWindows } from '../contexts/WindowContext';

export default function WindowContainer() {
  const { windows, restoreWindow } = useWindows();

  const minimizedWindows = windows.filter(w => w.minimized);

  return (
    <>
      {/* Fenêtres ouvertes */}
      {windows.filter(w => !w.minimized).map(window => (
        <Window key={window.id} window={window} />
      ))}

      {/* Barre des fenêtres minimisées */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white shadow-lg z-[2000]">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            {minimizedWindows.map(window => (
              <button
                key={window.id}
                onClick={() => restoreWindow(window.id)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors whitespace-nowrap"
                title={`Restaurer: ${window.title}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm">{window.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
