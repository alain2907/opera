import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirection vers la nouvelle page de login Firebase
 *
 * Cette page (Supabase auth) est obsolète.
 * L'application utilise maintenant Firebase Authentication.
 */
export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger automatiquement vers login-firebase
    router.replace('/login-firebase');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}
