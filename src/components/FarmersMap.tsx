import { useEffect, useRef } from 'react';
import { FarmerProfile } from '../lib/supabase';

declare global {
  interface Window { L: any }
}

interface FarmersMapProps {
  farmers: (FarmerProfile & { distanceKm?: number })[];
  buyerLocation?: { lat: number; lng: number } | null;
}

export function FarmersMap({ farmers, buyerLocation }: FarmersMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const layersRef = useRef<{ markers: any[]; circles: any[] }>({ markers: [], circles: [] });

  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    if (!leafletMapRef.current) {
      const startLat = buyerLocation?.lat ?? (farmers[0]?.latitude ?? 0);
      const startLng = buyerLocation?.lng ?? (farmers[0]?.longitude ?? 0);
      const startZoom = buyerLocation || farmers.length > 0 ? 11 : 2;

      leafletMapRef.current = L.map(mapRef.current).setView([startLat, startLng], startZoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMapRef.current);
    }

    // clear previous layers
    layersRef.current.markers.forEach(m => leafletMapRef.current.removeLayer(m));
    layersRef.current.circles.forEach(c => leafletMapRef.current.removeLayer(c));
    layersRef.current = { markers: [], circles: [] };

    const L = window.L;

    // buyer marker
    if (buyerLocation) {
      const buyerMarker = L.marker([buyerLocation.lat, buyerLocation.lng], { title: 'You' }).addTo(leafletMapRef.current);
      layersRef.current.markers.push(buyerMarker);
    }

    // farmer markers and delivery radius
    const bounds = L.latLngBounds([]);
    farmers.forEach(f => {
      if (typeof f.latitude === 'number' && typeof f.longitude === 'number') {
        const marker = L.marker([f.latitude, f.longitude], { title: f.farm_name }).addTo(leafletMapRef.current);
        marker.bindPopup(`<strong>${f.farm_name}</strong><br/>Delivery radius: ${f.delivery_radius_km} km`);
        layersRef.current.markers.push(marker);
        bounds.extend([f.latitude, f.longitude]);

        if (f.delivery_radius_km && f.delivery_radius_km > 0) {
          const circle = L.circle([f.latitude, f.longitude], {
            radius: f.delivery_radius_km * 1000,
            color: '#059669',
            fillColor: '#10B981',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(leafletMapRef.current);
          layersRef.current.circles.push(circle);
        }
      }
    });

    if (bounds.isValid()) {
      leafletMapRef.current.fitBounds(bounds.pad(0.2));
    }
  }, [farmers, buyerLocation]);

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-gray-200" ref={mapRef} />
  );
}


