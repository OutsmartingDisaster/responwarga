'use client';

import React from 'react';

interface PhotoUploadProps {
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoPreview: string | null;
}

export default function PhotoUpload({ onPhotoChange, photoPreview }: PhotoUploadProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        Photo (Optional)
      </label>
      <div className="flex items-center space-x-4">
        <input
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
          className="hidden"
          id="photo-upload"
        />
        <label
          htmlFor="photo-upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
        >
          Choose Photo
        </label>
        {photoPreview && (
          <div className="relative w-20 h-20">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-full object-cover rounded-md"
            />
          </div>
        )}
      </div>
    </div>
  );
}