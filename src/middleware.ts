import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-compatible in-memory cache with proper typing
interface CacheEntry {
  session: any;
  adminRole: boolean;
  timestamp: number;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache expiry
const RATE_LIMIT_BACKOFF = 2000; // 2 seconds backoff for rate limits

export async function middleware(req: NextRequest) {
  // Only process auth for protected routes and login page
  if (!req.nextUrl.pathname.startsWith('/mohonijin')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

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
          // Ensure response is updated with the cookie
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: '', ...options });
          // Ensure response is updated with the cookie removal
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    // Only check auth for dashboard routes or when already logged in
    if (req.nextUrl.pathname.startsWith('/mohonijin/dashboard') || req.cookies.get('sb-access-token')) {
      const accessToken = req.cookies.get('sb-access-token')?.value;
      const now = Date.now();

      // Use cached data if it exists and hasn't expired
      if (accessToken) {
        const cachedData = sessionCache.get(accessToken);
        if (cachedData && now - cachedData.timestamp < CACHE_EXPIRY) {
          if (!cachedData.session?.user) {
            return NextResponse.redirect(new URL('/mohonijin', req.url));
          }
          if (req.nextUrl.pathname.startsWith('/mohonijin/dashboard') && !cachedData.adminRole) {
            return NextResponse.redirect(new URL('/mohonijin', req.url));
          }
          if (req.nextUrl.pathname === '/mohonijin' && cachedData.adminRole) {
            return NextResponse.redirect(new URL('/mohonijin/dashboard', req.url));
          }
          return res;
        }
      }

      try {
        // If no valid cache, fetch fresh session
        const { data: { session } } = await supabase.auth.getSession();

        // Protected routes
        if (req.nextUrl.pathname.startsWith('/mohonijin/dashboard')) {
          if (!session?.user) {
            return NextResponse.redirect(new URL('/mohonijin', req.url));
          }

          // Check if user has admin role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileError || profileData?.role !== 'admin') {
            // Clear the session and cache
            await supabase.auth.signOut();
            if (accessToken) sessionCache.delete(accessToken);
            return NextResponse.redirect(new URL('/mohonijin', req.url));
          }

          // Cache the successful auth result
          if (accessToken) {
            sessionCache.set(accessToken, {
              session,
              adminRole: true,
              timestamp: now
            });
          }
        }

        // Redirect logged in admin users from login page to dashboard
        if (req.nextUrl.pathname === '/mohonijin' && session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profileData?.role === 'admin') {
            if (accessToken) {
              sessionCache.set(accessToken, {
                session,
                adminRole: true,
                timestamp: now
              });
            }
            return NextResponse.redirect(new URL('/mohonijin/dashboard', req.url));
          }
        }
      } catch (authError: any) {
        // Handle rate limiting
        if (authError.message?.includes('rate limit')) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF));
          // Return the response with cached data if available
          const cachedData = accessToken ? sessionCache.get(accessToken) : null;
          if (cachedData) {
            return res;
          }
        }
        throw authError;
      }
    }

    // Set the response cookies
    res.headers.set('set-cookie', req.headers.get('cookie') || '');
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login but preserve the response cookies
    const redirectResponse = NextResponse.redirect(new URL('/mohonijin', req.url));
    redirectResponse.headers.set('set-cookie', req.headers.get('cookie') || '');
    return redirectResponse;
  }
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)'
};