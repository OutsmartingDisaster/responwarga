'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const MiniMapPicker = dynamic(() => import('./MiniMapPicker'), { ssr: false });
import PhotoUpload from './shared/PhotoUpload';

type AssistanceType = 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';

interface EmergencyReportFormProps {
  onClose: () => void;
  onSuccess: (latitude: number, longitude: number) => void;
}

export default function EmergencyReportForm({ onClose, onSuccess }: EmergencyReportFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '', // Added address to form data state
    description: '',
    assistanceType: '' as AssistanceType,
    agreeToTerms: false,
  });
  // Use { lat, lng } for compatibility with MiniMapPicker
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Handle photo upload (assuming PhotoUpload component passes File | null directly)
  const handlePhotoChange = (file: File | null) => {
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setFormData(prev => ({ ...prev, address: data.display_name }));
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      // Silent fail, allow manual address entry
    }
  };


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setError('You must agree to the terms');
      return;
    }

    if (!location) {
      setError('Location is required. Please pilih lokasi pada peta.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let photoUrl = null;

      if (photo) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('bucket', 'emergency-reports');
        formData.append('path', `${Date.now()}-${photo.name}`);

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload photo');
        }

        const uploadResult = await uploadResponse.json();
        photoUrl = `/uploads/${uploadResult.data.bucket}/${uploadResult.data.path}`;
      }

      // Prepare form data for submission
      const reportData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        description: formData.description,
        assistance_type: formData.assistanceType,
        latitude: location.lat,
        longitude: location.lng,
        photo_url: photoUrl,
      };

      // Submit the report data to the API
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'insert',
          table: 'emergency_reports',
          values: reportData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }

      await response.json();

      setSuccess(true);
      onSuccess(location.lat, location.lng);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          address: '',
          description: '',
          assistanceType: '' as AssistanceType,
          agreeToTerms: false,
        });
        setLocation(null); // Reset location after submission
        setPhoto(null);
        setPhotoPreview(null);
        setError(null); // Clear any previous errors
        setSuccess(false); // Reset success state
        onClose();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during submission.');
      console.error('Submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const modalContent = document.querySelector('.modal-content');
      if (modalContent && !modalContent.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <>
      <div className="p-4 bg-zinc-700 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-heading font-bold text-white">Laporkan Kejadian Darurat</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-zinc-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {success ? (
        <div className="p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="mt-2 text-xl font-medium text-zinc-100">Laporan Berhasil Dikirim</h3>
          <p className="mt-2 text-zinc-400">Terima kasih atas laporan Anda. Tim kami akan segera memverifikasi dan menindaklanjuti.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-white text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-zinc-300">
              Nomor Telepon <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-zinc-400">Kami butuh email kamu agar kami bisa mengirimkan form feedback. hal ini kami butuhkan untuk akuntabilitas performa respon.</p>
          </div>

          {/* MiniMapPicker Component */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Pilih Lokasi Kejadian <span className="text-red-500">*</span>
            </label>
            <MiniMapPicker
              value={location}
              onChange={(coords) => {
                setLocation(coords);
                reverseGeocode(coords.lat, coords.lng);
              }}
            />
            {location && (
              <p className="mt-2 text-sm text-zinc-400">
                Lokasi dipilih: Latitude {location.lat.toFixed(6)}, Longitude {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Address Field (auto-filled by map, but editable) */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-zinc-300">
              Alamat <span className="text-zinc-500">(Auto-isi dari peta, bisa diedit)</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
              Deskripsi Kejadian <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="assistanceType" className="block text-sm font-medium text-zinc-300">
              Jenis Bantuan yang Dibutuhkan <span className="text-red-500">*</span>
            </label>
            <select
              id="assistanceType"
              name="assistanceType"
              required
              value={formData.assistanceType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Pilih Jenis Bantuan</option>
              <option value="evacuation">Evakuasi</option>
              <option value="food_water">Makanan & Air</option>
              <option value="medical">Medis</option>
              <option value="other">Lainnya</option>
              <option value="none">Tidak ada bantuan yang dibutuhkan</option>
            </select>
          </div>

          {/* PhotoUpload Component */}
          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-zinc-300 mb-1">
              Unggah Foto (Opsional)
            </label>
            <PhotoUpload
              onPhotoChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePhotoChange(e.target.files[0]);
                } else {
                  handlePhotoChange(null);
                }
              }}
              photoPreview={photoPreview}
            />
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                required
                checked={formData.agreeToTerms}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-700"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="agreeToTerms" className="font-medium text-zinc-300">
                Saya menyatakan bahwa laporan ini adalah nyata dan saya bertanggung jawab atas kebenarannya di hadapan hukum. <span className="text-red-500">*</span>
              </label>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengirim...
                </>
              ) : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}