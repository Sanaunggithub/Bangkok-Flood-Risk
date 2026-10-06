package com.example.risk_api

import com.example.risk_api.service.RiskService
import tools.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest
class RiskControllerTest @Autowired constructor(private val mockMvc: MockMvc) {
    @MockBean private lateinit var riskService: RiskService

    private val featureCollection =
            ObjectMapper().readTree("""{"type":"FeatureCollection","features":[]}""")

    @Test
    fun `district and building endpoints return GeoJSON`() {
        Mockito.`when`(riskService.districts()).thenReturn(featureCollection)
        Mockito.`when`(riskService.buildingsInDistrict(7L)).thenReturn(featureCollection)
        Mockito.`when`(riskService.buildingsNearRiver(100)).thenReturn(featureCollection)

        mockMvc.get("/api/districts").andExpect { status { isOk() } }.andExpect {
            jsonPath("$.type") { value("FeatureCollection") }
        }

        mockMvc.get("/api/districts/7/buildings").andExpect { status { isOk() } }

        mockMvc.get("/api/buildings/near-river?meters=100").andExpect { status { isOk() } }
    }

    @Test
    fun `near river rejects meters outside allowed range`() {
        mockMvc.get("/api/buildings/near-river?meters=5001").andExpect { status { isBadRequest() } }
    }
}
