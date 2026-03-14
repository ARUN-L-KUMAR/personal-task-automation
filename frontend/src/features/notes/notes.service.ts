import api from '../../services/api';

export interface Note {
    id: string;
    title: string;
    content: string;
    created: string;
    status: string;
}

export const notesService = {
    list: async (): Promise<Note[]> => {
        const res = await api.get('/api/notes');
        return res.data.notes;
    },

    create: async (title: string, content: string): Promise<Note> => {
        const res = await api.post('/api/notes', { title, content });
        return res.data;
    },

    update: async (id: string, title: string, content: string): Promise<Note> => {
        const res = await api.put(`/api/notes/${id}`, { title, content });
        return res.data;
    },

    remove: async (id: string): Promise<void> => {
        await api.delete(`/api/notes/${id}`);
    },
};
