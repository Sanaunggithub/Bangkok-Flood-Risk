CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE districts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE TABLE buildings (
    id BIGSERIAL PRIMARY KEY,
    osm_id BIGINT NOT NULL,
    name TEXT,
    building_type TEXT,
    levels INTEGER,
    geom geometry(Polygon, 4326) NOT NULL
);

CREATE TABLE river_line (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom geometry(LineString, 4326) NOT NULL
);

CREATE INDEX districts_geom_gist ON districts USING GIST (geom);
CREATE INDEX buildings_geom_gist ON buildings USING GIST (geom);
CREATE INDEX river_line_geom_gist ON river_line USING GIST (geom);