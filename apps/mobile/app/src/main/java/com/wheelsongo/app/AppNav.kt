package com.wheelsongo.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.wheelsongo.app.ui.navigation.Route
import com.wheelsongo.app.ui.navigation.UserRole
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.ui.screens.auth.OtpVerificationScreen
import com.wheelsongo.app.ui.screens.auth.PhoneInputScreen
import com.wheelsongo.app.ui.screens.driver.DocumentUploadScreen
import com.wheelsongo.app.ui.screens.home.HomeScreen
import com.wheelsongo.app.ui.screens.home.HomeViewModel
import com.wheelsongo.app.ui.screens.location.LocationConfirmScreen
import com.wheelsongo.app.ui.screens.search.PlaceSearchScreen
import com.wheelsongo.app.ui.screens.welcome.WelcomeScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Main navigation graph for the Wheels On Go app
 *
 * Navigation Flow:
 * - Rider: Welcome → PhoneInput → OTP → LocationConfirm → Home
 * - Driver: Welcome → PhoneInput → OTP → LocationConfirm → DocumentUpload → Home
 */
@Composable
fun AppNav(navController: NavHostController = rememberNavController()) {
    NavHost(
        navController = navController,
        startDestination = Route.Welcome.value
    ) {
        // ==========================================
        // Welcome Screen - Role Selection
        // ==========================================
        composable(Route.Welcome.value) {
            WelcomeScreen(
                onLoginAsDriver = {
                    navController.navigate(Route.PhoneInput.createRoute(UserRole.DRIVER))
                },
                onLoginAsUser = {
                    navController.navigate(Route.PhoneInput.createRoute(UserRole.RIDER))
                }
            )
        }

        // ==========================================
        // Phone Input Screen
        // ==========================================
        composable(
            route = Route.PhoneInput.value,
            arguments = listOf(
                navArgument(Route.PhoneInput.ARG_ROLE) {
                    type = NavType.StringType
                }
            )
        ) { backStackEntry ->
            val role = backStackEntry.arguments?.getString(Route.PhoneInput.ARG_ROLE) ?: UserRole.RIDER

            PhoneInputScreen(
                role = role,
                onBack = { navController.popBackStack() },
                onNext = { phoneNumber: String ->
                    // URL encode the phone number to handle special characters
                    val encodedPhone = URLEncoder.encode(phoneNumber, StandardCharsets.UTF_8.toString())
                    navController.navigate(Route.OtpVerification.createRoute(encodedPhone, role))
                }
            )
        }

        // ==========================================
        // OTP Verification Screen
        // ==========================================
        composable(
            route = Route.OtpVerification.value,
            arguments = listOf(
                navArgument(Route.OtpVerification.ARG_PHONE_NUMBER) {
                    type = NavType.StringType
                },
                navArgument(Route.OtpVerification.ARG_ROLE) {
                    type = NavType.StringType
                }
            )
        ) { backStackEntry ->
            val encodedPhoneNumber = backStackEntry.arguments?.getString(Route.OtpVerification.ARG_PHONE_NUMBER) ?: ""
            val phoneNumber = URLDecoder.decode(encodedPhoneNumber, StandardCharsets.UTF_8.toString())
            val role = backStackEntry.arguments?.getString(Route.OtpVerification.ARG_ROLE) ?: UserRole.RIDER

            OtpVerificationScreen(
                phoneNumber = phoneNumber,
                role = role,
                onBack = { navController.popBackStack() },
                onVerified = {
                    // Navigate to location confirmation
                    // Clear back stack so user can't go back to OTP screen
                    navController.navigate(Route.LocationConfirm.value) {
                        popUpTo(Route.Welcome.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Location Confirmation Screen
        // ==========================================
        composable(Route.LocationConfirm.value) {
            // Get the role from the previous navigation state
            // We pass it through the saved state handle
            val previousBackStackEntry = navController.previousBackStackEntry
            val role = previousBackStackEntry?.arguments?.getString(Route.OtpVerification.ARG_ROLE)
                ?: UserRole.RIDER

            LocationConfirmScreen(
                onBack = { navController.popBackStack() },
                onConfirmMetroManila = {
                    // If driver, go to document upload first
                    // If rider, go directly to home
                    if (role == UserRole.DRIVER) {
                        navController.navigate(Route.DriverDocumentUpload.value) {
                            popUpTo(Route.LocationConfirm.value) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Route.Home.value) {
                            popUpTo(Route.Welcome.value) { inclusive = true }
                        }
                    }
                },
                onNotInMetroManila = {
                    // For now, still navigate to home with a note
                    // In production, might show an error or restrict access
                    if (role == UserRole.DRIVER) {
                        navController.navigate(Route.DriverDocumentUpload.value) {
                            popUpTo(Route.LocationConfirm.value) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Route.Home.value) {
                            popUpTo(Route.Welcome.value) { inclusive = true }
                        }
                    }
                }
            )
        }

        // ==========================================
        // Driver Document Upload Screen (KYC)
        // ==========================================
        composable(Route.DriverDocumentUpload.value) {
            DocumentUploadScreen(
                onBack = { navController.popBackStack() },
                onComplete = {
                    // Navigate to home after KYC complete
                    navController.navigate(Route.Home.value) {
                        popUpTo(Route.Welcome.value) { inclusive = true }
                    }
                }
            )
        }

        // ==========================================
        // Home Screen (Map View)
        // ==========================================
        composable(Route.Home.value) { backStackEntry ->
            // Share HomeViewModel between Home and PlaceSearch
            val homeViewModel: HomeViewModel = viewModel()

            HomeScreen(
                onMenuClick = {
                    // TODO: Open drawer/menu
                },
                onFromFieldClick = {
                    navController.navigate(Route.PlaceSearch.createRoute(isPickup = true))
                },
                onToFieldClick = {
                    navController.navigate(Route.PlaceSearch.createRoute(isPickup = false))
                },
                viewModel = homeViewModel
            )
        }

        // ==========================================
        // Place Search Screen
        // ==========================================
        composable(
            route = Route.PlaceSearch.value,
            arguments = listOf(
                navArgument(Route.PlaceSearch.ARG_IS_PICKUP) {
                    type = NavType.BoolType
                }
            )
        ) { backStackEntry ->
            val isPickup = backStackEntry.arguments?.getBoolean(Route.PlaceSearch.ARG_IS_PICKUP) ?: true

            // Get the shared HomeViewModel from parent
            val parentEntry = navController.getBackStackEntry(Route.Home.value)
            val homeViewModel: HomeViewModel = viewModel(parentEntry)

            PlaceSearchScreen(
                isPickup = isPickup,
                onBackClick = {
                    navController.popBackStack()
                },
                onPlaceSelected = { placeDetails ->
                    // Update the HomeViewModel with the selected place
                    val locationData = LocationData(
                        latitude = placeDetails.latitude,
                        longitude = placeDetails.longitude
                    )

                    if (isPickup) {
                        homeViewModel.setPickupLocation(locationData, placeDetails.address)
                    } else {
                        homeViewModel.setDropoffLocation(locationData, placeDetails.address)
                    }

                    // Navigate back to home
                    navController.popBackStack()
                }
            )
        }
    }
}
