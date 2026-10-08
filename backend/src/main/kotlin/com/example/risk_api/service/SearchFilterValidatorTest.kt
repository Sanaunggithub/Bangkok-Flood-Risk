package com.example.risk_api.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SearchFilterValidatorTest {

    private val validator = SearchFilterValidator()

    @Test
    fun `validates known names and clamps numeric filters`() {
        val result = validator.validate(
            SearchFilters(
                districtName = "sathon",
                maxDistanceToRiverMeters = 9000,
                minRisk = 1.5,
                buildingType = "APARTMENTS"
            ),
            districtNames = listOf("Sathon"),
            buildingTypes = listOf("Apartments")
        )

        assertEquals(
            SearchFilters(
                districtName = "Sathon",
                maxDistanceToRiverMeters = 5000,
                minRisk = 1.0,
                buildingType = "Apartments"
            ),
            result
        )
    }

    @Test
    fun `clears unknown names and clamps minimum distance`() {
        val result = validator.validate(
            SearchFilters(
                districtName = "Unknown",
                maxDistanceToRiverMeters = 10,
                minRisk = -0.5,
                buildingType = "Unknown"
            ),
            districtNames = listOf("Sathon"),
            buildingTypes = listOf("Apartments")
        )

        assertEquals(
            SearchFilters(
                districtName = null,
                maxDistanceToRiverMeters = 50,
                minRisk = 0.0,
                buildingType = null
            ),
            result
        )
    }
}