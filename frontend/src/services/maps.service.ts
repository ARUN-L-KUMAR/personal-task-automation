import api from './api';

export const mapsService = {
    getDirections: (origin: string, destination: string, mode = 'driving', waypoints = '') =>
        api.get('/api/maps/directions', { params: { origin, destination, mode, waypoints: waypoints || undefined } }),

    getDistanceMatrix: (origins: string, destinations: string, mode = 'driving') =>
        api.get('/api/maps/distance', { params: { origins, destinations, mode } }),

    geocode: (address: string) =>
        api.get('/api/maps/geocode', { params: { address } }),

    reverseGeocode: (lat: number, lng: number) =>
        api.get('/api/maps/reverse', { params: { lat, lng } }),

    getSuggestions: (query: string, sessionToken = '') =>
        api.get('/api/maps/suggest', { params: { query, session_token: sessionToken } }),
};

export default mapsService;
