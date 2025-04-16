'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MarqueeBanner() {
  const [banners, setBanners] = useState<any[]>([]);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    fetchActiveBanners();

    // Subscribe to changes in the banners table
    const channel = supabase
      .channel('banner-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'banners'
        },
        () => {
          fetchActiveBanners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveBanners = async () => {
    const { data: bannerSettings, error: settingsError } = await supabase
      .from('banner_settings')
      .select('is_enabled')
      .single();

    if (!settingsError) {
      setShowBanner(bannerSettings?.is_enabled ?? true);
    }

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBanners(data);
    }
  };

  if (!showBanner || banners.length === 0) return null;

  // Calculate animation duration based on content length
  const totalContentLength = banners.reduce((acc, banner) => acc + banner.message.length, 0);
  const baseSpeed = 30; // seconds for base animation
  const speedMultiplier = Math.max(1, totalContentLength / 100); // Adjust speed based on content length
  const animationDuration = `${baseSpeed * speedMultiplier}s`;

  return (
    <div 
      className="bg-[#EF4444] text-white overflow-hidden py-1.5 relative font-space-grotesk"
      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <div className="overflow-hidden relative">
        <div 
          className="whitespace-nowrap inline-block animate-marquee"
          style={{ 
            animation: `marquee ${animationDuration} linear infinite`,
            willChange: 'transform',
            transform: 'translateX(100%)'
          }}
        >
          {banners.map((banner) => (
            <span key={banner.id} className="mx-4 text-sm font-medium">
              {banner.message}
              <span className="mx-4">•</span>
            </span>
          ))}
          {/* Duplicate banners for seamless loop */}
          {banners.map((banner) => (
            <span key={`${banner.id}-duplicate`} className="mx-4 text-sm font-medium">
              {banner.message}
              <span className="mx-4">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 