import React, { useEffect, useRef, useState } from 'react';
import {
    MapPin, Navigation, Map as MapIcon, ExternalLink,
    AlertCircle, CheckCircle2, X, XCircle,
    Loader2, Plus, Trash2, Car, Footprints,
    Bike, Bus, Zap, BarChart3, ArrowRight, Route,
    Star,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { mapsService } from '../../services/maps.service';
import { cn } from '../../utils/cn';

// Fix Leaflet default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Types ─────────────────────────────────────────────────────────────────────
interface RouteStep {
    instruction: string;
    distance: string;
    duration: string;
    maneuver: string;
}

interface RouteResult {
    summary: string;
    origin: string;
    destination: string;
    distance: string;
    distance_meters: number;
    duration: string;
    duration_seconds: number;
    steps: RouteStep[];
    mode: string;
    polyline: string;
    alternatives?: RouteResult[];
}

interface Suggestion {
    place_id: string;
    description: string;
    main_text: string;
    secondary_text: string;
}

type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

// ─── Saved Route ───────────────────────────────────────────────────────────────
interface SavedRoute {
    id: string;
    label: string;
    origin: string;
    destination: string;
    mode: TravelMode;
}

const SAVED_KEY = 'maps_saved_routes';
function loadSaved(): SavedRoute[] {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; }
}
function persistSaved(r: SavedRoute[]) {
    localStorage.setItem(SAVED_KEY, JSON.stringify(r));
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; type: 'success' | 'error'; text: string }
let _tid = 0;
function useToasts() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const push = (type: 'success' | 'error', text: string) => {
        const id = ++_tid;
        setToasts(p => [...p, { id, type, text }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    };
    const dismiss = (id: number) => setToasts(p => p.filter(t => t.id !== id));
    return { toasts, push, dismiss };
}
function ToastContainer({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
    return (
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white pointer-events-auto',
                    t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                )}>
                    {t.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{t.text}</span>
                    <button onClick={() => onDismiss(t.id)}><X className="h-3.5 w-3.5 opacity-70 hover:opacity-100" /></button>
                </div>
            ))}
        </div>
    );
}

// ─── Mode Config ───────────────────────────────────────────────────────────────
const MODES: { value: TravelMode; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'driving', label: 'Drive', icon: <Car className="h-4 w-4" />, color: 'bg-blue-500' },
    { value: 'walking', label: 'Walk', icon: <Footprints className="h-4 w-4" />, color: 'bg-emerald-500' },
    { value: 'bicycling', label: 'Bike', icon: <Bike className="h-4 w-4" />, color: 'bg-amber-500' },
    { value: 'transit', label: 'Transit', icon: <Bus className="h-4 w-4" />, color: 'bg-violet-500' },
];

