package com.wheelsongo.app.data.models.checklist

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ── Breathalyzer ──────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class BreathalyzerStatusResponse(
    @Json(name = "allowed") val allowed: Boolean,
    @Json(name = "cooldownUntil") val cooldownUntil: String? = null
)

@JsonClass(generateAdapter = true)
data class PresignBreathalyzerRequest(
    @Json(name = "fileName") val fileName: String,
    @Json(name = "mimeType") val mimeType: String
)

@JsonClass(generateAdapter = true)
data class PresignBreathalyzerResponse(
    @Json(name = "uploadUrl") val uploadUrl: String,
    @Json(name = "key") val key: String,
    @Json(name = "expiresIn") val expiresIn: Int
)

@JsonClass(generateAdapter = true)
data class ConfirmBreathalyzerRequest(
    @Json(name = "key") val key: String,
    @Json(name = "rideId") val rideId: String
)

@JsonClass(generateAdapter = true)
data class ConfirmBreathalyzerResponse(
    @Json(name = "passed") val passed: Boolean,
    @Json(name = "result") val result: String, // "PASS" | "FAIL" | "INVALID_IMAGE"
    @Json(name = "bacReading") val bacReading: Float? = null,
    @Json(name = "bacValueRaw") val bacValueRaw: Float? = null,
    @Json(name = "bacUnitRaw") val bacUnitRaw: String? = null, // "g/L" | "mg/L" | "%BAC"
    @Json(name = "bacNormalizedGPerL") val bacNormalizedGPerL: Float? = null,
    @Json(name = "thresholdGPerL") val thresholdGPerL: Float? = null,
    @Json(name = "cooldownUntil") val cooldownUntil: String? = null,
    @Json(name = "details") val details: String? = null
)

// ── BLOWBAGETS Checklist ──────────────────────────────────

@JsonClass(generateAdapter = true)
data class SubmitBlowbagetsRequest(
    @Json(name = "rideId") val rideId: String,
    @Json(name = "brakes") val brakes: Boolean,
    @Json(name = "lights") val lights: Boolean,
    @Json(name = "oil") val oil: Boolean,
    @Json(name = "water") val water: Boolean,
    @Json(name = "battery") val battery: Boolean,
    @Json(name = "air") val air: Boolean,
    @Json(name = "gas") val gas: Boolean,
    @Json(name = "engine") val engine: Boolean,
    @Json(name = "tools") val tools: Boolean,
    @Json(name = "self") val self: Boolean
)

@JsonClass(generateAdapter = true)
data class SubmitBlowbagetsResponse(
    @Json(name = "id") val id: String,
    @Json(name = "allItemsChecked") val allItemsChecked: Boolean,
    @Json(name = "rideId") val rideId: String? = null
)

@JsonClass(generateAdapter = true)
data class BlowbagetsChecklistResponse(
    @Json(name = "id") val id: String? = null,
    @Json(name = "allItemsChecked") val allItemsChecked: Boolean = false,
    @Json(name = "rideId") val rideId: String? = null
)
