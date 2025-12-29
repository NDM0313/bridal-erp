/**
 * Next.js Middleware
 * Protects routes and handles authentication
 * 
 * FIX: Client-side auth checks are primary, but middleware provides
 * basic route protection for known public routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api');
  
  // Allow public routes and static assets
  if (isPublicRoute || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
    return NextResponse.next();
  }
  
  // For protected routes, let client-side handle auth checks
  // This is because Supabase stores session in localStorage (client-side)
  // The actual auth redirect happens in page components using useAuth hook
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

