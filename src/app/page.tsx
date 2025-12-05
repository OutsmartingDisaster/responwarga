'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import EmergencyReportForm from './components/EmergencyReportForm';
import ContributionForm from './components/ContributionForm';
import SOSButton from './components/SOSButton';
import UserPolicyModal from './components/UserPolicyModal';
import AboutModal from './components/AboutModal';
import MarqueeBanner from './components/MarqueeBanner';
import { getSession } from '@/lib/auth/api';


type FilterType = 'all' | 'emergency' | 'contribution';
type EmergencyType = 'all' | 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';
type ContributionType = 'all' | 'shelter' | 'food_water' | 'medical' | 'clothing';

// Dynamically import the Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ),
});

interface ModalSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  content: string;
  cta_text: string;
  cta_url: string;
  public_note: string;
}

export default function Home() {
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showUserPolicyModal, setShowUserPolicyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [modalSettings, setModalSettings] = useState<ModalSettings | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('all');
  const [contributionType, setContributionType] = useState<ContributionType>('all');

  useEffect(() => {
    const hydrateSession = async () => {
      const user = await getSession();
      setIsSuperAdmin(user?.role === 'super_admin');
    };
    hydrateSession();

    // Fetch modal settings
    const fetchModalSettings = async () => {
      try {
        const res = await fetch('/api/settings/homepage_modal');
        if (res.ok) {
          const { data } = await res.json();
          setModalSettings(data);
          setShowAnnouncementModal(data?.enabled ?? false);
        }
      } catch (error) {
        console.error('Error fetching modal settings:', error);
      }
    };
    fetchModalSettings();
  }, []);

  // State for fetched emergency reports
  const [emergencyReports, setEmergencyReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Fetch emergency reports data
  useEffect(() => {
    const fetchReports = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        // Fetch only reports relevant for the public map
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'select',
            table: 'emergency_reports',
            filters: [
              { column: 'status', operator: 'in', value: ['verified', 'ditugaskan', 'on progress'] }
            ]
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to fetch reports');
        }

        setEmergencyReports(result.data || []);
        console.log('Fetched emergency reports for map:', result.data);
      } catch (err: any) {
        console.error("Error fetching emergency reports:", err);
        setReportsError(err.message);
        setEmergencyReports([]);
      } finally {
        setReportsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleFormSuccess = (latitude: number, longitude: number) => {
    setMapCenter([latitude, longitude]);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-zinc-900">
      {/* Map Component */}
      <div className="absolute inset-0 z-0">
        <Map
          center={mapCenter}
          filterType={filterType}
          emergencyType={emergencyType}
          contributionType={contributionType}
          emergencyReportsData={emergencyReports}
        />
      </div>

      {/* Marquee Banner */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <MarqueeBanner />
      </div>

      {/* Header */}
      <header className="absolute top-8 left-0 right-0 px-3 sm:px-4 flex flex-col z-20">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-white flex items-center gap-2">
          <img
            src="/icons/response.svg"
            alt="Respon Warga"
            className="w-7 h-7 sm:w-8 sm:h-8"
          />
          Respon Warga
        </h1>

        {/* Filter Controls */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="px-2.5 sm:px-3 py-1.5 bg-zinc-800/90 backdrop-blur border border-zinc-700 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all" className="bg-zinc-800 text-white">Semua Marker</option>
            <option value="emergency" className="bg-zinc-800 text-white">Laporan Darurat</option>
            <option value="contribution" className="bg-zinc-800 text-white">Kontribusi</option>
          </select>

          {filterType === 'emergency' && (
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
              className="px-3 py-1.5 bg-zinc-800/80 backdrop-blur border border-zinc-700 rounded-md text-sm text-white font-space-grotesk focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <option value="all" className="bg-zinc-800 text-white">Semua Laporan</option>
              <option value="evacuation" className="bg-zinc-800 text-white">Evakuasi</option>
              <option value="food_water" className="bg-zinc-800 text-white">Makanan & Air</option>
              <option value="medical" className="bg-zinc-800 text-white">Medis</option>
              <option value="other" className="bg-zinc-800 text-white">Lainnya</option>
              <option value="none" className="bg-zinc-800 text-white">Tidak Butuh Bantuan</option>
            </select>
          )}

          {filterType === 'contribution' && (
            <select
              value={contributionType}
              onChange={(e) => setContributionType(e.target.value as ContributionType)}
              className="px-3 py-1.5 bg-zinc-800/80 backdrop-blur border border-zinc-700 rounded-md text-sm text-white font-space-grotesk focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <option value="all" className="bg-zinc-800 text-white">Semua Kontribusi</option>
              <option value="shelter" className="bg-zinc-800 text-white">Shelter</option>
              <option value="food_water" className="bg-zinc-800 text-white">Makanan & Air</option>
              <option value="medical" className="bg-zinc-800 text-white">Obat-obatan</option>
              <option value="clothing" className="bg-zinc-800 text-white">Pakaian</option>
            </select>
          )}
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 pb-safe flex flex-col items-center space-y-3 sm:space-y-4 z-10">
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto px-2">
          <button
            onClick={() => setShowEmergencyForm(true)}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-full shadow-lg transition-colors text-sm sm:text-base"
          >
            Butuh Bantuan
          </button>
          <button
            onClick={() => setShowContributionForm(true)}
            className="flex-1 sm:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-full shadow-lg transition-colors text-sm sm:text-base"
          >
            Beri Bantuan
          </button>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center space-x-4 text-xs sm:text-sm">
          <button
            onClick={() => setShowAboutModal(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Tentang Respon Warga
          </button>
          <span className="text-zinc-600">•</span>
          <button
            onClick={() => setShowUserPolicyModal(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Kebijakan Pengguna
          </button>
        </div>
      </nav>

      {/* SOS Button */}
      <div className="absolute bottom-24 right-4 z-10">
        <SOSButton />
      </div>

      {/* Forms and Modals */}
      {showAnnouncementModal && modalSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm"
            onClick={() => {
              if (isSuperAdmin) {
                setShowAnnouncementModal(false);
              }
            }}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white/95 p-8 shadow-2xl border border-white/40">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="uppercase text-xs tracking-[0.3em] text-red-500 font-semibold">
                  {modalSettings.subtitle}
                </p>
                <h2 className="mt-3 text-2xl font-heading text-zinc-900">
                  {modalSettings.title}
                </h2>
              </div>
              {isSuperAdmin && (
                <button
                  aria-label="Tutup pengumuman"
                  className="text-zinc-500 hover:text-zinc-800 transition"
                  onClick={() => setShowAnnouncementModal(false)}
                >
                  ✕
                </button>
              )}
            </div>
            <p className="mt-6 text-zinc-700 leading-relaxed whitespace-pre-line">
              {modalSettings.content}
            </p>
            {!isSuperAdmin && modalSettings.public_note && (
              <p className="mt-4 text-sm text-zinc-500">
                {modalSettings.public_note}
              </p>
            )}
            {modalSettings.cta_url && modalSettings.cta_text && (
              <a
                href={modalSettings.cta_url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white font-medium shadow-lg hover:bg-blue-500 transition"
              >
                {modalSettings.cta_text}
                <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
      )}
      {showEmergencyForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70" onClick={() => setShowEmergencyForm(false)} />
            <div className="relative bg-zinc-800 w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
              <div className="max-h-[90vh] overflow-y-auto">
                <EmergencyReportForm
                  onClose={() => setShowEmergencyForm(false)}
                  onSuccess={handleFormSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {showContributionForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70" onClick={() => setShowContributionForm(false)} />
            <div className="relative bg-zinc-800 w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
              <div className="max-h-[90vh] overflow-y-auto">
                <ContributionForm
                  onClose={() => setShowContributionForm(false)}
                  onSuccess={handleFormSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {showUserPolicyModal && (
        <UserPolicyModal onClose={() => setShowUserPolicyModal(false)} />
      )}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
    </main>
  );
}