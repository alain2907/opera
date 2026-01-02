import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirection vers la page d'édition d'écriture standard
 * Pas besoin de page spécifique car l'édition est la même
 */
export default function PremierMoisEditPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Rediriger vers la page d'édition standard
      router.replace(`/saisie-ecriture-rapide?edit=${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirection...</p>
    </div>
  );
}
