import { useRouter } from 'next/router';

export default function GuideInstallationMac() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <h1 className="text-4xl font-bold mb-2">📘 Guide d'installation</h1>
          <p className="text-xl opacity-90">Comptabilité France - macOS</p>
          <p className="text-sm opacity-75 mt-2">Guide simple pour utilisateur lambda</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Étape 1 */}
          <section className="border-l-4 border-blue-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-blue-600 text-white rounded-full text-center leading-10 mr-3">1</span>
              Télécharger le logiciel
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ouvrez votre <strong>navigateur internet</strong> (Safari, Chrome, etc.)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <div>
                  <span>Allez sur :</span>
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <a
                      href="/telecharger"
                      className="text-blue-600 font-mono text-sm hover:underline"
                      target="_blank"
                    >
                      👉 https://compta-france.vercel.app/telecharger
                    </a>
                  </div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Cliquez sur le gros bouton vert : <strong>📦 Télécharger l'installeur PKG</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Le fichier <code className="bg-gray-100 px-2 py-1 rounded">ComptabiliteFrance-Installer.pkg</code> se télécharge dans votre dossier <strong>Téléchargements</strong></span>
              </li>
            </ol>
          </section>

          {/* Étape 2 */}
          <section className="border-l-4 border-green-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-green-600 text-white rounded-full text-center leading-10 mr-3">2</span>
              Lancer l'installation
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ouvrez le <strong>Finder</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Allez dans le dossier <strong>Téléchargements</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Faites un <strong>double-clic</strong> sur <code className="bg-gray-100 px-2 py-1 rounded">ComptabiliteFrance-Installer.pkg</code></span>
              </li>
            </ol>

            <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Si votre Mac affiche un message de sécurité</h3>
              <p className="text-sm text-yellow-700 mb-3">
                C'est normal ! Le logiciel n'est pas encore "certifié" par Apple.
              </p>
              <p className="text-sm text-yellow-800 font-semibold mb-2">Voici comment contourner ce blocage :</p>
              <ol className="text-sm text-yellow-700 space-y-2 ml-4">
                <li>1. Cliquez sur <strong>OK</strong> pour fermer le message</li>
                <li>2. Faites un <strong>clic droit</strong> (ou Ctrl + clic) sur le fichier PKG</li>
                <li>3. Choisissez <strong>Ouvrir</strong> dans le menu</li>
                <li>4. Une nouvelle fenêtre s'affiche avec un bouton <strong>Ouvrir</strong></li>
                <li>5. Cliquez sur <strong>Ouvrir</strong></li>
              </ol>
            </div>
          </section>

          {/* Étape 3 */}
          <section className="border-l-4 border-purple-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-purple-600 text-white rounded-full text-center leading-10 mr-3">3</span>
              Suivre l'assistant d'installation
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Une fenêtre d'installation s'ouvre</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Cliquez sur <strong>Continuer</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Cliquez sur <strong>Installer</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Votre Mac vous demande votre <strong>mot de passe</strong> → Tapez le mot de passe de votre session Mac</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Attendez quelques secondes (le logiciel s'installe)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Cliquez sur <strong>Fermer</strong> quand c'est terminé</span>
              </li>
            </ol>

            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
              <h3 className="font-bold text-green-800 mb-2">👉 À ce stade, le logiciel est installé :</h3>
              <ul className="text-sm text-green-700 space-y-1 ml-4">
                <li>✓ Le <strong>serveur local</strong> tourne sur votre Mac (invisible, en arrière-plan)</li>
                <li>✓ La <strong>base de données SQLite</strong> est créée dans <code className="bg-green-100 px-1 rounded text-xs">Documents/ComptabiliteFrance/comptabilite.db</code></li>
                <li>✓ Tout démarre automatiquement, même après un redémarrage</li>
                <li>✓ Vos données restent <strong>100% sur votre ordinateur</strong></li>
              </ul>
            </div>
          </section>

          {/* Étape 4 */}
          <section className="border-l-4 border-indigo-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-indigo-600 text-white rounded-full text-center leading-10 mr-3">4</span>
              Créer votre compte utilisateur
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ouvrez votre <strong>navigateur internet</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <div>
                  <span>Allez sur :</span>
                  <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <a
                      href="/login-firebase"
                      className="text-indigo-600 font-mono text-sm hover:underline"
                      target="_blank"
                    >
                      👉 https://compta-france.vercel.app
                    </a>
                  </div>
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <div>
                  <span>Si c'est votre <strong>première fois</strong> :</span>
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>- Cliquez sur <strong>Créer un compte</strong></li>
                    <li>- Entrez votre <strong>email</strong></li>
                    <li>- Choisissez un <strong>mot de passe</strong></li>
                    <li>- Cliquez sur <strong>S'inscrire</strong></li>
                  </ul>
                </div>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <div>
                  <span>Si vous avez <strong>déjà un compte</strong> :</span>
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>- Entrez votre <strong>email</strong> et <strong>mot de passe</strong></li>
                    <li>- Cliquez sur <strong>Se connecter</strong></li>
                  </ul>
                </div>
              </li>
            </ol>
          </section>

          {/* Étape 5 */}
          <section className="border-l-4 border-orange-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-orange-600 text-white rounded-full text-center leading-10 mr-3">5</span>
              Configurer la connexion
            </h2>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
              <p className="text-orange-800 font-semibold">⚠️ Important : Cette étape n'est à faire qu'<strong>une seule fois</strong>, lors de votre première utilisation.</p>
            </div>

            <ol className="space-y-4 text-gray-700">
              <li>
                <span className="font-semibold">Une fois connecté</span>, vous arrivez sur le <strong>tableau de bord</strong>
              </li>
              <li>
                Cliquez sur le lien : <strong>« Configurer le backend »</strong>
              </li>
              <li>
                <div>
                  <span className="font-semibold">Suivez les 3 étapes indiquées :</span>
                  <div className="mt-3 ml-4 space-y-3">
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="font-semibold text-gray-800">Étape 1 : Vérifier l'installation</p>
                      <p className="text-sm text-gray-600">✅ Le logiciel local est installé (vous venez de le faire)</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="font-semibold text-gray-800">Étape 2 : Copier vos identifiants</p>
                      <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                        <li>• Cliquez sur <strong>Copier</strong> à côté de votre identifiant (UID)</li>
                        <li>• Cliquez sur <strong>Copier</strong> à côté de la clé machine (MACHINE_KEY)</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="font-semibold text-gray-800 mb-2">Étape 3 : Configuration du LaunchAgent</p>
                      <p className="text-sm text-gray-600 mb-2">Ouvrez le <strong>Terminal</strong> (Applications → Utilitaires → Terminal) et suivez les instructions affichées sur la page.</p>
                    </div>
                  </div>
                </div>
              </li>
            </ol>

            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
              <p className="text-green-800 font-semibold">✅ C'est terminé ! La configuration est sauvegardée.</p>
            </div>
          </section>

          {/* Étape 6 */}
          <section className="border-l-4 border-pink-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-pink-600 text-white rounded-full text-center leading-10 mr-3">6</span>
              Créer votre première entreprise
            </h2>
            <ol className="space-y-3 text-gray-700">
              <li>Retournez sur <strong>https://compta-france.vercel.app</strong></li>
              <li>Vous arrivez sur le tableau de bord</li>
              <li>Cliquez sur : <strong>« Gérer mes entreprises »</strong> ou <strong>« Créer une entreprise »</strong></li>
              <li>
                <div>
                  <span>Remplissez les informations :</span>
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• Raison sociale (nom de votre entreprise)</li>
                    <li>• SIREN</li>
                    <li>• Autres informations demandées</li>
                  </ul>
                </div>
              </li>
              <li>Cliquez sur <strong>Créer</strong></li>
              <li>
                <div>
                  <span>Créez ensuite votre <strong>premier exercice comptable</strong> :</span>
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• Année (ex: 2024)</li>
                    <li>• Date de début (ex: 01/01/2024)</li>
                    <li>• Date de fin (ex: 31/12/2024)</li>
                  </ul>
                </div>
              </li>
              <li>Cliquez sur <strong>Créer</strong></li>
            </ol>
          </section>

          {/* Étape 7 */}
          <section className="border-l-4 border-cyan-600 pl-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              <span className="inline-block w-10 h-10 bg-cyan-600 text-white rounded-full text-center leading-10 mr-3">7</span>
              Utilisation quotidienne
            </h2>
            <p className="text-gray-700 font-semibold mb-3">Chaque jour, c'est très simple :</p>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Ouvrez votre <strong>navigateur</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Allez sur <strong>https://compta-france.vercel.app</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Connectez-vous avec votre <strong>email</strong> et <strong>mot de passe</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Sélectionnez votre <strong>entreprise</strong> et votre <strong>exercice</strong></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">5.</span>
                <span>Travaillez normalement !</span>
              </li>
            </ol>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <ul className="space-y-1 text-blue-800">
                <li>➡️ <strong>Plus besoin de refaire l'installation</strong></li>
                <li>➡️ <strong>Plus besoin de configurer quoi que ce soit</strong></li>
                <li>➡️ <strong>Vos données restent 100% sur votre Mac</strong></li>
              </ul>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">❓ Questions fréquentes</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-800 mb-2">Est-ce que mes données sont en ligne ?</h3>
                <p className="text-gray-700"><strong>Non !</strong> Vos données comptables restent <strong>100% sur votre ordinateur</strong> dans le fichier <code className="bg-gray-200 px-2 py-1 rounded text-sm">~/Documents/ComptabiliteFrance/comptabilite.db</code>. Seul votre compte utilisateur (email/mot de passe) est en ligne.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">Que se passe-t-il si je redémarre mon Mac ?</h3>
                <p className="text-gray-700">Le logiciel <strong>redémarre automatiquement</strong> tout seul. Vous n'avez rien à faire.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">Je peux utiliser le logiciel sans Internet ?</h3>
                <p className="text-gray-700">Non, vous devez être connecté à Internet pour utiliser le logiciel (l'interface web est hébergée en ligne), mais vos <strong>données restent sur votre Mac</strong>.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-2">Comment désinstaller le logiciel ?</h3>
                <p className="text-gray-700 mb-2">Si vous voulez désinstaller complètement, ouvrez le Terminal et tapez les commandes affichées dans la documentation.</p>
                <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                  <p className="text-red-800 text-sm font-semibold">⚠️ Attention : Cela supprime toutes vos données comptables !</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-xl font-bold text-gray-800">Bonne comptabilité !</p>
            <p className="text-sm text-gray-500 mt-4">
              En cas de problème, contactez le support.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="bg-gray-50 p-6 border-t border-gray-200 flex gap-4 justify-center print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            🖨️ Imprimer ce guide en PDF
          </button>
          <button
            onClick={() => router.push('/telecharger')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            📥 Télécharger le logiciel
          </button>
          <button
            onClick={() => router.push('/dashboard-firebase')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
