'use client';

import React from 'react';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
  currentLocation: { latitude: number; longitude: number } | null;
}

export default function LocationPicker({ onLocationSelect, currentLocation }: LocationPickerProps) {
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          onLocationSelect(coords);

          // Parse address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
              // Show confirmation dialog
              if (window.confirm(`Is this address correct?\n\n${data.display_name}\n\nClick OK to use this address, or Cancel to enter manually.`)) {
                // Handle address confirmation if needed
              }
            }
          } catch (err) {
            console.error('Error parsing address:', err);
          }
        },
        (err) => {
          console.error(`Error getting location: ${err.message}`);
        }
      );
    } else {
      console.error('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleGetLocation}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {currentLocation ? 'Update Location' : 'Share Location'}
      </button>
      {currentLocation && (
        <p className="mt-2 text-sm text-gray-300">
          Location shared: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
        </p>
      )}
    </div>
  );
}