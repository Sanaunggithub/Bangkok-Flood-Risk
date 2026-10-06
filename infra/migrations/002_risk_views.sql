CREATE OR REPLACE VIEW building_risk AS
SELECT
    b.id,
    b.osm_id,
    b.name,
    b.building_type,
    b.levels,
    b.geom,
    d.id   AS district_id,
    d.name AS district_name,
    r.meters AS river_distance_m,
    ROUND((
        0.7 * GREATEST(0, 1 - r.meters / 2000.0)
      + 0.3 * CASE
                WHEN COALESCE(b.levels, 1) <= 2 THEN 1.0
                WHEN b.levels <= 5 THEN 0.5
                ELSE 0.0
              END
    )::numeric, 3) AS risk_score
FROM buildings b
JOIN districts d
       ON ST_Intersects(d.geom, ST_PointOnSurface(b.geom))
CROSS JOIN LATERAL (
    SELECT MIN(ST_Distance(b.geom::geography, rl.geom::geography)) AS meters
    FROM river_line rl
) r;

CREATE OR REPLACE VIEW district_risk AS
SELECT
    district_id,
    district_name,
    count(*)                                         AS building_count,
    ROUND(AVG(risk_score), 3)                        AS avg_risk,
    count(*) FILTER (WHERE river_distance_m <= 500)  AS buildings_within_500m
FROM building_risk
GROUP BY district_id, district_name;