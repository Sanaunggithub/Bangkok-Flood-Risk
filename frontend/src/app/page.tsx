'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box } from '@mui/material';
import SidePanel from '../components/SidePanel';
import {
  getDistrictBuildings,
  getNearRiverBuildings,
} from '../lib/api';
import type { MapViewProps } from '../components/MapView';
import type {
  DistrictBuildingsResponse,
  DistrictProperties,
} from '../lib/types';

const MapView = dynamic<MapViewProps>(
  () => import('../components/MapView'),
  { ssr: false },
);

export default function HomePage() {
  const [district, setDistrict] = useState<DistrictProperties | null>(null);
  const [buildings, setBuildings] = useState<DistrictBuildingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadDistrictBuildings = useCallback(async (selected: DistrictProperties) => {
    const currentRequest = ++requestId.current;
    setDistrict(selected);
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

  const clear = useCallback(() => {
    requestId.current += 1;
    setDistrict(null);
    setBuildings(null);
    setLoading(false);
    setError(null);
  }, []);

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <SidePanel
        district={district}
        loading={loading}
        error={error}
        onShowNearRiver={loadNearRiverBuildings}
        onClear={clear}
      />
      <Box component="main" sx={{ flex: 1, minWidth: 0, height: '100%' }}>
        <MapView
          selectedDistrict={district}
          buildings={buildings}
          buildingsLoading={loading}
          buildingsError={error}
          onDistrictSelect={loadDistrictBuildings}
        />
      </Box>
    </Box>
  );
}