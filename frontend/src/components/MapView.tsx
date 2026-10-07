'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { getDistricts } from '../lib/api';
import type {
    DistrictBuildingsResponse,
    DistrictProperties,
    DistrictsResponse,
    FlyTarget,
} from '../lib/types';

maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js');

export interface MapViewProps {
    selectedDistrict: DistrictProperties | null;
    buildings: DistrictBuildingsResponse | null;
    buildingsLoading: boolean;
    buildingsError: string | null;
    onDistrictSelect: (district: DistrictProperties) => void;
    minRisk?: number;
    flyTarget?: FlyTarget | null;
}

const EMPTY_DISTRICTS: DistrictsResponse = {
    type: 'FeatureCollection',
    features: [],
};

const EMPTY_BUILDINGS: DistrictBuildingsResponse = {
    type: 'FeatureCollection',
    features: [],
};

export default function MapView({
    selectedDistrict,
    buildings,
    buildingsLoading,
    buildingsError,
    onDistrictSelect,
    minRisk = 0,
    flyTarget = null,
}: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [districts, setDistricts] = useState<DistrictsResponse>(EMPTY_DISTRICTS);
    const [districtsLoading, setDistrictsLoading] = useState(true);
    const [districtsError, setDistrictsError] = useState<string | null>(null);

    // Always call the latest callback without rebuilding the map.
    const onSelectRef = useRef(onDistrictSelect);
    useEffect(() => {
        onSelectRef.current = onDistrictSelect;
    }, [onDistrictSelect]);

    useEffect(() => {
        if (!containerRef.current) return;

        let cancelled = false;
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors',
                    },
                },
                layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
            },
            center: [100.54, 13.73],
            zoom: 12,
        });

        mapRef.current = map;

        const container = containerRef.current;
        const resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(container);

        map.on('error', (event) => {
            console.error('MapLibre error:', event.error);
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
            map.addSource('districts', { type: 'geojson', data: EMPTY_DISTRICTS });
            map.addSource('buildings', { type: 'geojson', data: EMPTY_BUILDINGS });

            map.addLayer({
                id: 'district-fill',
                type: 'fill',
                source: 'districts',
                paint: {
                    'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'avg_risk'],
                        0, '#fff7bc',
                        0.5, '#fdae61',
                        1, '#b10026',
                    ],
                    'fill-opacity': 0.64,
                },
            });

            map.addLayer({
                id: 'building-fill',
                type: 'fill',
                source: 'buildings',
                paint: {
                    'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'risk_score'],
                        0, '#fee8c8',
                        0.5, '#fdbb84',
                        1, '#e34a33',
                    ],
                    'fill-opacity': 0.8,
                    'fill-outline-color': '#7f1d1d',
                },
            });

            map.addLayer({
                id: 'district-outline',
                type: 'line',
                source: 'districts',
                paint: {
                    'line-color': '#574b3c',
                    'line-width': 1.2,
                },
            });

            map.on('click', 'building-fill', (event) => {
                const properties = event.features?.[0]?.properties as
                    | Record<string, unknown>
                    | undefined;
                if (!properties) return;

                const displayValue = (value: unknown, fallback: string): string => {
                    if (typeof value === 'string' && value.trim()) return value;
                    if (typeof value === 'number') return String(value);
                    return fallback;
                };

                const content = document.createElement('div');
                const title = document.createElement('strong');
                title.textContent = displayValue(properties.name, 'Unnamed building');
                content.appendChild(title);

                const addRow = (label: string, value: string) => {
                    const row = document.createElement('div');
                    row.textContent = `${label}: ${value}`;
                    content.appendChild(row);
                };

                addRow('Building type', displayValue(properties.building_type, 'unknown'));
                addRow('Floors', displayValue(properties.levels, 'unknown'));

                const distance = properties.river_distance_m;
                addRow(
                    'Distance to river',
                    typeof distance === 'number' ? `${Math.round(distance)} m` : 'unknown',
                );

                const risk = properties.risk_score;
                addRow('Risk score', typeof risk === 'number' ? risk.toFixed(2) : 'unknown');

                new maplibregl.Popup()
                    .setLngLat(event.lngLat)
                    .setDOMContent(content)
                    .addTo(map);
            });

            map.on('mouseenter', 'building-fill', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'building-fill', () => {
                map.getCanvas().style.cursor = '';
            });

            map.on('click', 'district-fill', (event) => {
                // Do not select a district when the click is on a building above it.
                if (map.queryRenderedFeatures(event.point, { layers: ['building-fill'] }).length > 0) {
                    return;
                }

                const properties = event.features?.[0]?.properties as
                    | Record<string, unknown>
                    | undefined;
                const id = properties?.district_id;
                const avgRisk = properties?.avg_risk;
                const buildingCount = properties?.building_count;

                if (
                    (typeof id !== 'string' && typeof id !== 'number') ||
                    typeof avgRisk !== 'number' ||
                    typeof buildingCount !== 'number'
                ) {
                    return;
                }

                const name = properties?.district_name ?? properties?.name;
                onSelectRef.current({
                    district_id: id,
                    avg_risk: avgRisk,
                    building_count: buildingCount,
                    district_name: typeof name === 'string' ? name : undefined,
                });
            });

            map.on('mouseenter', 'district-fill', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'district-fill', () => {
                map.getCanvas().style.cursor = '';
            });

            setMapReady(true);
        });

        void getDistricts()
            .then((data) => {
                if (!cancelled) setDistricts(data);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setDistrictsError(
                        error instanceof Error ? error.message : 'Could not load districts.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setDistrictsLoading(false);
            });

        return () => {
            resizeObserver.disconnect();
            cancelled = true;
            map.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapReady) return;
        const source = mapRef.current?.getSource('districts') as
            | maplibregl.GeoJSONSource
            | undefined;
        source?.setData(districts);
    }, [districts, mapReady]);

    useEffect(() => {
        if (!mapReady) return;
        const source = mapRef.current?.getSource('buildings') as
            | maplibregl.GeoJSONSource
            | undefined;
        source?.setData(buildings ?? EMPTY_BUILDINGS);
    }, [buildings, mapReady]);

    useEffect(() => {
        if (!mapReady) return;
        mapRef.current?.setFilter('building-fill', [
            '>=',
            ['get', 'risk_score'],
            minRisk,
        ]);
    }, [mapReady, minRisk]);

    useEffect(() => {
        if (!mapReady || !flyTarget) return;
        mapRef.current?.flyTo({
            center: [flyTarget.lng, flyTarget.lat],
            zoom: 16,
        });
    }, [flyTarget, mapReady]);

    const selectedName =
        selectedDistrict?.district_name ||
        selectedDistrict?.name ||
        (selectedDistrict ? `District ${selectedDistrict.district_id}` : '');

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
            <div
                ref={containerRef}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />

            <Box
                aria-label="Map risk legend"
                sx={{
                    position: 'absolute',
                    right: 16,
                    bottom: 24,
                    zIndex: 1,
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 2,
                }}
            >
                <Typography variant="subtitle2">District risk</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <Box
                        sx={{
                            width: 100,
                            height: 12,
                            borderRadius: 0.5,
                            background: 'linear-gradient(90deg, #fff7bc, #fdae61, #b10026)',
                        }}
                    />
                    <Typography variant="caption">0 — 0.5 — 1</Typography>
                </Box>
            </Box>

            {(districtsLoading || buildingsLoading) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                    }}
                >
                    <CircularProgress size={18} />
                    <Typography variant="body2">
                        {districtsLoading
                            ? 'Loading districts…'
                            : `Loading buildings${selectedName ? ` for ${selectedName}` : ''}…`}
                    </Typography>
                </Box>
            )}

            {(districtsError || buildingsError) && (
                <Alert
                    severity="error"
                    sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1, maxWidth: 420 }}
                >
                    {districtsError || buildingsError}
                </Alert>
            )}
        </Box>
    );
}