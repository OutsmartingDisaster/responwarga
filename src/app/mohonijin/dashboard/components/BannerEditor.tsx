import { createClient } from '@/lib/supabase/client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

export default function BannerEditor() {
  const supabase = createClient();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    fetchBanners();
    fetchBannerSettings();
  }, []);

  const fetchBannerSettings = async () => {
    const { data, error } = await supabase
      .from('banner_settings')
      .select('is_enabled')
      .single();

    if (!error && data) {
      setIsEnabled(data.is_enabled);
    }
  };

  const toggleBannerSystem = async () => {
    try {
      const { error } = await supabase
        .from('banner_settings')
        .update({ is_enabled: !isEnabled })
        .eq('id', (await supabase.from('banner_settings').select('id').single()).data?.id);

      if (error) throw error;

      setIsEnabled(!isEnabled);
      setSuccess('Banner system status updated');
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating banner system status:', err);
      setError('Failed to update banner system status');
    }
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setBanners(data || []);
    } catch (err: any) {
      console.error('Error fetching banners:', err);
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner: any) => {
    setEditingBanner(banner);
    setEditMessage(banner.message);
  };

  const handleSave = async () => {
    if (!editingBanner) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('banners')
        .update({
          message: editMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingBanner.id);
        
      if (error) throw error;
      
      setSuccess('Banner updated successfully');
      fetchBanners();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating banner:', err);
      setError('Failed to update banner');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const { data, error } = await supabase
        .from('banners')
        .insert({
          message: 'New Announcement',
          active: false
        })
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      if (data) {
        setSuccess('New banner created');
        setEditingBanner(data);
        setEditMessage(data.message);
      }
      
      fetchBanners();
    } catch (err: any) {
      console.error('Error creating banner:', err.message);
      setError(`Failed to create new banner: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      fetchBanners();
    } catch (err: any) {
      console.error('Error toggling banner status:', err);
      setError('Failed to update banner status');
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      fetchBanners();
      
      if (editingBanner?.id === id) {
        setEditingBanner(null);
        setEditMessage('');
      }
    } catch (err: any) {
      console.error('Error deleting banner:', err);
      setError('Failed to delete banner');
    }
  };

  return (
    <div className="bg-zinc-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-white">Announcement Banners</h2>
            <button
              onClick={toggleBannerSystem}
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                isEnabled 
                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' 
                  : 'bg-zinc-700/30 text-zinc-400 hover:bg-zinc-700/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-zinc-400'}`} />
              {isEnabled ? 'System Active' : 'System Inactive'}
            </button>
          </div>
          <button
            onClick={handleCreateNew}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
          >
            Create New Banner
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-white">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-white">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-1 bg-zinc-700 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-4 text-white">Available Banners</h3>
              {banners.length === 0 ? (
                <p className="text-zinc-400">No banners found</p>
              ) : (
                <ul className="space-y-2">
                  {banners.map((banner) => (
                    <li key={banner.id} className="p-3 bg-zinc-800 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-2">
                          <p className={`text-sm ${banner.active ? 'text-green-400' : 'text-zinc-400'}`}>
                            {banner.message}
                          </p>
                          <div className="mt-1 text-xs text-zinc-500">
                            Last updated: {new Date(banner.updated_at || banner.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="p-1 text-blue-400 hover:text-blue-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleBannerStatus(banner.id, banner.active)}
                            className={`p-1 ${banner.active ? 'text-green-400 hover:text-green-300' : 'text-zinc-400 hover:text-zinc-300'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteBanner(banner.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="md:col-span-2">
              {editingBanner ? (
                <div className="bg-zinc-700 p-4 rounded-lg">
                  <h3 className="font-medium text-lg mb-4 text-white">Edit Banner</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Announcement Text
                    </label>
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={3}
                      className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded-md text-white"
                      placeholder="Enter announcement text..."
                    />
                  </div>
                  
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setEditingBanner(null);
                        setEditMessage('');
                      }}
                      className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-700 p-4 rounded-lg h-full flex items-center justify-center">
                  <p className="text-zinc-400">Select a banner to edit</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 