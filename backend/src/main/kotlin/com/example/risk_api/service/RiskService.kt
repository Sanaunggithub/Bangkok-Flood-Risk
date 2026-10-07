package com.example.risk_api.service

import com.example.risk_api.repository.RiskFeatureRow
import com.example.risk_api.repository.RiskRepository
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import org.springframework.stereotype.Service

@Service
class RiskService(
    private val riskRepository: RiskRepository,
    private val objectMapper: ObjectMapper
) {

    fun districts(): JsonNode = toFeatureCollection(riskRepository.districts())

    fun buildingsInDistrict(districtId: Long): JsonNode =
        toFeatureCollection(riskRepository.buildingsInDistrict(districtId))

    fun buildingsNearRiver(meters: Int): JsonNode =
        toFeatureCollection(riskRepository.buildingsNearRiver(meters))

    fun topRisk(limit: Int, districtId: Long?): JsonNode =
        toFeatureCollection(riskRepository.topRisk(limit, districtId))

    private fun toFeatureCollection(rows: List<RiskFeatureRow>): JsonNode {
        val collection = objectMapper.createObjectNode()
        collection.put("type", "FeatureCollection")
        val features = collection.putArray("features")

        rows.forEach { row ->
            val feature = objectMapper.createObjectNode()
            feature.put("type", "Feature")
            feature.set("properties", objectMapper.valueToTree(row.properties))

            val geometry = row.geometryJson
            if (geometry == null) {
                feature.putNull("geometry")
            } else {
                feature.set("geometry", objectMapper.readTree(geometry))
            }

            features.add(feature)
        }

        return collection
    }
}
