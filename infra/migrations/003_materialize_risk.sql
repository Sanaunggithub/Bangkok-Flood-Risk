-- Keep the original calculation under a new name, then store its results.
DROP VIEW IF EXISTS district_risk;
ALTER VIEW building_risk RENAME TO building_risk_calc;

CREATE MATERIALIZED VIEW building_risk AS
SELECT * FROM building_risk_calc;

CREATE INDEX building_risk_district_idx ON building_risk (district_id);
CREATE INDEX building_risk_distance_idx ON building_risk (river_distance_m);
CREATE INDEX building_risk_geog_gix ON building_risk USING gist ((geom::geography));
CREATE INDEX river_line_geog_gix ON river_line USING gist ((geom::geography));

CREATE VIEW district_risk AS
SELECT
    district_id,
    district_name,
    count(*)                                         AS building_count,
    ROUND(AVG(risk_score), 3)                        AS avg_risk,
    count(*) FILTER (WHERE river_distance_m <= 500)  AS buildings_within_500m
FROM building_risk
GROUP BY district_id, district_name;

ANALYZE building_risk;