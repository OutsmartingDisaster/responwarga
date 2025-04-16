'use client';

import React from 'react';

interface PhotoUploadSectionProps {
  photoPreview: string | null;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PhotoUploadSection({ photoPreview, onPhotoChange }: PhotoUploadSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Photo Upload</h3>
      <div className="flex flex-col space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
          className="block w-full text-sm text-zinc-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700"
        />
        {photoPreview && (
          <div className="mt-2">
            <img
              src={photoPreview}
              alt="Preview"
              className="max-w-xs h-auto rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}