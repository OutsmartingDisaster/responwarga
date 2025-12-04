'use client';

import React from 'react';
import FormInput from './FormInput';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

interface LocationSectionProps {
  location: LocationData | null;
  address: string;
  onGetLocation: () => void;
  onAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
}

export default function LocationSection({
  location,
  address,
  onGetLocation,
  onAddressChange,
  error
}: LocationSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Location Information</h3>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={onGetLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Share Location
        </button>
        {location && location.latitude !== null && location.longitude !== null && (
          <span className="text-sm text-green-400">
            Location shared: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </span>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <FormInput
        label="Address"
        name="address"
        value={address}
        onChange={onAddressChange}
        placeholder="Your address will be filled automatically when you share location"
      />
    </div>
  );
}