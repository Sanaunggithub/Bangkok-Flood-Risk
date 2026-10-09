package com.example.risk_api.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class KeywordFallbackProviderTest {

    private val provider = KeywordFallbackProvider()

    @Test
    fun `extracts district river distance and high risk without network`() {
        val filters = provider.parseQuery(
            "Show high risk buildings in Sathon within 750 meters of the river",
            districtNames = listOf("Sathon", "Bang Rak"),
            buildingTypes = listOf("Apartments")
        )

        assertEquals("Sathon", filters.districtName)
        assertEquals(750, filters.maxDistanceToRiverMeters)
        assertEquals(0.7, filters.minRisk)
    }
}