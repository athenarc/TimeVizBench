import axios, { AxiosInstance } from 'axios';
import Cookie from 'universal-cookie';
import { enqueueSnackbar } from "notistack";

const cookie = new Cookie();

const apiClient: AxiosInstance = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = cookie.get('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  console.log(error)
  if (
    error.response &&
    error.response.status === 401 &&
    error.config.url !== '/auth/login'
  ) {
    enqueueSnackbar("Unauthorized.", { variant: "error" });
    cookie.remove('jwt');
    window.location.href = '/login';
  }
});

export default apiClient;
