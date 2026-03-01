package com.wheelsongo.app.ui.components.camera

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.Canvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay

/**
 * Dark-themed color palette for face camera screens
 */
private val DarkNavy = Color(0xFF0A0E21)
private val AccentBlue = Color(0xFF4A90D9)
private val AccentBlueBright = Color(0xFF6CB4FF)
private val ChipBackground = Color(0xFF1A1E35)
private val SuccessGreen = Color(0xFF4CAF50)

/**
 * Reusable embedded camera composable for face capture screens.
 * Dark-themed full-screen layout with oval face guide overlay,
 * CameraX front camera preview, and auto-capture functionality.
 *
 * Used by: BiometricVerificationScreen, FaceEnrollmentScreen, FatigueCheckScreen
 */
@Composable
fun FaceCameraCapture(
    title: String,
    subtitle: String,
    statusText: String,
    isProcessing: Boolean,
    isSuccess: Boolean,
    errorMessage: String? = null,
    onImageCaptured: (Bitmap) -> Unit,
    onBack: () -> Unit,
    onPermissionDenied: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                    PackageManager.PERMISSION_GRANTED
        )
    }

    var permissionDenied by remember { mutableStateOf(false) }
    var hasAutoCaptured by remember { mutableStateOf(false) }
    var cameraReady by remember { mutableStateOf(false) }

    val imageCapture = remember { mutableStateOf<ImageCapture?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            permissionDenied = true
            onPermissionDenied?.invoke()
        }
    }

    // Request permission on first composition if needed
    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // Reset auto-capture when processing ends without success (allows retry)
    LaunchedEffect(isProcessing, isSuccess, errorMessage) {
        if (!isProcessing && !isSuccess && hasAutoCaptured && (errorMessage != null)) {
            // Wait a moment then reset for auto-retry
            delay(1500)
            hasAutoCaptured = false
        }
    }

    // Auto-capture after camera is ready (2.5s delay for user to position face)
    LaunchedEffect(cameraReady, hasAutoCaptured, isProcessing, isSuccess) {
        if (cameraReady && !hasAutoCaptured && !isProcessing && !isSuccess) {
            delay(2500)
            val capture = imageCapture.value
            if (capture != null && !hasAutoCaptured) {
                hasAutoCaptured = true
                captureImage(capture, context) { bitmap ->
                    onImageCaptured(bitmap)
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkNavy)
    ) {
        if (hasCameraPermission && !permissionDenied) {
            // Camera preview
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                    }

                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }
                        val capture = ImageCapture.Builder()
                            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                            .build()

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_FRONT_CAMERA,
                                preview,
                                capture
                            )
                            imageCapture.value = capture
                            cameraReady = true
                        } catch (_: Exception) {
                            // Camera binding failed
                        }
                    }, ContextCompat.getMainExecutor(ctx))

                    previewView
                },
                modifier = Modifier.fillMaxSize()
            )

            // Cleanup camera on dispose
            DisposableEffect(Unit) {
                onDispose {
                    try {
                        val cameraProvider = ProcessCameraProvider.getInstance(context).get()
                        cameraProvider.unbindAll()
                    } catch (_: Exception) { }
                }
            }

            // Oval overlay with dark mask
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
            ) {
                // Dark semi-transparent mask over everything
                drawRect(color = DarkNavy.copy(alpha = 0.7f))

                // Clear oval cutout in upper-center area
                val ovalWidth = size.width * 0.62f
                val ovalHeight = size.height * 0.38f
                val ovalLeft = (size.width - ovalWidth) / 2f
                val ovalTop = size.height * 0.15f

                // Clear the oval area
                drawOval(
                    color = Color.Transparent,
                    topLeft = Offset(ovalLeft, ovalTop),
                    size = Size(ovalWidth, ovalHeight),
                    blendMode = BlendMode.Clear
                )

                // Draw glowing blue oval border
                val borderColor = if (isSuccess) SuccessGreen else AccentBlueBright
                drawOval(
                    color = borderColor,
                    topLeft = Offset(ovalLeft, ovalTop),
                    size = Size(ovalWidth, ovalHeight),
                    style = Stroke(width = 4.dp.toPx())
                )

                // Outer glow effect
                drawOval(
                    color = borderColor.copy(alpha = 0.3f),
                    topLeft = Offset(ovalLeft - 3.dp.toPx(), ovalTop - 3.dp.toPx()),
                    size = Size(ovalWidth + 6.dp.toPx(), ovalHeight + 6.dp.toPx()),
                    style = Stroke(width = 2.dp.toPx())
                )
            }
        } else if (permissionDenied) {
            // Permission denied state
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Camera Permission Required",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Please grant camera access in your device settings to use this feature.",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Top section: back button + title + subtitle
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 16.dp, start = 8.dp, end = 16.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = AccentBlue,
                    modifier = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = title,
                color = Color.White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = subtitle,
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 14.sp,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
        }

        // Bottom section: error message + status chip + progress indicator + manual capture
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Error message display
            if (errorMessage != null && !isProcessing && !isSuccess) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 32.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF4A1C1C).copy(alpha = 0.9f))
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = errorMessage,
                        color = Color(0xFFEF9A9A),
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
            }

            // Status text chip
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(ChipBackground.copy(alpha = 0.8f))
                    .border(
                        width = 1.dp,
                        color = if (isSuccess) SuccessGreen.copy(alpha = 0.5f)
                        else AccentBlue.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(20.dp)
                    )
                    .padding(horizontal = 24.dp, vertical = 10.dp)
            ) {
                Text(
                    text = statusText,
                    color = if (isSuccess) SuccessGreen else AccentBlueBright,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Progress / Success / Manual capture indicator
            Box(
                modifier = Modifier.size(56.dp),
                contentAlignment = Alignment.Center
            ) {
                when {
                    isSuccess -> {
                        // Green checkmark circle
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .border(2.dp, AccentBlueBright, CircleShape)
                                .background(Color.Transparent),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Success",
                                tint = AccentBlueBright,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                    isProcessing -> {
                        // Progress spinner
                        CircularProgressIndicator(
                            modifier = Modifier.size(48.dp),
                            color = AccentBlueBright,
                            strokeWidth = 3.dp
                        )
                    }
                    cameraReady -> {
                        // Manual capture button (always available when camera is ready)
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(AccentBlue.copy(alpha = 0.3f))
                                .border(2.dp, AccentBlueBright, CircleShape)
                                .clickable {
                                    val capture = imageCapture.value
                                    if (capture != null && !isProcessing) {
                                        hasAutoCaptured = true
                                        captureImage(capture, context) { bitmap ->
                                            onImageCaptured(bitmap)
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "Capture",
                                tint = AccentBlueBright,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Captures an image from the ImageCapture use case, mirrors it for front camera,
 * and delivers the result as a Bitmap via callback.
 */
private fun captureImage(
    imageCapture: ImageCapture,
    context: android.content.Context,
    onCaptured: (Bitmap) -> Unit
) {
    imageCapture.takePicture(
        ContextCompat.getMainExecutor(context),
        object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(image: ImageProxy) {
                val bitmap = image.toBitmap()
                // Mirror the bitmap since front camera is mirrored
                val matrix = Matrix().apply { preScale(-1f, 1f) }
                val mirrored = Bitmap.createBitmap(
                    bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
                )
                image.close()
                onCaptured(mirrored)
            }

            override fun onError(exception: ImageCaptureException) {
                // Capture failed silently — user can retry
            }
        }
    )
}
