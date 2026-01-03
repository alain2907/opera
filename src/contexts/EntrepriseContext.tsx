import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { entreprisesApi, Entreprise } from '../api/entreprises';

interface EntrepriseContextType {
  entrepriseId: number | null;
  setEntrepriseId: (id: number | null) => void;
  entreprise: Entreprise | null;
  refreshEntreprise: () => Promise<void>;
}

const EntrepriseContext = createContext<EntrepriseContextType | undefined>(undefined);

export function EntrepriseProvider({ children }: { children: ReactNode }) {
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);

  useEffect(() => {
    if (entrepriseId) {
      loadEntreprise();
    } else {
      setEntreprise(null);
    }
  }, [entrepriseId]);

  async function loadEntreprise() {
    if (!entrepriseId) return;
    try {
      const data = await entreprisesApi.getById(entrepriseId);
      setEntreprise(data);
    } catch (error) {
      console.error('Erreur chargement entreprise:', error);
    }
  }

  async function refreshEntreprise() {
    await loadEntreprise();
  }

  return (
    <EntrepriseContext.Provider value={{ entrepriseId, setEntrepriseId, entreprise, refreshEntreprise }}>
      {children}
    </EntrepriseContext.Provider>
  );
}

export function useEntreprise() {
  const context = useContext(EntrepriseContext);
  if (context === undefined) {
    throw new Error('useEntreprise must be used within an EntrepriseProvider');
  }
  return context;
}
