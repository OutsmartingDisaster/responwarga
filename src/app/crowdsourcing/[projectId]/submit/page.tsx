'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Camera, Video, Loader2, CheckCircle, AlertCircle, MapPin, HelpCircle, Navigation, X } from 'lucide-react';
import LocationPickerLeaflet from '@/components/crowdsourcing/LocationPickerLeaflet';
import { extractGPSFromImage, reverseGeocode } from '@/lib/utils/exif';
import type { CrowdsourceProject } from '@/lib/crowdsourcing/types';

export default function SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<CrowdsourceProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [caption, setCaption] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [locationUncertain, setLocationUncertain] = useState(false);
  const [locationLevel, setLocationLevel] = useState<'exact' | 'kelurahan' | 'kecamatan' | 'kabupaten' | 'provinsi'>('exact');
  const [consentPublishName, setConsentPublishName] = useState(false);
  
  // EXIF GPS state
  const [exifGPS, setExifGPS] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [extractingExif, setExtractingExif] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/crowdsourcing/projects/${projectId}`);
      const { data } = await res.json();
      if (!data || data.status !== 'active') {
        router.push('/crowdsourcing');
        return;
      }
      setProject(data);
    } catch (err) {
      console.error('Failed to fetch project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const maxSize = (project?.max_file_size_mb || 10) * 1024 * 1024;
    if (f.size > maxSize) {
      setError(`File terlalu besar. Maksimal ${project?.max_file_size_mb || 10}MB`);
      return;
    }

    const isVideo = f.type.startsWith('video/');
    const isImage = f.type.startsWith('image/');
    
    if (mediaType === 'photo' && !isImage) {
      setError('Pilih file gambar (JPG, PNG)');
      return;
    }
    if (mediaType === 'video' && !isVideo) {
      setError('Pilih file video (MP4)');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setExifGPS(null);
    
    // Extract EXIF GPS from image
    if (isImage && f.type === 'image/jpeg') {
      setExtractingExif(true);
      try {
        const gps = await extractGPSFromImage(f);
        if (gps) {
          const addr = await reverseGeocode(gps.latitude, gps.longitude);
          setExifGPS({ lat: gps.latitude, lng: gps.longitude, address: addr });
        }
      } catch (err) {
        console.error('EXIF extraction failed:', err);
      } finally {
        setExtractingExif(false);
      }
    }
  };
  
  const useExifLocation = () => {
    if (exifGPS) {
      setLocation({ lat: exifGPS.lat, lng: exifGPS.lng });
      setAddress(exifGPS.address);
      setExifGPS(null);
    }
  };

  const handleLocationChange = (loc: { lat: number; lng: number }, addr: string) => {
    setLocation(loc);
    setAddress(addr);
  };

  const validateForm = (): string | null => {
    if (!file) return 'Pilih foto atau video';
    if (!location) return 'Pilih lokasi kejadian';
    if (!address) return 'Alamat tidak ditemukan';
    
    // Validasi caption - minimal 5 kata
    const wordCount = caption.trim().split(/\s+/).filter(w => w.length > 0).length;
    const minWords = 5;
    
    if (wordCount < minWords) {
      return `Deskripsi minimal ${minWords} kata (sekarang ${wordCount} kata)`;
    }
    
    if (locationUncertain && locationLevel === 'exact') {
      return 'Pilih level lokasi (Provinsi/Kabupaten/Kecamatan/Kelurahan)';
    }
    
    // Kontributor info opsional, tapi jika email diisi harus valid
    if (email.trim() && !email.includes('@')) return 'Format email tidak valid';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('media', file!);
      formData.append('media_type', mediaType);
      formData.append('caption', caption);
      formData.append('latitude', location!.lat.toString());
      formData.append('longitude', location!.lng.toString());
      formData.append('address', address);
      formData.append('address_detail', addressDetail);
      formData.append('location_uncertain', locationUncertain.toString());
      formData.append('location_level', locationUncertain ? locationLevel : 'exact');
      formData.append('submitter_name', name);
      formData.append('submitter_email', email);
      formData.append('submitter_whatsapp', whatsapp);
      formData.append('consent_publish_name', consentPublishName.toString());

      const res = await fetch(`/api/crowdsourcing/projects/${projectId}/submit`, {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim dokumentasi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={48} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Terima Kasih!</h1>
          <p className="text-slate-400 mb-4">
            Dokumentasi Anda berhasil dikirim.
          </p>
          
          {/* Moderation Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-100 font-medium mb-1">Menunggu Moderasi</p>
                <p className="text-blue-200/70">
                  Foto/video Anda akan diverifikasi oleh tim kami sebelum dipublikasikan. 
                  Proses ini biasanya memakan waktu 1-24 jam.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Link href={`/crowdsourcing/${projectId}`} 
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
              Lihat Project
            </Link>
            <button onClick={() => { setSuccess(false); setFile(null); setPreview(null); setCaption(''); setLocationUncertain(false); }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all">
              Kirim Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href={`/crowdsourcing/${projectId}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-2">
            <ArrowLeft size={18} /> Kembali
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Upload size={20} /> Kirim Dokumentasi
          </h1>
          <p className="text-sm text-zinc-400">{project?.title}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium mb-2">1. Tipe Media *</label>
            <div className="flex gap-3">
              {project?.allow_photo && (
                <button type="button" onClick={() => { setMediaType('photo'); setFile(null); setPreview(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                    mediaType === 'photo' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-600'
                  }`}>
                  <Camera size={20} /> Foto
                </button>
              )}
              {project?.allow_video && (
                <button type="button" onClick={() => { setMediaType('video'); setFile(null); setPreview(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition ${
                    mediaType === 'video' ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-600'
                  }`}>
                  <Video size={20} /> Video
                </button>
              )}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">2. Upload {mediaType === 'photo' ? 'Foto' : 'Video'} *</label>
            <input ref={fileInputRef} type="file" accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
              onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="relative">
                {mediaType === 'photo' ? (
                  <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                ) : (
                  <video src={preview} controls className="w-full h-48 rounded-lg" />
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-black/50 rounded text-sm">
                  Ganti
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center hover:border-zinc-600 transition">
                <Upload size={24} className="text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400">Klik untuk upload</span>
                <span className="text-xs text-zinc-500">Maks {project?.max_file_size_mb || 10}MB</span>
              </button>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">3. Lokasi Kejadian *</label>
            
            {/* EXIF GPS Detection Notice */}
            {extractingExif && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Mengekstrak lokasi dari metadata foto...</span>
                </div>
              </div>
            )}
            
            {exifGPS && (
              <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Navigation size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-300 font-medium">Lokasi Terdeteksi dari Foto!</p>
                      <p className="text-xs text-green-400/80 mt-1">{exifGPS.address || `${exifGPS.lat.toFixed(6)}, ${exifGPS.lng.toFixed(6)}`}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setExifGPS(null)} className="text-green-400/50 hover:text-green-400">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={useExifLocation}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-all">
                    Gunakan Lokasi Ini
                  </button>
                  <button type="button" onClick={() => setExifGPS(null)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all">
                    Input Manual
                  </button>
                </div>
              </div>
            )}
            
            {/* Location Uncertain Toggle */}
            <div className="mb-3 p-3 bg-slate-800/50 border border-white/5 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={locationUncertain} 
                  onChange={e => setLocationUncertain(e.target.checked)}
                  className="mt-1" />
                <div>
                  <span className="flex items-center gap-1 font-medium">
                    <HelpCircle size={14} /> Saya tidak tahu lokasi pasti
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Centang jika Anda tidak yakin alamat pastinya. Anda tetap harus memilih perkiraan lokasi.
                  </p>
                </div>
              </label>
              
              {locationUncertain && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <label className="block text-xs text-slate-400 mb-1">Level Lokasi yang Diketahui</label>
                  <select value={locationLevel} onChange={e => setLocationLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm">
                    <option value="exact" disabled>-- Pilih Level --</option>
                    <option value="provinsi">Hanya tahu Provinsi</option>
                    <option value="kabupaten">Tahu Kabupaten/Kota</option>
                    <option value="kecamatan">Tahu Kecamatan</option>
                    <option value="kelurahan">Tahu Kelurahan/Desa</option>
                  </select>
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-xs text-orange-400 flex items-start gap-1">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>Karena lokasi tidak pasti, deskripsi harus lebih detail (min 50 karakter). Jelaskan landmark, ciri-ciri, atau petunjuk lokasi lainnya.</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Map + Address */}
            <LocationPickerLeaflet value={location} onChange={handleLocationChange}
              center={project?.latitude && project?.longitude ? { lat: project.latitude, lng: project.longitude } : undefined} />
            
            {/* Current Address Display */}
            {address && (
              <div className="mt-3 p-3 bg-slate-800/50 border border-white/5 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Alamat Terdeteksi:</p>
                    <p className="text-sm text-white">{address}</p>
                  </div>
                </div>
              </div>
            )}
            
            <input type="text" placeholder="Detail alamat tambahan (RT/RW, patokan, landmark)" value={addressDetail}
              onChange={e => setAddressDetail(e.target.value)}
              className="w-full mt-3 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
          </div>

          {/* Caption */}
          {(() => {
            const wordCount = caption.trim().split(/\s+/).filter(w => w.length > 0).length;
            const minWords = 5; // Always 5 words minimum
            const isValid = wordCount >= minWords;
            return (
              <div>
                <label className="block text-sm font-medium mb-2">
                  4. Deskripsi Media * 
                  <span className="text-slate-500">(min {minWords} kata)</span>
                </label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={locationUncertain ? 5 : 3}
                  placeholder={locationUncertain 
                    ? "Jelaskan kondisi yang terlihat, sertakan landmark/ciri-ciri lokasi seperti: nama jalan, bangunan terdekat, papan nama, dll..." 
                    : "Jelaskan kondisi yang terlihat di foto/video ini..."}
                  className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-sm resize-none ${
                    !isValid ? 'border-orange-500/50' : 'border-white/10'
                  }`} />
                <p className={`text-xs mt-1 ${!isValid ? 'text-orange-400' : 'text-green-400'}`}>
                  {wordCount}/{minWords} kata {isValid ? '✓' : 'minimum'}
                </p>
              </div>
            );
          })()}

          {/* Submitter Info */}
          <div>
            <label className="block text-sm font-medium mb-2">5. Informasi Kontributor <span className="text-slate-500 font-normal">(opsional)</span></label>
            <p className="text-xs text-slate-400 mb-3">
              Data Anda hanya digunakan untuk verifikasi dan akan ditambahkan ke daftar kontributor apabila Anda menyetujui.
            </p>
            <div className="space-y-3">
              <input type="text" placeholder="Nama Lengkap" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
              <input type="tel" placeholder="WhatsApp (+62...)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm" />
            </div>
            
            {/* Consent checkbox - always show */}
            <div className="mt-4 p-3 bg-slate-800/50 border border-white/5 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consentPublishName} onChange={e => setConsentPublishName(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500" />
                <div>
                  <span className="text-sm text-white">Saya setuju nama saya dicantumkan di daftar kontributor</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Nama Anda akan ditampilkan secara publik sebagai kontributor dokumentasi ini.
                  </p>
                </div>
              </label>
            </div>
            
            {/* Benefits info */}
            <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <p className="text-xs text-blue-300/80">
                <strong className="text-blue-300">Dengan mengisi data lengkap:</strong>
              </p>
              <ul className="text-xs text-blue-300/70 mt-1 space-y-0.5 list-disc list-inside">
                <li>Mendapat update status kontribusi Anda</li>
                <li>Info perkembangan project dan kesempatan berkontribusi lainnya</li>
              </ul>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {submitting ? 'Mengirim...' : 'Kirim Dokumentasi'}
          </button>
        </form>
      </main>
    </div>
  );
}
