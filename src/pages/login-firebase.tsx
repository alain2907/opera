import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function LoginFirebase() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;

      if (isSignup) {
        // Créer un nouveau compte Firebase
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Se connecter avec un compte existant
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      // Récupérer le token Firebase
      const idToken = await userCredential.user.getIdToken();

      // Sauvegarder les données Firebase dans localStorage
      const userData = {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
        }
      };

      localStorage.setItem('firebase_user', JSON.stringify(userData));
      localStorage.setItem('firebase_token', idToken);

      // Rediriger vers le dashboard PWA
      router.push('/pwa');
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('⚠️ Cet email est déjà utilisé. Cliquez sur "Déjà un compte ? Se connecter" ci-dessous.');
        setIsSignup(false); // Basculer automatiquement en mode connexion
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect. Mot de passe oublié ? Cliquez ci-dessous.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email invalide.');
      } else {
        setError(err.message || 'Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email pour réinitialiser votre mot de passe.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
      setShowForgotPassword(false);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cet email.');
      } else {
        setError('Erreur lors de l\'envoi de l\'email : ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🔥 Firebase Auth</h1>
          <p className="text-gray-600 mt-2">
            {isSignup ? 'Créer un compte' : 'Se connecter avec Firebase'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
              minLength={6}
            />
            {isSignup && (
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Chargement...' : (isSignup ? 'Créer mon compte' : 'Se connecter')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setSuccess('');
            }}
            className="text-sm text-green-600 hover:text-green-700 font-medium block w-full"
          >
            {isSignup ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
          </button>

          {!isSignup && (
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800 block w-full"
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>

        {/* Modal Mot de passe oublié */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Réinitialiser le mot de passe</h3>
              <p className="text-gray-600 mb-4">
                Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <a href="/login" className="text-sm text-gray-600 hover:text-gray-800">
            ← Retour au login JWT classique
          </a>
        </div>
      </div>
    </div>
  );
}
