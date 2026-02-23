package com.wheelsongo.app.data.network

import com.wheelsongo.app.data.models.location.*
import retrofit2.Response
import retrofit2.http.*

/**
 * API interface for location-related endpoints
 */
interface LocationApi {

    /**
     * Get place autocomplete suggestions
     */
    @GET("location/autocomplete")
    suspend fun getPlaceAutocomplete(
        @Query("input") input: String,
        @Query("sessionToken") sessionToken: String? = null
    ): Response<PlaceAutocompleteResponse>

    /**
     * Get place details by place ID
     */
    @GET("location/place/{placeId}")
    suspend fun getPlaceDetails(
        @Path("placeId") placeId: String,
        @Query("sessionToken") sessionToken: String? = null
    ): Response<PlaceDetails>

    /**
     * Reverse geocode coordinates to address
     */
    @POST("location/reverse-geocode")
    suspend fun reverseGeocode(
        @Body request: ReverseGeocodeRequest
    ): Response<GeocodeResponse>

    /**
     * Get ride fare estimate
     */
    @POST("rides/estimate")
    suspend fun getRideEstimate(
        @Body request: RideEstimateRequest
    ): Response<RideEstimateResponse>
}
