'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-zinc-900" />
});

export default function MapLoader() {
  return <MapComponent />;
}