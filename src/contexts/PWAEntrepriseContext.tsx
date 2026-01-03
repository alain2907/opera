import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PWAEntrepriseContextType {
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  entrepriseId: number | null;
  setEntrepriseId: (id: number | null) => void;
}

const PWAEntrepriseContext = createContext<PWAEntrepriseContextType | undefined>(undefined);

export function PWAEntrepriseProvider({ children }: { children: ReactNode }) {
  const [backgroundColor, setBackgroundColor] = useState('#f0f9ff');
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);

  // Sauvegarder dans localStorage pour persister entre les sessions
  useEffect(() => {
    const saved = localStorage.getItem('pwa_backgroundColor');
    if (saved) {
      setBackgroundColor(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pwa_backgroundColor', backgroundColor);
    // Appliquer directement sur le body
    document.body.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  return (
    <PWAEntrepriseContext.Provider value={{ backgroundColor, setBackgroundColor, entrepriseId, setEntrepriseId }}>
      {children}
    </PWAEntrepriseContext.Provider>
  );
}

export function usePWAEntreprise() {
  const context = useContext(PWAEntrepriseContext);
  if (context === undefined) {
    throw new Error('usePWAEntreprise must be used within a PWAEntrepriseProvider');
  }
  return context;
}
