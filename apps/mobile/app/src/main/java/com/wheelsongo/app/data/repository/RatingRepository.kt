package com.wheelsongo.app.data.repository

import com.wheelsongo.app.data.models.rating.CreateRatingRequest
import com.wheelsongo.app.data.models.rating.RatingResponse
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.network.RatingApi

class RatingRepository(
    private val ratingApi: RatingApi = ApiClient.ratingApi
) {

    suspend fun createRating(request: CreateRatingRequest): Result<RatingResponse> {
        return try {
            val response = ratingApi.createRating(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to submit rating: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
