package com.wheelsongo.app.data.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Google Directions API client for fetching route polylines
 */
interface DirectionsApi {

    @GET("directions/json")
    suspend fun getDirections(
        @Query("origin") origin: String,
        @Query("destination") destination: String,
        @Query("key") apiKey: String,
        @Query("mode") mode: String = "driving"
    ): Response<DirectionsResponse>

    companion object {
        private const val BASE_URL = "https://maps.googleapis.com/maps/api/"

        val instance: DirectionsApi by lazy {
            Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(DirectionsApi::class.java)
        }
    }
}

@JsonClass(generateAdapter = true)
data class DirectionsResponse(
    @Json(name = "routes") val routes: List<DirectionsRoute> = emptyList(),
    @Json(name = "status") val status: String = ""
)

@JsonClass(generateAdapter = true)
data class DirectionsRoute(
    @Json(name = "overview_polyline") val overviewPolyline: OverviewPolyline? = null
)

@JsonClass(generateAdapter = true)
data class OverviewPolyline(
    @Json(name = "points") val points: String = ""
)
