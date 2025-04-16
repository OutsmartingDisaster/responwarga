'use client';

import { MarkerPopupProps } from './types';

export default function MarkerPopup({ marker, formatDate, renderFacilities }: MarkerPopupProps) {
  const isEmergencyMarker = 'assistance_type' in marker;
  const isContributionMarker = 'contribution_type' in marker;

  const renderStatus = () => {
    if (!isEmergencyMarker) return null;
    
    return (
      <span className={`px-2 py-1 rounded ${
        marker.status === 'needs_verification'
          ? 'bg-yellow-900/50 text-yellow-200'
          : marker.status === 'active'
          ? 'bg-red-900/50 text-red-200'
          : 'bg-green-900/50 text-green-200'
      }`}>
        {marker.status === 'needs_verification'
          ? 'Perlu Verifikasi'
          : marker.status === 'active'
          ? 'Aktif'
          : 'Selesai'}
      </span>
    );
  };

  const renderType = () => {
    if (isEmergencyMarker) {
      return (
        <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded">
          {marker.assistance_type === 'evacuation'
            ? 'Evakuasi'
            : marker.assistance_type === 'food_water'
            ? 'Makanan & Air'
            : marker.assistance_type === 'medical'
            ? 'Medis'
            : marker.assistance_type === 'other'
            ? 'Lainnya'
            : 'Tidak Membutuhkan Bantuan'}
        </span>
      );
    }

    if (isContributionMarker) {
      return (
        <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded text-sm">
          {marker.contribution_type === 'shelter'
            ? 'Shelter'
            : marker.contribution_type === 'food_water'
            ? 'Makanan & Air'
            : marker.contribution_type === 'medical'
            ? 'Obat-obatan'
            : 'Pakaian'}
        </span>
      );
    }

    return null;
  };

  const renderDetails = () => {
    if (!isContributionMarker) return null;

    if (marker.contribution_type === 'shelter') {
      return (
        <div>
          <p className="text-sm">
            <span className="font-medium">Kapasitas:</span> {marker.capacity} orang
          </p>
          {renderFacilities && marker.facilities && renderFacilities(marker.facilities)}
        </div>
      );
    }

    return (
      <p className="text-sm">
        <span className="font-medium">Jumlah:</span> {marker.quantity} {marker.unit}
      </p>
    );
  };

  const renderContactInfo = () => {
    if (!isContributionMarker || !marker.show_contact_info) return null;
    
    return (
      <div className="mt-3 p-2 bg-blue-900/30 rounded-md">
        <h3 className="text-sm font-medium text-blue-200 mb-1">Informasi Kontak:</h3>
        <p className="text-sm"><span className="font-medium">Nama:</span> {marker.full_name}</p>
        {marker.phone_number && (
          <p className="text-sm">
            <span className="font-medium">Telepon:</span>{' '}
            <a href={`tel:${marker.phone_number}`} className="text-blue-300 hover:underline">
              {marker.phone_number}
            </a>
          </p>
        )}
        {marker.email && (
          <p className="text-sm">
            <span className="font-medium">Email:</span>{' '}
            <a href={`mailto:${marker.email}`} className="text-blue-300 hover:underline">
              {marker.email}
            </a>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-xs">
      <div className="font-medium text-lg mb-1">
        {isEmergencyMarker ? 'Report' : 'Contribution'} #{marker.id}
      </div>
      <div className="text-sm text-zinc-400 mb-2">
        {formatDate(marker.created_at)}
      </div>
      <p className="text-sm mb-2">{marker.description}</p>
      {marker.photo_url && (
        <img
          src={marker.photo_url}
          alt={isEmergencyMarker ? 'Emergency situation' : 'Contribution'}
          className="w-full h-32 object-cover rounded-md mb-2"
        />
      )}
      {renderDetails()}
      {renderContactInfo()}
      <div className="mt-2 flex items-center gap-2 text-sm">
        {renderStatus()}
        {renderType()}
      </div>
    </div>
  );
}