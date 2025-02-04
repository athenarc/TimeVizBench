import {AxiosResponse } from 'axios';

import apiClient from './client';
import {MetadataDto} from "../interfaces/metadata";
import {QueryResultsDto, ResponseDto} from "../interfaces/data";
import {QueryDto} from "../interfaces/query";

const prefix = '/data'

interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
}

interface DataServices {
  getData(datasource: string, postData: QueryDto, signal: AbortSignal): Promise<QueryResultsDto | null>
  getMetadata(
    datasource: string,
    schema: string,
    table: string,
  ): Promise<AxiosResponse<MetadataDto>>,
  clearCache(datasource: string): Promise<void>,
  getDatabaseConfigs(): Promise<Record<string, DatabaseConfig>>
}

const endpoints = {
  getData: (datasource: string) => `${prefix}/${datasource}/query`,
  getMetadata: (
    datasource: string,
    schema: string,
    table: string
  ) => `${prefix}/${datasource}/dataset/${schema}/${table}`,
  clearCache: (datasource: string) => `${prefix}/${datasource}/clear_cache`,
  getConfig: () => `${prefix}/config`,
}

export const services: DataServices = {
  getData: async (
    datasource: string,
    postData: QueryDto,
    signal: AbortSignal
  ): Promise<QueryResultsDto | null> => {
    const response: AxiosResponse<ResponseDto> = await apiClient.post(endpoints.getData(datasource), postData, { signal });

    if (!response) {
      return null;
    }
    return response.data.queryResults;
  },
  clearCache: async (datasource: string): Promise<void> => {
    try {
      await apiClient.post(endpoints.clearCache(datasource));
    } catch (error) {
      console.error(`Failed to clear ${datasource} cache:`, error);
      throw error;
    }
  },
  getMetadata: async (
    datasource: string,
    schema: string,
    table: string,
  ): Promise<AxiosResponse<MetadataDto>> => {
    return apiClient.get(endpoints.getMetadata(datasource, schema, table))
  },
  getDatabaseConfigs: async (): Promise<Record<string, DatabaseConfig>> => {
    const response = await apiClient.get(endpoints.getConfig());
    return response.data;
  }
}
