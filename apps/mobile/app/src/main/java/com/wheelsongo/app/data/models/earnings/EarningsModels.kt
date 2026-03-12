package com.wheelsongo.app.data.models.earnings

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class EarningsPeriod(
    @Json(name = "earnings") val earnings: Double,
    @Json(name = "rides") val rides: Int
)

@JsonClass(generateAdapter = true)
data class EarningsSummaryResponse(
    @Json(name = "today") val today: EarningsPeriod,
    @Json(name = "thisWeek") val thisWeek: EarningsPeriod,
    @Json(name = "thisMonth") val thisMonth: EarningsPeriod,
    @Json(name = "total") val total: EarningsPeriod
)

@JsonClass(generateAdapter = true)
data class EarningsTransaction(
    @Json(name = "id") val id: String,
    @Json(name = "type") val type: String,
    @Json(name = "amount") val amount: Double,
    @Json(name = "grossAmount") val grossAmount: Double?,
    @Json(name = "commissionAmount") val commissionAmount: Double?,
    @Json(name = "commissionRate") val commissionRate: Double?,
    @Json(name = "netAmount") val netAmount: Double?,
    @Json(name = "paymentMethod") val paymentMethod: String,
    @Json(name = "description") val description: String?,
    @Json(name = "processedAt") val processedAt: String?,
    @Json(name = "createdAt") val createdAt: String
)

@JsonClass(generateAdapter = true)
data class EarningsTransactionsResponse(
    @Json(name = "data") val data: List<EarningsTransaction>,
    @Json(name = "total") val total: Int,
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "totalPages") val totalPages: Int
)

@JsonClass(generateAdapter = true)
data class WalletResponse(
    @Json(name = "balance") val balance: Double
)
