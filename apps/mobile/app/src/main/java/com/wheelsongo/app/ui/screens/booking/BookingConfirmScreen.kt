package com.wheelsongo.app.ui.screens.booking

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.distinctUntilChanged
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import com.wheelsongo.app.ui.components.buttons.PrimaryButton
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingConfirmScreen(
    pickupLat: Double,
    pickupLng: Double,
    pickupAddress: String,
    dropoffLat: Double,
    dropoffLng: Double,
    dropoffAddress: String,
    onBack: () -> Unit,
    onRideCreated: (rideId: String) -> Unit,
    onFindDriver: (paymentMethod: String) -> Unit = {},
    onAddVehicle: () -> Unit,
    onScheduledRideCreated: () -> Unit = {},
    viewModel: BookingConfirmViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val lifecycle = LocalLifecycleOwner.current.lifecycle

    LaunchedEffect(Unit) {
        viewModel.initialize(pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress)
    }

    // Refresh vehicles on screen resume (e.g., returning from registration)
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.fetchVehicles()
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(uiState.bookingSuccess) {
        if (uiState.bookingSuccess && uiState.createdRideId != null) {
            onRideCreated(uiState.createdRideId!!)
        }
    }

    // Redirect to existing active ride if "already have an active ride" error
    LaunchedEffect(uiState.existingActiveRideId) {
        uiState.existingActiveRideId?.let { rideId ->
            onRideCreated(rideId)
        }
    }

    // Scheduling success dialog
    var showSchedulingSuccessDialog by remember { mutableStateOf(false) }
    LaunchedEffect(uiState.schedulingSuccess) {
        if (uiState.schedulingSuccess) {
            showSchedulingSuccessDialog = true
        }
    }

    if (showSchedulingSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showSchedulingSuccessDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            },
            title = {
                Text(
                    "Ride Scheduled",
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Scheduled time card
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                uiState.scheduledPickupTimeFormatted,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Text(
                        "We'll find a driver 15 minutes before your pickup time.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            },
            confirmButton = {
                PrimaryButton(
                    text = "View Scheduled Rides",
                    onClick = {
                        showSchedulingSuccessDialog = false
                        onScheduledRideCreated()
                    },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            dismissButton = {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    TextButton(onClick = {
                        showSchedulingSuccessDialog = false
                        onBack()
                    }) {
                        Text("Done")
                    }
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Confirm Booking") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = {
            if (uiState.errorMessage != null) {
                Snackbar(
                    action = { TextButton(onClick = { viewModel.clearError() }) { Text("Dismiss") } }
                ) { Text(uiState.errorMessage!!) }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))

            // Route summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("From", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    Text(pickupAddress, style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("To", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                    Text(dropoffAddress, style = MaterialTheme.typography.bodyMedium)
                }
            }

            // Ride type toggle: Ride Now vs Schedule for Later
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("When do you need a ride?", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.onToggleScheduled(false) },
                            colors = CardDefaults.cardColors(
                                containerColor = if (!uiState.isScheduledRide)
                                    MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surface
                            ),
                            border = if (!uiState.isScheduledRide)
                                BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                            else BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.DirectionsCar,
                                    contentDescription = "Ride Now",
                                    modifier = Modifier.size(28.dp),
                                    tint = if (!uiState.isScheduledRide) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Ride Now",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (!uiState.isScheduledRide) FontWeight.Bold else FontWeight.Normal,
                                    color = if (!uiState.isScheduledRide) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            onClick = { viewModel.onToggleScheduled(true) },
                            colors = CardDefaults.cardColors(
                                containerColor = if (uiState.isScheduledRide)
                                    MaterialTheme.colorScheme.primaryContainer
                                else MaterialTheme.colorScheme.surface
                            ),
                            border = if (uiState.isScheduledRide)
                                BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                            else BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Schedule,
                                    contentDescription = "Schedule for Later",
                                    modifier = Modifier.size(28.dp),
                                    tint = if (uiState.isScheduledRide) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Schedule",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (uiState.isScheduledRide) FontWeight.Bold else FontWeight.Normal,
                                    color = if (uiState.isScheduledRide) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // Inline schedule picker
                    AnimatedVisibility(
                        visible = uiState.isScheduledRide,
                        enter = expandVertically(),
                        exit = shrinkVertically()
                    ) {
                        InlineSchedulePicker(
                            selectedDayIndex = uiState.selectedDayIndex,
                            selectedHour = uiState.selectedHour,
                            selectedMinute = uiState.selectedMinute,
                            scheduledTimeFormatted = uiState.scheduledPickupTimeFormatted,
                            scheduleWarning = uiState.scheduleWarning,
                            onDaySelected = { viewModel.onDayChipSelected(it) },
                            onTimeSelected = { h, m -> viewModel.onTimeSelected(h, m) }
                        )
                    }
                }
            }

            // Fare estimate
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Fare Estimate", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingEstimate) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else if (uiState.estimate != null) {
                        val est = uiState.estimate!!
                        FareRow("Distance", "${est.distanceText} (${est.durationText})")
                        FareRow("Base fare", "${est.currency} ${est.baseFare}")
                        FareRow("Distance fare", "${est.currency} ${est.distanceFare}")
                        FareRow("Time fare", "${est.currency} ${est.timeFare}")
                        if (est.surgePricing > 0) {
                            FareRow("Surge (${est.surgeMultiplier}x)", "+${est.currency} ${est.surgePricing}")
                        }
                        if (est.promoDiscount > 0) {
                            FareRow("Promo discount", "-${est.currency} ${est.promoDiscount}")
                        }
                        if (est.subscriptionDiscount > 0) {
                            FareRow("Subscription discount", "-${est.currency} ${est.subscriptionDiscount}")
                        }
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${est.currency} ${est.estimatedFare}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Note: This is an estimated fare. The actual fare may vary based on the actual transit distance.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Vehicle selector
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Your Vehicle", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))

                    if (uiState.isLoadingVehicles) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else if (uiState.vehicles.isEmpty()) {
                        Text(
                            "No vehicle registered. Please add your car first.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(onClick = onAddVehicle, modifier = Modifier.fillMaxWidth()) {
                            Text("Add Vehicle")
                        }
                    } else {
                        uiState.vehicles.forEach { vehicle ->
                            val isSelected = vehicle.id == uiState.selectedVehicle?.id
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected)
                                        MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surface
                                ),
                                onClick = { viewModel.onVehicleSelected(vehicle) }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        vehicle.displayName,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                    Text(
                                        vehicle.plateNumber,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Payment method selector
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Payment Method", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        PaymentMethodCard(
                            label = "Cash",
                            icon = Icons.Default.Payments,
                            isSelected = uiState.paymentMethod == "CASH",
                            onClick = { viewModel.onPaymentMethodChange("CASH") },
                            modifier = Modifier.weight(1f)
                        )
                        PaymentMethodCard(
                            label = "GCash",
                            icon = Icons.Default.AccountBalanceWallet,
                            isSelected = uiState.paymentMethod == "GCASH",
                            onClick = { viewModel.onPaymentMethodChange("GCASH") },
                            modifier = Modifier.weight(1f)
                        )
                        PaymentMethodCard(
                            label = "Card",
                            icon = Icons.Default.CreditCard,
                            isSelected = uiState.paymentMethod == "CREDIT_CARD",
                            onClick = { viewModel.onPaymentMethodChange("CREDIT_CARD") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Promo code
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = uiState.promoCode,
                    onValueChange = viewModel::onPromoCodeChange,
                    label = { Text("Promo Code") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                OutlinedButton(onClick = viewModel::applyPromoCode) {
                    Text("Apply")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Action button — Find a Driver (instant) or Schedule Ride (scheduled)
            if (uiState.isScheduledRide) {
                PrimaryButton(
                    text = if (uiState.isBooking) "Scheduling..." else "Schedule Ride",
                    onClick = { viewModel.findDriver() },
                    enabled = uiState.selectedVehicle != null
                            && uiState.estimate != null
                            && uiState.scheduledPickupTime != null
                            && !uiState.isBooking,
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                PrimaryButton(
                    text = "Find a Driver",
                    onClick = { onFindDriver(uiState.paymentMethod) },
                    enabled = uiState.selectedVehicle != null && uiState.estimate != null,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentMethodCard(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        onClick = onClick,
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected)
            BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
        else BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                modifier = Modifier.size(28.dp),
                tint = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                textAlign = TextAlign.Center,
                color = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FareRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun InlineSchedulePicker(
    selectedDayIndex: Int,
    selectedHour: Int,
    selectedMinute: Int,
    scheduledTimeFormatted: String,
    scheduleWarning: String = "",
    onDaySelected: (Int) -> Unit,
    onTimeSelected: (Int, Int) -> Unit
) {
    Column(modifier = Modifier.padding(top = 12.dp)) {
        // Day chips
        Text(
            "Select date",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val today = LocalDate.now()
            (0..6).forEach { dayIndex ->
                val date = today.plusDays(dayIndex.toLong())
                val label = when (dayIndex) {
                    0 -> "Today"
                    1 -> "Tomorrow"
                    else -> "${date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${date.dayOfMonth}"
                }
                FilterChip(
                    selected = selectedDayIndex == dayIndex,
                    onClick = { onDaySelected(dayIndex) },
                    label = { Text(label, style = MaterialTheme.typography.labelMedium) },
                    shape = RoundedCornerShape(20.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Time input
        Text(
            "Select time",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))

        ScrollWheelTimePicker(
            selectedHour = selectedHour,
            selectedMinute = selectedMinute,
            onTimeSelected = onTimeSelected
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Inline warning or confirmation
        if (scheduleWarning.isNotEmpty()) {
            Text(
                scheduleWarning,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Medium
            )
        } else if (scheduledTimeFormatted.isNotEmpty()) {
            Text(
                "Pickup: $scheduledTimeFormatted",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

/**
 * Scroll-wheel (roller) time picker with Hour, Minute, and AM/PM columns.
 * ViewModel-driven state — programmatic scrollToItem fixes the sync bug
 * that Material3 TimeInput had with rememberTimePickerState.
 */
@Composable
private fun ScrollWheelTimePicker(
    selectedHour: Int,   // 24h format (0–23) from ViewModel
    selectedMinute: Int, // 0–55 in 5-min steps
    onTimeSelected: (Int, Int) -> Unit
) {
    val hours = remember { (1..12).toList() }
    val minutes = remember { (0..55 step 5).toList() }
    val periods = remember { listOf("AM", "PM") }

    // Convert 24h → 12h display
    val display12Hour = when {
        selectedHour <= 0 || selectedHour == 12 -> 12
        selectedHour > 12 -> selectedHour - 12
        else -> selectedHour
    }
    val isPm = selectedHour >= 12

    val hourIndex = hours.indexOf(display12Hour).coerceAtLeast(0)
    val minuteIndex = minutes.indexOf((selectedMinute / 5) * 5).coerceAtLeast(0)
    val periodIndex = if (isPm) 1 else 0

    val hourListState = rememberLazyListState(initialFirstVisibleItemIndex = hourIndex)
    val minuteListState = rememberLazyListState(initialFirstVisibleItemIndex = minuteIndex)
    val periodListState = rememberLazyListState(initialFirstVisibleItemIndex = periodIndex)

    // Sync scroll positions when ViewModel state changes (e.g., auto-clamp)
    LaunchedEffect(hourIndex) {
        if (hourListState.firstVisibleItemIndex != hourIndex) {
            hourListState.animateScrollToItem(hourIndex)
        }
    }
    LaunchedEffect(minuteIndex) {
        if (minuteListState.firstVisibleItemIndex != minuteIndex) {
            minuteListState.animateScrollToItem(minuteIndex)
        }
    }
    LaunchedEffect(periodIndex) {
        if (periodListState.firstVisibleItemIndex != periodIndex) {
            periodListState.animateScrollToItem(periodIndex)
        }
    }

    // Notify ViewModel when user scrolls
    LaunchedEffect(hourListState) {
        snapshotFlow { hourListState.firstVisibleItemIndex }
            .distinctUntilChanged()
            .collect {
                val h = hours.getOrElse(hourListState.firstVisibleItemIndex) { 12 }
                val m = minutes.getOrElse(minuteListState.firstVisibleItemIndex) { 0 }
                val pm = periodListState.firstVisibleItemIndex == 1
                val hour24 = when {
                    h == 12 && !pm -> 0
                    h == 12 && pm -> 12
                    pm -> h + 12
                    else -> h
                }
                onTimeSelected(hour24, m)
            }
    }
    LaunchedEffect(minuteListState) {
        snapshotFlow { minuteListState.firstVisibleItemIndex }
            .distinctUntilChanged()
            .collect {
                val h = hours.getOrElse(hourListState.firstVisibleItemIndex) { 12 }
                val m = minutes.getOrElse(minuteListState.firstVisibleItemIndex) { 0 }
                val pm = periodListState.firstVisibleItemIndex == 1
                val hour24 = when {
                    h == 12 && !pm -> 0
                    h == 12 && pm -> 12
                    pm -> h + 12
                    else -> h
                }
                onTimeSelected(hour24, m)
            }
    }
    LaunchedEffect(periodListState) {
        snapshotFlow { periodListState.firstVisibleItemIndex }
            .distinctUntilChanged()
            .collect {
                val h = hours.getOrElse(hourListState.firstVisibleItemIndex) { 12 }
                val m = minutes.getOrElse(minuteListState.firstVisibleItemIndex) { 0 }
                val pm = periodListState.firstVisibleItemIndex == 1
                val hour24 = when {
                    h == 12 && !pm -> 0
                    h == 12 && pm -> 12
                    pm -> h + 12
                    else -> h
                }
                onTimeSelected(hour24, m)
            }
    }

    val itemHeight = 40.dp

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(itemHeight * 3),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Hour column
        WheelColumn(
            items = hours.map { "%02d".format(it) },
            listState = hourListState,
            itemHeight = itemHeight,
            modifier = Modifier.width(56.dp)
        )

        // Colon separator
        Text(
            ":",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 4.dp)
        )

        // Minute column
        WheelColumn(
            items = minutes.map { "%02d".format(it) },
            listState = minuteListState,
            itemHeight = itemHeight,
            modifier = Modifier.width(56.dp)
        )

        Spacer(modifier = Modifier.width(12.dp))

        // AM/PM column
        WheelColumn(
            items = periods,
            listState = periodListState,
            itemHeight = itemHeight,
            modifier = Modifier.width(52.dp)
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun WheelColumn(
    items: List<String>,
    listState: LazyListState,
    itemHeight: Dp,
    modifier: Modifier = Modifier
) {
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)

    Box(
        modifier = modifier.height(itemHeight * 3),
        contentAlignment = Alignment.Center
    ) {
        // Selection highlight band
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(itemHeight)
                .background(
                    MaterialTheme.colorScheme.primaryContainer,
                    RoundedCornerShape(8.dp)
                )
        )

        LazyColumn(
            state = listState,
            flingBehavior = flingBehavior,
            contentPadding = PaddingValues(vertical = itemHeight),
            modifier = Modifier.height(itemHeight * 3)
        ) {
            items(items.size) { index ->
                val isCenter = index == listState.firstVisibleItemIndex
                Box(
                    modifier = Modifier
                        .height(itemHeight)
                        .fillMaxWidth()
                        .alpha(if (isCenter) 1f else 0.3f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = items[index],
                        style = if (isCenter) MaterialTheme.typography.titleLarge
                        else MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isCenter) FontWeight.Bold else FontWeight.Normal,
                        color = if (isCenter) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
