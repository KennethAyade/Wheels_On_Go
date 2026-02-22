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
     * Session resume screen — checks for existing session on app launch.
     * Redirects to Home (auto-login) or Welcome (no session).
     */
    data object SessionResume : Route("session_resume")

    /**
     * Welcome screen - role selection
     * Shown when no existing session
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
    data object OtpVerification : Route("otp_verification/{phoneNumber}/{role}?verificationId={verificationId}") {
        const val ARG_PHONE_NUMBER = "phoneNumber"
        const val ARG_ROLE = "role"
        const val ARG_VERIFICATION_ID = "verificationId"

        fun createRoute(phoneNumber: String, role: String, verificationId: String? = null): String {
            val encodedPhone = URLEncoder.encode(phoneNumber, StandardCharsets.UTF_8.toString())
            val base = "otp_verification/$encodedPhone/$role"
            return if (verificationId != null) {
                val encodedId = URLEncoder.encode(verificationId, StandardCharsets.UTF_8.toString())
                "$base?verificationId=$encodedId"
            } else {
                base
            }
        }
    }

    // ==========================================
    // Post-Auth Screens
    // ==========================================

    /**
     * Location confirmation screen
     * Asks if user is in Metro Manila
     * @param role User role (RIDER or DRIVER)
     * @param needsKyc Whether driver needs to upload documents (first time only)
     */
    data object LocationConfirm : Route("location_confirm/{role}/{needsKyc}") {
        const val ARG_ROLE = "role"
        const val ARG_NEEDS_KYC = "needsKyc"

        fun createRoute(role: String, needsKyc: Boolean = false): String =
            "location_confirm/$role/$needsKyc"
    }

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
     * Biometric (face) verification screen for driver login
     */
    data object BiometricVerification : Route("biometric_verification")

    /**
     * Driver profile setup screen — collect name, license info
     * @param needsKyc whether to continue to DocumentUpload after LocationConfirm
     * @param returnToHome if true, pop back to Home after setup instead of going to LocationConfirm
     */
    data object DriverProfileSetup : Route("driver_profile_setup/{needsKyc}/{returnToHome}") {
        const val ARG_NEEDS_KYC = "needsKyc"
        const val ARG_RETURN_TO_HOME = "returnToHome"
        fun createRoute(needsKyc: Boolean = false, returnToHome: Boolean = false): String =
            "driver_profile_setup/$needsKyc/$returnToHome"
    }

    /**
     * Rider profile setup screen — collect name, age, address
     * @param returnToHome if true, pop back to Home after setup instead of going to LocationConfirm
     */
    data object RiderProfileSetup : Route("rider_profile_setup/{returnToHome}") {
        const val ARG_RETURN_TO_HOME = "returnToHome"
        fun createRoute(returnToHome: Boolean = false): String = "rider_profile_setup/$returnToHome"
    }

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
    // Booking & Rides
    // ==========================================

    /**
     * Booking confirmation screen — shows fare estimate, vehicle selection, and "Find a Driver" button
     * Receives pickup/dropoff data from HomeScreen via shared ViewModel
     */
    data object BookingConfirm : Route("booking_confirm")

    /**
     * Active ride screen — real-time ride tracking
     * @param rideId The ride ID to track
     */
    data object ActiveRide : Route("active_ride/{rideId}") {
        const val ARG_RIDE_ID = "rideId"

        fun createRoute(rideId: String): String = "active_ride/$rideId"
    }

    // ==========================================
    // Vehicle Management
    // ==========================================

    /**
     * Vehicle list screen — rider views/manages their registered vehicles
     */
    data object VehicleList : Route("vehicle_list")

    /**
     * Vehicle registration screen — rider registers their own car
     */
    data object VehicleRegistration : Route("vehicle_registration")

    /**
     * Driver active ride screen — driver managing an accepted ride
     * @param rideId The ride ID
     * @param riderName Rider display name (optional, URL-encoded)
     */
    data object DriverActiveRide : Route("driver_active_ride/{rideId}?riderName={riderName}") {
        const val ARG_RIDE_ID = "rideId"
        const val ARG_RIDER_NAME = "riderName"

        fun createRoute(rideId: String, riderName: String = ""): String {
            val encName = URLEncoder.encode(riderName, StandardCharsets.UTF_8.toString())
            return "driver_active_ride/$rideId?riderName=$encName"
        }
    }

    /**
     * Drive requests screen — driver sees incoming ride requests while online
     */
    data object DriveRequests : Route("driver/drive_requests")

    /**
     * Driver trip completion summary screen
     * @param rideId The completed ride ID
     * @param riderName Rider display name (URL-encoded)
     */
    data object DriverTripCompletion : Route("driver/trip_completion/{rideId}/{riderName}") {
        const val ARG_RIDE_ID = "rideId"
        const val ARG_RIDER_NAME = "riderName"

        fun createRoute(rideId: String, riderName: String = "Customer"): String {
            val encName = URLEncoder.encode(riderName.ifEmpty { "Customer" }, StandardCharsets.UTF_8.toString())
            return "driver/trip_completion/$rideId/$encName"
        }
    }

    // ==========================================
    // Driver Selection & Rating
    // ==========================================

    data object DriverList : Route("driver_list/{pickupLat}/{pickupLng}/{dropoffLat}/{dropoffLng}/{pickupAddress}/{dropoffAddress}") {
        const val ARG_PICKUP_LAT = "pickupLat"
        const val ARG_PICKUP_LNG = "pickupLng"
        const val ARG_DROPOFF_LAT = "dropoffLat"
        const val ARG_DROPOFF_LNG = "dropoffLng"
        const val ARG_PICKUP_ADDRESS = "pickupAddress"
        const val ARG_DROPOFF_ADDRESS = "dropoffAddress"

        fun createRoute(
            pickupLat: Double, pickupLng: Double,
            dropoffLat: Double, dropoffLng: Double,
            pickupAddress: String, dropoffAddress: String
        ): String {
            val encPickup = URLEncoder.encode(pickupAddress, StandardCharsets.UTF_8.toString())
            val encDropoff = URLEncoder.encode(dropoffAddress, StandardCharsets.UTF_8.toString())
            return "driver_list/$pickupLat/$pickupLng/$dropoffLat/$dropoffLng/$encPickup/$encDropoff"
        }
    }

    data object DriverProfile : Route("driver_profile/{driverProfileId}/{pickupLat}/{pickupLng}/{dropoffLat}/{dropoffLng}/{pickupAddress}/{dropoffAddress}") {
        const val ARG_DRIVER_PROFILE_ID = "driverProfileId"
        const val ARG_PICKUP_LAT = "pickupLat"
        const val ARG_PICKUP_LNG = "pickupLng"
        const val ARG_DROPOFF_LAT = "dropoffLat"
        const val ARG_DROPOFF_LNG = "dropoffLng"
        const val ARG_PICKUP_ADDRESS = "pickupAddress"
        const val ARG_DROPOFF_ADDRESS = "dropoffAddress"

        fun createRoute(
            driverProfileId: String,
            pickupLat: Double, pickupLng: Double,
            dropoffLat: Double, dropoffLng: Double,
            pickupAddress: String, dropoffAddress: String
        ): String {
            val encPickup = URLEncoder.encode(pickupAddress, StandardCharsets.UTF_8.toString())
            val encDropoff = URLEncoder.encode(dropoffAddress, StandardCharsets.UTF_8.toString())
            return "driver_profile/$driverProfileId/$pickupLat/$pickupLng/$dropoffLat/$dropoffLng/$encPickup/$encDropoff"
        }
    }

    data object RideCompletion : Route("ride_completion/{rideId}/{driverName}") {
        const val ARG_RIDE_ID = "rideId"
        const val ARG_DRIVER_NAME = "driverName"

        fun createRoute(rideId: String, driverName: String): String {
            val encName = URLEncoder.encode(driverName, StandardCharsets.UTF_8.toString())
            return "ride_completion/$rideId/$encName"
        }
    }

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
