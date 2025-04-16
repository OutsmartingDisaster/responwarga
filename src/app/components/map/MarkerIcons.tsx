'use client';

import L from 'leaflet';

// Create dot icons with depth and shadow for better visibility
export const createDotIcon = (color: string, size: number = 16, borderWidth: number = 2, shadowBlur: number = 4, isPulsing: boolean = false) => {
  console.log(`Creating dot icon with color ${color} and size ${size}`);
  return L.divIcon({
    className: 'custom-dot-icon',
    html: `
      <div style="
        position: relative;
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: ${borderWidth}px solid white;
        box-shadow: 0 ${shadowBlur}px ${shadowBlur * 1.5}px rgba(0,0,0,0.6);
        transform: translateZ(0);
        ${isPulsing ? 'animation: pulse 2s infinite ease-in-out;' : ''}
      ">
        <div style="
          position: absolute;
          top: 15%;
          left: 15%;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.3);
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
};

// Define marker types and their corresponding icons
export const markerIcons = {
  // Emergency markers - red dot with larger size (18px)
  emergency: createDotIcon('#ef4444', 18, 2, 4, true),
  
  // Contribution markers - blue dots (16px)
  shelter: createDotIcon('#3b82f6', 16, 2, 3),  // blue
  food_water: createDotIcon('#3b82f6', 16, 2, 3), // blue
  medical: createDotIcon('#3b82f6', 16, 2, 3),  // blue
  clothing: createDotIcon('#3b82f6', 16, 2, 3),  // blue
  
  // Default fallback
  default: createDotIcon('#3b82f6', 16, 2, 3)  // blue fallback
};

// Create a function to get the appropriate icon based on marker type
export const getMarkerIcon = (type: string): L.DivIcon => {
  console.log('Getting marker icon for type:', type);
  const iconKey = type as keyof typeof markerIcons;
  const icon = markerIcons[iconKey] || markerIcons.default;
  console.log('Using icon:', iconKey in markerIcons ? iconKey : 'default');
  return icon;
};