import { useRouter } from 'next/router';
import { useState } from 'react';

export default function PWANavbar() {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const menuItems = [
    { label: '🏠 Dashboard', path: '/pwa' },
    { label: '🏢 Entreprises', path: '/pwa/entreprises' },
    {
      label: '⚙️ Paramétrage',
      submenu: [
        { label: '📖 Plan Comptable', path: '/pwa/plan-comptable' },
        { label: '🔍 Vérifier Comptes', path: '/pwa/verifier-comptes' },
        { label: '🔢 Comptes', path: '/pwa/comptes' },
        { label: '📔 Journaux', path: '/pwa/journaux' },
      ]
    },
    {
      label: '📊 États',
      submenu: [
        { label: '✍️ Saisie', path: '/pwa/ecritures' },
        { label: '📋 Gestion Écritures', path: '/pwa/gestion-ecritures' },
        { label: '📒 Consultation Journaux', path: '/pwa/consultation-journaux' },
        { label: '⚖️ Balance', path: '/pwa/balance-comptable' },
        { label: '📈 Balance Progressive', path: '/pwa/balance-progressive-comptable' },
        { label: '📘 Grand Livre', path: '/pwa/grand-livre-comptable' },
        { label: '📊 Compte Résultat CERFA', path: '/pwa/compte-resultat-cerfa' },
        { label: '📄 Bilan Actif', path: '/pwa/bilan-actif' },
        { label: '📄 Bilan Passif', path: '/pwa/bilan-passif' },
      ]
    },
    {
      label: '📥 Import',
      submenu: [
        { label: '📥 Import FEC', path: '/pwa/fec' },
        { label: '📊 Import CSV Banque', path: '/pwa/import-csv' },
        { label: '📝 Import Écritures CSV', path: '/pwa/import-ecritures' },
      ]
    },
    {
      label: '⚡ Génération',
      submenu: [
        { label: '📄 Factures Auto', path: '/pwa/generation-factures-auto' },
      ]
    },
    {
      label: '🛠️ Outils',
      submenu: [
        { label: '💾 Backup', path: '/pwa/backup' },
        { label: '🗄️ Database', path: '/pwa/database' },
        { label: '🔧 Corriger Accents', path: '/pwa/corriger-accents' },
      ]
    },
  ];

  const handleMenuClick = (item: any) => {
    if (item.path) {
      router.push(item.path);
      setOpenDropdown(null);
    } else if (item.submenu) {
      setOpenDropdown(openDropdown === item.label ? null : item.label);
    }
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Titre */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => router.push('/pwa')}
          >
            <h1 className="text-xl font-bold text-blue-600">ComptaWeb</h1>
          </div>

          {/* Menu desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <div key={item.label} className="relative">
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => handleMenuClick(item)}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                    >
                      {item.label}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openDropdown === item.label && (
                      <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                        {item.submenu.map((subitem: any) => (
                          <button
                            key={subitem.path}
                            onClick={() => {
                              router.push(subitem.path);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                              router.pathname === subitem.path ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {subitem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      router.pathname === item.path
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Menu mobile */}
          <div className="md:hidden">
            <button
              onClick={() => {
                const menu = document.getElementById('mobile-menu');
                menu?.classList.toggle('hidden');
              }}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile dropdown */}
      <div id="mobile-menu" className="hidden md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
          {menuItems.map((item) => (
            <div key={item.label}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                  >
                    {item.label}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === item.label && (
                    <div className="pl-6 space-y-1 mt-1">
                      {item.submenu.map((subitem: any) => (
                        <button
                          key={subitem.path}
                          onClick={() => {
                            router.push(subitem.path);
                            document.getElementById('mobile-menu')?.classList.add('hidden');
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left block px-3 py-2 rounded-md text-sm ${
                            router.pathname === subitem.path
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    router.push(item.path!);
                    document.getElementById('mobile-menu')?.classList.add('hidden');
                  }}
                  className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === item.path
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
