import '../index.css';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { EntrepriseProvider } from '../contexts/EntrepriseContext';
import { WindowProvider } from '../contexts/WindowContext';
import WindowContainer from '../components/WindowContainer';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Pages PWA : pas de contextes de l'app locale
  if (router.pathname.startsWith('/pwa') || router.pathname === '/login-firebase') {
    return <Component {...pageProps} />;
  }

  // Pages app locale : avec tous les contextes
  return (
    <EntrepriseProvider>
      <WindowProvider>
        <Component {...pageProps} />
        <WindowContainer />
      </WindowProvider>
    </EntrepriseProvider>
  );
}
