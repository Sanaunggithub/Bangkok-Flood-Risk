package com.example.risk_api.service

import com.example.risk_api.repository.RiskFeatureRow
import com.example.risk_api.repository.RiskRepository
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

@Service
class RiskService(private val repository: RiskRepository, private val objectMapper: ObjectMapper) {
    fun districts(): JsonNode = featureCollection(repository.districts())

    fun buildingsInDistrict(districtId: Long): JsonNode =
            featureCollection(repository.buildingsInDistrict(districtId))

    fun buildingsNearRiver(meters: Int): JsonNode =
            featureCollection(repository.buildingsNearRiver(meters))

    private fun featureCollection(rows: List<RiskFeatureRow>): JsonNode {
        val features = objectMapper.createArrayNode()

        rows.forEach { row ->
            val properties = objectMapper.createObjectNode()
            row.properties.forEach { (key, value) ->
                properties.set(key, objectMapper.valueToTree(value))
            }

            val feature = objectMapper.createObjectNode()
            feature.put("type", "Feature")
            feature.set(
                    "geometry",
                    row.geometryJson?.let(objectMapper::readTree) ?: objectMapper.nullNode()
            )
            feature.set("properties", properties)
            features.add(feature)
        }

        return objectMapper.createObjectNode().apply {
            put("type", "FeatureCollection")
            set("features", features)
        }
    }
}
