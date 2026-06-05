"use client";

import { useEffect, useRef } from "react";
import { Equipment } from "@/lib/types/projects";

interface RentalMapProps {
  equipment: (Equipment & { distance?: number })[];
  userLocation?: { lat: number; lon: number };
  onMarkerClick?: (equipment: Equipment) => void;
  isAr: boolean;
}

// Dynamically loaded to avoid SSR issues with Leaflet
export function RentalMap({ equipment, userLocation, onMarkerClick, isAr }: RentalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Lazy load Leaflet
    import("leaflet").then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Initialize map if not already done
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!, {
          center: [28.0339, 1.6596], // Algeria center
          zoom: 5,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // User location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-200"></div>`,
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const userMarker = L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<strong>${isAr ? "موقعك الحالي" : "Votre position"}</strong>`);
        markersRef.current.push(userMarker);
        map.setView([userLocation.lat, userLocation.lon], 8);
      }

      // Equipment markers
      equipment.forEach(eq => {
        if (!eq.gps_coordinates) return;
        const parts = eq.gps_coordinates.split(",");
        if (parts.length < 2) return;
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        if (isNaN(lat) || isNaN(lon)) return;

        const equipIcon = L.divIcon({
          html: `<div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
              🚜
            </div>
          </div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const rate = eq.rent_daily_rate || eq.daily_rate;
        const marker = L.marker([lat, lon], { icon: equipIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px;font-family:sans-serif">
              <strong style="display:block;margin-bottom:4px">${eq.name}</strong>
              <span style="color:#6b7280;font-size:12px">${eq.brand} ${eq.model || ""}</span><br/>
              <span style="color:#6b7280;font-size:12px">${eq.wilaya}</span><br/>
              <strong style="color:#10b981;font-size:14px">${rate.toLocaleString()} DZD/${isAr ? "يوم" : "jour"}</strong>
            </div>
          `);

        marker.on("click", () => onMarkerClick?.(eq));
        markersRef.current.push(marker);
      });

      // Auto-fit bounds if we have markers
      if (markersRef.current.length > 0 && !userLocation) {
        const group = L.featureGroup(markersRef.current);
        try { map.fitBounds(group.getBounds().pad(0.2)); } catch {}
      }
    });

    return () => {
      // Don't destroy map on re-render, just clean markers
    };
  }, [equipment, userLocation, isAr]);

  // Load Leaflet CSS
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: "360px" }}
    />
  );
}
