import api from './api';

export const tasksService = {
    // ── Task Lists ──────────────────────────────────────────────────────────────
    getTaskLists: () =>
        api.get('/api/tasks/lists'),

    // ── Tasks ───────────────────────────────────────────────────────────────────
    getTasks: (listId = '@default', showCompleted = false) =>
        api.get('/api/tasks/list', { params: { list_id: listId, show_completed: showCompleted } }),

    createTask: (title: string, notes?: string, due?: string, listId = '@default') =>
        api.post('/api/tasks/create', null, { params: { title, notes, due, list_id: listId } }),

    completeTask: (taskId: string, listId = '@default') =>
        api.put(`/api/tasks/complete/${taskId}`, null, { params: { list_id: listId } }),

    deleteTask: (taskId: string, listId = '@default') =>
        api.delete(`/api/tasks/${taskId}`, { params: { list_id: listId } }),

    // ── Notes ───────────────────────────────────────────────────────────────────
    getNotes: () =>
        api.get('/api/tasks/notes'),

    createNote: (title: string, content: string) =>
        api.post('/api/tasks/notes', { title, content }),

    deleteNote: (noteId: string) =>
        api.delete(`/api/tasks/notes/${noteId}`),
};

export default tasksService;
