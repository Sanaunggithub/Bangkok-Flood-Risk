'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { getTopRiskBuildings } from '../lib/api';
import type { DistrictProperties, TopRiskResponse } from '../lib/types';

interface SidePanelProps {
  district: DistrictProperties | null;
  loading: boolean;
  error: string | null;
  minRisk: number;
  onMinRiskChange: (value: number) => void;
  onFlyTo: (lng: number, lat: number) => void;
  onShowNearRiver: (meters: number) => void;
  onClear: () => void;
}

export default function SidePanel({
  district,
  loading,
  error,
  minRisk,
  onMinRiskChange,
  onFlyTo,
  onShowNearRiver,
  onClear,
}: SidePanelProps) {
  const [meters, setMeters] = useState(500);
  const [topRiskBuildings, setTopRiskBuildings] = useState<TopRiskResponse | null>(null);
  const [topRiskLoading, setTopRiskLoading] = useState(true);
  const [topRiskError, setTopRiskError] = useState<string | null>(null);
  const topRiskRequestId = useRef(0);

  const districtName =
    district?.district_name ||
    district?.name ||
    (district ? `District ${district.district_id}` : 'No district selected');

  useEffect(() => {
    const currentRequest = ++topRiskRequestId.current;
    setTopRiskLoading(true);
    setTopRiskError(null);

    void getTopRiskBuildings(10, district?.district_id)
      .then((data) => {
        if (currentRequest === topRiskRequestId.current) {
          setTopRiskBuildings(data);
        }
      })
      .catch((cause: unknown) => {
        if (currentRequest === topRiskRequestId.current) {
          setTopRiskBuildings(null);
          setTopRiskError(
            cause instanceof Error ? cause.message : 'Could not load top-risk buildings.',
          );
        }
      })
      .finally(() => {
        if (currentRequest === topRiskRequestId.current) setTopRiskLoading(false);
      });

    return () => {
      if (currentRequest === topRiskRequestId.current) {
        topRiskRequestId.current += 1;
      }
    };
  }, [district?.district_id]);

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

                return (
                  <ListItemButton
                    key={String(properties.building_id)}
                    onClick={() => onFlyTo(properties.lng, properties.lat)}
                    sx={{ px: 1, borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={properties.name || 'Unnamed building'}
                      secondary={`${properties.district_name} · Risk ${properties.risk_score.toFixed(2)}`}
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

        <Button variant="outlined" onClick={onClear}>
          Clear
        </Button>
      </Stack>
    </Paper>
  );
}