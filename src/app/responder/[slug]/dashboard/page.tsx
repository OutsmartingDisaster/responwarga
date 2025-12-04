"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { LogOut } from 'lucide-react';
import DisasterResponseDashboard from "../../dashboard/DisasterResponseDashboard";

export default function ResponderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    async function initializeDashboard() {
      try {
        // Verify user has access to this organization
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'select',
            table: 'organizations',
            filters: [{ column: 'slug', operator: 'eq', value: slug }],
            single: true
          })
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/masuk');
            return;
          }
          throw new Error(result.error?.message || 'Organization not found or access denied');
        }

        const orgData = result.data;
        if (!orgData) {
          throw new Error('Organization not found or access denied');
        }

        setLoading(false);

      } catch (err: any) {
        console.error('Dashboard initialization error:', err);
        setError(err.message || 'An error occurred');
        setLoading(false);
      }
    }

    initializeDashboard();
  }, [router, slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border-l-4 border-red-500 p-4 m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <DisasterResponseDashboard />
    </div>
  );
}
