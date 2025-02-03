import { useEffect, useState } from 'react';
import apiService from '../../api/apiService';

// Define types for method configurations
export interface MethodParameter {
  label: string;
  description: string;
  type: "number" | "boolean";
  default: number | boolean;
  min?: number; // Only for type "number"
  max?: number; // Only for type "number"
  step?: number; // Only for type "number"
}

interface MethodConfig {
    description: string;
    initParams: Record<string, MethodParameter>; // Initialization parameters
    queryParams: Record<string, MethodParameter>; // Query parameters
}

// Fetch configurations from backend
export const useMethodConfigurations = () => {
    const [methodConfigurations, setMethodConfigurations] = useState<Record<string, MethodConfig>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfigurations = async () => {
            try {
                const response = await apiService.get('/method-configurations');
                setMethodConfigurations(response.data);
            } catch (err) {
                setError('Failed to load method configurations');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchConfigurations();
    }, []);

    return { methodConfigurations, loading, error };
};
