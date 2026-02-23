package com.wheelsongo.app.data.models

import com.squareup.moshi.JsonClass

/**
 * Standard NestJS error response structure
 *
 * NestJS returns errors in this format:
 * {
 *   "statusCode": 409,
 *   "message": "Vehicle with plate number ABC123 already exists",
 *   "error": "Conflict"
 * }
 */
@JsonClass(generateAdapter = true)
data class ErrorResponse(
    val statusCode: Int,
    val message: String,
    val error: String? = null
)
