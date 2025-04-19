'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import FormInput from './shared/FormInput';
import LocationPicker from './shared/LocationPicker';
import PhotoUpload from './shared/PhotoUpload';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AssistanceType = 'evacuation' | 'food_water' | 'medical' | 'other' | 'none';

interface EmergencyReportFormProps {
  onClose: () => void;
  onSuccess: (latitude: number, longitude: number) => void;
}

export default function EmergencyReportForm({ onClose, onSuccess }: EmergencyReportFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    description: '',
    assistanceType: '' as AssistanceType,
    agreeToTerms: false,
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
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

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Get current location and parse address
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setError(null);

          // Parse address from coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
              // Directly set the address without confirmation
              setFormData(prev => ({ ...prev, address: data.display_name }));
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the terms');
      return;
    }

    if (!location) {
      setError('Location is required. Please share your location.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let photoPublicUrl: string | null = null;
      if (photo) {
        const fileName = `${Date.now()}_${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('emergency-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('emergency-photos')
          .getPublicUrl(fileName);
        
        photoPublicUrl = urlData?.publicUrl || null;
        console.log('Uploaded photo public URL:', photoPublicUrl);
      }

      const reportData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        latitude: location.latitude,
        longitude: location.longitude,
        address: formData.address || 'Alamat tidak spesifik',
        description: formData.description,
        assistance_type: formData.assistanceType,
        photo_url: photoPublicUrl,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('emergency_reports')
        .insert([reportData])
        .select();

      if (error) throw error;
      
      setSuccess(true);
      onSuccess(location.latitude, location.longitude);
      
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
        setPhoto(null);
        setPhotoPreview(null);
        setSuccess(false);
        onClose();
      }, 3000);

    } catch (err: any) {
      setError(err.message);
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
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-zinc-800 rounded-lg shadow-xl overflow-hidden modal-content">
        <div className="p-4 bg-zinc-700 flex justify-between items-center">
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
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-zinc-300">
                Alamat <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-zinc-400">Lengkapi detail alamat secara manual dengan informasi seperti nomor rumah, gang, atau patokan terdekat agar tim respon dapat dengan mudah menemukan lokasi.</p>
              {location && (
                <p className="mt-1 text-xs text-green-500">
                  Lokasi ditemukan: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-zinc-300">
                Foto <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                required
                onChange={handlePhotoChange}
                className="mt-1 block w-full text-sm text-zinc-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="h-32 w-auto object-cover rounded-md" />
                </div>
              )}
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
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      </div>
    </div>
  );
}
