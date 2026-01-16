package com.wheelsongo.app.data.network

import com.wheelsongo.app.AppConfig
import com.squareup.moshi.Moshi
import okhttp3.OkHttpClient
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

object ApiClient {
  private val moshi = Moshi.Builder().build()
  private val client = OkHttpClient.Builder().build()

  private val retrofit = Retrofit.Builder()
    .baseUrl(AppConfig.BASE_URL)
    .addConverterFactory(MoshiConverterFactory.create(moshi))
    .client(client)
    .build()

  val authApi: AuthApi = retrofit.create(AuthApi::class.java)
}

interface AuthApi {
  @POST("auth/register")
  suspend fun register(@Body body: Map<String, String>): Response<Unit>

  @POST("auth/login")
  suspend fun login(@Body body: Map<String, String>): Response<Unit>

  @GET("auth/me")
  suspend fun me(): Response<Unit>
}
