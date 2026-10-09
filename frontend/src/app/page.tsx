'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box } from '@mui/material';
import SidePanel from '../components/SidePanel';
import {
  getDistrictBuildings,
  getNearRiverBuildings,
  searchBuildings,
} from '../lib/api';
import type { MapViewProps } from '../components/MapView';
import type { Geometry } from 'geojson';
import type {
  DistrictBuildingsResponse,
  DistrictProperties,
  FlyTarget,
  SearchResponse,
} from '../lib/types';

const MapView = dynamic<MapViewProps>(
  () => import('../components/MapView'),
  { ssr: false },
);

type SearchInfo = Pick<SearchResponse, 'interpretation' | 'usedFallback' | 'count'>;

function getGeometryCenter(geometry: Geometry): [number, number][] {
  const positions: [number, number][] = [];

  const visitCoordinates = (value: unknown): void => {
    if (!Array.isArray(value)) return;

    const items = value as unknown[];
    if (
      items.length >= 2 &&
      typeof items[0] === 'number' &&
      Number.isFinite(items[0]) &&
      typeof items[1] === 'number' &&
      Number.isFinite(items[1])
    ) {
      positions.push([items[0], items[1]]);
      return;
    }

    items.forEach(visitCoordinates);
  };

  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((child) => {
      positions.push(...getGeometryCenter(child));
    });
  } else {
    visitCoordinates(geometry.coordinates);
  }

  return positions;
}

function getResultsCenter(results: DistrictBuildingsResponse): { lng: number; lat: number } | null {
  const positions = results.features.flatMap((feature) =>
    feature.geometry ? getGeometryCenter(feature.geometry) : [],
  );

  if (positions.length === 0) return null;

  const longitudes = positions.map(([lng]) => lng);
  const latitudes = positions.map(([, lat]) => lat);

  return {
    lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}

export default function HomePage() {
  const [district, setDistrict] = useState<DistrictProperties | null>(null);
  const [buildings, setBuildings] = useState<DistrictBuildingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minRisk, setMinRisk] = useState(0);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
  const requestId = useRef(0);

  const loadDistrictBuildings = useCallback(async (selected: DistrictProperties) => {
    const currentRequest = ++requestId.current;
    setDistrict(selected);
    setSearchInfo(null);
    setLoading(true);
    setError(null);

    try {
      const data = await getDistrictBuildings(selected.district_id);
      if (currentRequest === requestId.current) setBuildings(data);
    } catch (cause: unknown) {
      if (currentRequest === requestId.current) {
        setBuildings(null);
        setError(cause instanceof Error ? cause.message : 'Could not load buildings.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const loadNearRiverBuildings = useCallback(async (meters: number) => {
    const currentRequest = ++requestId.current;
    setSearchInfo(null);
    setLoading(true);
    setError(null);

    try {
      const data = await getNearRiverBuildings(meters);
      if (currentRequest === requestId.current) setBuildings(data);
    } catch (cause: unknown) {
      if (currentRequest === requestId.current) {
        setBuildings(null);
        setError(cause instanceof Error ? cause.message : 'Could not load buildings.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const loadSearchResults = useCallback(async (query: string) => {
    const currentRequest = ++requestId.current;
    setDistrict(null);
    setSearchInfo(null);
    setLoading(true);
    setError(null);

    try {
      const response = await searchBuildings(query);
      if (currentRequest === requestId.current) {
        setBuildings(response.results);
        setSearchInfo({
          interpretation: response.interpretation,
          usedFallback: response.usedFallback,
          count: response.count,
        });

        if (response.count > 0) {
          const center = getResultsCenter(response.results);
          if (center) {
            setFlyTarget({
              ...center,
              zoom: 13,
              key: Date.now(),
            });
          }
        }
      }
    } catch (cause: unknown) {
      if (currentRequest === requestId.current) {
        setBuildings(null);
        setSearchInfo(null);
        setError(cause instanceof Error ? cause.message : 'Could not search buildings.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    requestId.current += 1;
    setDistrict(null);
    setBuildings(null);
    setLoading(false);
    setError(null);
    setSearchInfo(null);
  }, []);

  const handleFlyTo = useCallback((lng: number, lat: number) => {
    setFlyTarget({ lng, lat, key: Date.now() });
  }, []);

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <SidePanel
        district={district}
        loading={loading}
        error={error}
        minRisk={minRisk}
        onMinRiskChange={setMinRisk}
        onFlyTo={handleFlyTo}
        onShowNearRiver={loadNearRiverBuildings}
        onSearch={loadSearchResults}
        searchInfo={searchInfo}
        onClear={clear}
      />
      <Box component="main" sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
        <MapView
          selectedDistrict={district}
          buildings={buildings}
          buildingsLoading={loading}
          buildingsError={error}
          onDistrictSelect={loadDistrictBuildings}
          minRisk={minRisk}
          flyTarget={flyTarget}
        />
      </Box>
    </Box>
  );
}