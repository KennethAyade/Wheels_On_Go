package com.wheelsongo.app.ui.navigation

import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Navigation routes for the Wheels On Go app
 * Defines all destinations and their parameters
 */
sealed class Route(val value: String) {

    // ==========================================
    // Onboarding & Authentication
    // ==========================================

    /**
     * Welcome screen - role selection
     * Entry point for the app
     */
    data object Welcome : Route("welcome")

    /**
     * Phone input screen
     * @param role User role (RIDER or DRIVER)
     */
    data object PhoneInput : Route("phone_input/{role}") {
        const val ARG_ROLE = "role"

        fun createRoute(role: String): String = "phone_input/$role"
    }

    /**
     * OTP verification screen
     * @param phoneNumber Full phone number with country code
     * @param role User role (RIDER or DRIVER)
     */
    data object OtpVerification : Route("otp_verification/{phoneNumber}/{role}") {
        const val ARG_PHONE_NUMBER = "phoneNumber"
        const val ARG_ROLE = "role"

        fun createRoute(phoneNumber: String, role: String): String {
            // URL encode phone number to preserve + symbol (+ becomes space in URLs)
            val encodedPhone = URLEncoder.encode(phoneNumber, StandardCharsets.UTF_8.toString())
            return "otp_verification/$encodedPhone/$role"
        }
    }

    // ==========================================
    // Post-Auth Screens
    // ==========================================

    /**
     * Location confirmation screen
     * Asks if user is in Metro Manila
     */
    data object LocationConfirm : Route("location_confirm")

    // ==========================================
    // Main App
    // ==========================================

    /**
     * Home screen with map view
     * Main screen for riders to request rides
     */
    data object Home : Route("home")

    // ==========================================
    // Driver Specific
    // ==========================================

    /**
     * Driver document upload screen (KYC)
     * For uploading license, ORCR, ID, and profile photo
     */
    data object DriverDocumentUpload : Route("driver/document_upload")

    /**
     * Driver dashboard (future)
     */
    data object DriverDashboard : Route("driver/dashboard")

    // ==========================================
    // Place Search
    // ==========================================

    /**
     * Place search screen for pickup/dropoff selection
     * @param isPickup true for pickup, false for dropoff
     */
    data object PlaceSearch : Route("place_search/{isPickup}") {
        const val ARG_IS_PICKUP = "isPickup"

        fun createRoute(isPickup: Boolean): String = "place_search/$isPickup"
    }
}

/**
 * User roles for the app
 */
object UserRole {
    const val RIDER = "RIDER"
    const val DRIVER = "DRIVER"
}
