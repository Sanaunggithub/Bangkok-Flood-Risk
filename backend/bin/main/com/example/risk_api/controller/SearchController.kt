package com.example.risk_api.controller

import com.example.risk_api.service.SearchRateLimiter
import com.example.risk_api.service.SearchResponse
import com.example.risk_api.service.SearchService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class SearchRequest(
    @field:NotBlank
    @field:Size(min = 1, max = 300)
    val query: String
)

@RestController
@RequestMapping("/api")
class SearchController(
    private val searchService: SearchService,
    private val rateLimiter: SearchRateLimiter
) {

    @PostMapping("/search")
    fun search(
        @Valid @RequestBody request: SearchRequest,
        servletRequest: HttpServletRequest
    ): ResponseEntity<Any> {
        if (!rateLimiter.allow(servletRequest.remoteAddr ?: "unknown")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(mapOf("message" to "Rate limit exceeded. Try again in a minute."))
        }

        val response: SearchResponse = searchService.search(request.query)
        return ResponseEntity.ok(response)
    }
}