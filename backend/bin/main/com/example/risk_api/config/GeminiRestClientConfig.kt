package com.example.risk_api.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

@Configuration
class GeminiRestClientConfig {

    @Bean
    fun geminiRestClient(): RestClient {
        val httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build()

        val requestFactory = JdkClientHttpRequestFactory(httpClient)
        requestFactory.setReadTimeout(Duration.ofSeconds(10))

        return RestClient.builder()
            .requestFactory(requestFactory)
            .build()
    }
}