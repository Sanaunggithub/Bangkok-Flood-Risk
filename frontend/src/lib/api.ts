import type {
  DistrictBuildingsResponse,
  DistrictsResponse,
  NearRiverBuildingsResponse,
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