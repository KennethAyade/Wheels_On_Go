package com.wheelsongo.app.data.models.driver

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Driver status in the system
 */
enum class DriverStatus {
    @Json(name = "PENDING_KYC") PENDING_KYC,
    @Json(name = "PENDING_APPROVAL") PENDING_APPROVAL,
    @Json(name = "APPROVED") APPROVED,
    @Json(name = "REJECTED") REJECTED,
    @Json(name = "SUSPENDED") SUSPENDED
}

/**
 * Document types for driver KYC
 */
enum class DriverDocumentType {
    @Json(name = "LICENSE") LICENSE,
    @Json(name = "GOVERNMENT_ID") GOVERNMENT_ID,
    @Json(name = "PROFILE_PHOTO") PROFILE_PHOTO
}

/**
 * Document verification status
 */
enum class DocumentStatus {
    @Json(name = "PENDING") PENDING,
    @Json(name = "VERIFIED") VERIFIED,
    @Json(name = "REJECTED") REJECTED
}

// ==========================================
// Driver Profile
// ==========================================

/**
 * Driver profile data
 * GET /drivers/me
 */
@JsonClass(generateAdapter = true)
data class DriverProfileResponse(
    @Json(name = "id") val id: String,
    @Json(name = "userId") val userId: String,
    @Json(name = "status") val status: String,
    @Json(name = "isOnline") val isOnline: Boolean = false,
    @Json(name = "isAvailable") val isAvailable: Boolean = false,
    @Json(name = "averageRating") val averageRating: Float? = null,
    @Json(name = "totalRatings") val totalRatings: Int = 0,
    @Json(name = "totalTrips") val totalTrips: Int = 0,
    @Json(name = "createdAt") val createdAt: String? = null
)

// ==========================================
// KYC Documents
// ==========================================

/**
 * KYC documents status
 * GET /drivers/kyc
 */
@JsonClass(generateAdapter = true)
data class KycDocumentsResponse(
    @Json(name = "documents") val documents: List<DriverDocumentDto> = emptyList(),
    @Json(name = "allUploaded") val allUploaded: Boolean = false,
    @Json(name = "allVerified") val allVerified: Boolean = false
)

/**
 * Individual document status
 */
@JsonClass(generateAdapter = true)
data class DriverDocumentDto(
    @Json(name = "id") val id: String? = null,
    @Json(name = "type") val type: String,
    @Json(name = "status") val status: String? = null,
    @Json(name = "storageKey") val storageKey: String? = null,
    @Json(name = "uploadedAt") val uploadedAt: String? = null,
    @Json(name = "verifiedAt") val verifiedAt: String? = null,
    @Json(name = "rejectionReason") val rejectionReason: String? = null,
    @Json(name = "downloadUrl") val downloadUrl: String? = null
)

// ==========================================
// Document Upload Flow
// ==========================================

/**
 * Request for presigned upload URL
 * POST /drivers/kyc/presign
 * Fields must match backend RequestKycUploadDto: type, fileName, mimeType, size
 */
@JsonClass(generateAdapter = true)
data class KycPresignRequest(
    @Json(name = "type") val type: String,
    @Json(name = "fileName") val fileName: String,
    @Json(name = "mimeType") val mimeType: String,
    @Json(name = "size") val size: Long? = null
)

/**
 * Response with presigned upload URL
 * Backend returns: { uploadUrl, key, expiresIn }
 */
@JsonClass(generateAdapter = true)
data class KycPresignResponse(
    @Json(name = "uploadUrl") val uploadUrl: String,
    @Json(name = "key") val key: String,
    @Json(name = "expiresIn") val expiresIn: Int // seconds
)

/**
 * Confirm document upload after successful R2 upload
 * POST /drivers/kyc/confirm
 * Fields must match backend ConfirmKycUploadDto: type, key, size
 */
@JsonClass(generateAdapter = true)
data class KycConfirmRequest(
    @Json(name = "type") val type: String,
    @Json(name = "key") val key: String,
    @Json(name = "size") val size: Long? = null
)

/**
 * Response from document confirmation
 * Backend returns the updated DriverDocument directly
 */
@JsonClass(generateAdapter = true)
data class KycConfirmResponse(
    @Json(name = "id") val id: String,
    @Json(name = "type") val type: String,
    @Json(name = "status") val status: String,
    @Json(name = "storageKey") val storageKey: String? = null,
    @Json(name = "fileName") val fileName: String? = null,
    @Json(name = "uploadedAt") val uploadedAt: String? = null
)

// ==========================================
// Admin Actions (for reference)
// ==========================================

/**
 * Driver approval request (admin only)
 * POST /admin/drivers/:id/approve
 */
@JsonClass(generateAdapter = true)
data class ApproveDriverRequest(
    @Json(name = "notes") val notes: String? = null
)

/**
 * Driver rejection request (admin only)
 * POST /admin/drivers/:id/reject
 */
@JsonClass(generateAdapter = true)
data class RejectDriverRequest(
    @Json(name = "reason") val reason: String
)

/**
 * Response from admin driver actions
 */
@JsonClass(generateAdapter = true)
data class AdminDriverActionResponse(
    @Json(name = "driver") val driver: DriverProfileResponse,
    @Json(name = "message") val message: String
)

// ==========================================
// Driver Status Update
// ==========================================

/**
 * Request to toggle driver online/offline status
 * PATCH /drivers/me/status
 */
@JsonClass(generateAdapter = true)
data class UpdateDriverStatusRequest(
    @Json(name = "isOnline") val isOnline: Boolean,
    @Json(name = "latitude") val latitude: Double? = null,
    @Json(name = "longitude") val longitude: Double? = null
)

// ==========================================
// Type Aliases for API Compatibility
// ==========================================

/**
 * Type alias for KYC status response
 * Maps to GET /drivers/kyc response
 */
typealias KycStatusResponse = KycDocumentsResponse

/**
 * Type alias for presign URL request
 */
typealias PresignUrlRequest = KycPresignRequest

/**
 * Type alias for presign URL response
 */
typealias PresignUrlResponse = KycPresignResponse

/**
 * Type alias for confirm upload request
 */
typealias ConfirmUploadRequest = KycConfirmRequest

/**
 * Type alias for confirm upload response (raw DriverDocument from backend)
 */
typealias ConfirmUploadResponse = KycConfirmResponse
