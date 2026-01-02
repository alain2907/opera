import { useState, useEffect, FormEvent, useRef } from 'react';
import { entreprisesApi, type Entreprise } from './api/entreprises';
import { ecrituresApi, type Ecriture, type LigneEcriture } from './api/ecritures';
import { comptesApi, type Compte } from './api/comptes';
import { journauxApi, type Journal } from './api/journaux';
import { fecApi, type ImportFECResult } from './api/fec';
import { searchCompte, getLibelleCompte } from './data/planComptable';
import { Landing } from './app/page';
import { Dashboard } from './app/dashboard/page';
import { Entreprises } from './app/entreprises/page';
import { Liste } from './app/liste/page';

type Page = 'landing' | 'saisie' | 'liste' | 'entreprises' | 'rapports' | 'comptes' | 'journaux' | 'balances' | 'grands-livres' | 'import-fec' | 'dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextNumPiece, setNextNumPiece] = useState('');

  const [formData, setFormData] = useState({
    journal_id: 1,
    exercice_id: 1,
    date_ecriture: new Date().toISOString().split('T')[0],
    numero_piece: '',
    libelle: '',
  });

  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
  ]);

  const [suggestions, setSuggestions] = useState<Record<number, Array<{ code: string; libelle: string }>>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({});
  const [pendingAccount, setPendingAccount] = useState<{ index: number; code: string; libelle: string; taux_tva?: string } | null>(null);
  const [comptesEntreprise, setComptesEntreprise] = useState<Compte[]>([]);
  const [focusedField, setFocusedField] = useState<{ index: number; field: 'debit' | 'credit' } | null>(null);
  const [lastTVARate, setLastTVARate] = useState(0.20);
  const [userEditedLines, setUserEditedLines] = useState<Set<number>>(new Set());
  const savingRef = useRef(false);
  const [draftPieces, setDraftPieces] = useState<Array<{
    form: typeof formData,
    lignes: LigneEcriture[]
  }>>([]);
  const [selectedCompteForMouvements, setSelectedCompteForMouvements] = useState<Compte | null>(null);
  const [mouvementsCompte, setMouvementsCompte] = useState<Array<{
    date: string;
    piece: string;
    libelle: string;
    debit: number;
    credit: number;
    solde: number;
  }>>([]);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [mouvementsJournal, setMouvementsJournal] = useState<Ecriture[]>([]);
  const [editingEcriture, setEditingEcriture] = useState<Ecriture | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportFECResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingEntreprise, setEditingEntreprise] = useState<Entreprise | null>(null);

  // === DEBUG: flag + store ===
  const [showDebug, setShowDebug] = useState<boolean>(
    localStorage.getItem('debug') === '1' || import.meta.env?.VITE_DEBUG === '1'
  );
  const [debugState, setDebugState] = useState<{
    events: Array<{ t: number; tag: string; data: any }>;
    lastPayload?: any;
    lastError?: { msg: string; status?: number; data?: any };
  }>({ events: [] });

  // petit helper pour tracer
  const dbg = (tag: string, data: any) => {
    if (!showDebug) return;
    console.log(`[DBG] ${tag}`, data);
    setDebugState((prev) => ({
      ...prev,
      events: [...prev.events.slice(-200), { t: Date.now(), tag, data }],
    }));
  };

  // Mois de saisie (YYYY-MM), initialisé depuis la date actuelle du formulaire
  const [saisieMonth, setSaisieMonth] = useState(() => formData.date_ecriture.slice(0, 7));

  // Parse "5,5", "5.5", "5,5 %", "5 %", etc. -> 0.055 / 0.05 / etc.
  const parseTVARateFromText = (txt?: string): number | null => {
    if (!txt) return null;
    const s = txt.replace(',', '.');
    const m = s.match(/(\d+(?:\.\d+)?)(\s*%?)/);
    if (!m) return null;
    const num = parseFloat(m[1]);
    if (isNaN(num)) return null;
    // Si on a trouvé un % explicite OU un nombre > 1, on convertit en fraction
    const hasPercent = /%/.test(s);
    const rate = hasPercent || num > 1 ? num / 100 : num;
    return rate > 0 && rate < 1 ? rate : null;
  };

  // Récupère le meilleur taux disponible (compte, libellé de ligne/écriture, sinon mémoire, sinon 20%)
  const detectTVARate = (opts: { libCompte?: string; libLigne?: string; libGlobal?: string; fallback?: number }): number => {
    const fromCompte = parseTVARateFromText(opts.libCompte);
    const fromLigne  = parseTVARateFromText(opts.libLigne);
    const fromGlobal = parseTVARateFromText(opts.libGlobal);
    const r = fromCompte ?? fromLigne ?? fromGlobal ?? lastTVARate ?? opts.fallback ?? 0.20;
    // mémoriser le dernier taux s'il vient d'être identifié
    if (fromCompte || fromLigne || fromGlobal) setLastTVARate(r);
    return r;
  };

  // Quand le mois change, on fixe la date de saisie au 1er du mois choisi
  useEffect(() => {
    if (!saisieMonth) return;
    setFormData(prev => ({ ...prev, date_ecriture: `${saisieMonth}-01` }));
  }, [saisieMonth]);

  // Libellé d'exercice affiché (ex: "Exercice 2025")
  const exerciceLabel = new Date(formData.date_ecriture).getFullYear();

  // toggle clavier Cmd+D (Mac) ou Ctrl+D (Windows/Linux)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowDebug((v) => {
          const nv = !v;
          localStorage.setItem('debug', nv ? '1' : '0');
          return nv;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Attraper les erreurs globales
  useEffect(() => {
    const onErr = (e: any) => dbg('window.error', { message: e?.message, error: e?.error });
    const onRej = (e: any) => dbg('unhandledrejection', { reason: e?.reason });
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, [showDebug]);

  // Auto-effacer les messages de succès après 5 secondes
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-effacer les messages d'erreur après 5 secondes
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    loadEntreprises();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadEcritures();
      loadComptes();
      loadJournaux();
    }
  }, [selectedEntreprise]);

  // Recharger les entreprises quand on arrive sur le dashboard pour avoir les exercices
  useEffect(() => {
    if (currentPage === 'dashboard') {
      loadEntreprises();
    }
  }, [currentPage]);

  useEffect(() => {
    if (ecritures.length > 0) {
      const lastPiece = ecritures[0]?.numero_piece;
      if (lastPiece) {
        const num = parseInt(lastPiece.replace(/\D/g, '')) || 0;
        setNextNumPiece(String(num + 1).padStart(4, '0'));
      } else {
        setNextNumPiece('0001');
      }
    } else {
      setNextNumPiece('0001');
    }
  }, [ecritures]);

  useEffect(() => {
    if (nextNumPiece && !formData.numero_piece) {
      setFormData(prev => ({ ...prev, numero_piece: nextNumPiece }));
    }
  }, [nextNumPiece]);

  // Pré-remplir le formulaire quand on édite une écriture
  useEffect(() => {
    if (editingEcriture) {
      setFormData({
        journal_id: editingEcriture.journal_id,
        exercice_id: editingEcriture.exercice_id,
        date_ecriture: editingEcriture.date_ecriture.split('T')[0],
        numero_piece: editingEcriture.numero_piece || '',
        libelle: editingEcriture.libelle,
      });
      setLignes(editingEcriture.lignes.map(l => ({
        numero_compte: l.numero_compte,
        libelle_compte: l.libelle_compte,
        debit: Number(l.debit),
        credit: Number(l.credit),
      })));
    }
  }, [editingEcriture]);

  // Miroir: ligne 1 -> toutes les lignes & libellé global (lecture seule)
  useEffect(() => {
    const libFirst = lignes[0]?.libelle_compte?.trim() || '';
    const libGlobal = formData.libelle?.trim() || '';

    // Si la ligne 1 est renseignée, on synchronise toutes les autres lignes et le libellé global
    if (libFirst) {
      // Synchroniser le libellé global si besoin
      if (libFirst !== libGlobal) {
        setFormData(prev => ({ ...prev, libelle: libFirst }));
      }
      // Appliquer à toutes les autres lignes (écrase les différences)
      setLignes(prev =>
        prev.map((l, i) => (i === 0 ? l : { ...l, libelle_compte: libFirst }))
      );
    }
  }, [lignes[0]?.libelle_compte]);

  const loadEntreprises = async () => {
    try {
      const data = await entreprisesApi.getAll();
      setEntreprises(data);
      // Ne plus sélectionner automatiquement la première entreprise
      // L'utilisateur doit cliquer sur "Ouvrir" pour sélectionner une entreprise
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const loadEcritures = async () => {
    if (!selectedEntreprise) return;
    try {
      const data = await ecrituresApi.getAll(selectedEntreprise);
      setEcritures(data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const loadComptes = async () => {
    if (!selectedEntreprise) return;
    try {
      const data = await comptesApi.getAll(selectedEntreprise);
      setComptesEntreprise(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  const loadJournaux = async () => {
    if (!selectedEntreprise) return;
    try {
      const data = await journauxApi.findByEntreprise(selectedEntreprise);
      setJournaux(data);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
    }
  };

  const loadMouvementsJournal = (journal: Journal) => {
    setSelectedJournal(journal);
    const mouvements = ecritures.filter(e => e.journal_id === journal.id);
    setMouvementsJournal(mouvements);
  };

  const loadMouvementsCompte = async (compte: Compte) => {
    if (!selectedEntreprise) return;
    try {
      setSelectedCompteForMouvements(compte);

      // Filtrer les écritures qui contiennent ce compte
      const mouvements: Array<{
        date: string;
        piece: string;
        libelle: string;
        debit: number;
        credit: number;
        solde: number;
      }> = [];

      let solde = 0;

      ecritures.forEach(ecriture => {
        ecriture.lignes?.forEach(ligne => {
          if (ligne.numero_compte === compte.numero_compte) {
            const debit = Number(ligne.debit) || 0;
            const credit = Number(ligne.credit) || 0;
            solde += debit - credit;

            mouvements.push({
              date: ecriture.date_ecriture,
              piece: ecriture.numero_piece,
              libelle: ligne.libelle_compte || ecriture.libelle,
              debit,
              credit,
              solde,
            });
          }
        });
      });

      setMouvementsCompte(mouvements);
    } catch (err) {
      console.error('Erreur chargement mouvements:', err);
    }
  };

  // Helper : empile la pièce courante et passe à la suivante (sans enregistrement serveur)
  const startNextPieceLocal = () => {
    dbg('startNextPieceLocal/snapshot', { formData, lignes }); // AVANT de créer le snapshot

    const lignesValides = lignes
      .filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0));

    if (lignesValides.length >= 2) {
      const snapshotForm = { ...formData }; // ← copie pour figer N° pièce, date, libellé
      const snapshotLignes = lignesValides.map(l => ({ ...l })); // ← copie des lignes
      setDraftPieces(prev => [...prev, { form: snapshotForm, lignes: snapshotLignes }]);
    }

    const newNextNum = (nextNumPiece ? String(parseInt(nextNumPiece) + 1).padStart(4, '0') : '0001');
    dbg('startNextPieceLocal/newNextNum', newNextNum); // APRÈS le calcul du n° suivant
    setNextNumPiece(newNextNum);
    setFormData({
      journal_id: formData.journal_id,
      exercice_id: formData.exercice_id,
      date_ecriture: `${saisieMonth}-01`,
      numero_piece: newNextNum,
      libelle: '',
    });
    setLignes([
      { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
      { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
    ]);
    setUserEditedLines(new Set());
    setTimeout(() => {
      const first = document.querySelector(`input[data-compte-index="0"]`) as HTMLInputElement;
      first?.focus();
    }, 50);
  };

  // -- A UTILISER PARTOUT : enregistre + incrémente + reset
  const finalizePiece = async () => {
    if (savingRef.current) return;            // 🔒 anti-doublon
    savingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const totalDebitLocal = lignes.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCreditLocal = lignes.reduce((sum, l) => sum + Number(l.credit), 0);

      if (Math.abs(totalDebitLocal - totalCreditLocal) > 0.01) {
        throw new Error(`Écriture non équilibrée: Débit=${totalDebitLocal.toFixed(2)} / Crédit=${totalCreditLocal.toFixed(2)}`);
      }

      const lignesValides = lignes.filter(l => l.numero_compte && (l.debit > 0 || l.credit > 0));
      if (lignesValides.length < 2) {
        throw new Error('Au moins 2 lignes sont requises');
      }

      // 👉 si l'API renvoie une erreur, elle sera catchée juste en dessous
      await ecrituresApi.create({
        ...formData,
        entreprise_id: selectedEntreprise!,
        lignes: lignesValides.map(l => ({
          numero_compte: l.numero_compte,
          libelle_compte: l.libelle_compte,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
      });

      // succès : incrément + reset
      const newNextNum = String(parseInt(nextNumPiece) + 1).padStart(4, '0');
      setNextNumPiece(newNextNum);

      setFormData({
        journal_id: formData.journal_id,
        exercice_id: formData.exercice_id,
        date_ecriture: `${saisieMonth}-01`,
        numero_piece: newNextNum,
        libelle: '',
      });
      setLignes([
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
      ]);
      setUserEditedLines(new Set());
      setSuccess('Écriture enregistrée et nouvelle pièce prête.');
      await loadEcritures();

      setTimeout(() => {
        const first = document.querySelector(`input[data-compte-index="0"]`) as HTMLInputElement;
        first?.focus();
      }, 50);
    } catch (err: any) {
      // ✅ on affiche l'erreur et on débloque l'UI
      const msg = err?.message || err?.response?.data?.message || 'Erreur lors de l\'enregistrement';
      setError(msg);
    } finally {
      setLoading(false);
      savingRef.current = false;              // 🔓 ne plus rester bloqué
    }
  };

  // Enregistrer = envoyer toutes les pièces (brouillons + en cours)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // MODE ÉDITION : mise à jour d'une écriture existante
      if (editingEcriture && editingEcriture.id) {
        const lignesValides = lignes.filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0));
        if (lignesValides.length < 2) {
          throw new Error('Au moins 2 lignes sont requises');
        }
        const payload = {
          ...formData,
          entreprise_id: selectedEntreprise!,
          lignes: lignesValides.map(l => ({
            numero_compte: l.numero_compte,
            libelle_compte: l.libelle_compte,
            debit: Number(l.debit),
            credit: Number(l.credit),
          })),
        };
        await ecrituresApi.update(editingEcriture.id, payload);
        setSuccess('Écriture mise à jour');
        setEditingEcriture(null);
      } else {
        // MODE CRÉATION
        // 1) envoyer les brouillons
        for (const draft of draftPieces) {
          const payload = {
            ...draft.form,
            entreprise_id: selectedEntreprise!,
            lignes: draft.lignes.map(l => ({
              numero_compte: l.numero_compte,
              libelle_compte: l.libelle_compte,
              debit: Number(l.debit),
              credit: Number(l.credit),
            })),
          };
          dbg('POST /ecritures payload', payload);
          setDebugState((prev) => ({ ...prev, lastPayload: payload }));
          console.log('POST /ecritures (brouillon)', payload);
          await ecrituresApi.create(payload);
        }

        // 2) envoyer la pièce affichée si elle a du contenu
        const lignesValides = lignes.filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0));
        if (lignesValides.length >= 2) {
          const payload = {
            ...formData,
            entreprise_id: selectedEntreprise!,
            lignes: lignesValides.map(l => ({
              numero_compte: l.numero_compte,
              libelle_compte: l.libelle_compte,
              debit: Number(l.debit),
              credit: Number(l.credit),
            })),
          };
          dbg('POST /ecritures payload', payload);
          setDebugState((prev) => ({ ...prev, lastPayload: payload }));
          console.log('POST /ecritures (en cours)', payload);
          await ecrituresApi.create(payload);
        }

        // 3) reset file d'attente et préparer pièce suivante
        setDraftPieces([]);
        const newNextNum = (nextNumPiece ? String(parseInt(nextNumPiece) + 1).padStart(4, '0') : '0001');
        setNextNumPiece(newNextNum);
        setSuccess('Toutes les écritures ont été enregistrées.');
      }

      // Reset formulaire
      setFormData({
        journal_id: formData.journal_id,
        exercice_id: formData.exercice_id,
        date_ecriture: `${saisieMonth}-01`,
        numero_piece: nextNumPiece,
        libelle: '',
      });
      setLignes([
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
      ]);
      setUserEditedLines(new Set());

      await loadEcritures();
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg = err?.message || data?.message || 'Erreur lors de l\'enregistrement';
      dbg('POST /ecritures ERROR', { status, data, msg });

      setDebugState((prev) => ({
        ...prev,
        lastError: { msg, status, data },
      }));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const addLigne = () => {
    const lib = lignes[0]?.libelle_compte || formData.libelle || '';
    setLignes([...lignes, { numero_compte: '', libelle_compte: lib, debit: 0, credit: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 2) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const calcAndApplyTVA = (
    lines: LigneEcriture[],
    index: number,
    codeCompte: string,
    libCompte?: string
  ) => {
    if (!codeCompte || index <= 0) return lines;
    if (!(codeCompte.startsWith('4456') || codeCompte.startsWith('4457'))) return lines;

    const newLignes = [...lines];
    const ligneBase = newLignes[index - 1] || { debit: 0, credit: 0 };
    const montantTTC = Number(ligneBase.debit || ligneBase.credit || 0);

    const taux = detectTVARate({
      libCompte,
      libLigne: newLignes[index]?.libelle_compte,
      libGlobal: formData.libelle,
      fallback: 0.20,
    });

    console.log('🔍 Détection TVA:', {
      codeCompte,
      libCompte,
      libLigne: newLignes[index]?.libelle_compte,
      libGlobal: formData.libelle,
      taux,
      montantTTC
    });

    if (montantTTC > 0 && taux > 0) {
      // Calcul de la TVA d'abord
      const montantHTCalcule = parseFloat((montantTTC / (1 + taux)).toFixed(2));
      const montantTVA = parseFloat((montantHTCalcule * taux).toFixed(2));
      // Puis HT = TTC - TVA (pour éviter les erreurs d'arrondi)
      const montantHT = parseFloat((montantTTC - montantTVA).toFixed(2));

      console.log('💰 Calcul TVA:', {
        montantTTC,
        taux,
        montantTVA,
        montantHT: `${montantTTC} - ${montantTVA} = ${montantHT}`
      });

      if (codeCompte.startsWith('4456')) {
        newLignes[index] = { ...newLignes[index], debit: montantTVA, credit: 0 };
      } else {
        newLignes[index] = { ...newLignes[index], credit: montantTVA, debit: 0 };
      }

      // ---- Remplissage auto de la ligne HT (L3) sans écraser l'utilisateur ----
      const libEcriture = newLignes[0]?.libelle_compte || formData.libelle || '';
      const next = newLignes[index + 1];
      const editedNext = userEditedLines.has(index + 1);

      // Achats (4456) -> 6xx en DEBIT (par défaut 607)
      if (codeCompte.startsWith('4456')) {
        if (next && (/^6/.test(next.numero_compte || ''))) {
          // Ne pas écraser si l'utilisateur a modifié cette ligne
          if (!editedNext) {
            newLignes[index + 1] = {
              ...next,
              numero_compte: next.numero_compte || '607',
              libelle_compte: next.libelle_compte || libEcriture,
              debit: montantHT,
              credit: 0,
            };
          }
        } else if (!editedNext) {
          // Insérer une L3 607 si rien en 6xx juste après
          newLignes.splice(index + 1, 0, {
            numero_compte: '607',
            libelle_compte: libEcriture,
            debit: montantHT,
            credit: 0,
          });
        }
      }

      // Ventes (4457) -> 7xx en CREDIT (par défaut 707)
      if (codeCompte.startsWith('4457')) {
        if (next && (/^7/.test(next.numero_compte || ''))) {
          if (!editedNext) {
            newLignes[index + 1] = {
              ...next,
              numero_compte: next.numero_compte || '707',
              libelle_compte: next.libelle_compte || libEcriture,
              credit: montantHT,
              debit: 0,
            };
          }
        } else if (!editedNext) {
          newLignes.splice(index + 1, 0, {
            numero_compte: '707',
            libelle_compte: libEcriture,
            credit: montantHT,
            debit: 0,
          });
        }
      }
    }
    return newLignes;
  };

  const updateLigne = (index: number, field: keyof LigneEcriture, value: any) => {
    let newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };

    // Marquer la ligne comme éditée si l'utilisateur modifie debit/credit
    if (field === 'debit' || field === 'credit') {
      setUserEditedLines(prev => {
        const s = new Set(prev);
        s.add(index);
        return s;
      });
    }

    if (field === 'numero_compte') {
      // Chercher dans les comptes de l'entreprise ET le plan comptable
      const valueUpper = value.toUpperCase();
      const resultsStandard = searchCompte(value);
      const resultsEntreprise = comptesEntreprise
        .filter(c =>
          c.numero_compte.toUpperCase().startsWith(valueUpper) ||
          c.libelle.toLowerCase().includes(value.toLowerCase())
        )
        .map(c => ({ code: c.numero_compte, libelle: c.libelle }));

      // Combiner les résultats (entreprise en premier)
      const allResults = [...resultsEntreprise, ...resultsStandard]
        .filter((item, index, self) =>
          index === self.findIndex(t => t.code === item.code)
        )
        .slice(0, 10);


      setSuggestions(prev => ({ ...prev, [index]: allResults }));
      setShowSuggestions(prev => ({ ...prev, [index]: value.length > 0 && allResults.length > 0 }));

      // Vérifier d'abord si le compte existe dans la base de l'entreprise
      const compteEntreprise = comptesEntreprise.find(c => c.numero_compte === value);
      const exactMatch = getLibelleCompte(value);

      // Applique le calcul TVA si besoin (que le compte existe en base ou pas)
      newLignes = calcAndApplyTVA(
        newLignes,
        index,
        value,
        compteEntreprise?.libelle
      );

      // --- Remplissage initial du libellé ligne 1 (une seule fois si vide) ---
      if (index === 0) {
        const libFirst = (newLignes[0]?.libelle_compte || '').trim();
        const libGlobal = (formData.libelle || '').trim();
        const libFromAccount = (compteEntreprise?.libelle || exactMatch || '').trim();

        if (!libFirst && !libGlobal && libFromAccount) {
          newLignes[0] = { ...newLignes[0], libelle_compte: libFromAccount };
          setFormData(prev => ({ ...prev, libelle: libFromAccount }));
        }
      }

      // Focus automatique selon le type de compte
      if (compteEntreprise || exactMatch) {
        if (value.startsWith('4456') || value.startsWith('4457')) {
          // Pour les comptes TVA, aller à la ligne suivante
          setTimeout(() => {
            if (index === lignes.length - 1) {
              addLigne();
            }
            setTimeout(() => {
              const nextInput = document.querySelector(`input[data-compte-index="${index + 1}"]`) as HTMLInputElement;
              if (nextInput) nextInput.focus();
            }, 50);
          }, 100);
        } else if (value.startsWith('4')) {
          // Pour les autres comptes classe 4 (fournisseurs), aller au crédit
          setTimeout(() => {
            const creditInput = document.querySelector(`input[data-credit-index="${index}"]`) as HTMLInputElement;
            if (creditInput) creditInput.focus();
          }, 100);
        }
      }
    }

    setLignes(newLignes);
    // Mettre à jour le libellé global UNIQUEMENT si on modifie la première ligne
    if (index === 0) {
      updateLibelleAuto(newLignes);
    }
  };

  const checkNewAccount = (index: number, value: string) => {
    if (value.length < 3) return;

    const compteEntreprise = comptesEntreprise.find(c => c.numero_compte === value);
    const exactMatch = getLibelleCompte(value);

    // Si le compte n'existe ni dans l'entreprise ni dans le plan comptable
    // On vérifie uniquement si le compte exact n'existe pas
    if (!compteEntreprise && !exactMatch) {
      const isTVA = value.startsWith('4456') || value.startsWith('4457');
      setPendingAccount({ index, code: value, libelle: '', taux_tva: isTVA ? '20' : undefined });
    }
  };

  const selectSuggestion = (index: number, code: string, libelle: string) => {
    let newLignes = [...lignes];
    newLignes[index] = {
      ...newLignes[index],
      numero_compte: code
      // ❌ Ne pas toucher au libelle_compte - on garde celui de la ligne 1
    };
    setShowSuggestions(prev => ({ ...prev, [index]: false }));

    // Calcul TVA si 4456/4457 choisi via suggestion
    const libCompteEntreprise = comptesEntreprise.find(c => c.numero_compte === code)?.libelle;
    newLignes = calcAndApplyTVA(newLignes, index, code, libCompteEntreprise);

    // --- Remplissage initial du libellé ligne 1 si vide (via suggestion) ---
    if (index === 0) {
      const libFirst = (newLignes[0]?.libelle_compte || '').trim();
      const libGlobal = (formData.libelle || '').trim();
      const libFromAccount = (libelle || '').trim();

      if (!libFirst && !libGlobal && libFromAccount) {
        newLignes[0] = { ...newLignes[0], libelle_compte: libFromAccount };
        setFormData(prev => ({ ...prev, libelle: libFromAccount }));
      }
    }

    setLignes(newLignes);

    // Si on modifie la 1ère ligne, pousse dans le libellé global + recopie sur les autres
    if (index === 0) {
      updateLibelleAuto(newLignes);
    }

    // Focus automatique selon le type de compte
    if (code.startsWith('4456') || code.startsWith('4457')) {
      // Pour les comptes TVA, aller à la ligne suivante
      setTimeout(() => {
        if (index === lignes.length - 1) {
          addLigne();
        }
        setTimeout(() => {
          const nextInput = document.querySelector(`input[data-compte-index="${index + 1}"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 50);
      }, 100);
    } else if (code.startsWith('4')) {
      // Pour les autres comptes classe 4, aller au crédit
      setTimeout(() => {
        const creditInput = document.querySelector(`input[data-credit-index="${index}"]`) as HTMLInputElement;
        if (creditInput) creditInput.focus();
      }, 100);
    }
  };

  const updateLibelleAuto = (currentLignes: LigneEcriture[]) => {
    // Toujours mettre à jour le libellé global avec celui de la première ligne
    const premiereLigne = currentLignes[0];
    if (premiereLigne?.libelle_compte) {
      setFormData(prev => ({ ...prev, libelle: premiereLigne.libelle_compte }));

      // Copier le libellé de la première ligne sur toutes les autres lignes (sauf si déjà rempli)
      const newLignes = currentLignes.map((ligne, index) => {
        if (index > 0 && !ligne.libelle_compte) {
          return { ...ligne, libelle_compte: premiereLigne.libelle_compte };
        }
        return ligne;
      });

      setLignes(newLignes);
    }
  };

  const totalDebit = lignes.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lignes.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const confirmNewAccount = async (libelle: string) => {
    if (pendingAccount && selectedEntreprise) {
      const newLignes = [...lignes];

      // Construire le libellé avec le taux TVA si applicable
      let finalLibelle = libelle;
      if (pendingAccount.taux_tva) {
        finalLibelle = `${libelle} ${pendingAccount.taux_tva}%`;
      }

      newLignes[pendingAccount.index] = {
        ...newLignes[pendingAccount.index],
        numero_compte: pendingAccount.code
        // ✅ on garde le libellé déjà saisi (ou copié depuis la 1ère ligne)
      };

      // Seed uniquement si 1ère ligne vide (comportement que tu souhaites)
      if (pendingAccount.index === 0) {
        const libFirst = (newLignes[0]?.libelle_compte || '').trim();
        const libGlobal = (formData.libelle || '').trim();
        if (!libFirst && !libGlobal && finalLibelle.trim()) {
          newLignes[0] = { ...newLignes[0], libelle_compte: finalLibelle.trim() };
          setFormData(prev => ({ ...prev, libelle: finalLibelle.trim() }));
        }
      }

      setLignes(newLignes);

      // Créer le compte dans la base de données
      try {
        await comptesApi.create({
          entreprise_id: selectedEntreprise,
          numero_compte: pendingAccount.code,
          libelle: finalLibelle
        });

        // Recharger tous les comptes depuis le backend
        await loadComptes();
      } catch (err) {
        console.error('Erreur création compte:', err);
        setError('Erreur lors de la création du compte');
      }

      // Si c'est un compte TVA, ajouter automatiquement une ligne avec le bon sens
      if (pendingAccount.code.startsWith('4456') || pendingAccount.code.startsWith('4457')) {
        const currentIndex = pendingAccount.index;
        const ligneBase = newLignes[currentIndex - 1] || { debit: 0, credit: 0 };
        const montantHT = Number(ligneBase.debit || ligneBase.credit || 0);

        const tauxTVA = parseFloat(String(pendingAccount.taux_tva).replace(',', '.')) / 100 || 0.20;
        const montantTVA = parseFloat((montantHT * tauxTVA).toFixed(2));

        const libEcriture = newLignes[0]?.libelle_compte || formData.libelle || '';
        const nouvelleLigne: LigneEcriture = {
          numero_compte: pendingAccount.code,
          libelle_compte: libEcriture,   // ✅ libellé de l'écriture
          debit: pendingAccount.code.startsWith('4456') ? montantTVA : 0,
          credit: pendingAccount.code.startsWith('4457') ? montantTVA : 0,
        };

        if (currentIndex === lignes.length - 1) {
          setLignes([...newLignes, nouvelleLigne]);
        } else {
          newLignes[currentIndex + 1] = nouvelleLigne;
          setLignes(newLignes);
        }
      }

      setPendingAccount(null);

      // Focus sur crédit si compte commence par 4456 (TVA)
      if (pendingAccount.code.startsWith('4456')) {
        setTimeout(() => {
          const creditInput = document.querySelector(`input[data-credit-index="${pendingAccount.index}"]`) as HTMLInputElement;
          if (creditInput) creditInput.focus();
        }, 100);
      } else if (pendingAccount.code.startsWith('4')) {
        // Autres comptes classe 4
        setTimeout(() => {
          const creditInput = document.querySelector(`input[data-credit-index="${pendingAccount.index}"]`) as HTMLInputElement;
          if (creditInput) creditInput.focus();
        }, 100);
      }
    }
  };

  const cancelNewAccount = () => {
    if (pendingAccount) {
      const newLignes = [...lignes];
      newLignes[pendingAccount.index] = {
        ...newLignes[pendingAccount.index],
        numero_compte: '',
        libelle_compte: ''
      };
      setLignes(newLignes);
      setPendingAccount(null);
    }
  };

  const handleImportFEC = async () => {
    if (!importFile || !selectedEntreprise) return;

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await fecApi.importFEC(importFile, selectedEntreprise, formData.exercice_id);
      setImportResult(result);
      if (result.success && result.imported > 0) {
        setSuccess(`${result.imported} écriture(s) importée(s) avec succès`);
        // Recharger les écritures
        await loadEcritures();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  const menuItems = [
    { id: 'saisie' as Page, label: 'Saisie rapide', icon: '⚡' },
    { id: 'liste' as Page, label: 'Liste écritures', icon: '📋' },
    { id: 'comptes' as Page, label: 'Comptes', icon: '💰' },
    { id: 'journaux' as Page, label: 'Journaux', icon: '📖' },
    { id: 'balances' as Page, label: 'Balances', icon: '⚖️' },
    { id: 'grands-livres' as Page, label: 'Grands Livres', icon: '📚' },
    { id: 'import-fec' as Page, label: 'Import FEC', icon: '📥' },
    { id: 'entreprises' as Page, label: 'Entreprises', icon: '🏢' },
    { id: 'rapports' as Page, label: 'Rapports', icon: '📊' },
  ];

  const topMenus = [
    {
      label: 'Fichier',
      items: [
        { label: 'Créer une entreprise…', action: () => setCurrentPage('entreprises') },
        { label: 'Modifier l\'entreprise…', action: () => setCurrentPage('entreprises') },
        { label: 'Supprimer une entreprise…', action: () => setCurrentPage('entreprises') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Créer un dossier de comptabilité…', action: () => alert('Création de dossier à venir') },
        { label: 'Ouvrir la comptabilité d\'une entreprise…', action: () => setCurrentPage('entreprises') },
        { label: 'Fermer la comptabilité en cours', action: () => setSelectedEntreprise(null) },
        { label: 'Vérifier la comptabilité en cours…', action: () => alert('Vérification à venir') },
        { label: 'Supprimer un dossier de comptabilité…', action: () => alert('Suppression de dossier à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Importer…', action: () => setCurrentPage('import-fec') },
        { label: 'Exporter…', action: () => alert('Export à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Gérer les relevés bancaires…', action: () => alert('Gestion des relevés à venir') },
        { label: 'Intégrer les relevés bancaires…', action: () => alert('Intégration des relevés à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Liste des entreprises…', action: () => setCurrentPage('entreprises') },
        { label: 'Liste des institutions…', action: () => alert('Liste des institutions à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Format d\'impression…', action: () => alert('Format d\'impression à venir') },
        { label: 'Imprimer…', action: () => window.print() },
      ]
    },
    {
      label: 'Édition',
      items: [
        { label: 'Saisie rapide', action: () => setCurrentPage('saisie') },
        { label: 'Nouvelle écriture', action: () => setCurrentPage('saisie') },
        { label: 'Modifier écriture', action: () => setCurrentPage('liste') },
      ]
    },
    {
      label: 'Paramétrage',
      items: [
        { label: 'Entreprises', action: () => setCurrentPage('entreprises') },
        { label: 'Plan comptable', action: () => setCurrentPage('comptes') },
        { label: 'Journaux', action: () => setCurrentPage('journaux') },
      ]
    },
    {
      label: 'Écritures',
      items: [
        { label: 'Saisie au kilomètre', action: () => setCurrentPage('saisie') },
        { label: 'Liste des écritures', action: () => setCurrentPage('liste') },
        { label: 'Rechercher', action: () => setCurrentPage('liste') },
      ]
    },
    {
      label: 'Comptes',
      items: [
        { label: 'Plan comptable', action: () => setCurrentPage('comptes') },
        { label: 'Consultation compte', action: () => setCurrentPage('comptes') },
      ]
    },
    {
      label: 'États',
      items: [
        { label: 'Balance générale', action: () => setCurrentPage('balances') },
        { label: 'Grand livre', action: () => setCurrentPage('grands-livres') },
        { label: 'Journaux', action: () => setCurrentPage('journaux') },
        { label: 'Rapports', action: () => setCurrentPage('rapports') },
      ]
    },
    {
      label: 'Modèles',
      items: [
        { label: 'Écritures types', action: () => alert('Modèles à venir') },
        { label: 'Abonnements', action: () => alert('Abonnements à venir') },
      ]
    },
    {
      label: 'Fenêtre',
      items: [
        { label: 'Réorganiser', action: () => {} },
      ]
    },
    {
      label: 'Aide',
      items: [
        { label: 'Documentation', action: () => window.open('https://github.com/alain2907/comptabilite-france', '_blank') },
        { label: 'À propos', action: () => alert('Comptabilité France v1.0\nGestion comptable française') },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu horizontal classique */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-2">
          <div className="flex items-center h-10">
            {/* Menus déroulants */}
            <div className="flex items-center space-x-0">
              {topMenus.map((menu) => (
                <div key={menu.label} className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                    onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                  >
                    {menu.label}
                  </button>
                  {openMenu === menu.label && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div className="absolute left-0 mt-0 w-56 bg-white border border-gray-200 shadow-lg z-20 py-1">
                        {menu.items.map((item, idx) => (
                          item.separator ? (
                            <div key={idx} className="border-t border-gray-200 my-1" />
                          ) : (
                            <button
                              key={idx}
                              onClick={() => {
                                item.action();
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            >
                              {item.label}
                            </button>
                          )
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Sélecteur d'entreprise à droite */}
            {selectedEntreprise && entreprises.length > 0 && (
              <div className="ml-auto flex items-center space-x-2 text-sm">
                <span className="text-gray-600">Entreprise :</span>
                <select
                  value={selectedEntreprise}
                  onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.raison_sociale}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* PAGE LANDING */}
          {currentPage === 'landing' && (
            <Landing
              entreprises={entreprises}
              setCurrentPage={setCurrentPage}
            />
          )}

          {/* PAGE DASHBOARD */}
          {currentPage === 'dashboard' && (
            <Dashboard
              entreprises={entreprises}
              selectedEntreprise={selectedEntreprise}
              selectedExercice={selectedExercice}
              setCurrentPage={setCurrentPage}
            />
          )}

          {/* ANCIEN DASHBOARD - À SUPPRIMER */}
          {false && currentPage === 'dashboard' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              {selectedEntreprise && selectedExercice ? (
                <>
                  {/* En-tête avec infos entreprise */}
                  <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                          {entreprises.find(e => e.id === selectedEntreprise)?.raison_sociale}
                        </h2>
                        <div className="text-sm text-gray-600 space-y-1">
                          {entreprises.find(e => e.id === selectedEntreprise)?.siret && (
                            <p>SIRET: {entreprises.find(e => e.id === selectedEntreprise)?.siret}</p>
                          )}
                          {entreprises.find(e => e.id === selectedEntreprise)?.forme_juridique && (
                            <p>Forme juridique: {entreprises.find(e => e.id === selectedEntreprise)?.forme_juridique}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-semibold text-blue-900">
                          Exercice {(() => {
                            const ent = entreprises.find(e => e.id === selectedEntreprise);
                            const ex = ent?.exercices?.find((e: any) => e.id === selectedExercice);
                            return ex?.annee || '';
                          })()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {(() => {
                            const ent = entreprises.find(e => e.id === selectedEntreprise);
                            const ex = ent?.exercices?.find((e: any) => e.id === selectedExercice);
                            if (!ex) return '';
                            return `${new Date(ex.date_debut).toLocaleDateString('fr-FR')} → ${new Date(ex.date_fin).toLocaleDateString('fr-FR')}`;
                          })()}
                        </p>
                        {(() => {
                          const ent = entreprises.find(e => e.id === selectedEntreprise);
                          const ex = ent?.exercices?.find((e: any) => e.id === selectedExercice);
                          return ex?.cloture && (
                            <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Exercice clôturé
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Cartes de statistiques */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <h3 className="text-sm font-medium text-green-800 mb-2">Produits d'exploitation</h3>
                      <p className="text-3xl font-bold text-green-900">—</p>
                      <p className="text-xs text-green-600 mt-1">Comptes 70-74</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                      <h3 className="text-sm font-medium text-red-800 mb-2">Charges d'exploitation</h3>
                      <p className="text-3xl font-bold text-red-900">—</p>
                      <p className="text-xs text-red-600 mt-1">Comptes 60-64</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-800 mb-2">Résultat d'exploitation</h3>
                      <p className="text-3xl font-bold text-blue-900">—</p>
                      <p className="text-xs text-blue-600 mt-1">Produits - Charges</p>
                    </div>
                  </div>

                  {/* Soldes intermédiaires de gestion */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Soldes Intermédiaires de Gestion (SIG)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Indicateur
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              Montant (€)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">Ventes de marchandises</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">- Coût d'achat des marchandises vendues</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-blue-50 font-semibold">
                            <td className="px-6 py-4 text-sm text-blue-900">= Marge commerciale</td>
                            <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">Production vendue</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">+ Production stockée</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">+ Production immobilisée</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-blue-50 font-semibold">
                            <td className="px-6 py-4 text-sm text-blue-900">= Production de l'exercice</td>
                            <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">- Consommations de l'exercice</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-green-50 font-semibold">
                            <td className="px-6 py-4 text-sm text-green-900">= Valeur ajoutée</td>
                            <td className="px-6 py-4 text-sm text-right text-green-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">- Charges de personnel</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-blue-50 font-semibold">
                            <td className="px-6 py-4 text-sm text-blue-900">= Excédent brut d'exploitation (EBE)</td>
                            <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">± Autres produits et charges</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">- Dotations aux amortissements</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-green-50 font-bold">
                            <td className="px-6 py-4 text-sm text-green-900">= Résultat d'exploitation</td>
                            <td className="px-6 py-4 text-sm text-right text-green-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">± Résultat financier</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-blue-50 font-semibold">
                            <td className="px-6 py-4 text-sm text-blue-900">= Résultat courant avant impôts</td>
                            <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">± Résultat exceptionnel</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">- Impôts sur les bénéfices</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">—</td>
                          </tr>
                          <tr className="bg-gradient-to-r from-green-100 to-green-50 font-bold text-lg">
                            <td className="px-6 py-4 text-green-900">= Résultat net</td>
                            <td className="px-6 py-4 text-right text-green-900 font-mono">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Boutons d'actions rapides */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setCurrentPage('saisie')}
                      className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                    >
                      ✏️ Nouvelle saisie
                    </button>
                    <button
                      onClick={() => setCurrentPage('liste')}
                      className="p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
                    >
                      📋 Liste écritures
                    </button>
                    <button
                      onClick={() => setCurrentPage('balances')}
                      className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
                    >
                      ⚖️ Balance
                    </button>
                    <button
                      onClick={() => setCurrentPage('grands-livres')}
                      className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition"
                    >
                      📖 Grand livre
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">Aucune entreprise ou exercice sélectionné</p>
                  <button
                    onClick={() => setCurrentPage('entreprises')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Sélectionner une entreprise
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAGE SAISIE RAPIDE */}
          {currentPage === 'saisie' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingEcriture ? '✏️ Modification d\'écriture' : 'Saisie rapide au kilomètre'}
                </h2>
                {editingEcriture && (
                  <button
                    onClick={() => {
                      setEditingEcriture(null);
                      setFormData({
                        journal_id: 1,
                        exercice_id: 1,
                        date_ecriture: new Date().toISOString().split('T')[0],
                        numero_piece: nextNumPiece,
                        libelle: '',
                      });
                      setLignes([
                        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
                        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
                      ]);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Annuler
                  </button>
                )}
              </div>

              {/* Barre de contexte : Journal • Mois de saisie • Exercice */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Journal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Journal</label>
                  <select
                    value={formData.journal_id}
                    onChange={(e) => setFormData({ ...formData, journal_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value={1}>Achats</option>
                    <option value={2}>Ventes</option>
                    <option value={3}>Banque</option>
                    <option value={4}>Caisse</option>
                    <option value={5}>OD</option>
                  </select>
                </div>

                {/* Mois de saisie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois de saisie</label>
                  <input
                    type="month"
                    value={saisieMonth}
                    onChange={(e) => setSaisieMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Exercice en cours (lecture seule) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exercice en cours</label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    Exercice {exerciceLabel}
                  </div>
                </div>
              </div>

              <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                💡 Saisie rapide : Date • Compte • N° Pièce • Libellé • Débit • Crédit • Tab ou Entrée pour ligne suivante
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Tableau de saisie rapide */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="p-2 text-left text-xs font-semibold">Date</th>
                        <th className="p-2 text-left text-xs font-semibold">Compte</th>
                        <th className="p-2 text-left text-xs font-semibold">N° Pièce</th>
                        <th className="p-2 text-left text-xs font-semibold">Libellé</th>
                        <th className="p-2 text-right text-xs font-semibold">Débit</th>
                        <th className="p-2 text-right text-xs font-semibold">Crédit</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((ligne, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-1">
                            <input
                              type="date"
                              value={formData.date_ecriture}
                              onChange={(e) => setFormData({ ...formData, date_ecriture: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="p-1 relative">
                            <input
                              type="text"
                              placeholder="Ex: 401000"
                              value={ligne.numero_compte}
                              onChange={(e) => updateLigne(index, 'numero_compte', e.target.value)}
                              onBlur={(e) => {
                                // Fermer les suggestions après un délai pour permettre le clic
                                setTimeout(() => {
                                  setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                }, 200);
                                checkNewAccount(index, e.target.value);
                              }}
                              onFocus={() => setShowSuggestions(prev => ({ ...prev, [index]: suggestions[index]?.length > 0 }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  e.preventDefault();
                                  setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                  checkNewAccount(index, ligne.numero_compte);
                                  const libelleInput = document.querySelector(`input[data-libelle-index="${index}"]`) as HTMLInputElement;
                                  if (libelleInput) libelleInput.focus();
                                }
                              }}
                              data-compte-index={index}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                            />
                            {showSuggestions[index] && suggestions[index]?.length > 0 && (
                              <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                                {suggestions[index].map((sugg, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectSuggestion(index, sugg.code, sugg.libelle);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs"
                                  >
                                    <span className="font-mono font-semibold">{sugg.code}</span>
                                    <span className="ml-2 text-gray-600">{sugg.libelle}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="Auto"
                              value={formData.numero_piece}
                              onChange={(e) => setFormData({ ...formData, numero_piece: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="Libellé..."
                              value={ligne.libelle_compte}
                              onChange={(e) => updateLigne(index, 'libelle_compte', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  e.preventDefault();
                                  const debitInput = document.querySelector(`input[data-debit-index="${index}"]`) as HTMLInputElement;
                                  if (debitInput) debitInput.focus();
                                }
                              }}
                              data-libelle-index={index}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="0.00"
                              value={(() => {
                                // Si le champ est en focus, afficher la valeur brute
                                const isFocused = focusedField?.index === index && focusedField?.field === 'debit';
                                if (isFocused) {
                                  return ligne.debit || '';
                                }
                                // Sinon, formatter avec .00
                                if (!ligne.debit) return '';
                                return Number(ligne.debit).toFixed(2);
                              })()}
                              onFocus={() => setFocusedField({ index, field: 'debit' })}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                updateLigne(index, 'debit', val);
                              }}
                              onBlur={(e) => {
                                setFocusedField(null);
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  updateLigne(index, 'debit', parseFloat(val.toFixed(2)));
                                } else if (e.target.value === '' || val === 0) {
                                  updateLigne(index, 'debit', 0);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  e.preventDefault();
                                  const creditInput = document.querySelector(`input[data-credit-index="${index}"]`) as HTMLInputElement;
                                  if (creditInput) creditInput.focus();
                                }
                              }}
                              data-debit-index={index}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right font-mono"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="0.00"
                              value={(() => {
                                // Si le champ est en focus, afficher la valeur brute
                                const isFocused = focusedField?.index === index && focusedField?.field === 'credit';
                                if (isFocused) {
                                  return ligne.credit || '';
                                }
                                // Sinon, formatter avec .00
                                if (!ligne.credit) return '';
                                return Number(ligne.credit).toFixed(2);
                              })()}
                              onFocus={() => setFocusedField({ index, field: 'credit' })}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                updateLigne(index, 'credit', val);
                              }}
                              onBlur={(e) => {
                                setFocusedField(null);
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  updateLigne(index, 'credit', parseFloat(val.toFixed(2)));
                                } else if (e.target.value === '' || val === 0) {
                                  updateLigne(index, 'credit', 0);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  e.preventDefault();

                                  // Recalcule l'équilibre *maintenant*
                                  const creditNow = parseFloat((e.currentTarget.value || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
                                  const totalD = lignes.reduce((s, l) => s + Number(l.debit || 0), 0);
                                  const totalC = lignes.reduce((s, l, i) => s + (i === index ? creditNow : Number(l.credit || 0)), 0);
                                  const balancedNow = Math.abs(totalD - totalC) < 0.01 && (totalD > 0 || totalC > 0);

                                  if (e.key === 'Enter' && balancedNow) {
                                    // ✅ nouvelle pièce locale (sans enregistrement serveur)
                                    startNextPieceLocal();
                                    return;
                                  }

                                  // sinon navigation ligne suivante
                                  if (index === lignes.length - 1) addLigne();
                                  setTimeout(() => {
                                    const next = document.querySelector(`input[data-compte-index="${index + 1}"]`) as HTMLInputElement;
                                    if (next) next.focus();
                                  }, 50);
                                }
                              }}
                              data-credit-index={index}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right font-mono"
                            />
                          </td>
                          <td className="p-1 text-center">
                            {lignes.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeLigne(index)}
                                className="text-red-600 hover:text-red-800 text-lg font-bold"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                        <td colSpan={4} className="p-2 text-right text-sm">TOTAUX:</td>
                        <td className={'p-2 text-right text-sm font-mono ' + (!isBalanced && totalDebit > 0 ? 'text-red-600' : 'text-green-600')}>
                          {totalDebit.toFixed(2)} €
                        </td>
                        <td className={'p-2 text-right text-sm font-mono ' + (!isBalanced && totalCredit > 0 ? 'text-red-600' : 'text-green-600')}>
                          {totalCredit.toFixed(2)} €
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={addLigne}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                  >
                    + Ajouter une ligne
                  </button>

                  {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                    <span className="text-red-600 text-sm font-semibold">⚠️ Non équilibrée</span>
                  )}
                  {isBalanced && totalDebit > 0 && (
                    <span className="text-green-600 text-sm font-semibold">✓ Équilibrée</span>
                  )}
                </div>

                {formData.libelle && (
                  <div className="mb-4 text-sm text-gray-600">
                    <span className="text-gray-500">Libellé global :</span>{' '}
                    <span className="font-medium">{formData.libelle}</span>
                  </div>
                )}

                <div className="pt-2">
                  {draftPieces.length > 0 && (
                    <div className="mb-2 text-sm text-blue-600 font-medium">
                      📝 {draftPieces.length} pièce{draftPieces.length > 1 ? 's' : ''} en attente
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
                  >
                    {loading ? 'Enregistrement...' : `Enregistrer${draftPieces.length > 0 ? ` (${draftPieces.length + (lignes.filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0)).length >= 2 ? 1 : 0)})` : ''}`}
                  </button>
                </div>

                {showDebug && (
                  <div className="mt-4 border border-amber-300 bg-amber-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <strong>🛠 Debug (Cmd+D pour masquer)</strong>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => {
                          setDebugState({ events: [] });
                          dbg('clear', 'events cleared');
                        }}
                      >
                        Vider
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div>
                        <div className="font-medium mb-1">Pièces en attente</div>
                        <pre className="text-xs overflow-auto max-h-48 bg-white p-2 rounded border">
{JSON.stringify(draftPieces, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="font-medium mb-1">Dernier payload POST</div>
                        <pre className="text-xs overflow-auto max-h-48 bg-white p-2 rounded border">
{JSON.stringify(debugState.lastPayload, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <div className="font-medium mb-1">Dernière erreur API</div>
                        <pre className="text-xs overflow-auto max-h-48 bg-white p-2 rounded border">
{JSON.stringify(debugState.lastError, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="font-medium mb-1">Événements</div>
                      <div className="space-y-1 max-h-56 overflow-auto">
                        {debugState.events.slice().reverse().map((e, i) => (
                          <div key={i} className="bg-white rounded border p-2">
                            <div className="text-xs text-gray-500">
                              {new Date(e.t).toLocaleTimeString()} — {e.tag}
                            </div>
                            <pre className="text-xs overflow-auto">{JSON.stringify(e.data, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* MODAL DE VALIDATION NOUVEAU COMPTE */}
          {pendingAccount && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Nouveau compte</h3>
                <p className="text-gray-600 mb-4">
                  Ce compte n'existe pas dans le plan comptable.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° de compte
                  </label>
                  <input
                    type="text"
                    value={pendingAccount.code}
                    onChange={(e) => setPendingAccount({ ...pendingAccount, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Numéro de compte"
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Libellé du compte
                  </label>
                  <input
                    type="text"
                    value={pendingAccount.libelle}
                    onChange={(e) => setPendingAccount({ ...pendingAccount, libelle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Entrez le libellé du compte"
                  />
                </div>
                {pendingAccount.taux_tva !== undefined && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taux de TVA (%)
                    </label>
                    <select
                      value={pendingAccount.taux_tva}
                      onChange={(e) => setPendingAccount({ ...pendingAccount, taux_tva: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="20">20% (Taux normal)</option>
                      <option value="10">10% (Taux intermédiaire)</option>
                      <option value="5.5">5.5% (Taux réduit)</option>
                      <option value="2.1">2.1% (Taux super réduit)</option>
                    </select>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={cancelNewAccount}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => confirmNewAccount(pendingAccount.libelle)}
                    disabled={!pendingAccount.code.trim() || !pendingAccount.libelle.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    Créer le compte
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE LISTE - Choisir un dossier */}
          {currentPage === 'liste' && (
            <Liste
              entreprises={entreprises}
              setCurrentPage={setCurrentPage}
              setSelectedEntreprise={setSelectedEntreprise}
              setSelectedExercice={setSelectedExercice}
            />
          )}

          {/* PAGE ENTREPRISES */}
          {currentPage === 'entreprises' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestion des entreprises</h2>

              {/* Formulaire création entreprise */}
              <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-lg mb-4">Créer une nouvelle entreprise</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);
                  try {
                    // Créer l'entreprise
                    const newEntreprise = await entreprisesApi.create({
                      raison_sociale: formData.get('raison_sociale') as string,
                      siret: formData.get('siret') as string || undefined,
                      forme_juridique: formData.get('forme_juridique') as string || undefined,
                      adresse: formData.get('adresse') as string || undefined,
                      code_postal: formData.get('code_postal') as string || undefined,
                      ville: formData.get('ville') as string || undefined,
                    });

                    // Créer l'exercice associé
                    const dateDebut = formData.get('exercice_date_debut') as string;
                    const dateFin = formData.get('exercice_date_fin') as string;
                    const annee = new Date(dateDebut).getFullYear();

                    await fetch('http://localhost:3001/api/exercices', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        entreprise_id: newEntreprise.id,
                        annee: annee,
                        date_debut: dateDebut,
                        date_fin: dateFin,
                        cloture: false,
                      }),
                    });

                    setEntreprises([...entreprises, newEntreprise]);
                    setSelectedEntreprise(newEntreprise.id);
                    setSuccess('Entreprise et exercice créés avec succès !');
                    form.reset();
                  } catch (err) {
                    setError('Erreur lors de la création de l\'entreprise');
                  }
                }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raison sociale <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="raison_sociale"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                    <input
                      type="text"
                      name="siret"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
                    <select
                      name="forme_juridique"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="SARL">SARL</option>
                      <option value="SAS">SAS</option>
                      <option value="SASU">SASU</option>
                      <option value="EURL">EURL</option>
                      <option value="SA">SA</option>
                      <option value="SNC">SNC</option>
                      <option value="EI">Entreprise Individuelle</option>
                      <option value="MICRO">Micro-entreprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      name="adresse"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                    <input
                      type="text"
                      name="code_postal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                    <input
                      type="text"
                      name="ville"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début exercice <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="exercice_date_debut"
                      required
                      defaultValue={`${new Date().getFullYear()}-01-01`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin exercice <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="exercice_date_fin"
                      required
                      defaultValue={`${new Date().getFullYear()}-12-31`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Créer l'entreprise
                    </button>
                  </div>
                </form>
              </div>

              {/* Liste des entreprises */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Entreprises existantes</h3>
                {entreprises.length === 0 ? (
                  <p className="text-gray-500">Aucune entreprise créée pour le moment</p>
                ) : (
                  <div className="space-y-4">
                    {entreprises.map((e) => (
                      <div
                        key={e.id}
                        className={`p-4 rounded border transition ${
                          selectedEntreprise === e.id
                            ? 'bg-blue-50 border-blue-400 border-2'
                            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 cursor-pointer" onClick={() => setSelectedEntreprise(e.id)}>
                            <h3 className="font-semibold text-lg">{e.raison_sociale}</h3>
                            {e.siret && <p className="text-sm text-gray-600">SIRET: {e.siret}</p>}
                            {e.forme_juridique && <p className="text-sm text-gray-600">{e.forme_juridique}</p>}
                            {e.adresse && <p className="text-sm text-gray-600">{e.adresse}</p>}
                            {(e.code_postal || e.ville) && (
                              <p className="text-sm text-gray-600">{e.code_postal} {e.ville}</p>
                            )}
                            {e.exercices && e.exercices.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-1">Exercices comptables :</p>
                                {e.exercices.map((ex: any) => (
                                  <p key={ex.id} className="text-xs text-gray-600">
                                    📅 {ex.annee} : {new Date(ex.date_debut).toLocaleDateString('fr-FR')} → {new Date(ex.date_fin).toLocaleDateString('fr-FR')}
                                    {ex.cloture && <span className="ml-2 text-red-600 font-medium">(Clôturé)</span>}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedEntreprise === e.id && (
                              <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                                Active
                              </span>
                            )}
                            <button
                              onClick={async (ev) => {
                                ev.stopPropagation();
                                console.log('🔵 Bouton Ouvrir cliqué pour entreprise:', e.raison_sociale);

                                try {
                                  // Recharger les entreprises pour s'assurer d'avoir les exercices
                                  console.log('🔵 Chargement des entreprises...');
                                  const entreprisesReloaded = await entreprisesApi.getAll();
                                  console.log('🔵 Entreprises chargées:', entreprisesReloaded);
                                  setEntreprises(entreprisesReloaded);

                                  // Trouver l'entreprise rechargée
                                  const entrepriseReloaded = entreprisesReloaded.find(ent => ent.id === e.id);
                                  console.log('🔵 Entreprise trouvée:', entrepriseReloaded);
                                  console.log('🔵 Exercices de l\'entreprise:', entrepriseReloaded?.exercices);

                                  // Charger les exercices de l'entreprise
                                  if (entrepriseReloaded?.exercices && entrepriseReloaded.exercices.length > 0) {
                                    // Sélectionner le premier exercice non clôturé ou le premier exercice
                                    const exerciceOuvert = entrepriseReloaded.exercices.find((ex: any) => !ex.cloture) || entrepriseReloaded.exercices[0];
                                    console.log('🔵 Exercice sélectionné:', exerciceOuvert);

                                    // Important: tout faire en une seule fois pour éviter les re-rendus intermédiaires
                                    setSelectedExercice(exerciceOuvert.id);
                                    setSelectedEntreprise(e.id);
                                    console.log('🔵 Navigation vers dashboard...');
                                    setCurrentPage('dashboard');
                                  } else {
                                    console.log('🔴 Aucun exercice trouvé!');
                                    setError('Aucun exercice trouvé pour cette entreprise');
                                  }
                                } catch (err) {
                                  console.log('🔴 Erreur:', err);
                                  setError('Erreur lors du chargement de l\'entreprise');
                                  console.error(err);
                                }
                              }}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
                            >
                              📂 Ouvrir
                            </button>
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setEditingEntreprise(e);
                              }}
                              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (confirm(`Êtes-vous sûr de vouloir supprimer "${e.raison_sociale}" ?`)) {
                                  entreprisesApi.delete(e.id)
                                    .then(() => {
                                      setEntreprises(entreprises.filter(ent => ent.id !== e.id));
                                      if (selectedEntreprise === e.id) setSelectedEntreprise(null);
                                      setSuccess('Entreprise supprimée avec succès');
                                    })
                                    .catch(() => setError('Erreur lors de la suppression'));
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal de modification entreprise */}
              {editingEntreprise && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">Modifier l'entreprise</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      try {
                        const updated = await entreprisesApi.update(editingEntreprise.id, {
                          raison_sociale: formData.get('raison_sociale') as string,
                          siret: formData.get('siret') as string || undefined,
                          forme_juridique: formData.get('forme_juridique') as string || undefined,
                          adresse: formData.get('adresse') as string || undefined,
                          code_postal: formData.get('code_postal') as string || undefined,
                          ville: formData.get('ville') as string || undefined,
                        });
                        setEntreprises(entreprises.map(ent =>
                          ent.id === editingEntreprise.id ? { ...ent, ...updated } : ent
                        ));
                        setEditingEntreprise(null);
                        setSuccess('Entreprise modifiée avec succès');
                      } catch (err) {
                        setError('Erreur lors de la modification de l\'entreprise');
                      }
                    }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Raison sociale <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="raison_sociale"
                          defaultValue={editingEntreprise.raison_sociale}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                        <input
                          type="text"
                          name="siret"
                          defaultValue={editingEntreprise.siret || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
                        <select
                          name="forme_juridique"
                          defaultValue={editingEntreprise.forme_juridique || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="SARL">SARL</option>
                          <option value="SAS">SAS</option>
                          <option value="SASU">SASU</option>
                          <option value="EURL">EURL</option>
                          <option value="SA">SA</option>
                          <option value="SNC">SNC</option>
                          <option value="EI">Entreprise Individuelle</option>
                          <option value="MICRO">Micro-entreprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                        <input
                          type="text"
                          name="adresse"
                          defaultValue={editingEntreprise.adresse || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                        <input
                          type="text"
                          name="code_postal"
                          defaultValue={editingEntreprise.code_postal || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                        <input
                          type="text"
                          name="ville"
                          defaultValue={editingEntreprise.ville || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex space-x-3">
                        <button
                          type="submit"
                          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          Enregistrer les modifications
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEntreprise(null)}
                          className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAGE COMPTES */}
          {currentPage === 'comptes' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan comptable</h2>
              {selectedEntreprise ? (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {comptesEntreprise.length} compte(s) pour cette entreprise
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold">N° Compte</th>
                          <th className="text-left p-3 font-semibold">Libellé</th>
                          <th className="text-left p-3 font-semibold">Date création</th>
                          <th className="text-center p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comptesEntreprise.map((compte) => (
                          <tr key={compte.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3 font-mono">{compte.numero_compte}</td>
                            <td className="p-3">{compte.libelle}</td>
                            <td className="p-3 text-sm text-gray-500">
                              {new Date(compte.date_creation).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => loadMouvementsCompte(compte)}
                                className="text-green-600 hover:text-green-800 mr-3"
                                title="Voir les mouvements"
                              >
                                📊
                              </button>
                              <button
                                onClick={async () => {
                                  const newLibelle = prompt('Nouveau libellé :', compte.libelle);
                                  if (newLibelle && newLibelle !== compte.libelle && compte.id) {
                                    try {
                                      await comptesApi.update(compte.id, { libelle: newLibelle });
                                      await loadComptes();
                                      setSuccess('Compte mis à jour');
                                      setTimeout(() => setSuccess(null), 3000);
                                    } catch (err: any) {
                                      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour');
                                    }
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                                title="Éditer"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Supprimer le compte ${compte.numero_compte} - ${compte.libelle} ?`) && compte.id) {
                                    try {
                                      await comptesApi.delete(compte.id);
                                      await loadComptes();
                                      setSuccess('Compte supprimé');
                                      setTimeout(() => setSuccess(null), 3000);
                                    } catch (err: any) {
                                      setError(err?.response?.data?.message || 'Erreur lors de la suppression');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Veuillez sélectionner une entreprise</p>
              )}
            </div>
          )}

          {/* MODAL MOUVEMENTS COMPTE */}
          {selectedCompteForMouvements && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Mouvements du compte {selectedCompteForMouvements.numero_compte}
                    </h2>
                    <p className="text-gray-600 mt-1">{selectedCompteForMouvements.libelle}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCompteForMouvements(null);
                      setMouvementsCompte([]);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {mouvementsCompte.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">N° Pièce</th>
                          <th className="text-left p-3 font-semibold">Libellé</th>
                          <th className="text-right p-3 font-semibold">Débit</th>
                          <th className="text-right p-3 font-semibold">Crédit</th>
                          <th className="text-right p-3 font-semibold">Solde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mouvementsCompte.map((mouvement, index) => (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3 text-sm">
                              {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 font-mono text-sm">{mouvement.piece}</td>
                            <td className="p-3">{mouvement.libelle}</td>
                            <td className="p-3 text-right font-mono">
                              {mouvement.debit > 0 ? mouvement.debit.toFixed(2) : ''}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {mouvement.credit > 0 ? mouvement.credit.toFixed(2) : ''}
                            </td>
                            <td className={`p-3 text-right font-mono font-semibold ${
                              mouvement.solde >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {mouvement.solde.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                          <td colSpan={3} className="p-3">TOTAUX</td>
                          <td className="p-3 text-right font-mono">
                            {mouvementsCompte.reduce((sum, m) => sum + m.debit, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {mouvementsCompte.reduce((sum, m) => sum + m.credit, 0).toFixed(2)}
                          </td>
                          <td className={`p-3 text-right font-mono ${
                            mouvementsCompte[mouvementsCompte.length - 1]?.solde >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {mouvementsCompte[mouvementsCompte.length - 1]?.solde.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Aucun mouvement trouvé pour ce compte</p>
                )}
              </div>
            </div>
          )}

          {/* PAGE JOURNAUX */}
          {currentPage === 'journaux' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Journaux comptables</h2>
              {selectedEntreprise ? (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {journaux.length} journal(aux) pour cette entreprise
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold">Code</th>
                          <th className="text-left p-3 font-semibold">Libellé</th>
                          <th className="text-center p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journaux.map((journal) => (
                          <tr key={journal.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-3 font-mono font-bold">{journal.code}</td>
                            <td className="p-3">{journal.libelle}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => loadMouvementsJournal(journal)}
                                className="text-green-600 hover:text-green-800"
                                title="Voir les mouvements"
                              >
                                📊
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Veuillez sélectionner une entreprise</p>
              )}
            </div>
          )}

          {/* MODAL MOUVEMENTS JOURNAL */}
          {selectedJournal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Journal {selectedJournal.code} - {selectedJournal.libelle}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {mouvementsJournal.length} écriture(s)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJournal(null);
                      setMouvementsJournal([]);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {mouvementsJournal.length > 0 ? (
                  <div className="space-y-4">
                    {mouvementsJournal.map((ecriture) => {
                      const totalDebit = ecriture.lignes?.reduce((sum, l) => sum + (Number(l.debit) || 0), 0) || 0;
                      const totalCredit = ecriture.lignes?.reduce((sum, l) => sum + (Number(l.credit) || 0), 0) || 0;

                      return (
                        <div key={ecriture.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-gray-900">
                                Pièce n° {ecriture.numero_piece} - {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{ecriture.libelle}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (ecriture.id) {
                                    const ecritureFull = await ecrituresApi.getOne(ecriture.id);
                                    setEditingEcriture(ecritureFull);
                                    setSelectedJournal(null);
                                    setMouvementsJournal([]);
                                    setCurrentPage('saisie');
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800"
                                title="Éditer"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Supprimer l'écriture n° ${ecriture.numero_piece} ?`) && ecriture.id) {
                                    try {
                                      await ecrituresApi.delete(ecriture.id);
                                      await loadEcritures();
                                      loadMouvementsJournal(selectedJournal!);
                                      setSuccess('Écriture supprimée');
                                      setTimeout(() => setSuccess(null), 3000);
                                    } catch (err: any) {
                                      setError(err?.response?.data?.message || 'Erreur lors de la suppression');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Supprimer"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <table className="w-full border-collapse mt-2">
                            <thead>
                              <tr className="bg-white border-b border-gray-300">
                                <th className="text-left p-2 text-sm font-semibold">Compte</th>
                                <th className="text-left p-2 text-sm font-semibold">Libellé</th>
                                <th className="text-right p-2 text-sm font-semibold">Débit</th>
                                <th className="text-right p-2 text-sm font-semibold">Crédit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ecriture.lignes?.map((ligne, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                  <td className="p-2 font-mono text-sm">{ligne.numero_compte}</td>
                                  <td className="p-2 text-sm">{ligne.libelle_compte}</td>
                                  <td className="p-2 text-right font-mono text-sm">
                                    {ligne.debit > 0 ? Number(ligne.debit).toFixed(2) : ''}
                                  </td>
                                  <td className="p-2 text-right font-mono text-sm">
                                    {ligne.credit > 0 ? Number(ligne.credit).toFixed(2) : ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-white border-t-2 border-gray-300 font-bold">
                                <td colSpan={2} className="p-2 text-sm">TOTAUX</td>
                                <td className="p-2 text-right font-mono text-sm">{totalDebit.toFixed(2)}</td>
                                <td className="p-2 text-right font-mono text-sm">{totalCredit.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Aucune écriture trouvée pour ce journal</p>
                )}
              </div>
            </div>
          )}

          {/* PAGE BALANCES */}
          {currentPage === 'balances' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Balance comptable</h2>
              {selectedEntreprise ? (
                (() => {
                  // Calculer la balance : pour chaque compte, totaliser débit/crédit
                  const balanceMap = new Map<string, {
                    numero: string;
                    libelle: string;
                    debit: number;
                    credit: number;
                  }>();

                  ecritures.forEach(ecriture => {
                    ecriture.lignes?.forEach(ligne => {
                      const key = ligne.numero_compte;
                      if (!balanceMap.has(key)) {
                        balanceMap.set(key, {
                          numero: ligne.numero_compte,
                          libelle: ligne.libelle_compte,
                          debit: 0,
                          credit: 0,
                        });
                      }
                      const entry = balanceMap.get(key)!;
                      entry.debit += Number(ligne.debit) || 0;
                      entry.credit += Number(ligne.credit) || 0;
                    });
                  });

                  const balance = Array.from(balanceMap.values())
                    .sort((a, b) => a.numero.localeCompare(b.numero));

                  const totalDebit = balance.reduce((sum, item) => sum + item.debit, 0);
                  const totalCredit = balance.reduce((sum, item) => sum + item.credit, 0);

                  return (
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          {balance.length} compte(s) mouvementé(s)
                        </p>
                      </div>
                      {balance.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b-2 border-gray-300">
                                <th className="text-left p-3 font-semibold">N° Compte</th>
                                <th className="text-left p-3 font-semibold">Libellé</th>
                                <th className="text-right p-3 font-semibold">Débit</th>
                                <th className="text-right p-3 font-semibold">Crédit</th>
                                <th className="text-right p-3 font-semibold">Solde</th>
                              </tr>
                            </thead>
                            <tbody>
                              {balance.map((item) => {
                                const solde = item.debit - item.credit;
                                return (
                                  <tr key={item.numero} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-3 font-mono">{item.numero}</td>
                                    <td className="p-3">{item.libelle}</td>
                                    <td className="p-3 text-right font-mono">
                                      {item.debit > 0 ? item.debit.toFixed(2) : '-'}
                                    </td>
                                    <td className="p-3 text-right font-mono">
                                      {item.credit > 0 ? item.credit.toFixed(2) : '-'}
                                    </td>
                                    <td className={`p-3 text-right font-mono font-semibold ${
                                      solde > 0 ? 'text-green-600' : solde < 0 ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {solde.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                                <td colSpan={2} className="p-3">TOTAUX</td>
                                <td className="p-3 text-right font-mono">{totalDebit.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono">{totalCredit.toFixed(2)}</td>
                                <td className={`p-3 text-right font-mono ${
                                  Math.abs(totalDebit - totalCredit) < 0.01
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {(totalDebit - totalCredit).toFixed(2)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">Aucune écriture enregistrée</p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-500">Veuillez sélectionner une entreprise</p>
              )}
            </div>
          )}

          {/* PAGE GRANDS LIVRES */}
          {currentPage === 'grands-livres' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Grand Livre</h2>
              {selectedEntreprise ? (
                (() => {
                  // Regrouper les mouvements par compte
                  const compteMap = new Map<string, Array<{
                    date: string;
                    piece: string;
                    libelle: string;
                    debit: number;
                    credit: number;
                    solde: number;
                  }>>();

                  // Trier les écritures par date
                  const ecrituresSorted = [...ecritures].sort((a, b) =>
                    new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime()
                  );

                  // Calculer les mouvements par compte
                  const soldesCompte = new Map<string, number>();

                  ecrituresSorted.forEach(ecriture => {
                    ecriture.lignes?.forEach(ligne => {
                      const key = ligne.numero_compte;
                      if (!compteMap.has(key)) {
                        compteMap.set(key, []);
                        soldesCompte.set(key, 0);
                      }

                      const debit = Number(ligne.debit) || 0;
                      const credit = Number(ligne.credit) || 0;
                      const soldeActuel = soldesCompte.get(key)! + debit - credit;
                      soldesCompte.set(key, soldeActuel);

                      compteMap.get(key)!.push({
                        date: ecriture.date_ecriture,
                        piece: ecriture.numero_piece || '',
                        libelle: ligne.libelle_compte || ecriture.libelle,
                        debit,
                        credit,
                        solde: soldeActuel,
                      });
                    });
                  });

                  // Convertir en tableau et trier par numéro de compte
                  const grandLivre = Array.from(compteMap.entries())
                    .map(([numero, mouvements]) => ({
                      numero,
                      libelle: mouvements[0]?.libelle || '',
                      mouvements,
                    }))
                    .sort((a, b) => a.numero.localeCompare(b.numero));

                  return (
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          {grandLivre.length} compte(s) mouvementé(s)
                        </p>
                      </div>
                      {grandLivre.length > 0 ? (
                        <div className="space-y-6">
                          {grandLivre.map((compte) => {
                            const totalDebit = compte.mouvements.reduce((sum, m) => sum + m.debit, 0);
                            const totalCredit = compte.mouvements.reduce((sum, m) => sum + m.credit, 0);
                            const soldeFinal = compte.mouvements[compte.mouvements.length - 1]?.solde || 0;

                            return (
                              <div key={compte.numero} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-bold text-lg text-gray-900">
                                      {compte.numero} - {compte.libelle}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {compte.mouvements.length} mouvement(s)
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-lg font-bold ${
                                      soldeFinal > 0 ? 'text-green-600' : soldeFinal < 0 ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      Solde: {soldeFinal.toFixed(2)} €
                                    </div>
                                  </div>
                                </div>

                                <table className="w-full border-collapse mt-2">
                                  <thead>
                                    <tr className="bg-white border-b border-gray-300">
                                      <th className="text-left p-2 text-sm font-semibold">Date</th>
                                      <th className="text-left p-2 text-sm font-semibold">N° Pièce</th>
                                      <th className="text-left p-2 text-sm font-semibold">Libellé</th>
                                      <th className="text-right p-2 text-sm font-semibold">Débit</th>
                                      <th className="text-right p-2 text-sm font-semibold">Crédit</th>
                                      <th className="text-right p-2 text-sm font-semibold">Solde</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compte.mouvements.map((mouvement, idx) => (
                                      <tr key={idx} className="border-b border-gray-200">
                                        <td className="p-2 text-sm">
                                          {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="p-2 font-mono text-sm">{mouvement.piece}</td>
                                        <td className="p-2 text-sm">{mouvement.libelle}</td>
                                        <td className="p-2 text-right font-mono text-sm">
                                          {mouvement.debit > 0 ? mouvement.debit.toFixed(2) : ''}
                                        </td>
                                        <td className="p-2 text-right font-mono text-sm">
                                          {mouvement.credit > 0 ? mouvement.credit.toFixed(2) : ''}
                                        </td>
                                        <td className={`p-2 text-right font-mono text-sm font-semibold ${
                                          mouvement.solde > 0 ? 'text-green-600' : mouvement.solde < 0 ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                          {mouvement.solde.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-white border-t-2 border-gray-300 font-bold">
                                      <td colSpan={3} className="p-2 text-sm">TOTAUX</td>
                                      <td className="p-2 text-right font-mono text-sm">{totalDebit.toFixed(2)}</td>
                                      <td className="p-2 text-right font-mono text-sm">{totalCredit.toFixed(2)}</td>
                                      <td className={`p-2 text-right font-mono text-sm ${
                                        soldeFinal > 0 ? 'text-green-600' : soldeFinal < 0 ? 'text-red-600' : 'text-gray-600'
                                      }`}>
                                        {soldeFinal.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">Aucune écriture enregistrée</p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-500">Veuillez sélectionner une entreprise</p>
              )}
            </div>
          )}

          {/* PAGE IMPORT FEC */}
          {currentPage === 'import-fec' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Import FEC</h2>

              {!selectedEntreprise ? (
                <p className="text-gray-500">Veuillez sélectionner une entreprise</p>
              ) : (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-4">
                      Sélectionnez un fichier FEC (Fichier des Écritures Comptables) au format texte tabulé.
                    </p>
                    <input
                      type="file"
                      accept=".txt,.fec"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImportFile(file);
                          setImportResult(null);
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                    {importFile && (
                      <p className="mt-2 text-sm text-gray-700">
                        Fichier sélectionné : <span className="font-medium">{importFile.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Format attendu :</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Fichier texte avec tabulations comme séparateurs</li>
                      <li>• Première ligne : en-têtes de colonnes</li>
                      <li>• Colonnes : JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib, etc.</li>
                      <li>• Les écritures sont groupées par EcritureNum (même numéro = même pièce)</li>
                      <li>• Format de date : AAAAMMJJ (ex: 20250115)</li>
                      <li>• Décimales avec virgule (ex: 13,20)</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleImportFEC}
                    disabled={!importFile || importing}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                      !importFile || importing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {importing ? 'Importation en cours...' : 'Importer le fichier FEC'}
                  </button>

                  {importResult && (
                    <div className={`rounded-lg p-4 ${
                      importResult.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <h3 className="font-semibold mb-2">Résultat de l'importation :</h3>
                      <p className="text-sm mb-2">
                        <span className="font-medium">{importResult.imported}</span> écriture(s) importée(s) avec succès
                      </p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-700 mb-1">
                            {importResult.errors.length} erreur(s) :
                          </p>
                          <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                            {importResult.errors.slice(0, 10).map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                            {importResult.errors.length > 10 && (
                              <li className="font-medium">... et {importResult.errors.length - 10} autre(s) erreur(s)</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PAGE RAPPORTS */}
          {currentPage === 'rapports' && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Rapports comptables</h2>
              <p className="text-gray-500">À venir : Bilan, Compte de résultat, Annexes...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
