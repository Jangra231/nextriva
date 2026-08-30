"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./MapPinEditor.module.css";

declare global { interface Window { google?: any; __fitizenMapsLoader?: Promise<void> } }

type Point = { lat: number; lng: number };
const INDIA_CENTER: Point = { lat: 20.5937, lng: 78.9629 };

function waitForGoogleMaps(timeoutMs = 12_000) {
  return new Promise<void>((resolve, reject) => { const started = Date.now(); const timer = window.setInterval(() => { if (window.google?.maps?.Map) { window.clearInterval(timer); resolve(); } else if (Date.now() - started >= timeoutMs) { window.clearInterval(timer); reject(new Error("Maps proxy did not initialize in time")); } }, 100); });
}

function loadMapsProxy() {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (window.__fitizenMapsLoader) return window.__fitizenMapsLoader;
  window.__fitizenMapsLoader = fetch("/api/maps/config", { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("Map configuration unavailable"); const config = await response.json() as { scriptUrl?: string }; if (!config.scriptUrl) throw new Error("Map proxy URL is unavailable"); return config.scriptUrl; }).then(scriptUrl => new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-fitizen-map]");
    const settle = () => waitForGoogleMaps().then(resolve, reject);
    if (existing) { existing.addEventListener("load", settle, { once: true }); existing.addEventListener("error", () => reject(new Error("Maps proxy script failed")), { once: true }); settle(); return; }
    const script = document.createElement("script"); script.dataset.fitizenMap = "true"; script.src = scriptUrl; script.async = true; script.defer = true; script.onload = settle; script.onerror = () => reject(new Error("Maps proxy script failed")); document.head.appendChild(script);
  })).catch(error => { window.__fitizenMapsLoader = undefined; throw error; });
  return window.__fitizenMapsLoader;
}

export default function MapPinEditor({ latitude, longitude, onCoordinatesChange }: { latitude: string; longitude: string; onCoordinatesChange: (latitude: string, longitude: string) => void }) {
  const element = useRef<HTMLDivElement>(null); const map = useRef<any>(null); const marker = useRef<any>(null); const [message, setMessage] = useState("Loading interactive map…"); const [failure, setFailure] = useState(""); const [mapReady, setMapReady] = useState(false); const [retryKey, setRetryKey] = useState(0);
  const point = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) ? { lat: Number(latitude), lng: Number(longitude) } : null;
  const previewHref = `https://www.google.com/maps/search/?api=1&query=${point ? `${point.lat},${point.lng}` : `${INDIA_CENTER.lat},${INDIA_CENTER.lng}`}`;
  const bbox = `${(point?.lng ?? INDIA_CENTER.lng) - .08},${(point?.lat ?? INDIA_CENTER.lat) - .05},${(point?.lng ?? INDIA_CENTER.lng) + .08},${(point?.lat ?? INDIA_CENTER.lat) + .05}`; const osmHref = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${point?.lat ?? INDIA_CENTER.lat}%2C${point?.lng ?? INDIA_CENTER.lng}`;
  useEffect(() => { let active = true; setMessage("Loading interactive map…"); setFailure(""); setMapReady(false); const update = (next: Point) => { if (active) onCoordinatesChange(next.lat.toFixed(6), next.lng.toFixed(6)); }; const init = () => { if (!active || !element.current || !window.google?.maps?.Map) return; try { const center = point || INDIA_CENTER; map.current = new window.google.maps.Map(element.current, { center, zoom: point ? 16 : 5, mapTypeControl: true, streetViewControl: false, fullscreenControl: true, zoomControl: true, gestureHandling: "greedy" }); marker.current = new window.google.maps.Marker({ map: map.current, position: center, draggable: true, title: "Drag to refine venue location" }); marker.current.addListener("dragend", (event: any) => update({ lat: event.latLng.lat(), lng: event.latLng.lng() })); map.current.addListener("click", (event: any) => { marker.current.setPosition(event.latLng); update({ lat: event.latLng.lat(), lng: event.latLng.lng() }); }); setMapReady(true); setMessage("Interactive map ready — drag the pin or click the map to set exact coordinates."); } catch (error) { if (!active) return; setFailure(error instanceof Error ? error.message : "Map initialization failed"); setMessage("Using the map preview while the interactive map is unavailable."); } }; loadMapsProxy().then(init).catch(error => { if (!active) return; setFailure(error instanceof Error ? error.message : "Map proxy unavailable"); setMessage("Using the visible map preview while the interactive map is unavailable."); }); return () => { active = false; }; }, [retryKey]);
  useEffect(() => { if (!point || !map.current || !marker.current) return; const current = marker.current.getPosition?.(); const samePoint = current && Math.abs(current.lat() - point.lat) < 0.0000005 && Math.abs(current.lng() - point.lng) < 0.0000005; if (!samePoint) { marker.current.setPosition(point); map.current.panTo(point); map.current.setZoom(16); } }, [latitude, longitude]);
  return <div className={styles.editor}><div className={styles.stage}>{!mapReady ? <iframe className={styles.osmFallback} title="Venue coordinate map preview" src={osmHref} loading="lazy" /> : null}<div ref={element} className={`${styles.canvas} ${mapReady ? styles.canvasReady : ""}`} aria-label="Interactive venue location map" role="application" /></div><div className={styles.status}><p>{message}</p>{failure ? <button type="button" className="text-button" onClick={() => setRetryKey(value => value + 1)}><RefreshCw size={13} /> Retry map</button> : null}</div>{failure ? <div className={styles.fallback}><span>Enter or capture latitude and longitude above, then use the visible map preview or open it in a new tab while the interactive pin is unavailable.</span><a href={previewHref} target="_blank" rel="noreferrer">Open coordinate map <ExternalLink size={13} /></a></div> : null}</div>;
}
