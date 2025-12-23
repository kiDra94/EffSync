import { apiClient } from './httpClient.js';

export const authApi = {
  register: (userData) => 
    apiClient.post('/auth/register', userData),
  
  login: (credentials) => 
    apiClient.post('/auth/login', credentials),

  logout: () => 
    apiClient.post('/auth/logout')
};
