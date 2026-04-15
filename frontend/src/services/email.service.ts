import api from './api';

export const emailService = {
    /** Fetch inbox emails; optionally pass a Gmail search query */
    getInbox: (maxResults = 50, query = '') =>
        api.get('/api/email/inbox', { params: { max_results: maxResults, query } }),

    /** Fetch full email detail by message ID */
    getEmail: (messageId: string) =>
        api.get(`/api/email/message/${messageId}`),

    /** Send a new email via Gmail */
    sendEmail: (to: string, subject: string, body: string) =>
        api.post('/api/email/send', null, { params: { to, subject, body } }),

    /** Generate an AI reply draft for an existing email */
    generateReplyDraft: (messageId: string, tone = 'professional') =>
        api.post('/api/email/ai-reply-draft', null, { params: { message_id: messageId, tone } }),
};

export default emailService;
