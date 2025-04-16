'use client';

import React from 'react';

interface LocationPickerProps {
  address: string;
  onAddressChange: (address: string) => void;
  onLocationChange: (location: { latitude: number; longitude: number } | null) => void;
  location: { latitude: number; longitude: number } | null;
  error: string | null;
  setError: (error: string | null) => void;
}

export default function LocationPicker({ 
  address,
  onAddressChange,
  onLocationChange,
  location,
  error,
  setError
}: LocationPickerProps) {
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          onLocationChange(coords);
          setError(null);

          // Parse address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
              // Show confirmation dialog
              if (window.confirm(`Is this address correct?\n\n${data.display_name}\n\nClick OK to use this address, or Cancel to enter manually.`)) {
                onAddressChange(data.display_name);
              }
            }
          } catch (err) {
            console.error('Error parsing address:', err);
            // Don't show error to user, just let them input manually
          }
        },
        (err) => {
          setError(`Error getting location: ${err.message}`);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-zinc-300">
          Alamat <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <textarea
            id="address"
            name="address"
            rows={3}
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            required
            className="block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Untuk memudahkan tim respon, bagikan lokasi kamu, lalu perbaiki secara manual untuk detail rumah/bangunan seperti nomor atau RT/RW.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={handleGetLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {location ? 'Perbarui Lokasi' : 'Bagikan Lokasi'}
        </button>
        {location && (
          <div className="mt-2 text-sm text-zinc-400">
            Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
          </div>
        )}
      </div>
    </div>
  );
}