package com.example.risk_api.service

import org.springframework.stereotype.Component

@Component
class SearchRateLimiter {

    private data class Window(var startedAt: Long, var count: Int)

    private val lock = Any()
    private val windows = mutableMapOf<String, Window>()

    fun allow(ipAddress: String): Boolean = synchronized(lock) {
        val now = System.currentTimeMillis()
        val expired = windows.filterValues { now - it.startedAt >= WINDOW_MILLIS }.keys
        expired.forEach(windows::remove)

        val window = windows[ipAddress]
        if (window == null) {
            windows[ipAddress] = Window(now, 1)
            true
        } else if (window.count >= MAX_REQUESTS) {
            false
        } else {
            window.count++
            true
        }
    }

    private companion object {
        const val MAX_REQUESTS = 10
        const val WINDOW_MILLIS = 60_000L
    }
}