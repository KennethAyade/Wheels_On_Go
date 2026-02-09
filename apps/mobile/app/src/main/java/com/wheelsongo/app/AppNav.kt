package com.wheelsongo.app

import androidx.compose.material3.DrawerValue
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.wheelsongo.app.ui.navigation.Route
import com.wheelsongo.app.ui.navigation.UserRole
import com.wheelsongo.app.data.models.location.LocationData
import com.wheelsongo.app.data.network.ApiClient
import com.wheelsongo.app.data.repository.AuthRepository
import com.wheelsongo.app.ui.components.AppDrawer
import com.wheelsongo.app.ui.screens.auth.BiometricVerificationScreen
import com.wheelsongo.app.ui.screens.auth.OtpVerificationScreen
import com.wheelsongo.app.ui.screens.auth.PhoneInputScreen
import com.wheelsongo.app.ui.screens.auth.SessionResumeScreen
import com.wheelsongo.app.ui.screens.driver.DocumentUploadScreen
import com.wheelsongo.app.ui.screens.home.HomeScreen
import com.wheelsongo.app.ui.screens.home.HomeViewModel
import com.wheelsongo.app.ui.screens.location.LocationConfirmScreen
import com.wheelsongo.app.ui.screens.search.PlaceSearchScreen
import com.wheelsongo.app.ui.screens.welcome.WelcomeScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Main navigation graph for the Wheels On Go app
 *
 * Navigation Flow:
 * - App Launch: SessionResume → (auto-login) → Home  OR  → Welcome
 * - Rider (first time): Welcome → PhoneInput → OTP → LocationConfirm → Home
 * - Driver (first time): Welcome → PhoneInput → OTP → LocationConfirm → DocumentUpload → Home
 * - Driver (returning, OTP): Welcome → PhoneInput → OTP → BiometricVerification → LocationConfirm → Home
 * - Rider (returning, session): SessionResume → (auto-refresh) → Home
 * - Driver (returning, session): SessionResume → BiometricPrompt → (auto-refresh) → Home
 */
@Composable
fun AppNav(navController: NavHostController = rememberNavController()) {
    NavHost(
        navController = navController,
        startDestination = Route.SessionResume.value
    ) {
        // ==========================================
        // Session Resume — checks for existing session
        // ==========================================
        composable(Route.SessionResume.value) {
            SessionResumeScreen(
                onNavigateToHome = {
                    navController.navigate(Route.Home.value) {
                        popUpTo(Route.SessionResume.value) { inclusive = true }
                    }
                },
                onNavigateToWelcome = {
                    navController.navigate(Route.Welcome.value) {
                        popUpTo(Route.SessionResume.value) { inclusive = true }
                    }
                }
            )
        }

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
                onVerified = { needsKyc ->
                    navController.navigate(Route.LocationConfirm.createRoute(role, needsKyc)) {
                        popUpTo(Route.Welcome.value) { inclusive = false }
                    }
                },
                onBiometricRequired = {
                    // Driver needs face verification before proceeding
                    navController.navigate(Route.BiometricVerification.value) {
                        popUpTo(Route.Welcome.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Biometric Verification Screen (Driver Face Auth)
        // ==========================================
        composable(Route.BiometricVerification.value) {
            BiometricVerificationScreen(
                onBack = { navController.popBackStack() },
                onVerified = {
                    // Returning driver — KYC already done, no need for document upload
                    navController.navigate(Route.LocationConfirm.createRoute(UserRole.DRIVER, needsKyc = false)) {
                        popUpTo(Route.Welcome.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Location Confirmation Screen
        // ==========================================
        composable(
            route = Route.LocationConfirm.value,
            arguments = listOf(
                navArgument(Route.LocationConfirm.ARG_ROLE) { type = NavType.StringType },
                navArgument(Route.LocationConfirm.ARG_NEEDS_KYC) { type = NavType.BoolType }
            )
        ) { backStackEntry ->
            val role = backStackEntry.arguments?.getString(Route.LocationConfirm.ARG_ROLE) ?: UserRole.RIDER
            val needsKyc = backStackEntry.arguments?.getBoolean(Route.LocationConfirm.ARG_NEEDS_KYC) ?: false

            LocationConfirmScreen(
                onBack = { navController.popBackStack() },
                onConfirmMetroManila = {
                    if (role == UserRole.DRIVER && needsKyc) {
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
                    if (role == UserRole.DRIVER && needsKyc) {
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
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
            val scope = rememberCoroutineScope()

            // Read user info for drawer
            val tokenManager = ApiClient.getTokenManager()
            val userRole by tokenManager.userRole.collectAsState(initial = null)
            val phoneNumber by tokenManager.phoneNumber.collectAsState(initial = null)

            HomeScreen(
                drawerState = drawerState,
                drawerContent = {
                    AppDrawer(
                        userRole = userRole,
                        phoneNumber = phoneNumber,
                        onMyDocuments = {
                            scope.launch { drawerState.close() }
                            navController.navigate(Route.DriverDocumentUpload.value)
                        },
                        onLogout = {
                            scope.launch {
                                drawerState.close()
                                AuthRepository().logout()
                                navController.navigate(Route.Welcome.value) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        }
                    )
                },
                onMenuClick = { scope.launch { drawerState.open() } },
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
