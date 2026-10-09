'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getTopRiskBuildings } from '../lib/api';
import type { DistrictProperties, SearchResponse, TopRiskResponse } from '../lib/types';

interface SidePanelProps {
  district: DistrictProperties | null;
  loading: boolean;
  error: string | null;
  minRisk: number;
  onMinRiskChange: (value: number) => void;
  onFlyTo: (lng: number, lat: number) => void;
  onShowNearRiver: (meters: number) => void;
  onSearch: (query: string) => void;
  searchInfo: Pick<SearchResponse, 'interpretation' | 'usedFallback' | 'count'> | null;
  onClear: () => void;
}

const EXAMPLE_QUERIES = [
  'High-risk buildings near the river in Bang Rak',
  'Buildings within 300 m of the river',
  'Residential buildings with risk above 0.7',
];

function getBuildingTitle(name: unknown, buildingType: unknown): string {
  const buildingName = typeof name === 'string' ? name.trim() : '';
  if (buildingName) return buildingName;

  const type = typeof buildingType === 'string' ? buildingType.trim() : '';
  if (!type || type.toLowerCase() === 'yes') return 'Building';

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} building`;
}

export default function SidePanel({
  district,
  loading,
  error,
  minRisk,
  onMinRiskChange,
  onFlyTo,
  onShowNearRiver,
  onSearch,
  searchInfo,
  onClear,
}: SidePanelProps) {
  const [meters, setMeters] = useState(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [topRisk, setTopRisk] = useState<{
    key: string;
    data: TopRiskResponse | null;
    error: string | null;
  } | null>(null);

  const districtName =
    district?.district_name ||
    district?.name ||
    (district ? `District ${district.district_id}` : 'No district selected');

  const requestKey = String(district?.district_id ?? 'all');

  useEffect(() => {
    let cancelled = false;

    getTopRiskBuildings(10, district?.district_id)
      .then((data) => {
        if (!cancelled) setTopRisk({ key: requestKey, data, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setTopRisk({
            key: requestKey,
            data: null,
            error:
              cause instanceof Error ? cause.message : 'Could not load top-risk buildings.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [district?.district_id, requestKey]);

  const topRiskCurrent = topRisk?.key === requestKey ? topRisk : null;
  const topRiskLoading = topRiskCurrent === null;
  const topRiskBuildings = topRiskCurrent?.data ?? null;
  const topRiskError = topRiskCurrent?.error ?? null;

  const submitSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery && !loading) onSearch(trimmedQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    onClear();
  };

  const interpretation = searchInfo?.interpretation;

  return (
    <Paper
      component="aside"
      square
      elevation={3}
      sx={{
        width: { xs: 280, sm: 320 },
        height: '100%',
        overflowY: 'auto',
        flexShrink: 0,
        p: 2.5,
        zIndex: 2,
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1">Ask about the map</Typography>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch(searchQuery);
            }}
            sx={{ display: 'flex', gap: 1, mt: 1 }}
          >
            <TextField
              fullWidth
              size="small"
              label="Ask about the map"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <Button type="submit" variant="contained" disabled={loading || !searchQuery.trim()}>
              Search
            </Button>
          </Box>

          <Stack direction="row" useFlexGap sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
            {EXAMPLE_QUERIES.map((query) => (
              <Chip
                key={query}
                size="small"
                label={query}
                onClick={() => {
                  setSearchQuery(query);
                  submitSearch(query);
                }}
                disabled={loading}
              />
            ))}
          </Stack>

          {searchInfo && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Interpreted as:
              </Typography>
              <Stack direction="row" useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
                {interpretation?.districtName && (
                  <Chip size="small" label={`District: ${interpretation.districtName}`} />
                )}
                {interpretation?.maxDistanceToRiverMeters !== null &&
                  interpretation?.maxDistanceToRiverMeters !== undefined && (
                    <Chip
                      size="small"
                      label={`≤ ${interpretation.maxDistanceToRiverMeters} m from river`}
                    />
                  )}
                {interpretation?.minRisk !== null && interpretation?.minRisk !== undefined && (
                  <Chip size="small" label={`Risk ≥ ${interpretation.minRisk}`} />
                )}
                {interpretation?.buildingType && (
                  <Chip size="small" label={`Type: ${interpretation.buildingType}`} />
                )}
              </Stack>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {searchInfo.count === 0
                  ? 'No matching buildings found. Try changing your search.'
                  : `${searchInfo.count} ${searchInfo.count === 1 ? 'building' : 'buildings'} found.`}
              </Typography>
              {searchInfo.usedFallback && (
                <Typography variant="caption" color="text.secondary">
                  Basic keyword matching used (AI unavailable)
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <Divider />

        <Typography variant="h6">Bangkok flood risk</Typography>

        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Selected district
          </Typography>
          <Typography variant="h6">{districtName}</Typography>
          {district && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Buildings: {district.building_count.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Average risk: {district.avg_risk.toFixed(2)}
              </Typography>
            </Stack>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1">Buildings near river</Typography>
          <Typography variant="body2" color="text.secondary">
            Search distance: {meters} m
          </Typography>
          <Slider
            aria-label="River distance in meters"
            min={100}
            max={2000}
            step={100}
            value={meters}
            valueLabelDisplay="auto"
            onChange={(_, value) => {
              if (typeof value === 'number') setMeters(value);
            }}
          />
          <Button
            fullWidth
            variant="contained"
            disabled={loading}
            onClick={() => onShowNearRiver(meters)}
          >
            {loading ? 'Loading buildings…' : 'Show buildings near river'}
          </Button>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1">Minimum risk</Typography>
          <Typography variant="body2" color="text.secondary">
            Current value: {minRisk.toFixed(2)}
          </Typography>
          <Slider
            aria-label="Minimum risk"
            min={0}
            max={1}
            step={0.05}
            value={minRisk}
            valueLabelDisplay="auto"
            onChange={(_, value) => {
              if (typeof value === 'number') onMinRiskChange(value);
            }}
          />
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1">Top 10 highest-risk buildings</Typography>
          {topRiskLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} aria-label="Loading top-risk buildings" />
            </Box>
          )}
          {topRiskError && <Alert severity="error">{topRiskError}</Alert>}
          {!topRiskLoading && !topRiskError && topRiskBuildings?.features.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No buildings found.
            </Typography>
          )}
          {!topRiskLoading && !topRiskError && topRiskBuildings && (
            <List dense disablePadding>
              {topRiskBuildings.features.map((feature) => {
                const properties = feature.properties;
                const districtName =
                  typeof properties.district_name === 'string'
                    ? properties.district_name.trim()
                    : '';
                const riskScore =
                  typeof properties.risk_score === 'number' &&
                  Number.isFinite(properties.risk_score)
                    ? `Risk ${properties.risk_score.toFixed(2)}`
                    : '';

                return (
                  <ListItemButton
                    key={String(properties.building_id)}
                    onClick={() => onFlyTo(properties.lng, properties.lat)}
                    sx={{ px: 1, borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={getBuildingTitle(properties.name, properties.building_type)}
                      secondary={[districtName, riskScore].filter(Boolean).join(' · ')}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Typography variant="caption" color="text.secondary">
          Risk score is illustrative: based on distance to the Chao Phraya river (70%) and
          building height (30%). It is not real flood data.
        </Typography>

        <Button variant="outlined" onClick={handleClear}>
          Clear
        </Button>
      </Stack>
    </Paper>
  );
}