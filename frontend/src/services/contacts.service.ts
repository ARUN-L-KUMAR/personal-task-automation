import api from './api';

export const contactsService = {
    getContacts: (maxResults = 50) =>
        api.get('/api/contacts', { params: { max_results: maxResults } }),

    searchContacts: (query: string) =>
        api.get('/api/contacts/search', { params: { query } }),
};

export default contactsService;
