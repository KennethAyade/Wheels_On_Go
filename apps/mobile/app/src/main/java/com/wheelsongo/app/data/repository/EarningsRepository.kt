package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.earnings.EarningsSummaryResponse
import com.wheelsongo.app.data.models.earnings.EarningsTransactionsResponse
import com.wheelsongo.app.data.models.earnings.WalletResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.EarningsApi

class EarningsRepository(
    private val api: EarningsApi = ApiClient.earningsApi
) {

    suspend fun getEarnings(): Result<EarningsSummaryResponse> {
        return try {
            val response = api.getEarnings()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load earnings"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTransactions(page: Int = 1, limit: Int = 20): Result<EarningsTransactionsResponse> {
        return try {
            val response = api.getTransactions(page, limit)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load transactions"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWallet(): Result<WalletResponse> {
        return try {
            val response = api.getWallet()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load wallet"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
