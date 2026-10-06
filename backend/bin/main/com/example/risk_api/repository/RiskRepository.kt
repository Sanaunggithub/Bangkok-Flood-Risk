package com.example.risk_api.repository

import org.jooq.DSLContext
import org.springframework.stereotype.Repository

data class RiskFeatureRow(val properties: Map<String, Any?>, val geometryJson: String?)

@Repository
class RiskRepository(private val dsl: DSLContext) {

    fun districts(): List<RiskFeatureRow> =
            dsl.fetch(
                            """
            select dr.district_id, dr.avg_risk, dr.building_count,
                   ST_AsGeoJSON(d.geom) as geometry
            from district_risk dr
            join districts d on d.id = dr.district_id
            """.trimIndent()
                    )
                    .map { record ->
                        RiskFeatureRow(
                                properties =
                                        mapOf(
                                                "district_id" to record.get("district_id"),
                                                "avg_risk" to record.get("avg_risk"),
                                                "building_count" to record.get("building_count")
                                        ),
                                geometryJson = record.get("geometry", String::class.java)
                        )
                    }

    fun buildingsInDistrict(districtId: Long): List<RiskFeatureRow> =
            dsl.fetch(
                            """
            select br.id as building_id, br.risk_score, br.river_distance_m,
                   ST_AsGeoJSON(br.geom) as geometry
            from building_risk br
            where br.district_id = ?
            """.trimIndent(),
                            districtId
                    )
                    .map { record ->
                        RiskFeatureRow(
                                properties =
                                        mapOf(
                                                "building_id" to record.get("building_id"),
                                                "risk_score" to record.get("risk_score"),
                                                "river_distance_m" to record.get("river_distance_m")
                                        ),
                                geometryJson = record.get("geometry", String::class.java)
                        )
                    }

    fun buildingsNearRiver(meters: Int): List<RiskFeatureRow> =
            dsl.fetch(
                            """
            select br.id as building_id, br.risk_score, br.river_distance_m,
                   ST_AsGeoJSON(br.geom) as geometry
            from building_risk br
            where exists (
                select 1
                from river_line r
                where ST_DWithin(br.geom::geography, r.geom::geography, ?)
            )
            """.trimIndent(),
                            meters
                    )
                    .map { record ->
                        RiskFeatureRow(
                                properties =
                                        mapOf(
                                                "building_id" to record.get("building_id"),
                                                "risk_score" to record.get("risk_score"),
                                                "river_distance_m" to record.get("river_distance_m")
                                        ),
                                geometryJson = record.get("geometry", String::class.java)
                        )
                    }
}