// ─── Autocomplete Input ─────────────────────────────────────────────────────────
function PlaceInput({ value, onChange, placeholder, icon, color = 'blue' }: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    icon: React.ReactNode;
    color?: string;
}) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const timerRef = useRef<any>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleChange = (v: string) => {
        onChange(v);
        clearTimeout(timerRef.current);
        if (v.length < 3) { setSuggestions([]); setIsOpen(false); return; }
        setIsLoading(true);
        timerRef.current = setTimeout(async () => {
            try {
                const res = await mapsService.getSuggestions(v);
                setSuggestions(res.data.suggestions || []);
                setIsOpen(true);
            } catch { /* silently ignore */ }
            finally { setIsLoading(false); }
        }, 350);
    };

    const pick = (s: Suggestion) => {
        onChange(s.description);
        setSuggestions([]); setIsOpen(false);
    };

    return (
        <div ref={wrapRef} className="relative flex-1">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
                <input
                    type="text"
                    value={value}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className={cn(
                        "w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none",
                        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    )}
                />
                {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />}
                {value && !isLoading && (
                    <button onClick={() => { onChange(''); setSuggestions([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                    {suggestions.map(s => (
                        <button key={s.place_id} onClick={() => pick(s)}
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.main_text}</p>
                                {s.secondary_text && <p className="text-xs text-slate-400 truncate">{s.secondary_text}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Decode Google polyline to lat/lng array ────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
    if (!encoded) return [];
    const poly: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        poly.push([lat / 1e5, lng / 1e5]);
    }
    return poly;
}

// ─── Auto-fit map bounds helper ─────────────────────────────────────────────────
function FitBounds({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

// ─── Leaflet Map with OpenStreetMap ─────────────────────────────────────────────
function LeafletMap({ 
    origin, 
    destination, 
    polyline, 
    mode 
}: { 
    origin: string; 
    destination: string; 
    polyline?: string;
    mode: string;
}) {
    const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
    const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Geocode addresses to coordinates
    useEffect(() => {
        if (!origin || !destination) return;
        setIsGeocoding(true);

        const geocodeAddresses = async () => {
            try {
                // Try to use backend geocoding (Google Maps API)
                const [originRes, destRes] = await Promise.all([
                    mapsService.geocode(origin).catch(() => null),
                    mapsService.geocode(destination).catch(() => null)
                ]);

                if (originRes?.data?.lat && originRes?.data?.lng) {
                    setOriginCoords([originRes.data.lat, originRes.data.lng]);
                }
                if (destRes?.data?.lat && destRes?.data?.lng) {
                    setDestCoords([destRes.data.lat, destRes.data.lng]);
                }
            } catch (error) {
                console.error('Geocoding error:', error);
            } finally {
                setIsGeocoding(false);
            }
        };

        geocodeAddresses();
    }, [origin, destination]);

    // Decode polyline if available
    useEffect(() => {
        if (polyline) {
            const decoded = decodePolyline(polyline);
            setRoutePath(decoded);
            // Update origin/dest from polyline endpoints if not already set
            if (decoded.length > 0) {
                if (!originCoords) setOriginCoords(decoded[0]);
                if (!destCoords) setDestCoords(decoded[decoded.length - 1]);
            }
        }
    }, [polyline, originCoords, destCoords]);

    // Calculate bounds
    const bounds: [[number, number], [number, number]] | null = 
        routePath.length > 0 
            ? [
                [Math.min(...routePath.map(p => p[0])), Math.min(...routePath.map(p => p[1]))],
                [Math.max(...routePath.map(p => p[0])), Math.max(...routePath.map(p => p[1]))]
              ]
            : originCoords && destCoords 
                ? [[Math.min(originCoords[0], destCoords[0]), Math.min(originCoords[1], destCoords[1])],
                   [Math.max(originCoords[0], destCoords[0]), Math.max(originCoords[1], destCoords[1])]]
                : null;

    const center: [number, number] = 
        originCoords || destCoords 
            ? originCoords || destCoords! 
            : [20.5937, 78.9629]; // Default: India center

    const openInMaps = () => {
        const url = origin && destination
            ? `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/?travelmode=${mode}`
            : `https://www.google.com/maps`;
        window.open(url, '_blank');
    };

    // Custom icons
    const originIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const destIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    if (!origin && !destination) {
        return (
            <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center">
                <div className="h-20 w-20 bg-white dark:bg-slate-700 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-5">
                    <MapIcon className="h-10 w-10 text-blue-500" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">Route Planning</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs text-center">
                    Enter origin and destination to view interactive map with real-time directions.
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {originCoords && (
                    <Marker position={originCoords} icon={originIcon}>
                        <Popup>
                            <div className="text-xs">
                                <p className="font-bold text-emerald-600">Origin</p>
                                <p className="text-slate-700">{origin}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
                
                {destCoords && (
                    <Marker position={destCoords} icon={destIcon}>
                        <Popup>
                            <div className="text-xs">
                                <p className="font-bold text-red-600">Destination</p>
                                <p className="text-slate-700">{destination}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {routePath.length > 0 && (
                    <Polyline 
                        positions={routePath} 
                        color="#3B82F6" 
                        weight={4}
                        opacity={0.7}
                    />
                )}

                <FitBounds bounds={bounds} />
            </MapContainer>

            {/* Floating button to open in Google Maps */}
            <button
                onClick={openInMaps}
                className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
            >
                <ExternalLink className="h-3.5 w-3.5" /> Google Maps
            </button>

            {isGeocoding && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-[999]">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading map...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Google Maps Embed (OLD - kept as fallback) ────────────────────────────────
function MapEmbed({ origin, destination, mode }: { origin: string; destination: string; mode: string }) {
    const apiKey = process.env.REACT_APP_MAPS_EMBED_KEY || process.env.REACT_APP_API_BASE_URL?.replace('http://localhost:8000', '') || '';

    // Use Google Maps embed URL if key available, else fallback to OSM-based static map
    const gmapsUrl = origin && destination
        ? `https://www.google.com/maps/embed/v1/directions?key=AIzaSyPLACEHOLDER&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}`
        : '';

    // Use the directions link as a clickable redirect instead
    const openInMaps = () => {
        const url = origin && destination
            ? `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/?travelmode=${mode}`
            : `https://www.google.com/maps`;
        window.open(url, '_blank');
    };

    return (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center overflow-hidden">
            {/* Decorative map grid background */}
            <div className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '30px 30px'
                }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                {origin && destination ? (
                    <div className="text-center z-10 px-8">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                            <div className="flex-1 max-w-xs">
                                <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-blue-400 to-blue-600 rounded-full relative">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="flex gap-1">
                                            {[0.2, 0.4, 0.6, 0.8].map(p => (
                                                <div key={p} className="h-1.5 w-1.5 bg-blue-400 rounded-full opacity-80" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-600/20" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Route Preview</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-1 truncate max-w-xs mx-auto">{origin}</p>
                        <p className="text-xs text-slate-400 mb-1">↓</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold truncate max-w-xs mx-auto">{destination}</p>
                        <button onClick={openInMaps}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25">
                            <ExternalLink className="h-3.5 w-3.5" /> View in Google Maps
                        </button>
                    </div>
                ) : (
                    <div className="text-center z-10 px-8">
                        <div className="h-20 w-20 bg-white dark:bg-slate-700 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-5">
                            <MapIcon className="h-10 w-10 text-blue-500" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">Route Planning</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs">
                            Enter an origin and destination above to get real-time directions and travel insights.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Step Instruction (strip HTML) ─────────────────────────────────────────────
function StripHtml({ html }: { html: string }) {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return <span>{text}</span>;
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export function MapsPage() {
    const [originInput, setOriginInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [mode, setMode] = useState<TravelMode>('driving');
    const [waypoints, setWaypoints] = useState<string[]>([]);
    const [wpInput, setWpInput] = useState('');

    const [routeData, setRouteData] = useState<RouteResult | null>(null);
    const [selectedAlt, setSelectedAlt] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(loadSaved);
    const [activeTab, setActiveTab] = useState<'steps' | 'alternatives'>('steps');

    const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

    const allRoutes = routeData
        ? [routeData, ...(routeData.alternatives || [])]
        : [];
    const currentRoute = allRoutes[selectedAlt] || routeData;

    // ── Fetch Directions ──
    const fetchDirections = async (customMode?: TravelMode) => {
        if (!originInput.trim() || !destInput.trim()) {
            setError('Please enter both origin and destination.');
            return;
        }
        const activeMode = customMode || mode;
        setIsLoading(true); setError(null); setRouteData(null); setSelectedAlt(0);
        try {
            const wpStr = waypoints.join('|');
            const res = await mapsService.getDirections(originInput.trim(), destInput.trim(), activeMode, wpStr);
            setRouteData(res.data.directions);
            pushToast('success', `${res.data.directions.mode} route: ${res.data.directions.duration}`);
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e?.message || 'Failed to fetch directions.';
            setError(msg);
        } finally { setIsLoading(false); }
    };

    // ── Swap origin/destination ──
    const handleSwap = () => {
        const tmp = originInput;
        setOriginInput(destInput);
        setDestInput(tmp);
    };

    // ── Waypoints ──
    const addWaypoint = () => {
        if (wpInput.trim() && waypoints.length < 4) {
            setWaypoints(p => [...p, wpInput.trim()]);
            setWpInput('');
        }
    };
    const removeWaypoint = (i: number) => setWaypoints(p => p.filter((_, idx) => idx !== i));

    // ── Save / Load ──
    const saveRoute = () => {
        if (!routeData) return;
        const label = window.prompt('Name this route:', `${originInput} → ${destInput}`);
        if (!label) return;
        const r: SavedRoute = {
            id: Date.now().toString(),
            label,
            origin: originInput,
            destination: destInput,
            mode,
        };
        const updated = [r, ...savedRoutes].slice(0, 6);
        setSavedRoutes(updated); persistSaved(updated);
        pushToast('success', `Route "${label}" saved!`);
    };

    const loadRoute = (r: SavedRoute) => {
        setOriginInput(r.origin);
        setDestInput(r.destination);
        setMode(r.mode);
        setWaypoints([]);
    };

    const deleteSaved = (id: string) => {
        const updated = savedRoutes.filter(r => r.id !== id);
        setSavedRoutes(updated); persistSaved(updated);
    };

    // ── Google Maps open ──
    const openGoogleMaps = () => {
        const o = currentRoute?.origin || originInput;
        const d = currentRoute?.destination || destInput;
        if (!o || !d) return;
        window.open(`https://www.google.com/maps/dir/${encodeURIComponent(o)}/${encodeURIComponent(d)}/?travelmode=${mode}`, '_blank');
    };

    const modeConfig = MODES.find(m => m.value === mode) || MODES[0];

    return (
        <div className="space-y-5 pb-12">
            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        Maps & Travel
                        <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">Free</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                        Interactive maps with OpenStreetMap + real-time directions via Google Maps API.
                    </p>
                </div>
            </header>

            {/* ── Route Planner ── */}
            <Card className="p-5 border-slate-200 dark:border-slate-800">
                {/* Mode selector */}
                <div className="flex items-center gap-2 mb-4">
                    {MODES.map(m => (
                        <button key={m.value} onClick={() => {
                            setMode(m.value);
                            if (routeData) fetchDirections(m.value);
                        }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                                mode === m.value
                                    ? `${m.color} text-white shadow-md`
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            )}>
                            {m.icon} {m.label}
                        </button>
                    ))}
                </div>

                {/* Origin / Destination row */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <PlaceInput
                        value={originInput}
                        onChange={setOriginInput}
                        placeholder="Origin — e.g. New Delhi, India"
                        icon={<div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />}
                    />

                    {/* Swap button */}
                    <button onClick={handleSwap}
                        className="hidden md:flex h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex-shrink-0 self-center">
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    <PlaceInput
                        value={destInput}
                        onChange={setDestInput}
                        placeholder="Destination — e.g. Mumbai, India"
                        icon={<div className="h-3 w-3 rounded-full bg-blue-600 ring-2 ring-blue-600/20" />}
                    />

                    <Button onClick={() => fetchDirections()} disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-[42px] px-5 flex-shrink-0 whitespace-nowrap">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Navigation className="h-4 w-4 mr-1.5" />}
                        {isLoading ? 'Finding…' : 'Get Directions'}
                    </Button>
                </div>

                {/* Waypoints */}
                <div className="mt-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={wpInput}
                            onChange={e => setWpInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addWaypoint()}
                            placeholder="Add a stop along the way… (optional, max 4)"
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                        <Button variant="ghost" size="sm" onClick={addWaypoint} disabled={!wpInput.trim() || waypoints.length >= 4} className="h-9 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Stop
                        </Button>
                    </div>
                    {waypoints.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {waypoints.map((wp, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-100 dark:border-blue-800/40">
                                    <Route className="h-3 w-3" /> {wp}
                                    <button onClick={() => removeWaypoint(i)} className="ml-0.5 text-blue-400 hover:text-blue-700"><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-red-700 dark:text-red-400">Error</p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/70 leading-relaxed mt-0.5">{error}</p>
                        </div>
                    </div>
                )}
            </Card>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

                {/* ── Map + Distance Comparison ── */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Map Card */}
                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: 400 }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-2.5">
                                <MapIcon className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    {currentRoute ? `${currentRoute.distance} · ${currentRoute.duration}` : 'Live Route Preview'}
                                </span>
                            </div>
                            <button onClick={openGoogleMaps}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors font-medium">
                                <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
                            </button>
                        </div>
                        <div style={{ height: 'calc(400px - 49px)' }}>
                            <LeafletMap
                                origin={currentRoute?.origin || originInput}
                                destination={currentRoute?.destination || destInput}
                                polyline={currentRoute?.polyline}
                                mode={mode}
                            />
                        </div>
                    </Card>

                    {/* Multi-mode comparison */}
                    {originInput && destInput && !routeData && !isLoading && !error && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Zap className="h-3 w-3 text-amber-500" /> Quick Compare
                                </h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {MODES.map(m => (
                                    <button key={m.value} onClick={() => { 
                                        setMode(m.value); 
                                        fetchDirections(m.value); 
                                    }}
                                        className={cn(
                                            'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:shadow-md',
                                            'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800/40 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                        )}>
                                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-white', m.color)}>
                                            {m.icon}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Route loaded — quick stats */}
                    {currentRoute && (
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="border-slate-200 dark:border-slate-800 p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{currentRoute.distance}</p>
                            </Card>
                            <Card className="border-slate-200 dark:border-slate-800 p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                                <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{currentRoute.duration}</p>
                            </Card>
                            <Card className="border-slate-200 dark:border-slate-800 p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Steps</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{currentRoute.steps.length}</p>
                            </Card>
                        </div>
                    )}
                </div>

                {/* ── Right Sidebar ── */}
                <aside className="lg:col-span-1 space-y-4">

                    {/* Route Summary Card */}
                    {currentRoute && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {modeConfig.icon}
                                    <span className="text-sm font-bold">Route Found</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={saveRoute}
                                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Save route">
                                        <Star className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={openGoogleMaps}
                                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Open in Google Maps">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                {/* From/To */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-start gap-2.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">From</p>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">{currentRoute.origin}</p>
                                        </div>
                                    </div>
                                    <div className="ml-[5px] w-0.5 h-4 bg-blue-200 dark:bg-blue-900/40" />
                                    <div className="flex items-start gap-2.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-600/20 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">To</p>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">{currentRoute.destination}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics grid */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Distance</p>
                                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{currentRoute.distance}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase">Duration</p>
                                        <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">{currentRoute.duration}</p>
                                    </div>
                                </div>

                                {/* Via */}
                                {currentRoute.summary && (
                                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                        <Route className="h-3 w-3" /> Via {currentRoute.summary}
                                    </p>
                                )}
                            </div>

                            {/* Step / Alternatives tabs */}
                            {((currentRoute.steps && currentRoute.steps.length > 0) || (routeData?.alternatives && routeData.alternatives.length > 0)) && (
                                <>
                                    <div className="flex border-t border-slate-100 dark:border-slate-800">
                                        <button onClick={() => setActiveTab('steps')}
                                            className={cn('flex-1 py-2.5 text-xs font-semibold transition-all',
                                                activeTab === 'steps' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                                            Turn-by-Turn
                                        </button>
                                        {routeData?.alternatives && routeData.alternatives.length > 0 && (
                                            <button onClick={() => setActiveTab('alternatives')}
                                                className={cn('flex-1 py-2.5 text-xs font-semibold transition-all',
                                                    activeTab === 'alternatives' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                                                {routeData.alternatives.length + 1} Routes
                                            </button>
                                        )}
                                    </div>

                                    {activeTab === 'steps' && currentRoute.steps.length > 0 && (
                                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
                                            {currentRoute.steps.map((step, i) => (
                                                <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <div className="h-5 w-5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-blue-600 mt-0.5">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                                            <StripHtml html={step.instruction} />
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{step.distance} · {step.duration}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'alternatives' && allRoutes.length > 1 && (
                                        <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                            {allRoutes.map((alt, i) => (
                                                <button key={i} onClick={() => setSelectedAlt(i)}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                                                        selectedAlt === i ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                                    )}>
                                                    <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
                                                        selectedAlt === i ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{alt.summary || `Route ${i + 1}`}</p>
                                                        <p className="text-[11px] text-slate-400">{alt.distance} · {alt.duration}</p>
                                                    </div>
                                                    {selectedAlt === i && <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </Card>
                    )}

                    {/* Saved Routes */}
                    {savedRoutes.length > 0 && (
                        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Star className="h-3 w-3" /> Saved Routes
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {savedRoutes.map(r => (
                                    <div key={r.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                        <button onClick={() => loadRoute(r)} className="flex-1 text-left min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{r.label}</p>
                                            <p className="text-[11px] text-slate-400 capitalize truncate">{r.mode} · {r.origin} → {r.destination}</p>
                                        </button>
                                        <button onClick={() => deleteSaved(r.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </aside>
            </div>

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
