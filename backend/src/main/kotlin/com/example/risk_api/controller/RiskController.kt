package com.example.risk_api.controller

import com.example.risk_api.service.RiskService
import tools.jackson.databind.JsonNode
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@Validated
@RestController
@RequestMapping("/api")
class RiskController(private val riskService: RiskService) {

    @GetMapping("/districts")
    fun districts(): JsonNode = riskService.districts()

    @GetMapping("/districts/{id}/buildings")
    fun buildingsInDistrict(@PathVariable id: Long): JsonNode =
        riskService.buildingsInDistrict(id)

    @GetMapping("/buildings/near-river")
    fun buildingsNearRiver(@RequestParam @Min(1) @Max(5000) meters: Int): JsonNode =
        riskService.buildingsNearRiver(meters)

    @GetMapping("/buildings/top-risk")
    fun topRisk(
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) limit: Int,
        @RequestParam(required = false) @Min(1) districtId: Long?
    ): JsonNode = riskService.topRisk(limit, districtId)
}
