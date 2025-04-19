import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // Explicitly await cookies() based on the error message from the terminal
  const cookieStore = await cookies()

  // Create a server's supabase client with newly configured cookie, passing in
  // the cookiesExpires and cookiesPath parameters.
  // The `createServerClient` function from `@supabase/ssr` is designed to work
  // directly with the `cookieStore` object returned by Next.js's `cookies()`.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  )
}
