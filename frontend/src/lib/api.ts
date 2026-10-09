import type {
  DistrictBuildingsResponse,
  DistrictsResponse,
  NearRiverBuildingsResponse,
  SearchRequest,
  SearchResponse,
  TopRiskResponse,
} from './types';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'
).replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${path}`);
  }

  return response.json() as Promise<T>;
}

export function getDistricts(): Promise<DistrictsResponse> {
  return getJson('/api/districts');
}

export function getDistrictBuildings(
  districtId: string | number,
): Promise<DistrictBuildingsResponse> {
  return getJson(`/api/districts/${encodeURIComponent(String(districtId))}/buildings`);
}

export function getNearRiverBuildings(
  meters: number,
): Promise<NearRiverBuildingsResponse> {
  return getJson(`/api/buildings/near-river?meters=${encodeURIComponent(String(meters))}`);
}

export function getTopRiskBuildings(
  limit: number,
  districtId?: string | number,
): Promise<TopRiskResponse> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (districtId !== undefined) query.set('districtId', String(districtId));

  return getJson(`/api/buildings/top-risk?${query.toString()}`);
}

export async function searchBuildings(query: string): Promise<SearchResponse> {
  const body: SearchRequest = { query };
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    throw new Error('Too many searches, try again in a minute');
  }

  if (!response.ok) {
    const statusText = response.statusText ? `: ${response.statusText}` : '';
    throw new Error(`Search failed (${response.status})${statusText}`);
  }

  return response.json() as Promise<SearchResponse>;
}