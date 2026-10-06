import os
import pandas as pd

import osmnx as ox
import psycopg
from shapely import wkb
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Polygon
from shapely.ops import unary_union

ox.settings.cache_folder = "infra/cache"

DISTRICTS = ["Pathum Wan", "Bang Rak", "Khlong Toei"]
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://bangkok:bangkok_dev_only@localhost:5433/bangkok_flood",
)

def clean(value):
    return None if pd.isna(value) else str(value)


def osm_id(row):
    # OSMnx indexes features by element type and OSM ID.
    return int(row.name[-1])


def parse_levels(value):
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return None


def polygon_parts(geometry):
    if isinstance(geometry, Polygon):
        return [geometry]
    if isinstance(geometry, MultiPolygon):
        return list(geometry.geoms)
    return []


def line_parts(geometry):
    if isinstance(geometry, LineString):
        return [geometry]
    if isinstance(geometry, MultiLineString):
        return list(geometry.geoms)
    return []


def main():
    district_rows = []
    building_rows = []
    district_geometries = []

    for district in DISTRICTS:
        place = ox.geocode_to_gdf(f"{district}, Bangkok, Thailand")
        boundary = unary_union(place.geometry)
        if not isinstance(boundary, (Polygon, MultiPolygon)):
            raise ValueError(f"No polygon boundary found for {district}")

        district_geometries.append(boundary)
        district_rows.append((district, wkb.dumps(boundary)))

        features = ox.features_from_polygon(boundary, tags={"building": True})
        for _, row in features.iterrows():
            geometry = row.geometry
            if geometry is None or geometry.is_empty:
                continue

            building_name = row.get("name")
            building_type = row.get("building")
            levels = parse_levels(row.get("building:levels"))

            # The database stores Polygon, so split OSM multipolygons into parts.
            for polygon in polygon_parts(geometry):
                if polygon.is_valid and not polygon.is_empty:
                    building_rows.append(
                        (
                            osm_id(row),
                            clean(building_name),
                            clean(building_type),
                            levels,
                            wkb.dumps(polygon),
                        )
                    )

        # Buffer a little (~1 km in degrees) so a river on the district edge is still found.
    search_area = unary_union(district_geometries).buffer(0.01)
    river_features = ox.features_from_polygon(
        search_area, tags={"waterway": "river"}
    )

    print("River features found:", len(river_features))
    print(river_features.columns.tolist())
    for _, row in river_features.head(20).iterrows():
        print(row.get("name"), "|", row.get("name:en"), "|", row.geometry.geom_type)

    def is_chao_phraya(row):
        names = " ".join(
            str(row.get(key) or "")
            for key in ("name", "name:en", "name:th", "alt_name")
        ).casefold()
        return "chao phraya" in names or "เจ้าพระยา" in names

    def collect_river_rows(only_named):
        rows = []
        for _, row in river_features.iterrows():
            if only_named and not is_chao_phraya(row):
                continue
            for line in line_parts(row.geometry):
                if not line.is_empty and line.is_valid:
                    rows.append(("Chao Phraya", wkb.dumps(line)))
        return rows

    river_rows = collect_river_rows(only_named=True)
    if not river_rows:
        print("Warning: no named Chao Phraya segments, using any waterway=river lines.")
        river_rows = collect_river_rows(only_named=False)
    if not river_rows:
        raise RuntimeError("No river lines found near the selected districts.")

    # Keep the refresh atomic: if an insert fails, the previous data remains.
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM buildings")
            cur.execute("DELETE FROM districts")
            cur.execute("DELETE FROM river_line")

            cur.executemany(
                """
                INSERT INTO districts (name, geom)
                VALUES (%s, ST_Multi(ST_GeomFromWKB(%s, 4326)))
                """,
                district_rows,
            )
            cur.executemany(
                """
                INSERT INTO buildings (osm_id, name, building_type, levels, geom)
                VALUES (%s, %s, %s, %s, ST_GeomFromWKB(%s, 4326))
                """,
                building_rows,
            )
            cur.executemany(
                """
                INSERT INTO river_line (name, geom)
                VALUES (%s, ST_GeomFromWKB(%s, 4326))
                """,
                river_rows,
            )

    print(
        f"Loaded {len(district_rows)} districts, "
        f"{len(building_rows)} building footprints, "
        f"and {len(river_rows)} river segments."
    )


if __name__ == "__main__":
    main()