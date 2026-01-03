import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import { type LigneEcriture } from '../../api/ecritures';
import { type Compte } from '../../api/comptes';
import { type Journal } from '../../api/journaux';
import { searchCompte, getLibelleCompte } from '../../data/planComptable';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllComptes,
  createEcriture,
  updateEcriture,
  createCompte,
  getEcrituresByExercice,
  getAllEcritures,
  getEcriture,
  deleteEcriture,
} from '../../lib/storageAdapter';

// Hardcoded journals list for PWA
const JOURNAUX_PWA: Journal[] = [
  { id: 1, code: 'AC', libelle: 'Achats', entreprise_id: 0, actif: true, date_creation: new Date().toISOString() },
  { id: 2, code: 'VE', libelle: 'Ventes', entreprise_id: 0, actif: true, date_creation: new Date().toISOString() },
  { id: 3, code: 'BQ', libelle: 'Banque', entreprise_id: 0, actif: true, date_creation: new Date().toISOString() },
  { id: 4, code: 'CA', libelle: 'Caisse', entreprise_id: 0, actif: true, date_creation: new Date().toISOString() },
  { id: 5, code: 'OD', libelle: 'Opérations Diverses', entreprise_id: 0, actif: true, date_creation: new Date().toISOString() },
];

export default function SaisiePWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<number | null>(null);
  const [selectedExerciceId, setSelectedExerciceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextNumPiece, setNextNumPiece] = useState('0001');
  const [journaux, setJournaux] = useState<Journal[]>(JOURNAUX_PWA);

  const [formData, setFormData] = useState({
    journal_id: 1,
    exercice_id: selectedExerciceId || 1,
    date_ecriture: new Date().toISOString().split('T')[0],
    numero_piece: '',
    libelle: '',
  });

  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
  ]);
  const [lignesOriginales, setLignesOriginales] = useState<any[]>([]);

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
  const [editingEcriture, setEditingEcriture] = useState<any>(null);

  // === DEBUG: flag + store ===
  const [showDebug, setShowDebug] = useState<boolean>(
    typeof window !== 'undefined' && (localStorage.getItem('debug') === '1')
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('debug', nv ? '1' : '0');
          }
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

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load comptes when entreprise changes
  useEffect(() => {
    if (selectedEntrepriseId) {
      loadComptes();
    }
  }, [selectedEntrepriseId]);

  // Load next num piece when entreprise or exercice changes
  useEffect(() => {
    if (selectedEntrepriseId && selectedExerciceId) {
      loadNextNumPiece();
    }
  }, [selectedEntrepriseId, selectedExerciceId]);

  useEffect(() => {
    if (nextNumPiece && !formData.numero_piece) {
      setFormData(prev => ({ ...prev, numero_piece: nextNumPiece }));
    }
  }, [nextNumPiece]);

  // Update exercice_id when selectedExerciceId changes
  useEffect(() => {
    if (selectedExerciceId) {
      setFormData(prev => ({ ...prev, exercice_id: selectedExerciceId }));
    }
  }, [selectedExerciceId]);

  // Charger l'écriture depuis le paramètre URL ?id=XXX ou ?piece=XXX
  useEffect(() => {
    const loadEcritureFromUrl = async () => {
      const ligneId = router.query.id as string;
      const pieceRef = router.query.piece as string;

      // Priorité à l'ID (méthode moderne) - charger la ligne puis toutes les lignes de la même écriture
      if (ligneId) {
        try {
          // 1. Charger la ligne de référence
          const ligneRef = await getEcriture(Number(ligneId));
          if (!ligneRef) {
            setError(`Ligne #${ligneId} introuvable`);
            return;
          }

          const pieceRefFromLigne = ligneRef.pieceRef || ligneRef.piece_ref;
          const dateFromLigne = ligneRef.date;
          const journalFromLigne = ligneRef.journal;
          const moisFromLigne = dateFromLigne.substring(0, 7); // AAAA-MM

          // 2. Charger toutes les lignes de la même écriture (même piece_ref ET même date)
          const toutesEcritures = await getAllEcritures();
          let ecrituresGroupe = toutesEcritures.filter((e: any) => {
            const ref = e.pieceRef || e.piece_ref;
            return ref === pieceRefFromLigne && e.date === dateFromLigne;
          });

          if (ecrituresGroupe.length === 0) {
            setError(`Écriture complète introuvable`);
            return;
          }

          // Vérifier si l'écriture est équilibrée
          const totalDebit = ecrituresGroupe.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
          const totalCredit = ecrituresGroupe.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
          const equilibree = Math.abs(totalDebit - totalCredit) < 0.01;

          // Si déséquilibrée ET journal de banque, charger toutes les lignes du mois (écriture mensuelle avec équilibrage final)
          if (!equilibree && journalFromLigne === 'BQ') {
            ecrituresGroupe = toutesEcritures.filter((e: any) => {
              const moisEcriture = e.date.substring(0, 7);
              return e.journal === 'BQ' && moisEcriture === moisFromLigne;
            });
          }

          // 3. Préparer le formulaire avec les données de la première ligne
          const premiere = ecrituresGroupe[0];
          const journalId = premiere.journalId || premiere.journal_id;
          const exerciceId = premiere.exerciceId || premiere.exercice_id;
          const dateEcritureFormatee = dateFromLigne.split('T')[0];

          const formDataUpdated = {
            journal_id: journalId || 1,
            exercice_id: exerciceId || selectedExerciceId || 1,
            date_ecriture: dateEcritureFormatee,
            numero_piece: pieceRefFromLigne,
            libelle: premiere.libelle || '',
          };

          setFormData(formDataUpdated);

          // Synchroniser le mois de saisie avec la date de l'écriture
          setSaisieMonth(dateEcritureFormatee.slice(0, 7));

          // 4. Convertir toutes les lignes ET stocker les lignes originales avec leurs IDs
          const lignesChargees = ecrituresGroupe.map((e: any) => ({
            numero_compte: e.compteNumero || e.compte_numero || '',
            libelle_compte: e.libelle || '',
            debit: Number(e.debit || 0),
            credit: Number(e.credit || 0),
          }));

          setLignes(lignesChargees);
          setLignesOriginales(ecrituresGroupe); // Garder les lignes originales avec leurs IDs

          // 5. Stocker l'ID de la première ligne pour l'édition
          setEditingEcriture({ id: premiere.id, ...formDataUpdated, lignes: lignesChargees });
          setSuccess(`Écriture #${pieceRefFromLigne} chargée pour modification`);
        } catch (err) {
          console.error('Erreur chargement écriture par ID:', err);
          setError('Impossible de charger l\'écriture');
        }
        return;
      }

      // Fallback: charger par pieceRef (ancienne méthode)
      if (pieceRef) {
        try {
          const toutesEcritures = await getAllEcritures();
          const ecrituresGroupe = toutesEcritures.filter((e: any) => {
            const ref = e.pieceRef || e.piece_ref;
            return ref === pieceRef;
          });

          if (ecrituresGroupe.length === 0) {
            setError(`Aucune écriture trouvée avec la référence ${pieceRef}`);
            return;
          }

          // Prendre la première écriture pour les infos communes
          const premiere = ecrituresGroupe[0];
          const journalId = premiere.journalId || premiere.journal_id;
          const exerciceId = premiere.exerciceId || premiere.exercice_id;
          const date = premiere.date;

          setFormData({
            journal_id: journalId || 1,
            exercice_id: exerciceId || selectedExerciceId || 1,
            date_ecriture: date.split('T')[0],
            numero_piece: pieceRef,
            libelle: premiere.libelle || '',
          });

          // Convertir toutes les écritures en lignes
          const lignesChargees = ecrituresGroupe.map((e: any) => ({
            numero_compte: e.compteNumero || e.compte_numero || '',
            libelle_compte: e.libelle || '',
            debit: Number(e.debit || 0),
            credit: Number(e.credit || 0),
          }));

          setLignes(lignesChargees);
          setSuccess(`Écriture ${pieceRef} chargée pour modification`);
        } catch (err) {
          console.error('Erreur chargement écriture par piece:', err);
          setError('Impossible de charger l\'écriture');
        }
      }
    };

    if (router.isReady) {
      loadEcritureFromUrl();
    }
  }, [router.isReady, router.query.id, router.query.piece]);

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
      setLignes(editingEcriture.lignes.map((l: any) => ({
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

  const loadInitialData = async () => {
    try {
      const [entreprisesData, exercicesData] = await Promise.all([
        getAllEntreprises(),
        getAllExercices(),
      ]);

      setEntreprises(entreprisesData);
      setExercices(exercicesData);

      // Auto-select first entreprise and exercice if available
      if (entreprisesData.length > 0) {
        setSelectedEntrepriseId(entreprisesData[0].id);
      }
      if (exercicesData.length > 0) {
        setSelectedExerciceId(exercicesData[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement données initiales:', err);
      setError('Erreur lors du chargement des données');
    }
  };

  const loadComptes = async () => {
    if (!selectedEntrepriseId) return;
    try {
      const data = await getAllComptes();
      // Filter comptes by entreprise_id
      const comptesFiltered = data.filter((c: Compte) => c.entreprise_id === selectedEntrepriseId);
      setComptesEntreprise(comptesFiltered);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  const loadNextNumPiece = async () => {
    if (!selectedEntrepriseId || !selectedExerciceId) return;
    try {
      const ecritures = await getEcrituresByExercice(selectedExerciceId);
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
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  // Helper : empile la pièce courante et passe à la suivante (sans enregistrement serveur)
  const startNextPieceLocal = () => {
    dbg('startNextPieceLocal/snapshot', { formData, lignes });

    const lignesValides = lignes
      .filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0));

    if (lignesValides.length >= 2) {
      const snapshotForm = { ...formData };
      const snapshotLignes = lignesValides.map(l => ({ ...l }));
      setDraftPieces(prev => [...prev, { form: snapshotForm, lignes: snapshotLignes }]);
    }

    const newNextNum = (nextNumPiece ? String(parseInt(nextNumPiece) + 1).padStart(4, '0') : '0001');
    dbg('startNextPieceLocal/newNextNum', newNextNum);
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

  // Enregistrer = envoyer toutes les pièces (brouillons + en cours)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEntrepriseId || !selectedExerciceId) return;

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

        const journal = journaux.find(j => j.id === formData.journal_id);
        const journalCode = journal?.code || 'OD';

        console.log('📝 Mise à jour intelligente de l\'écriture');
        console.log('  Lignes originales:', lignesOriginales.length);
        console.log('  Lignes actuelles:', lignesValides.length);

        let nbUpdated = 0;
        let nbCreated = 0;
        let nbDeleted = 0;

        // 1. Mettre à jour ou créer les lignes actuelles
        for (let i = 0; i < lignesValides.length; i++) {
          const ligneActuelle = lignesValides[i];
          const ligneOriginale = lignesOriginales[i]; // Correspondance par index

          const ligneData = {
            exerciceId: formData.exercice_id,
            date: formData.date_ecriture,
            journal: journalCode,
            pieceRef: formData.numero_piece,
            compteNumero: ligneActuelle.numero_compte,
            libelle: ligneActuelle.libelle_compte,
            debit: Number(ligneActuelle.debit),
            credit: Number(ligneActuelle.credit),
          };

          if (ligneOriginale && ligneOriginale.id) {
            // Mettre à jour la ligne existante
            console.log(`  ✏️ Mise à jour ligne #${ligneOriginale.id}`);
            await updateEcriture(ligneOriginale.id, ligneData);
            nbUpdated++;
          } else {
            // Créer une nouvelle ligne
            console.log('  ➕ Création nouvelle ligne');
            await createEcriture(ligneData);
            nbCreated++;
          }
        }

        // 2. Supprimer les lignes en trop (si l'utilisateur a supprimé des lignes)
        if (lignesOriginales.length > lignesValides.length) {
          for (let i = lignesValides.length; i < lignesOriginales.length; i++) {
            const ligneASupprimer = lignesOriginales[i];
            if (ligneASupprimer && ligneASupprimer.id) {
              console.log(`  🗑️ Suppression ligne #${ligneASupprimer.id}`);
              await deleteEcriture(ligneASupprimer.id);
              nbDeleted++;
            }
          }
        }

        console.log(`✅ Mise à jour terminée: ${nbUpdated} modifiée(s), ${nbCreated} créée(s), ${nbDeleted} supprimée(s)`);

        setSuccess(`Écriture mise à jour: ${nbUpdated} modifiée(s), ${nbCreated} créée(s), ${nbDeleted} supprimée(s)`);
        setEditingEcriture(null);
        setLignesOriginales([]);

        // Retourner à la page précédente après la mise à jour
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        // MODE CRÉATION
        // 1) envoyer les brouillons
        for (const draft of draftPieces) {
          const payload = {
            ...draft.form,
            entreprise_id: selectedEntrepriseId,
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
          await createEcriture(payload);
        }

        // 2) envoyer la pièce affichée si elle a du contenu
        const lignesValides = lignes.filter(l => l.numero_compte && (Number(l.debit) > 0 || Number(l.credit) > 0));
        if (lignesValides.length >= 2) {
          const payload = {
            ...formData,
            entreprise_id: selectedEntrepriseId,
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
          await createEcriture(payload);
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

      await loadNextNumPiece();
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
    if (pendingAccount && selectedEntrepriseId) {
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
        await createCompte({
          entreprise_id: selectedEntrepriseId,
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
          libelle_compte: libEcriture,
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

  if (!selectedEntrepriseId || !selectedExerciceId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Sélection requise
            </h3>
            <p className="text-gray-500 mb-6">
              Veuillez sélectionner une entreprise et un exercice pour accéder à la saisie rapide.
            </p>

            {/* Selectors */}
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                <select
                  value={selectedEntrepriseId || ''}
                  onChange={(e) => setSelectedEntrepriseId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Sélectionner une entreprise</option>
                  {entreprises.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exercice</label>
                <select
                  value={selectedExerciceId || ''}
                  onChange={(e) => setSelectedExerciceId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Sélectionner un exercice</option>
                  {exercices
                    .filter((ex) => !selectedEntrepriseId || ex.entreprise_id === selectedEntrepriseId)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.annee} ({new Date(ex.date_debut).toLocaleDateString()} - {new Date(ex.date_fin).toLocaleDateString()})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedEntreprise = entreprises.find(e => e.id === selectedEntrepriseId);
  const selectedExercice = exercices.find(e => e.id === selectedExerciceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-8">
        {/* Selectors Section */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <select
                value={selectedEntrepriseId || ''}
                onChange={(e) => setSelectedEntrepriseId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {entreprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
              <select
                value={selectedExerciceId || ''}
                onChange={(e) => setSelectedExerciceId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {exercices
                  .filter((ex) => ex.entreprise_id === selectedEntrepriseId)
                  .map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.annee} ({new Date(ex.date_debut).toLocaleDateString()} - {new Date(ex.date_fin).toLocaleDateString()})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingEcriture ? 'Modification d\'écriture' : 'Saisie rapide au kilomètre'}
            </h2>
            {editingEcriture && (
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!editingEcriture?.id) return;

                    const confirmation = confirm(
                      `⚠️ ATTENTION ⚠️\n\n` +
                      `Voulez-vous vraiment supprimer cette écriture complète ?\n\n` +
                      `Toutes les lignes (débit/crédit) seront supprimées.\n\n` +
                      `Cette action est irréversible.`
                    );

                    if (!confirmation) return;

                    try {
                      setLoading(true);

                      // 1. Charger la ligne de référence pour obtenir piece_ref et date
                      const ligneRef = await getEcriture(editingEcriture.id);
                      if (!ligneRef) {
                        throw new Error('Écriture introuvable');
                      }

                      const pieceRef = ligneRef.pieceRef || ligneRef.piece_ref;
                      const date = ligneRef.date;

                      // 2. Charger toutes les lignes de la même écriture
                      const toutesEcritures = await getAllEcritures();
                      const lignesASupprimer = toutesEcritures.filter((e: any) => {
                        const ref = e.pieceRef || e.piece_ref;
                        return ref === pieceRef && e.date === date;
                      });

                      // 3. Supprimer toutes les lignes
                      for (const ligne of lignesASupprimer) {
                        await deleteEcriture(ligne.id);
                      }

                      setSuccess(`Écriture complète supprimée (${lignesASupprimer.length} ligne(s))`);
                      setEditingEcriture(null);
                      setFormData({
                        journal_id: 1,
                        exercice_id: selectedExerciceId || 1,
                        date_ecriture: new Date().toISOString().split('T')[0],
                        numero_piece: nextNumPiece,
                        libelle: '',
                      });
                      setLignes([
                        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
                        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
                      ]);

                      // Retourner à la page précédente
                      setTimeout(() => {
                        router.back();
                      }, 1500);
                    } catch (err: any) {
                      setError('Erreur lors de la suppression : ' + (err.message || 'Erreur inconnue'));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  🗑️ Supprimer
                </button>
                <button
                  onClick={() => {
                    setEditingEcriture(null);
                    setFormData({
                      journal_id: 1,
                      exercice_id: selectedExerciceId || 1,
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
              </div>
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
                disabled={!!editingEcriture}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {journaux.length === 0 ? (
                  <option value="">Aucun journal disponible</option>
                ) : (
                  journaux.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.code} - {journal.libelle}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Mois de saisie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois de saisie</label>
              <input
                type="month"
                value={saisieMonth}
                onChange={(e) => setSaisieMonth(e.target.value)}
                disabled={!!editingEcriture}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                          disabled={!!editingEcriture}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                            // Touche "=" : solder automatiquement l'écriture
                            if (e.key === '=') {
                              e.preventDefault();
                              const totalD = lignes.reduce((s, l, i) => s + (i === index ? (parseFloat(e.currentTarget.value) || 0) : Number(l.debit || 0)), 0);
                              const totalC = lignes.reduce((s, l) => s + Number(l.credit || 0), 0);
                              const diff = totalC - totalD;

                              if (diff > 0.01) {
                                // Il manque du débit, on le complète
                                updateLigne(index, 'debit', parseFloat(diff.toFixed(2)));
                                setTimeout(() => {
                                  const creditInput = document.querySelector(`input[data-credit-index="${index}"]`) as HTMLInputElement;
                                  if (creditInput) creditInput.focus();
                                }, 50);
                              }
                              return;
                            }

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
                            // Touche "=" : solder automatiquement l'écriture
                            if (e.key === '=') {
                              e.preventDefault();
                              const totalD = lignes.reduce((s, l) => s + Number(l.debit || 0), 0);
                              const totalC = lignes.reduce((s, l, i) => s + (i === index ? (parseFloat(e.currentTarget.value) || 0) : Number(l.credit || 0)), 0);
                              const diff = totalD - totalC;

                              if (diff > 0.01) {
                                // Il manque du crédit, on le complète
                                updateLigne(index, 'credit', parseFloat(diff.toFixed(2)));
                                setTimeout(() => {
                                  if (index === lignes.length - 1) addLigne();
                                  const next = document.querySelector(`input[data-compte-index="${index + 1}"]`) as HTMLInputElement;
                                  if (next) next.focus();
                                }, 50);
                              }
                              return;
                            }

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
      </div>

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
    </div>
  );
}
