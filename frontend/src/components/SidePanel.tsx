'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import type { DistrictProperties } from '../lib/types';

interface SidePanelProps {
  district: DistrictProperties | null;
  loading: boolean;
  error: string | null;
  onShowNearRiver: (meters: number) => void;
  onClear: () => void;
}

export default function SidePanel({
  district,
  loading,
  error,
  onShowNearRiver,
  onClear,
}: SidePanelProps) {
  const [meters, setMeters] = useState(500);
  const districtName =
    district?.district_name ||
    district?.name ||
    (district ? `District ${district.district_id}` : 'No district selected');

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

        {error && <Alert severity="error">{error}</Alert>}

        <Button variant="outlined" onClick={onClear}>
          Clear
        </Button>
      </Stack>
    </Paper>
  );
}