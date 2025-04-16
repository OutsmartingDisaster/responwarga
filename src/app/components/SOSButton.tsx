'use client';

import { useState } from 'react';

export default function SosButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmergencyCall = () => {
    // In a real app, this would trigger an emergency call
    window.location.href = 'tel:112';
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
        </svg>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-zinc-800 rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-heading font-bold text-white mb-4">Panggilan Darurat</h3>
            <p className="text-zinc-300 mb-6">
              Apakah Anda yakin ingin melakukan panggilan darurat ke 112?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEmergencyCall}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Ya, Hubungi 112
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
