'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/../lib/supabase/client';

interface Content {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export default function ContentTable() {
  const supabase = createClient();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setContents(data || []);
    } catch (err: any) {
      console.error('Error fetching contents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'draft' | 'published') => {
    try {
      const { error } = await supabase
        .from('contents')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setContents(prev => prev.map(content => 
        content.id === id ? { ...content, status } : content
      ));
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContents(prev => prev.filter(content => content.id !== id));
    } catch (err: any) {
      console.error('Error deleting content:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700 rounded text-white">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-zinc-300">
        <thead className="text-xs uppercase bg-zinc-800 text-zinc-400">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Updated</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contents.map((content) => (
            <tr key={content.id} className="border-b border-zinc-700 bg-zinc-800/50">
              <td className="px-4 py-3">{content.title}</td>
              <td className="px-4 py-3">
                <select
                  value={content.status}
                  onChange={(e) => updateStatus(content.id, e.target.value as 'draft' | 'published')}
                  className="bg-zinc-700 border border-zinc-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </td>
              <td className="px-4 py-3">
                {new Date(content.updated_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-2">
                <button
                  onClick={() => {/* Implement edit functionality */}}
                  className="text-blue-500 hover:text-blue-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteContent(content.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}