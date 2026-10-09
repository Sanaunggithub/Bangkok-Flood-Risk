package com.example.risk_api.repository

import com.example.risk_api.service.SearchFilters
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class SearchRepository(private val dsl: DSLContext) {

    fun districtNames(): List<String> =
            dsl.fetch(
                            """
            select distinct district_name
            from building_risk
            where district_name is not null
            order by district_name
            """.trimIndent()
                    )
                    .mapNotNull { it.get("district_name", String::class.java) }

    fun buildingTypes(): List<String> =
            dsl.fetch(
                            """
            select distinct building_type
            from building_risk
            where building_type is not null
            order by building_type
            """.trimIndent()
                    )
                    .mapNotNull { it.get("building_type", String::class.java) }

    fun search(filters: SearchFilters): List<RiskFeatureRow> =
            dsl.fetch(
                            """
            select br.id as building_id, br.name, br.building_type, br.levels,
                   br.district_name, br.risk_score, br.river_distance_m,
                   ST_AsGeoJSON(br.geom) as geometry
            from building_risk br
            where (?::text is null or lower(br.district_name) = lower(?::text))
              and (?::integer is null or br.river_distance_m <= ?::integer)
              and (?::double precision is null or br.risk_score >= ?::double precision)
              and (?::text is null or lower(br.building_type) = lower(?::text))
            order by br.risk_score desc
            limit ?::integer
            """.trimIndent(),
                            filters.districtName,
                            filters.districtName,
                            filters.maxDistanceToRiverMeters,
                            filters.maxDistanceToRiverMeters,
                            filters.minRisk,
                            filters.minRisk,
                            filters.buildingType,
                            filters.buildingType,
                            2000
                    )
                    .map { record ->
                        RiskFeatureRow(
                                properties =
                                        mapOf(
                                                "building_id" to record.get("building_id"),
                                                "name" to record.get("name"),
                                                "building_type" to record.get("building_type"),
                                                "levels" to record.get("levels"),
                                                "district_name" to record.get("district_name"),
                                                "risk_score" to record.get("risk_score"),
                                                "river_distance_m" to record.get("river_distance_m")
                                        ),
                                geometryJson = record.get("geometry", String::class.java)
                        )
                    }
}
