'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Initialize Supabase client outside component to prevent recreation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initial form state - moved outside to prevent recreation
const initialFormState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  address: '',
  description: '',
  contributionType: '' as ContributionType,
  capacity: '',
  facilities: {
    food_water: false,
    medical: false,
    clothing: false,
    electricity: false,
    internet: false,
  } as Facility,
  quantity: '',
  unit: '',
  showContactOnMap: false,
  agreeToTerms: false,
};

// Facility options - moved outside to prevent recreation
const facilityOptions = {
  food_water: 'Makanan & Air',
  medical: 'Obat-obatan',
  clothing: 'Pakaian',
  electricity: 'Listrik',
  internet: 'Internet',
} as const;

type ContributionType = 'shelter' | 'food_water' | 'medical' | 'clothing';

interface Facility {
  food_water: boolean;
  medical: boolean;
  clothing: boolean;
  electricity: boolean;
  internet: boolean;
}

interface ContributionFormProps {
  onClose: () => void;
  onSuccess: (latitude: number, longitude: number) => void;
}

export default function ContributionForm({ onClose, onSuccess }: ContributionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Memoized handlers
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  }, []);

  const handleFacilityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        [name]: checked,
      },
    }));
  }, []);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      
      // Cleanup URL when preview changes
      return () => URL.revokeObjectURL(url);
    }
  }, []);

  // Debounced location lookup
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);
        setError(null);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error('Failed to fetch address');
          
          const data = await response.json();
          
          if (data.address) {
            const addressParts = [
              data.address.house_number,
              data.address.road,
              data.address.suburb,
              data.address.city || data.address.town,
              data.address.state
            ].filter(Boolean);
            
            setFormData(prev => ({
              ...prev,
              address: addressParts.join(', ')
            }));
          }
        } catch (err) {
          console.error('Error getting address:', err);
          // Don't set error for address lookup failure
        }
      },
      (err) => {
        setError(`Error getting location: ${err.message}`);
      }
    );
  }, []);

  // Memoized form validation
  const validateForm = useCallback(() => {
    if (!formData.agreeToTerms) {
      setError('Anda harus menyetujui syarat dan ketentuan');
      return false;
    }

    if (!location) {
      setError('Lokasi diperlukan. Silakan bagikan lokasi Anda.');
      return false;
    }

    return true;
  }, [formData.agreeToTerms, location]);

  // Optimized form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload photo if exists
      let photoUrl = null;
      if (photo) {
        const fileName = `contributions/${Date.now()}_${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contribution_photo')
          .upload(fileName, photo);

        if (uploadError) throw new Error(`Error uploading photo: ${uploadError.message}`);

        if (supabaseUrl) {
          photoUrl = new URL(`storage/v1/object/public/contribution_photo/${fileName}`, supabaseUrl).href;
        }
      }

      // Prepare contribution data
      const contributionData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        address: formData.address,
        description: formData.description,
        contribution_type: formData.contributionType,
        capacity: formData.contributionType === 'shelter' ? formData.capacity : null,
        facilities: formData.contributionType === 'shelter' ? formData.facilities : null,
        quantity: ['food_water', 'medical', 'clothing'].includes(formData.contributionType) ? formData.quantity : null,
        unit: ['food_water', 'medical', 'clothing'].includes(formData.contributionType) ? formData.unit : null,
        latitude: location.latitude,
        longitude: location.longitude,
        photo_url: photoUrl,
        status: formData.showContactOnMap ? 'active' : 'Akan di koordinasikan oleh relawan',
        show_contact_info: formData.showContactOnMap,
      };

      const { error: insertError } = await supabase
        .from('contributions')
        .insert([contributionData])
        .select();

      if (insertError) throw new Error(`Error saving contribution: ${insertError.message}`);

      setSuccess(true);
      onSuccess(location.latitude, location.longitude);
      
      // Reset form after delay
      const timeoutId = setTimeout(() => {
        setFormData(initialFormState);
        setPhoto(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setSuccess(false);
        onClose();
      }, 3000);

      return () => clearTimeout(timeoutId);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Event listeners
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  // Memoize static content
  const successContent = useMemo(() => (
    <div className="p-6 text-center">
      <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <h3 className="mt-2 text-xl font-medium text-zinc-100">Kontribusi Berhasil Ditambahkan</h3>
      <p className="mt-2 text-zinc-400">Terima kasih atas bantuan Anda. Kontribusi Anda akan sangat membantu mereka yang membutuhkan.</p>
    </div>
  ), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-2xl modal-content">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Contribute</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {success ? (
            successContent
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded text-white text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="contributionType" className="block text-sm font-medium text-zinc-300">
                  Jenis Kontribusi <span className="text-red-500">*</span>
                </label>
                <select
                  id="contributionType"
                  name="contributionType"
                  required
                  value={formData.contributionType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Pilih Jenis Kontribusi</option>
                  <option value="shelter">Shelter/Tempat Berlindung</option>
                  <option value="food_water">Makanan & Air</option>
                  <option value="medical">Obat-obatan</option>
                  <option value="clothing">Pakaian Kering</option>
                </select>
              </div>

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

              {formData.contributionType === 'shelter' && (
                <>
                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-zinc-300">
                      Kapasitas (Jumlah Orang) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="capacity"
                      name="capacity"
                      required
                      min="1"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Fasilitas yang Tersedia <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {Object.entries({
                        food_water: 'Makanan & Air',
                        medical: 'Obat-obatan',
                        clothing: 'Pakaian',
                        electricity: 'Listrik',
                        internet: 'Internet',
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            id={key}
                            name={key}
                            checked={formData.facilities[key as keyof Facility]}
                            onChange={handleFacilityChange}
                            className="h-4 w-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-700"
                          />
                          <label htmlFor={key} className="ml-2 text-sm text-zinc-300">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {['food_water', 'medical', 'clothing'].includes(formData.contributionType) && (
                <>
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-zinc-300">
                      Jumlah <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        id="quantity"
                        name="quantity"
                        required
                        min="1"
                        value={formData.quantity}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        id="unit"
                        name="unit"
                        placeholder="Satuan"
                        required
                        value={formData.unit}
                        onChange={handleChange}
                        className="mt-1 block w-32 rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
              
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
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Berikan detail tambahan tentang kontribusi Anda..."
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showContactOnMap"
                    name="showContactOnMap"
                    checked={formData.showContactOnMap}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-700"
                  />
                  <label htmlFor="showContactOnMap" className="ml-2 text-sm text-zinc-300">
                    Tampilkan kontak saya di peta untuk penyintas yang membutuhkan bantuan
                  </label>
                </div>
                {!formData.showContactOnMap && (
                  <p className="text-sm text-zinc-400 italic">
                    Jika tidak menampilkan kontak, bantuan Anda akan dikoordinasikan oleh relawan
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  name="agreeToTerms"
                  required
                  checked={formData.agreeToTerms}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 bg-zinc-700"
                />
                <label htmlFor="agreeToTerms" className="ml-2 text-sm text-zinc-300">
                  Saya menyatakan bahwa kontribusi ini adalah nyata dan saya bertanggung jawab atas kebenarannya di hadapan hukum. <span className="text-red-500">*</span>
                </label>
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
                  ) : 'Kirim Kontribusi'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
