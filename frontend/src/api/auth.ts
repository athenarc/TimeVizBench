import {AxiosResponse } from 'axios';

import apiClient from './client';
import { Credentials, Jwt } from 'interfaces/auth';

const prefix = '/auth'

interface AuthenticationServices {
  login(postData: Credentials): Promise<AxiosResponse<Jwt>>
}

const endpoints = {
  login: `${prefix}/login`,
}

export const services: AuthenticationServices = {
  login: async (postData: Credentials): Promise<AxiosResponse<Jwt>> => {
    return apiClient.post(endpoints.login, postData);
  },
}
