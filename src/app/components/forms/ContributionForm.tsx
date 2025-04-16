'use client';

import React from 'react';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [formData, setFormData] = useState({
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
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleFacilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        [name]: checked,
      },
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`
            );
            const data = await response.json();
            
            const addressParts = [];
            if (data.address) {
              if (data.address.house_number) addressParts.push(data.address.house_number);
              if (data.address.road) addressParts.push(data.address.road);
              if (data.address.suburb) addressParts.push(data.address.suburb);
              if (data.address.city || data.address.town) addressParts.push(data.address.city || data.address.town);
              if (data.address.state) addressParts.push(data.address.state);
            }
            
            const formattedAddress = addressParts.join(', ');
            setFormData(prev => ({ ...prev, address: formattedAddress }));
            setError(null);
          } catch (err) {
            console.error('Error getting address:', err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setError('Anda harus menyetujui syarat dan ketentuan');
      return;
    }

    if (!location) {
      setError('Lokasi diperlukan. Silakan bagikan lokasi Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let photoUrl = null;
      if (photo) {
        const fileName = `contributions/${Date.now()}_${photo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contribution-photos')
          .upload(fileName, photo);

        if (uploadError) {
          throw new Error(`Error uploading photo: ${uploadError.message}`);
        }

        if (supabaseUrl) {
          const storageUrl = new URL(`storage/v1/object/public/contribution-photos/${fileName}`, supabaseUrl).href;
          photoUrl = storageUrl;
        }
      }

      const { data, error: insertError } = await supabase
        .from('contributions')
        .insert([
          {
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
            status: 'menunggu',
            show_contact: formData.showContactOnMap,
          },
        ])
        .select();

      if (insertError) {
        throw new Error(`Error saving contribution: ${insertError.message}`);
      }

      setSuccess(true);
      onSuccess(location.latitude, location.longitude);
      
      setTimeout(() => {
        setFormData({
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
          },
          quantity: '',
          unit: '',
          showContactOnMap: false,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Formulir Kontribusi</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500 text-white p-3 rounded mb-4">
              Terima kasih atas kontribusi Anda!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Nomor Telepon
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Alamat
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Lokasi Saya
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Jenis Kontribusi
              </label>
              <select
                name="contributionType"
                value={formData.contributionType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Pilih jenis kontribusi</option>
                <option value="shelter">Tempat Berlindung</option>
                <option value="food_water">Makanan & Air</option>
                <option value="medical">Bantuan Medis</option>
                <option value="clothing">Pakaian</option>
              </select>
            </div>

            {formData.contributionType === 'shelter' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Kapasitas (orang)
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Fasilitas
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="food_water"
                        checked={formData.facilities.food_water}
                        onChange={handleFacilityChange}
                        className="form-checkbox text-blue-600"
                      />
                      <span className="text-gray-200">Makanan & Air</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="medical"
                        checked={formData.facilities.medical}
                        onChange={handleFacilityChange}
                        className="form-checkbox text-blue-600"
                      />
                      <span className="text-gray-200">Bantuan Medis</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="clothing"
                        checked={formData.facilities.clothing}
                        onChange={handleFacilityChange}
                        className="form-checkbox text-blue-600"
                      />
                      <span className="text-gray-200">Pakaian</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="electricity"
                        checked={formData.facilities.electricity}
                        onChange={handleFacilityChange}
                        className="form-checkbox text-blue-600"
                      />
                      <span className="text-gray-200">Listrik</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="internet"
                        checked={formData.facilities.internet}
                        onChange={handleFacilityChange}
                        className="form-checkbox text-blue-600"
                      />
                      <span className="text-gray-200">Internet</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {['food_water', 'medical', 'clothing'].includes(formData.contributionType) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Jumlah
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    placeholder="e.g., kg, box, pcs"
                    className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Deskripsi
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Foto (opsional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-w-full h-auto rounded"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="showContactOnMap"
                  checked={formData.showContactOnMap}
                  onChange={handleCheckboxChange}
                  className="form-checkbox text-blue-600"
                />
                <span className="text-gray-200">
                  Tampilkan kontak saya di peta
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleCheckboxChange}
                  className="form-checkbox text-blue-600"
                />
                <span className="text-gray-200">
                  Saya setuju dengan syarat dan ketentuan
                </span>
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Mengirim...' : 'Kirim Kontribusi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
