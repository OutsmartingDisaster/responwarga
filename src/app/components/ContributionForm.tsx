'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
const MiniMapPicker = dynamic(() => import('./MiniMapPicker'), { ssr: false });

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

const ContributionForm: React.FC<ContributionFormProps> = ({ onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<typeof initialFormState>(initialFormState);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null); // compatible with MiniMapPicker
  const [address, setAddress] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);

      // Cleanup URL when preview changes
      return () => URL.revokeObjectURL(url);
    }
  }, []);

  // Debounced location lookup
  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch {
      // Silent fail, allow manual address entry
    }
  };

  // Memoized form validation
  const validateForm = useCallback(() => {
    if (!formData.agreeToTerms) {
      setError('Anda harus menyetujui syarat dan ketentuan');
      return false;
    }

    if (!location) {
      setError('Lokasi diperlukan. Silakan pilih lokasi pada peta.');
      return false;
    }

    return true;
  }, [formData.agreeToTerms, location]);

  // Optimized form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error("Lokasi kontribusi wajib diisi. Silakan pilih lokasi pada peta.");
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      let photoPublicUrl: string | null = null;
      if (photoFile) {
        const fileName = `${Date.now()}_${photoFile.name}`;
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('bucket', 'contribution-photos');
        formData.append('path', fileName);

        const uploadResponse = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Gagal mengunggah foto');
        }

        // Assuming the upload API saves to public/uploads, the URL is accessible via /uploads/...
        photoPublicUrl = `/uploads/contribution-photos/${fileName}`;
      }

      const contributionData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        address: address,
        description: formData.description,
        contribution_type: formData.contributionType,
        capacity: formData.contributionType === 'shelter' ? formData.capacity : null,
        latitude: location.lat,
        longitude: location.lng,
        facilities: formData.contributionType === 'shelter' ? formData.facilities : null,
        quantity: ['food_water', 'medical', 'clothing'].includes(formData.contributionType) ? formData.quantity : null,
        unit: ['food_water', 'medical', 'clothing'].includes(formData.contributionType) ? formData.unit : null,
        photo_url: photoPublicUrl,
        status: 'menunggu',
        show_contact_info: formData.showContactOnMap,
        consent_statement: formData.agreeToTerms ? 'Saya setuju' : 'Tidak setuju',
      };

      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'insert',
          table: 'contributions',
          values: contributionData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Gagal mengirim kontribusi');
      }

      toast.success('Kontribusi berhasil dikirim!');
      onSuccess(location.lat, location.lng);

      // Reset form after delay
      const timeoutId = setTimeout(() => {
        setFormData(initialFormState);
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        setSuccess(false);
        onClose();
      }, 3000);

      setSuccess(true);

      return () => clearTimeout(timeoutId);

    } catch (err: any) {
      console.error('Error submitting contribution:', err);
      toast.error(`Gagal mengirim kontribusi: ${err.message}`);
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
    <>
      <div className="p-6 sticky top-0 z-10 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center">
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

      <div className="p-6">
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

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Pilih Lokasi pada Peta <span className="text-red-500">*</span>
              </label>
              <MiniMapPicker
                value={location}
                onChange={coords => {
                  setLocation(coords);
                  reverseGeocode(coords.lat, coords.lng);
                }}
                height="240px"
              />
              {error && (
                <div className="text-xs text-red-500 mt-1">{error}</div>
              )}
              <input
                type="text"
                id="address"
                name="address"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="mt-2 block w-full rounded-md bg-zinc-700 border-zinc-600 text-zinc-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Alamat hasil peta atau isi manual"
              />
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
    </>
  );
};

export default ContributionForm;
