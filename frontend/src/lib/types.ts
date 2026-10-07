import type { FeatureCollection, Geometry } from 'geojson';

export interface DistrictProperties {
  district_id: string | number;
  avg_risk: number;
  building_count: number;
  district_name?: string | null;
  name?: string;
}

export interface BuildingProperties {
  building_id: string | number;
  risk_score: number;
  river_distance_m: number;
  name?: string | null;
  building_type?: string | null;
  levels?: number | null;
  district_name?: string | null;
}

export interface TopRiskProperties extends BuildingProperties {
  name: string | null;
  building_type: string | null;
  levels: number | null;
  district_name: string;
  lng: number;
  lat: number;
}

export interface FlyTarget {
  lng: number;
  lat: number;
  key: number;
}

export type DistrictsResponse = FeatureCollection<Geometry, DistrictProperties>;
export type DistrictBuildingsResponse = FeatureCollection<Geometry, BuildingProperties>;
export type NearRiverBuildingsResponse = FeatureCollection<Geometry, BuildingProperties>;
export type TopRiskResponse = FeatureCollection<Geometry, TopRiskProperties>;