package com.wheelsongo.app.data.models.fatigue

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ==========================================
// Fatigue Check
// ==========================================

@JsonClass(generateAdapter = true)
data class FatigueCheckRequest(
    @Json(name = "imageBase64") val imageBase64: String,
    @Json(name = "isOnRide") val isOnRide: Boolean = false,
    @Json(name = "currentRideId") val currentRideId: String? = null
)

@JsonClass(generateAdapter = true)
data class FatigueCheckResponse(
    @Json(name = "isFatigued") val isFatigued: Boolean,
    @Json(name = "fatigueLevel") val fatigueLevel: String,
    @Json(name = "confidence") val confidence: Double,
    @Json(name = "reasons") val reasons: List<String> = emptyList(),
    @Json(name = "cooldownMinutes") val cooldownMinutes: Int = 0,
    @Json(name = "leftEyeProbability") val leftEyeProbability: Double = 1.0,
    @Json(name = "rightEyeProbability") val rightEyeProbability: Double = 1.0,
    @Json(name = "avgEyeProbability") val avgEyeProbability: Double = 1.0
)

// ==========================================
// Fatigue Status (canGoOnline check)
// ==========================================

@JsonClass(generateAdapter = true)
data class FatigueStatusResponse(
    @Json(name = "allowed") val allowed: Boolean,
    @Json(name = "reason") val reason: String? = null,
    @Json(name = "cooldownUntil") val cooldownUntil: String? = null,
    @Json(name = "lastCheckAt") val lastCheckAt: String? = null
)

// ==========================================
// Face Enrollment
// ==========================================

@JsonClass(generateAdapter = true)
data class FaceEnrollRequest(
    @Json(name = "imageBase64") val imageBase64: String
)

@JsonClass(generateAdapter = true)
data class FaceEnrollResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "enrolledAt") val enrolledAt: String
)
