'use client';

import { useState, useEffect } from 'react';

export default function MarqueeBanner() {
  const [banners, setBanners] = useState<any[]>([]);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    fetchActiveBanners();
    // Real-time subscription removed as we migrated to REST API
    // We could implement polling here if needed
  }, []);

  const fetchActiveBanners = async () => {
    try {
      // Fetch banner settings
      const settingsResponse = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: 'banner_settings',
          columns: 'is_enabled',
          single: true
        })
      });

      const settingsResult = await settingsResponse.json();
      if (!settingsResponse.ok) {
        // If error (e.g. table doesn't exist or empty), default to true
        console.warn('Failed to fetch banner settings:', settingsResult.error);
      } else {
        setShowBanner(settingsResult.data?.is_enabled ?? true);
      }

      // Fetch active banners
      const bannersResponse = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: 'banners',
          filters: [{ column: 'active', operator: 'eq', value: true }],
          order: [{ column: 'created_at', ascending: false }]
        })
      });

      const bannersResult = await bannersResponse.json();
      if (!bannersResponse.ok) {
        console.warn('Failed to fetch banners:', bannersResult.error);
      } else if (bannersResult.data) {
        setBanners(bannersResult.data);
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
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