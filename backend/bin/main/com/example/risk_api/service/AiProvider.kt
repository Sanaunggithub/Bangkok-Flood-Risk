package com.example.risk_api.service

data class SearchFilters(
    val districtName: String? = null,
    val maxDistanceToRiverMeters: Int? = null,
    val minRisk: Double? = null,
    val buildingType: String? = null
)

interface AiProvider {
    fun parseQuery(
        query: String,
        districtNames: List<String>,
        buildingTypes: List<String>
    ): SearchFilters
}