'use client';

// Mock data for development
export const mockEmergencyMarkers = [
  {
    id: '1',
    latitude: -6.2088,
    longitude: 106.8456,
    full_name: 'Ahmad Setiawan',
    description: 'Banjir setinggi 1 meter, butuh bantuan evakuasi segera.',
    assistance_type: 'evacuation',
    status: 'active',
    photo_url: 'https://placehold.co/300x200',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    latitude: -6.2154,
    longitude: 106.8584,
    full_name: 'Siti Rahayu',
    description: 'Kekurangan makanan dan air bersih untuk 5 keluarga.',
    assistance_type: 'food_water',
    status: 'needs_verification',
    created_at: new Date().toISOString(),
  },
];

export const mockContributionMarkers = [
  {
    id: '1',
    latitude: -6.2110,
    longitude: 106.8500,
    full_name: 'Posko Bantuan Kemang',
    description: 'Posko bantuan dengan kapasitas 50 orang, tersedia makanan dan tempat istirahat.',
    contribution_type: 'shelter',
    capacity: 50,
    facilities: {
      food_water: true,
      medical: true,
      clothing: true,
      electricity: true,
      internet: true,
    },
    photo_url: 'https://placehold.co/300x200',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    latitude: -6.2200,
    longitude: 106.8400,
    full_name: 'RS Darurat Kuningan',
    description: 'Pos kesehatan darurat, tersedia dokter dan obat-obatan.',
    contribution_type: 'medical',
    quantity: 100,
    unit: 'orang',
    created_at: new Date().toISOString(),
  },
];