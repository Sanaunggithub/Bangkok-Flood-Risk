package com.example.risk_api.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper

@Component
class GeminiProvider(
    private val geminiRestClient: RestClient,
    private val objectMapper: ObjectMapper,
    @Value("\${gemini.api-key:}") private val apiKey: String,
    @Value("\${gemini.model:}") private val model: String,
    @Value("\${gemini.base-url:https://generativelanguage.googleapis.com}")
    private val baseUrl: String
) : AiProvider {

    override fun parseQuery(
        query: String,
        districtNames: List<String>,
        buildingTypes: List<String>
    ): SearchFilters {
        require(apiKey.isNotBlank() && model.isNotBlank()) {
            "Gemini is not configured"
        }

        val schema = mapOf(
            "type" to "OBJECT",
            "properties" to mapOf(
                "districtName" to mapOf("type" to "STRING", "nullable" to true),
                "maxDistanceToRiverMeters" to mapOf("type" to "INTEGER", "nullable" to true),
                "minRisk" to mapOf("type" to "NUMBER", "nullable" to true),
                "buildingType" to mapOf("type" to "STRING", "nullable" to true)
            ),
            "required" to listOf(
                "districtName",
                "maxDistanceToRiverMeters",
                "minRisk",
                "buildingType"
            )
        )

        val requestBody = mapOf(
            "systemInstruction" to mapOf(
                "parts" to listOf(
                    mapOf(
                        "text" to """
                            Convert the user's request into filter parameters only.
                            Never produce SQL, code, explanations, or fields outside the schema.
                            Use only the supplied district and building type names.
                            Use null for any filter not clearly requested.
                            Known districts: ${districtNames.joinToString(", ")}
                            Known building types: ${buildingTypes.joinToString(", ")}
                        """.trimIndent()
                    )
                )
            ),
            "contents" to listOf(
                mapOf("parts" to listOf(mapOf("text" to query)))
            ),
            "generationConfig" to mapOf(
                "responseMimeType" to "application/json",
                "responseSchema" to schema
            )
        )

        val response = geminiRestClient.post()
            .uri("${baseUrl.trimEnd('/')}/v1beta/models/$model:generateContent")
            .header("x-goog-api-key", apiKey)
            .body(requestBody)
            .retrieve()
            .body(tools.jackson.databind.JsonNode::class.java)
            ?: error("Gemini returned no response")

        val text = response.path("candidates")
            .path(0)
            .path("content")
            .path("parts")
            .path(0)
            .path("text")
            .asText()

        require(text.isNotBlank()) { "Gemini returned no filter JSON" }
        val filters = objectMapper.readTree(text)

        return SearchFilters(
            districtName = filters.get("districtName").nullableText(),
            maxDistanceToRiverMeters = filters.get("maxDistanceToRiverMeters")
                .nullableInt(),
            minRisk = filters.get("minRisk").nullableDouble(),
            buildingType = filters.get("buildingType").nullableText()
        )
    }

    private fun tools.jackson.databind.JsonNode?.nullableText(): String? =
        this?.takeUnless { it.isNull }?.asText()

    private fun tools.jackson.databind.JsonNode?.nullableInt(): Int? =
        this?.takeUnless { it.isNull }?.asInt()

    private fun tools.jackson.databind.JsonNode?.nullableDouble(): Double? =
        this?.takeUnless { it.isNull }?.asDouble()
}