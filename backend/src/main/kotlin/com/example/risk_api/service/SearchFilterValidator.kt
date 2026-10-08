package com.example.risk_api.service

import org.springframework.stereotype.Component

@Component
class SearchFilterValidator {

    fun validate(
        filters: SearchFilters,
        districtNames: List<String>,
        buildingTypes: List<String>
    ): SearchFilters {
        val district = filters.districtName
            ?.let { requested ->
                districtNames.firstOrNull { it.equals(requested, ignoreCase = true) }
            }

        val buildingType = filters.buildingType
            ?.let { requested ->
                buildingTypes.firstOrNull { it.equals(requested, ignoreCase = true) }
            }

        return filters.copy(
            districtName = district,
            maxDistanceToRiverMeters =
                filters.maxDistanceToRiverMeters?.coerceIn(50, 5000),
            minRisk = filters.minRisk
                ?.takeIf { it.isFinite() }
                ?.coerceIn(0.0, 1.0),
            buildingType = buildingType
        )
    }
}