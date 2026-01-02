import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface WindowState {
  id: string;
  title: string;
  component: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
}

interface WindowContextType {
  windows: WindowState[];
  openWindow: (title: string, component: ReactNode, width?: number, height?: number) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

export const useWindows = () => {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error('useWindows must be used within WindowProvider');
  }
  return context;
};

export const WindowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const openWindow = useCallback((
    title: string,
    component: ReactNode,
    width: number = 800,
    height: number = 600
  ) => {
    const id = `window-${Date.now()}-${Math.random()}`;

    // Position en cascade
    const offset = windows.length * 30;
    const x = 100 + offset;
    const y = 100 + offset;

    const newWindow: WindowState = {
      id,
      title,
      component,
      x,
      y,
      width,
      height,
      minimized: false,
      zIndex: nextZIndex,
    };

    setWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  }, [windows.length, nextZIndex]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, minimized: false } : w))
    );
    bringToFront(id);
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, zIndex: nextZIndex } : w))
    );
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, x, y } : w))
    );
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, width, height } : w))
    );
  }, []);

  return (
    <WindowContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        bringToFront,
        updatePosition,
        updateSize,
      }}
    >
      {children}
    </WindowContext.Provider>
  );
};
