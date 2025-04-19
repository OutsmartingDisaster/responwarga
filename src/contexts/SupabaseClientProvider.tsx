'use client';

import React, { createContext, useContext } from 'react';
// Import the already created client instance
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase = createClient();

// Define the context type
type SupabaseContextType = {
  // The context will now always provide the client instance
  supabase: SupabaseClient;
};

// Create the context - no need for undefined default if instance is always available
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Define the Provider component
export function SupabaseClientProvider({ children }: { children: React.ReactNode }) {
  // No need for useState or useEffect, just provide the imported instance
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Custom hook to use the Supabase context
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseClientProvider');
  }
  // The supabase instance is directly available from the imported module
  return context.supabase;
}; 