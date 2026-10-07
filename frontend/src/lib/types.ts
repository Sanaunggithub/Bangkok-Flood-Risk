import type { FeatureCollection, Geometry } from 'geojson';

export interface DistrictProperties {
  district_id: string | number;
  avg_risk: number;
  building_count: number;
  district_name?: string;
  name?: string;
}

export interface BuildingProperties {
  building_id: string | number;
  risk_score: number;
  river_distance_m: number;
}

export type DistrictsResponse = FeatureCollection<Geometry, DistrictProperties>;
export type DistrictBuildingsResponse = FeatureCollection<Geometry, BuildingProperties>;
export type NearRiverBuildingsResponse = FeatureCollection<Geometry, BuildingProperties>;