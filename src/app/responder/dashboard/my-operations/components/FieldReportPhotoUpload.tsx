'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface FieldReportPhotoUploadProps {
  photos: string[];
  setPhotos: (photos: string[]) => void;
  operationId: string;
}

export default function FieldReportPhotoUpload({ photos, setPhotos, operationId }: FieldReportPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Hanya file gambar yang diperbolehkan');
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Ukuran file maksimal 5MB');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'field-reports');
        formData.append('path', `${operationId}/${filename}`);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Gagal upload foto');
        }

        const result = await response.json();
        return `/uploads/field-reports/${operationId}/${filename}`; // Return public URL
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos([...photos, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">Foto</label>

      {/* Photo Grid - responsive */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 p-1.5 bg-red-500 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button - mobile optimized with camera capture */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white rounded-xl text-sm disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengupload...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Ambil Foto
            </>
          )}
        </button>
        
        {photos.length === 0 && !uploading && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Maks 5MB per foto
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
