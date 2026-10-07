package com.example.risk_api.controller

import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(
            ConstraintViolationException::class,
            HandlerMethodValidationException::class,
            MethodArgumentTypeMismatchException::class,
    )
    fun badRequest(ex: Exception): ResponseEntity<Map<String, Any>> =
            ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(
                            mapOf(
                                    "status" to 400,
                                    "error" to "Bad Request",
                                    "message" to (ex.message ?: "Invalid request parameter"),
                            ),
                    )
}
