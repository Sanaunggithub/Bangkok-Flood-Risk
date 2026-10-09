package com.example.risk_api.service

import com.example.risk_api.repository.SearchRepository
import com.example.risk_api.repository.RiskFeatureRow
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.util.LinkedHashMap

data class SearchResponse(
    val interpretation: SearchFilters,
    val usedFallback: Boolean,
    val count: Int,
    val results: JsonNode
)

@Service
class SearchService(
    private val searchRepository: SearchRepository,
    private val geminiProvider: GeminiProvider,
    private val keywordFallbackProvider: KeywordFallbackProvider,
    private val validator: SearchFilterValidator,
    private val objectMapper: ObjectMapper,
    @Value("\${gemini.api-key:}") private val apiKey: String
) {
    private data class Catalog(
        val districtNames: List<String>,
        val buildingTypes: List<String>
    )

    private data class CachedFilters(
        val createdAt: Long,
        val filters: SearchFilters,
        val usedFallback: Boolean
    )

    private val catalog: Catalog by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
        Catalog(searchRepository.districtNames(), searchRepository.buildingTypes())
    }

    private val cacheLock = Any()
    private val cache = LinkedHashMap<String, CachedFilters>(16, 0.75f, true)

    fun search(query: String): SearchResponse {
        val normalizedQuery = query.trim().lowercase()
        val cached = getCached(normalizedQuery)

        val (filters, usedFallback) =
            if (cached != null) {
                cached.filters to cached.usedFallback
            } else {
                parseFilters(query.trim()).also { (parsedFilters, parsedFallback) ->
                    putCached(
                        normalizedQuery,
                        CachedFilters(System.currentTimeMillis(), parsedFilters, parsedFallback)
                    )
                }
            }

        val rows = searchRepository.search(filters)
        return SearchResponse(
            interpretation = filters,
            usedFallback = usedFallback,
            count = rows.size,
            results = toFeatureCollection(rows)
        )
    }

    private fun parseFilters(query: String): Pair<SearchFilters, Boolean> {
        val known = catalog

        val (parsed, usedFallback) = if (apiKey.isBlank()) {
            keywordFallbackProvider.parseQuery(query, known.districtNames, known.buildingTypes) to true
        } else {
            try {
                geminiProvider.parseQuery(query, known.districtNames, known.buildingTypes) to false
            } catch (_: Exception) {
                keywordFallbackProvider.parseQuery(query, known.districtNames, known.buildingTypes) to true
            }
        }

        return validator.validate(parsed, known.districtNames, known.buildingTypes) to usedFallback
    }

    private fun getCached(key: String): CachedFilters? = synchronized(cacheLock) {
        val entry = cache[key] ?: return@synchronized null
        if (System.currentTimeMillis() - entry.createdAt >= CACHE_TTL_MILLIS) {
            cache.remove(key)
            null
        } else {
            entry
        }
    }

    private fun putCached(key: String, entry: CachedFilters) = synchronized(cacheLock) {
        val now = System.currentTimeMillis()
        val iterator = cache.entries.iterator()
        while (iterator.hasNext()) {
            if (now - iterator.next().value.createdAt >= CACHE_TTL_MILLIS) {
                iterator.remove()
            }
        }

        cache[key] = entry
        while (cache.size > MAX_CACHE_ENTRIES) {
            val oldestKey = cache.entries.iterator().next().key
            cache.remove(oldestKey)
        }
    }

    private fun toFeatureCollection(rows: List<RiskFeatureRow>): JsonNode {
        val collection = objectMapper.createObjectNode()
        collection.put("type", "FeatureCollection")
        val features = collection.putArray("features")

        rows.forEach { row ->
            val feature = objectMapper.createObjectNode()
            feature.put("type", "Feature")
            feature.set("properties", objectMapper.valueToTree(row.properties))
            if (row.geometryJson == null) {
                feature.putNull("geometry")
            } else {
                feature.set("geometry", objectMapper.readTree(row.geometryJson))
            }
            features.add(feature)
        }

        return collection
    }

    private companion object {
        const val CACHE_TTL_MILLIS = 10 * 60 * 1000L
        const val MAX_CACHE_ENTRIES = 200
    }
}