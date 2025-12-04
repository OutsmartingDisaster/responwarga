'use client';

import { useState, useEffect } from 'react';
import { createApiClient } from '@/lib/api-client';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const api = createApiClient();
  const [content, setContent] = useState<string>('Memuat informasi...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAboutContent();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

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

  const fetchAboutContent = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await api
        .from('about_content')
        .select('content')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setContent(data[0].content);
      } else {
        setContent('Informasi belum tersedia.');
      }
    } catch (err: any) {
      console.error('Error fetching about content:', err);
      setError('Gagal memuat informasi. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/70" onClick={onClose} />
        <div className="relative bg-zinc-800 w-full max-w-2xl rounded-lg shadow-xl modal-content">
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-white">Tentang Respon Warga</h2>
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
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 