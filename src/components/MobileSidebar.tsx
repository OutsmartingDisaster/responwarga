'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileSidebarProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebarOverlay({ children, isOpen, onClose }: MobileSidebarProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {children}
      </div>
    </>
  );
}

interface MobileMenuButtonProps {
  onClick: () => void;
  className?: string;
}

export function MobileMenuButton({ onClick, className = '' }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300 ${className}`}
      aria-label="Open menu"
    >
      <Menu size={24} />
    </button>
  );
}

export function MobileSidebarCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-slate-400"
      aria-label="Close menu"
    >
      <X size={20} />
    </button>
  );
}
