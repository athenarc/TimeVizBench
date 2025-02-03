import apiClient from './client';

export const services = {
    get: async (url: string) => {
        return apiClient.get(url);
    }
};
