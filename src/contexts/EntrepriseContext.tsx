import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { entreprisesApi, type Entreprise } from '../api/entreprises';
import { exercicesApi, type Exercice } from '../api/exercices';

interface EntrepriseContextType {
  entrepriseId: number | null;
  setEntrepriseId: (id: number | null) => void;
  entreprise: Entreprise | null;
  refreshEntreprise: () => Promise<void>;
  exerciceId: number | null;
  setExerciceId: (id: number | null) => void;
  exercice: Exercice | null;
  entreprises: Entreprise[];
  exercices: Exercice[];
  loading: boolean;
}

const EntrepriseContext = createContext<EntrepriseContextType | undefined>(undefined);

export function EntrepriseProvider({ children }: { children: ReactNode }) {
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [exerciceId, setExerciceId] = useState<number | null>(null);
  const [exercice, setExercice] = useState<Exercice | null>(null);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (entrepriseId) {
      loadEntreprise();
    } else {
      setEntreprise(null);
    }
  }, [entrepriseId]);

  useEffect(() => {
    if (exerciceId) {
      loadExercice();
    } else {
      setExercice(null);
    }
  }, [exerciceId]);

  async function loadData() {
    setLoading(true);
    try {
      const [entreprisesData, exercicesData] = await Promise.all([
        entreprisesApi.getAll(),
        exercicesApi.getAll()
      ]);
      setEntreprises(entreprisesData || []);
      setExercices(exercicesData || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setEntreprises([]);
      setExercices([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEntreprise() {
    if (!entrepriseId) return;
    try {
      const data = await entreprisesApi.getOne(entrepriseId);
      setEntreprise(data);
    } catch (error) {
      console.error('Erreur chargement entreprise:', error);
    }
  }

  async function loadExercice() {
    if (!exerciceId) return;
    try {
      const data = await exercicesApi.getOne(exerciceId);
      setExercice(data);
    } catch (error) {
      console.error('Erreur chargement exercice:', error);
    }
  }

  async function refreshEntreprise() {
    await loadEntreprise();
  }

  return (
    <EntrepriseContext.Provider value={{
      entrepriseId,
      setEntrepriseId,
      entreprise,
      refreshEntreprise,
      exerciceId,
      setExerciceId,
      exercice,
      entreprises,
      exercices,
      loading
    }}>
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
