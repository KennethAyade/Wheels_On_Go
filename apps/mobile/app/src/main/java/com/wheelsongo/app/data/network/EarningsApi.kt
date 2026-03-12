package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.earnings.EarningsSummaryResponse
import com.wheelsongo.app.data.models.earnings.EarningsTransactionsResponse
import com.wheelsongo.app.data.models.earnings.WalletResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface EarningsApi {

    @GET("drivers/me/earnings")
    suspend fun getEarnings(): Response<EarningsSummaryResponse>

    @GET("drivers/me/earnings/transactions")
    suspend fun getTransactions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<EarningsTransactionsResponse>

    @GET("drivers/me/wallet")
    suspend fun getWallet(): Response<WalletResponse>
}
