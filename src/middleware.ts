import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Imports removed for Edge compatibility

// Cache removed for Edge compatibility

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Skip middleware for static assets, API routes etc.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/') ||
    pathname.includes('/favicon.ico')
  ) {
    return res;
  }

  const sessionToken = req.cookies.get('rw_session')?.value;

  // --- /mohonijin/dashboard routes (Admin specific) ---
  if (pathname.startsWith('/mohonijin/dashboard')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/mohonijin', req.url));
    }
    // Optimistic allow: Server Component will verify role
    return res;
  }

  // --- /responder/[slug]/... routes (Org Member specific) ---
  else if (pathname.startsWith('/responder/')) {
    const slug = pathname.split('/')[2];
    if (!slug) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Optimistic allow: Server Component will verify org membership
    return res;
  }

  // --- /admin routes (System Admin specific) ---
  else if (pathname.startsWith('/admin')) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/masuk', req.url));
    }
    // Optimistic allow: Server Component will verify admin role
    return res;
  }

  // --- Login pages ---
  else if (pathname === '/mohonijin') {
    if (sessionToken) {
      // Optimistic redirect: if they have a token, assume they might be logged in
      // But we can't know if they are admin or not without DB.
      // Better to let them see the login page, and if they are already logged in, 
      // the client-side or server-side logic on that page can redirect them.
      // For now, we'll just let them pass.
      return res;
    }
    return res;
  }

  // Allow all other paths (public pages)
  return res;
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};