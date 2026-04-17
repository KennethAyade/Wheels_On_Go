package com.wheelsongo.app.utils

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

sealed class FaceLivenessResult {
    data object Valid : FaceLivenessResult()
    data object NoFace : FaceLivenessResult()
    data object MultipleFaces : FaceLivenessResult()
    data object FaceTooSmall : FaceLivenessResult()
    data object EyesClosed : FaceLivenessResult()
    data class Error(val cause: Throwable) : FaceLivenessResult()
}

object FaceLivenessCheck {

    private const val MIN_FACE_BOUNDS_RATIO = 0.20f
    private const val EYE_OPEN_THRESHOLD = 0.4f

    private val detector by lazy {
        FaceDetection.getClient(
            FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
                .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
                .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
                .build()
        )
    }

    suspend fun check(bitmap: Bitmap): FaceLivenessResult = suspendCancellableCoroutine { cont ->
        val image = InputImage.fromBitmap(bitmap, 0)
        detector.process(image)
            .addOnSuccessListener { faces ->
                if (!cont.isActive) return@addOnSuccessListener
                when {
                    faces.isEmpty() -> cont.resume(FaceLivenessResult.NoFace)
                    faces.size > 1 -> cont.resume(FaceLivenessResult.MultipleFaces)
                    else -> {
                        val face = faces.first()
                        val bounds = face.boundingBox
                        val faceArea = bounds.width().toFloat() * bounds.height().toFloat()
                        val frameArea = bitmap.width.toFloat() * bitmap.height.toFloat()
                        val ratio = faceArea / frameArea

                        val leftEye = face.leftEyeOpenProbability
                        val rightEye = face.rightEyeOpenProbability
                        val eyesOpen = (leftEye == null || leftEye >= EYE_OPEN_THRESHOLD) &&
                                (rightEye == null || rightEye >= EYE_OPEN_THRESHOLD)

                        cont.resume(
                            when {
                                ratio < MIN_FACE_BOUNDS_RATIO -> FaceLivenessResult.FaceTooSmall
                                !eyesOpen -> FaceLivenessResult.EyesClosed
                                else -> FaceLivenessResult.Valid
                            }
                        )
                    }
                }
            }
            .addOnFailureListener { e ->
                if (cont.isActive) cont.resume(FaceLivenessResult.Error(e))
            }
    }

    fun userMessageFor(result: FaceLivenessResult): String = when (result) {
        FaceLivenessResult.Valid -> ""
        FaceLivenessResult.NoFace -> "No face detected. Please center your face in the frame."
        FaceLivenessResult.MultipleFaces -> "Multiple faces detected. Please ensure only your face is visible."
        FaceLivenessResult.FaceTooSmall -> "Please move closer so your face fills more of the frame."
        FaceLivenessResult.EyesClosed -> "Please keep your eyes open and look at the camera."
        is FaceLivenessResult.Error -> "Face detection failed. Please try again."
    }
}
