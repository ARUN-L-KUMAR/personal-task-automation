import api from './api';

export const emailService = {
    /** Fetch inbox emails; optionally pass a Gmail search query */
    getInbox: (maxResults = 20, query = '') =>
        api.get('/api/email/inbox', { params: { max_results: maxResults, query } }),

    /** Fetch full email detail by message ID */
    getEmail: (messageId: string) =>
        api.get(`/api/email/message/${messageId}`),

    /** Send a new email via Gmail */
    sendEmail: (to: string, subject: string, body: string) =>
        api.post('/api/email/send', null, { params: { to, subject, body } }),
};

export default emailService;
