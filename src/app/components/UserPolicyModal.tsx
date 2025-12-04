'use client';

import { useState, useEffect } from 'react';

interface UserPolicyModalProps {
  onClose: () => void;
}

export default function UserPolicyModal({ onClose }: UserPolicyModalProps) {
  const [policyContent, setPolicyContent] = useState<string>('Memuat kebijakan pengguna...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserPolicy();

    // Handle escape key press
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Handle click outside
    const handleClickOutside = (e: MouseEvent) => {
      const modalContent = document.querySelector('.modal-content');
      if (modalContent && !modalContent.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const fetchUserPolicy = async () => {
    try {
      setLoading(true);

      // Fetch the latest user policy using the data API
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'select',
          table: 'user_policies',
          columns: 'content',
          order: [{ column: 'created_at', ascending: false }],
          limit: 1
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch user policy');
      }

      if (result.data && result.data.length > 0) {
        setPolicyContent(result.data[0].content);
      } else {
        setPolicyContent('Kebijakan pengguna belum tersedia.');
      }
    } catch (err: any) {
      console.error('Error fetching user policy:', err);
      setError('Gagal memuat kebijakan pengguna. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-2xl modal-content">
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">Kebijakan Pengguna</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded text-white">
              {error}
            </div>
          ) : (
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: policyContent }}
            />
          )}
        </div>
      </div>
    </div>
  );
} 