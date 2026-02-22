import api from './api';

export const sheetsService = {
    /** Fetch a list of user's Google Sheets from Drive */
    listSheets: (query = '') =>
        api.get('/api/sheets/list', { params: { query } }),

    /** Read data from a spreadsheet */
    readSheet: (spreadsheetId: string, rangeName = 'Sheet1') =>
        api.get(`/api/sheets/${encodeURIComponent(spreadsheetId)}`, {
            params: { range_name: rangeName },
        }),

    /** Get all sheet tabs (sub-sheets) within a spreadsheet */
    getSheetTabs: (spreadsheetId: string) =>
        api.get(`/api/sheets/${encodeURIComponent(spreadsheetId)}/tabs`),

    /** Write (overwrite) data to a range */
    writeSheet: (spreadsheetId: string, rangeName: string, values: string[][]) =>
        api.post(`/api/sheets/${encodeURIComponent(spreadsheetId)}`, {
            range_name: rangeName,
            values,
        }),

    /** Append rows to a sheet */
    appendRows: (spreadsheetId: string, rangeName: string, values: string[][]) =>
        api.post(`/api/sheets/${encodeURIComponent(spreadsheetId)}/append`, {
            range_name: rangeName,
            values,
        }),
};

export default sheetsService;
