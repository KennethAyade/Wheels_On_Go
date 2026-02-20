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
import com.wheelsongo.app.ui.screens.driver.DriverActiveRideScreen
import com.wheelsongo.app.ui.screens.driver.DriverHomeScreen
import com.wheelsongo.app.ui.screens.driver.DriverHomeViewModel
import com.wheelsongo.app.ui.screens.driver.DriveRequestsScreen
import com.wheelsongo.app.ui.screens.driver.DriverTripCompletionScreen
import com.wheelsongo.app.ui.screens.driver.DriverTripCompletionViewModel
import com.wheelsongo.app.ui.screens.home.HomeScreen
import com.wheelsongo.app.ui.screens.home.HomeViewModel
import com.wheelsongo.app.ui.screens.vehicle.VehicleListScreen
import com.wheelsongo.app.ui.screens.location.LocationConfirmScreen
import com.wheelsongo.app.ui.screens.search.PlaceSearchScreen
import com.wheelsongo.app.ui.screens.welcome.WelcomeScreen
import com.wheelsongo.app.ui.screens.booking.BookingConfirmScreen
import com.wheelsongo.app.ui.screens.driver.DriverListScreen
import com.wheelsongo.app.ui.screens.driver.DriverProfileScreen
import com.wheelsongo.app.ui.screens.ride.ActiveRideScreen
import com.wheelsongo.app.ui.screens.ride.RideCompletionScreen
import com.wheelsongo.app.ui.screens.vehicle.VehicleRegistrationScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import java.net.URLEncoder

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
                onNext = { phoneNumber: String, verificationId: String? ->
                    if (verificationId == "AUTO_VERIFIED") {
                        // Firebase auto-verified — skip OTP screen, go straight to next step
                        navController.navigate(Route.LocationConfirm.createRoute(role, false)) {
                            popUpTo(Route.Welcome.value) { inclusive = false }
                        }
                    } else {
                        navController.navigate(Route.OtpVerification.createRoute(phoneNumber, role, verificationId))
                    }
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
                },
                navArgument(Route.OtpVerification.ARG_VERIFICATION_ID) {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val phoneNumber = backStackEntry.arguments?.getString(Route.OtpVerification.ARG_PHONE_NUMBER) ?: ""
            val role = backStackEntry.arguments?.getString(Route.OtpVerification.ARG_ROLE) ?: UserRole.RIDER
            val verificationId = backStackEntry.arguments?.getString(Route.OtpVerification.ARG_VERIFICATION_ID)

            OtpVerificationScreen(
                phoneNumber = phoneNumber,
                role = role,
                verificationId = verificationId,
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
        // Home Screen (Role-Conditional: Rider vs Driver)
        // ==========================================
        composable(Route.Home.value) {
            val homeViewModel: HomeViewModel = viewModel()
            val driverHomeViewModel: DriverHomeViewModel = viewModel()
            val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
            val scope = rememberCoroutineScope()

            // Read user info for drawer
            val tokenManager = ApiClient.getTokenManager()
            val userRole by tokenManager.userRole.collectAsState(initial = null)
            val phoneNumber by tokenManager.phoneNumber.collectAsState(initial = null)

            val drawerContent: @Composable () -> Unit = {
                AppDrawer(
                    userRole = userRole,
                    phoneNumber = phoneNumber,
                    onMyDocuments = {
                        scope.launch { drawerState.close() }
                        navController.navigate(Route.DriverDocumentUpload.value)
                    },
                    onMyVehicles = {
                        scope.launch { drawerState.close() }
                        navController.navigate(Route.VehicleList.value)
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
            }

            when (userRole) {
                UserRole.DRIVER -> {
                    DriverHomeScreen(
                        drawerState = drawerState,
                        drawerContent = drawerContent,
                        onMenuClick = { scope.launch { drawerState.open() } },
                        onNavigateToActiveRide = { rideId ->
                            val riderName = driverHomeViewModel.uiState.value.acceptedRiderName
                            navController.navigate(Route.DriverActiveRide.createRoute(rideId, riderName))
                        },
                        onNavigateToDriveRequests = {
                            navController.navigate(Route.DriveRequests.value)
                        },
                        viewModel = driverHomeViewModel
                    )
                }
                else -> {
                    // Rider or unknown role — show rider booking HomeScreen
                    HomeScreen(
                        drawerState = drawerState,
                        drawerContent = drawerContent,
                        onMenuClick = { scope.launch { drawerState.open() } },
                        onFromFieldClick = {
                            navController.navigate(Route.PlaceSearch.createRoute(isPickup = true))
                        },
                        onToFieldClick = {
                            navController.navigate(Route.PlaceSearch.createRoute(isPickup = false))
                        },
                        onConfirmBooking = {
                            navController.navigate(Route.BookingConfirm.value)
                        },
                        onNavigateToActiveRide = { rideId ->
                            navController.navigate(Route.ActiveRide.createRoute(rideId)) {
                                popUpTo(Route.Home.value) { inclusive = false }
                            }
                        },
                        viewModel = homeViewModel
                    )
                }
            }
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

        // ==========================================
        // Booking Confirmation Screen
        // ==========================================
        composable(Route.BookingConfirm.value) {
            // Share HomeViewModel to read pickup/dropoff data
            val parentEntry = navController.getBackStackEntry(Route.Home.value)
            val homeViewModel: HomeViewModel = viewModel(parentEntry)
            val homeState by homeViewModel.uiState.collectAsState()

            val pickupLat = homeState.pickupLocation?.latitude ?: 0.0
            val pickupLng = homeState.pickupLocation?.longitude ?: 0.0
            val dropoffLat = homeState.dropoffLocation?.latitude ?: 0.0
            val dropoffLng = homeState.dropoffLocation?.longitude ?: 0.0

            BookingConfirmScreen(
                pickupLat = pickupLat,
                pickupLng = pickupLng,
                pickupAddress = homeState.fromAddress,
                dropoffLat = dropoffLat,
                dropoffLng = dropoffLng,
                dropoffAddress = homeState.toAddress,
                onBack = { navController.popBackStack() },
                onRideCreated = { rideId ->
                    navController.navigate(Route.ActiveRide.createRoute(rideId)) {
                        popUpTo(Route.Home.value) { inclusive = false }
                    }
                },
                onFindDriver = {
                    navController.navigate(
                        Route.DriverList.createRoute(
                            pickupLat, pickupLng,
                            dropoffLat, dropoffLng,
                            homeState.fromAddress, homeState.toAddress
                        )
                    )
                },
                onAddVehicle = {
                    navController.navigate(Route.VehicleRegistration.value)
                }
            )
        }

        // ==========================================
        // Active Ride Screen
        // ==========================================
        composable(
            route = Route.ActiveRide.value,
            arguments = listOf(
                navArgument(Route.ActiveRide.ARG_RIDE_ID) {
                    type = NavType.StringType
                }
            )
        ) { backStackEntry ->
            val rideId = backStackEntry.arguments?.getString(Route.ActiveRide.ARG_RIDE_ID) ?: ""

            ActiveRideScreen(
                rideId = rideId,
                onBack = { navController.popBackStack() },
                onRideCompleted = { driverName ->
                    navController.navigate(Route.RideCompletion.createRoute(rideId, driverName)) {
                        popUpTo(Route.Home.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Vehicle List Screen (My Vehicles)
        // ==========================================
        composable(Route.VehicleList.value) {
            VehicleListScreen(
                onBack = { navController.popBackStack() },
                onAddVehicle = {
                    navController.navigate(Route.VehicleRegistration.value)
                }
            )
        }

        // ==========================================
        // Vehicle Registration Screen
        // ==========================================
        composable(Route.VehicleRegistration.value) {
            VehicleRegistrationScreen(
                onBack = { navController.popBackStack() },
                onSuccess = {
                    navController.popBackStack()
                }
            )
        }

        // ==========================================
        // Driver Active Ride Screen
        // ==========================================
        composable(
            route = Route.DriverActiveRide.value,
            arguments = listOf(
                navArgument(Route.DriverActiveRide.ARG_RIDE_ID) {
                    type = NavType.StringType
                },
                navArgument(Route.DriverActiveRide.ARG_RIDER_NAME) {
                    type = NavType.StringType
                    defaultValue = ""
                    nullable = true
                }
            )
        ) { backStackEntry ->
            val rideId = backStackEntry.arguments?.getString(Route.DriverActiveRide.ARG_RIDE_ID) ?: ""
            val riderName = backStackEntry.arguments?.getString(Route.DriverActiveRide.ARG_RIDER_NAME) ?: ""

            DriverActiveRideScreen(
                rideId = rideId,
                riderName = riderName,
                onBack = { navController.popBackStack() },
                onNavigateToCompletion = { completedRideId, completedRiderName ->
                    navController.navigate(
                        Route.DriverTripCompletion.createRoute(completedRideId, completedRiderName)
                    ) {
                        popUpTo(Route.Home.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Drive Requests Screen
        // ==========================================
        composable(Route.DriveRequests.value) {
            val parentEntry = navController.getBackStackEntry(Route.Home.value)
            val driverHomeViewModel: DriverHomeViewModel = viewModel(parentEntry)

            DriveRequestsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToActiveRide = { rideId ->
                    val riderName = driverHomeViewModel.uiState.value.acceptedRiderName
                    navController.navigate(Route.DriverActiveRide.createRoute(rideId, riderName)) {
                        popUpTo(Route.Home.value) { inclusive = false }
                    }
                },
                viewModel = driverHomeViewModel
            )
        }

        // ==========================================
        // Driver Trip Completion Screen
        // ==========================================
        composable(
            route = Route.DriverTripCompletion.value,
            arguments = listOf(
                navArgument(Route.DriverTripCompletion.ARG_RIDE_ID) { type = NavType.StringType },
                navArgument(Route.DriverTripCompletion.ARG_RIDER_NAME) { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val rideId = backStackEntry.arguments?.getString(Route.DriverTripCompletion.ARG_RIDE_ID) ?: ""
            val riderName = backStackEntry.arguments?.getString(Route.DriverTripCompletion.ARG_RIDER_NAME) ?: "Customer"

            DriverTripCompletionScreen(
                rideId = rideId,
                riderName = riderName,
                onGoHome = {
                    navController.navigate(Route.Home.value) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        // ==========================================
        // Driver List Screen (Rider selects driver)
        // ==========================================
        composable(
            route = Route.DriverList.value,
            arguments = listOf(
                navArgument(Route.DriverList.ARG_PICKUP_LAT) { type = NavType.StringType },
                navArgument(Route.DriverList.ARG_PICKUP_LNG) { type = NavType.StringType },
                navArgument(Route.DriverList.ARG_DROPOFF_LAT) { type = NavType.StringType },
                navArgument(Route.DriverList.ARG_DROPOFF_LNG) { type = NavType.StringType },
                navArgument(Route.DriverList.ARG_PICKUP_ADDRESS) { type = NavType.StringType },
                navArgument(Route.DriverList.ARG_DROPOFF_ADDRESS) { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val pickupLat = backStackEntry.arguments?.getString(Route.DriverList.ARG_PICKUP_LAT)?.toDoubleOrNull() ?: 0.0
            val pickupLng = backStackEntry.arguments?.getString(Route.DriverList.ARG_PICKUP_LNG)?.toDoubleOrNull() ?: 0.0
            val dropoffLat = backStackEntry.arguments?.getString(Route.DriverList.ARG_DROPOFF_LAT)?.toDoubleOrNull() ?: 0.0
            val dropoffLng = backStackEntry.arguments?.getString(Route.DriverList.ARG_DROPOFF_LNG)?.toDoubleOrNull() ?: 0.0
            val pickupAddress = backStackEntry.arguments?.getString(Route.DriverList.ARG_PICKUP_ADDRESS) ?: ""
            val dropoffAddress = backStackEntry.arguments?.getString(Route.DriverList.ARG_DROPOFF_ADDRESS) ?: ""

            DriverListScreen(
                pickupLat = pickupLat,
                pickupLng = pickupLng,
                dropoffLat = dropoffLat,
                dropoffLng = dropoffLng,
                pickupAddress = pickupAddress,
                dropoffAddress = dropoffAddress,
                onNavigateBack = { navController.popBackStack() },
                onDriverSelected = { driverProfileId ->
                    navController.navigate(
                        Route.DriverProfile.createRoute(
                            driverProfileId,
                            pickupLat, pickupLng,
                            dropoffLat, dropoffLng,
                            pickupAddress, dropoffAddress
                        )
                    )
                }
            )
        }

        // ==========================================
        // Driver Profile Screen
        // ==========================================
        composable(
            route = Route.DriverProfile.value,
            arguments = listOf(
                navArgument(Route.DriverProfile.ARG_DRIVER_PROFILE_ID) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_PICKUP_LAT) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_PICKUP_LNG) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_DROPOFF_LAT) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_DROPOFF_LNG) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_PICKUP_ADDRESS) { type = NavType.StringType },
                navArgument(Route.DriverProfile.ARG_DROPOFF_ADDRESS) { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val driverProfileId = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_DRIVER_PROFILE_ID) ?: ""
            val pickupLat = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_PICKUP_LAT)?.toDoubleOrNull() ?: 0.0
            val pickupLng = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_PICKUP_LNG)?.toDoubleOrNull() ?: 0.0
            val dropoffLat = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_DROPOFF_LAT)?.toDoubleOrNull() ?: 0.0
            val dropoffLng = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_DROPOFF_LNG)?.toDoubleOrNull() ?: 0.0
            val pickupAddress = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_PICKUP_ADDRESS) ?: ""
            val dropoffAddress = backStackEntry.arguments?.getString(Route.DriverProfile.ARG_DROPOFF_ADDRESS) ?: ""

            DriverProfileScreen(
                driverProfileId = driverProfileId,
                pickupLat = pickupLat,
                pickupLng = pickupLng,
                dropoffLat = dropoffLat,
                dropoffLng = dropoffLng,
                pickupAddress = pickupAddress,
                dropoffAddress = dropoffAddress,
                onNavigateBack = { navController.popBackStack() },
                onRideCreated = { rideId ->
                    navController.navigate(Route.ActiveRide.createRoute(rideId)) {
                        popUpTo(Route.Home.value) { inclusive = false }
                    }
                }
            )
        }

        // ==========================================
        // Ride Completion / Rating Screen
        // ==========================================
        composable(
            route = Route.RideCompletion.value,
            arguments = listOf(
                navArgument(Route.RideCompletion.ARG_RIDE_ID) { type = NavType.StringType },
                navArgument(Route.RideCompletion.ARG_DRIVER_NAME) { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val rideId = backStackEntry.arguments?.getString(Route.RideCompletion.ARG_RIDE_ID) ?: ""
            val driverName = backStackEntry.arguments?.getString(Route.RideCompletion.ARG_DRIVER_NAME) ?: "your driver"

            RideCompletionScreen(
                rideId = rideId,
                driverName = driverName,
                onDone = {
                    navController.navigate(Route.Home.value) {
                        popUpTo(Route.Home.value) { inclusive = true }
                    }
                }
            )
        }
    }
}
