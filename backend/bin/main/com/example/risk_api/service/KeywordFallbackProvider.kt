package com.example.risk_api.service

import org.springframework.stereotype.Component

@Component
class KeywordFallbackProvider : AiProvider {

    override fun parseQuery(
        query: String,
        districtNames: List<String>,
        buildingTypes: List<String>
    ): SearchFilters {
        val district = districtNames
            .sortedByDescending { it.length }
            .firstOrNull { query.contains(it, ignoreCase = true) }

        val nearRiver = Regex("""\bnear\s+(?:the\s+)?river\b|\bby\s+the\s+river\b""")
            .containsMatchIn(query)

        val statedDistance = Regex("""\b(\d{1,5})\s*(?:m|meters?)\b""")
            .find(query)
            ?.groupValues
            ?.get(1)
            ?.toIntOrNull()

        return SearchFilters(
            districtName = district,
            maxDistanceToRiverMeters = statedDistance ?: if (nearRiver) 500 else null,
            minRisk = if (Regex("""\bhigh\s+risk\b""").containsMatchIn(query)) 0.7 else null
        )
    }
}