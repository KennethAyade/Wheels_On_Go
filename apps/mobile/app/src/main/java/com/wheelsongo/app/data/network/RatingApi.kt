package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.rating.CreateRatingRequest
import com.wheelsongo.app.data.models.rating.RatingResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface RatingApi {

    @POST("ratings")
    suspend fun createRating(@Body request: CreateRatingRequest): Response<RatingResponse>
}
