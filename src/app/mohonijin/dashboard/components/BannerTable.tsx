'use client';

import React, { useState } from 'react';
import ConfirmationModal from '@/app/components/ConfirmationModal';

type Banner = {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive';
  created_at: string;
};

type BannerTableProps = {
  banners: Banner[];
  onUpdateStatus: (id: number, status: 'active' | 'inactive') => void;
  onEdit: (banner: Banner) => void;
  onDelete: (id: number) => void;
};

export default function BannerTable({ banners, onUpdateStatus, onEdit, onDelete }: BannerTableProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setBannerToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (bannerToDelete) {
      onDelete(bannerToDelete);
    }
  };
  return (
    <div className="bg-zinc-800 rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-zinc-700">
        <h3 className="text-lg font-medium">Banner Management</h3>
        <p className="mt-1 text-sm text-zinc-400">Manage banner images and scheduling.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-700">
          <thead className="bg-zinc-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">Image</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">Schedule</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-zinc-800 divide-y divide-zinc-700">
            {banners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-zinc-400">No banners found</td>
              </tr>
            ) : (
              banners.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{banner.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="max-w-xs truncate">{banner.title}</div>
                    {banner.link_url && (
                      <a
                        href={banner.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs mt-1 inline-block"
                      >
                        View Link
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-32 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div>Start: {(() => {
                      try {
                        const date = new Date(banner.start_date);
                        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
                      } catch (e) { return '-'; }
                    })()}</div>
                    <div>End: {(() => {
                      try {
                        const date = new Date(banner.end_date);
                        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
                      } catch (e) { return '-'; }
                    })()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${banner.status === 'active' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
                      }`}>
                      {banner.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => onUpdateStatus(banner.id, banner.status === 'active' ? 'inactive' : 'active')}
                        className={`text-xs ${banner.status === 'active' ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'
                          } text-white py-1 px-2 rounded`}
                      >
                        Mark as {banner.status === 'active' ? 'Inactive' : 'Active'}
                      </button>
                      <button
                        onClick={() => onEdit(banner)}
                        className="text-xs bg-blue-700 hover:bg-blue-600 text-white py-1 px-2 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(banner.id)}
                        className="text-xs bg-red-700 hover:bg-red-600 text-white py-1 px-2 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
}