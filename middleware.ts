import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages publiques (pas besoin d'être connecté)
  const publicPaths = [
    '/login',
    '/login-firebase',
    '/dashboard-firebase',
    '/configurer-backend',
    '/mon-uid',
    '/selection-entreprise',
    '/dashboard',
    '/telecharger',
    '/_next',
    '/favicon.ico',
    '/api'
  ];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Note: Firebase Auth gère l'authentification côté client
  // Ce middleware ne vérifie plus de cookie auth_token
  // Les pages protégées doivent gérer l'auth avec Firebase onAuthStateChanged

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
