import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { entreprisesApi, Entreprise } from '../api/entreprises';
import { exercicesApi, Exercice } from '../api/exercices';
import { auth } from '../lib/firebase';

interface EntrepriseContextType {
  entreprise: Entreprise | null;
  exercice: Exercice | null;
  entreprises: Entreprise[];
  exercices: Exercice[];
  setEntrepriseId: (id: number) => void;
  setExerciceId: (id: number) => void;
  reloadEntreprises: () => Promise<void>;
  loading: boolean;
}

const EntrepriseContext = createContext<EntrepriseContextType | undefined>(undefined);

export function EntrepriseProvider({ children }: { children: ReactNode }) {
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [exercice, setExercice] = useState<Exercice | null>(null);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Écouter l'état d'authentification Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fonction de chargement des entreprises
  const loadEntreprises = async () => {
    console.log('[EntrepriseContext] Chargement des entreprises...');
    try {
      const data = await entreprisesApi.getAll();
      console.log('[EntrepriseContext] Entreprises chargées', { count: data.length, data });
      setEntreprises(data);

      // Restaurer l'entreprise depuis le localStorage
      const savedEntrepriseId = localStorage.getItem('selectedEntrepriseId');
      console.log('[EntrepriseContext] savedEntrepriseId from localStorage', savedEntrepriseId);
      if (savedEntrepriseId) {
        const ent = data.find((e) => e.id === parseInt(savedEntrepriseId));
        console.log('[EntrepriseContext] Entreprise trouvée', ent);
        if (ent) {
          setEntreprise(ent);
        }
      }
    } catch (error) {
      console.error('[EntrepriseContext] Erreur lors du chargement des entreprises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction publique pour recharger les entreprises
  const reloadEntreprises = async () => {
    await loadEntreprises();
  };

  // Charger les entreprises uniquement si l'utilisateur est authentifié
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    loadEntreprises();
  }, [isAuthenticated]);

  // Charger les exercices quand l'entreprise change
  useEffect(() => {
    console.log('[EntrepriseContext] useEffect exercices, entreprise=', entreprise?.id);
    if (!entreprise) {
      setExercices([]);
      setExercice(null);
      return;
    }

    async function loadExercices() {
      console.log('[EntrepriseContext] Chargement des exercices pour entreprise', entreprise.id);
      try {
        const data = await exercicesApi.getByEntreprise(entreprise!.id);
        console.log('[EntrepriseContext] Exercices chargés', { count: data.length, data });
        setExercices(data);

        // Restaurer l'exercice depuis le localStorage
        const savedExerciceId = localStorage.getItem('selectedExerciceId');
        console.log('[EntrepriseContext] savedExerciceId from localStorage', savedExerciceId);
        if (savedExerciceId) {
          const ex = data.find((e) => e.id === parseInt(savedExerciceId));
          console.log('[EntrepriseContext] Exercice trouvé', ex);
          if (ex) {
            setExercice(ex);
            return;
          }
        }

        // Sinon, sélectionner le premier exercice
        if (data.length > 0) {
          console.log('[EntrepriseContext] Sélection du premier exercice', data[0]);
          setExercice(data[0]);
        }
      } catch (error) {
        console.error('[EntrepriseContext] Erreur lors du chargement des exercices:', error);
      }
    }
    loadExercices();
  }, [entreprise]);

  const setEntrepriseId = (id: number) => {
    if (id === 0) {
      setEntreprise(null);
      setExercice(null);
      setExercices([]);
      localStorage.removeItem('selectedEntrepriseId');
      localStorage.removeItem('selectedExerciceId');
      return;
    }

    const ent = entreprises.find((e) => e.id === id);
    if (ent) {
      setEntreprise(ent);
      localStorage.setItem('selectedEntrepriseId', id.toString());
    }
  };

  const setExerciceId = (id: number) => {
    if (id === 0) {
      setExercice(null);
      localStorage.removeItem('selectedExerciceId');
      return;
    }

    const ex = exercices.find((e) => e.id === id);
    if (ex) {
      setExercice(ex);
      localStorage.setItem('selectedExerciceId', id.toString());
    }
  };

  return (
    <EntrepriseContext.Provider
      value={{
        entreprise,
        exercice,
        entreprises,
        exercices,
        setEntrepriseId,
        setExerciceId,
        reloadEntreprises,
        loading,
      }}
    >
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
