import fetch from 'node-fetch';

const BASE_URL = 'https://api.tradier.com/v1';
const token = process.env.TRADIER_ACCESS_TOKEN;

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
};

export const tradierGet = async (endpoint, params = {}) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, val));

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Tradier API error: ${errorData.message || response.statusText}`);
  }
  return response.json();
};
