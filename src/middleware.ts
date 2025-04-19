import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-compatible in-memory cache with proper typing
interface CacheEntry {
  session: any; // Consider using a more specific type from @supabase/supabase-js if available
  isMohonIjinAdmin: boolean;
  isOrgMember?: boolean; // Is user part of the requested org slug?
  orgRole?: 'org_admin' | 'org_responder' | null; // Role within the requested org slug
  orgSlug?: string | null; // Cache the slug for verification
  timestamp: number;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache expiry
const RATE_LIMIT_BACKOFF = 2000; // 2 seconds backoff for rate limits

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Skip middleware for static assets, API routes etc.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image/') ||
    pathname.includes('/favicon.ico')
    // Add other paths to ignore if needed
  ) {
    return res;
  }

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const accessToken = req.cookies.get('sb-access-token')?.value;
    const now = Date.now();
    let cachedData: CacheEntry | undefined;

    if (accessToken) {
      cachedData = sessionCache.get(accessToken);
      // Invalidate cache if expired
      if (cachedData && now - cachedData.timestamp >= CACHE_EXPIRY) {
        cachedData = undefined;
        sessionCache.delete(accessToken);
      }
    }

    // --- /mohonijin/dashboard routes (Admin specific) --- 
    if (pathname.startsWith('/mohonijin/dashboard')) {
      if (cachedData) {
        if (!cachedData.session?.user || !cachedData.isMohonIjinAdmin) {
          return NextResponse.redirect(new URL('/mohonijin', req.url)); // Redirect non-admins
        }
        return res; // Allow access based on valid cache
      }

      // No valid cache, fetch session and profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return NextResponse.redirect(new URL('/mohonijin', req.url));
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      const isAdmin = profileData?.role === 'admin';
      if (!isAdmin) {
        await supabase.auth.signOut(); // Sign out non-admins trying to access
        if (accessToken) sessionCache.delete(accessToken);
        return NextResponse.redirect(new URL('/mohonijin', req.url));
      }

      // Cache successful admin auth
      if (accessToken) {
        sessionCache.set(accessToken, {
          session,
          isMohonIjinAdmin: true,
          timestamp: now
        });
      }
      return res;
    }

    // --- /responder/[slug]/... routes (Org Member specific) ---
    else if (pathname.startsWith('/responder/')) {
      const slug = pathname.split('/')[2]; // Extract slug
      if (!slug) {
        return NextResponse.redirect(new URL('/', req.url)); // Redirect if slug is missing
      }

      if (cachedData) {
        // Check if cached data matches the current slug and has appropriate role
        if (
          !cachedData.session?.user ||
          cachedData.orgSlug !== slug ||
          !cachedData.isOrgMember ||
          !(cachedData.orgRole === 'org_admin' || cachedData.orgRole === 'org_responder')
        ) {
          // Invalid cache for this route/slug, proceed to fetch fresh data
        } else {
          return res; // Allow access based on valid cache
        }
      }

      // No valid cache or cache mismatch, fetch session and profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return NextResponse.redirect(new URL('/', req.url)); // Redirect if not logged in
      }

      // Fetch org ID based on slug
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!orgData) {
        return NextResponse.redirect(new URL('/', req.url)); // Redirect if org not found
      }
      const orgId = orgData.id;

      // Fetch user profile including org ID and role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('user_id', session.user.id)
        .single();

      const isMemberOfOrg = profileData?.organization_id === orgId;
      const isValidRole = profileData?.role === 'org_admin' || profileData?.role === 'org_responder';

      if (!isMemberOfOrg || !isValidRole) {
        // User is not a member of this org or doesn't have the right role
        // Don't sign out, just redirect
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Cache successful org member auth
      if (accessToken) {
        sessionCache.set(accessToken, {
          session,
          isMohonIjinAdmin: false, // Not mohonijin admin
          isOrgMember: true,
          orgRole: profileData.role as 'org_admin' | 'org_responder',
          orgSlug: slug,
          timestamp: now
        });
      }
      return res;
    }

    // --- Login pages (/mohonijin, potentially /login later) ---
    else if (pathname === '/mohonijin') {
      if (cachedData) {
        if (cachedData.session?.user && cachedData.isMohonIjinAdmin) {
          return NextResponse.redirect(new URL('/mohonijin/dashboard', req.url)); // Redirect logged-in admin
        }
        // If cached session exists but not admin, let them stay on /mohonijin or proceed (no redirect needed here)
      } else {
         // No cache, check session if trying to access login page
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
            if (profileData?.role === 'admin') {
                // Cache admin status if freshly fetched
                 if (accessToken) {
                    sessionCache.set(accessToken, {
                        session,
                        isMohonIjinAdmin: true,
                        timestamp: now
                    });
                }
                return NextResponse.redirect(new URL('/mohonijin/dashboard', req.url));
            }
            // If logged in user is not admin, let them stay on /mohonijin (maybe show message?)
        }
      }
      // Allow access to /mohonijin if not logged in or not a logged-in admin
       return res;
    }
    // Add similar logic for a general /login page if created
    // else if (pathname === '/login') { ... }

    // Allow all other paths (public pages)
    return res;

  } catch (error: any) {
    console.error('Middleware error:', error.message || error);
    // Handle specific errors like rate limiting if needed
    if (error.message?.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF));
        // Optionally return response based on cache if rate limited?
        // return res;
    }
    // On generic error, redirect to a safe page (e.g., root or login)
    // Avoid infinite redirect loops
    if (req.nextUrl.pathname !== '/') {
      const redirectResponse = NextResponse.redirect(new URL('/', req.url));
      // Preserve essential cookies if needed, but be cautious
      // redirectResponse.headers.set('set-cookie', req.headers.get('cookie') || '');
      return redirectResponse;
    }
    return NextResponse.error(); // If already at root, show error
  }
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