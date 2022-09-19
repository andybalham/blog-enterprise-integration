/* eslint-disable import/prefer-default-export */
import fetch from 'node-fetch';

export const fetchFromUrlAsync = async <T>(url: string): Promise<T> => {
  const fetchResponse = await fetch(url);
  return (await fetchResponse.json()) as T;
};
