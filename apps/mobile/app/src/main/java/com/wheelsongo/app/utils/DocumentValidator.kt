package com.wheelsongo.app.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

sealed class DocumentValidationResult {
    data object Valid : DocumentValidationResult()
    data class Invalid(val userMessage: String) : DocumentValidationResult()
}

object DocumentValidator {

    const val MIN_BYTES = 50 * 1024L
    const val MAX_BYTES = 10 * 1024 * 1024L
    const val MIN_WIDTH_PX = 600
    const val MIN_HEIGHT_PX = 400

    val ALLOWED_MIME_TYPES = setOf("image/jpeg", "image/jpg", "image/png")

    private const val MIN_ID_TEXT_CHARS = 20
    private const val MIN_FACE_BOUNDS_RATIO = 0.25f

    private val LICENSE_KEYWORDS = listOf(
        "LICENSE", "LICENCE", "LTO", "DRIVER", "DRIVERS",
        "NON-PROFESSIONAL", "PROFESSIONAL", "LAND TRANSPORTATION"
    )

    private val GOVERNMENT_ID_KEYWORDS = listOf(
        "UMID", "PHILSYS", "PHILIPPINE IDENTIFICATION", "NATIONAL ID",
        "PASSPORT", "REPUBLIC OF THE PHILIPPINES",
        "POSTAL", "SSS", "GSIS", "PRC", "PROFESSIONAL REGULATION",
        "DRIVER", "LICENSE", "VOTER", "COMELEC", "TIN", "BIR"
    )

    private val faceDetector by lazy {
        FaceDetection.getClient(
            FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                .build()
        )
    }

    private val textRecognizer by lazy {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    /**
     * Checks basic file-level constraints: MIME whitelist, size range, dimensions.
     * Does not inspect content — use [validateContent] for that.
     */
    fun validateFile(
        mimeType: String,
        sizeBytes: Long,
        bitmap: Bitmap
    ): DocumentValidationResult {
        if (mimeType.lowercase() !in ALLOWED_MIME_TYPES) {
            return DocumentValidationResult.Invalid(
                "Unsupported file type. Please upload a JPG or PNG image."
            )
        }
        if (sizeBytes < MIN_BYTES) {
            return DocumentValidationResult.Invalid(
                "This image looks too small or blank. Please upload a clear photo."
            )
        }
        if (sizeBytes > MAX_BYTES) {
            return DocumentValidationResult.Invalid(
                "Image is too large. Please upload a file smaller than 10 MB."
            )
        }
        if (bitmap.width < MIN_WIDTH_PX || bitmap.height < MIN_HEIGHT_PX) {
            return DocumentValidationResult.Invalid(
                "Image resolution is too low. Please upload a clearer, higher-resolution photo."
            )
        }
        return DocumentValidationResult.Valid
    }

    /**
     * Validates that the image content matches the declared document type using
     * on-device ML Kit. For IDs, runs OCR and looks for expected keywords. For
     * profile photos, runs face detection and requires one well-framed face.
     */
    suspend fun validateContent(
        documentApiName: String,
        bitmap: Bitmap
    ): DocumentValidationResult = when (documentApiName) {
        "LICENSE" -> validateIdContent(bitmap, LICENSE_KEYWORDS, "driver's license")
        "GOVERNMENT_ID" -> validateIdContent(bitmap, GOVERNMENT_ID_KEYWORDS, "government-issued ID")
        "PROFILE_PHOTO" -> validateProfilePhoto(bitmap)
        else -> DocumentValidationResult.Valid
    }

    private suspend fun validateIdContent(
        bitmap: Bitmap,
        keywords: List<String>,
        displayName: String
    ): DocumentValidationResult {
        val recognized = runTextRecognition(bitmap)
            ?: return DocumentValidationResult.Invalid(
                "Could not read the image. Please ensure good lighting and try again."
            )

        val upper = recognized.uppercase()
        val cleanChars = recognized.count { it.isLetterOrDigit() }

        if (cleanChars < MIN_ID_TEXT_CHARS) {
            return DocumentValidationResult.Invalid(
                "This doesn't look like a $displayName. Please upload a clear photo of the document."
            )
        }

        val hasKeyword = keywords.any { upper.contains(it) }
        if (!hasKeyword) {
            return DocumentValidationResult.Invalid(
                "This doesn't look like a $displayName. Please upload a clear photo of the document."
            )
        }

        return DocumentValidationResult.Valid
    }

    private suspend fun validateProfilePhoto(bitmap: Bitmap): DocumentValidationResult =
        suspendCancellableCoroutine { cont ->
            val image = InputImage.fromBitmap(bitmap, 0)
            faceDetector.process(image)
                .addOnSuccessListener { faces ->
                    if (!cont.isActive) return@addOnSuccessListener
                    val result = when {
                        faces.isEmpty() -> DocumentValidationResult.Invalid(
                            "No face detected. Please upload a clear photo of your face."
                        )
                        faces.size > 1 -> DocumentValidationResult.Invalid(
                            "Multiple faces detected. Please upload a photo with only your face."
                        )
                        else -> {
                            val face = faces.first()
                            val faceArea = face.boundingBox.width().toFloat() *
                                face.boundingBox.height().toFloat()
                            val frameArea = bitmap.width.toFloat() * bitmap.height.toFloat()
                            if (faceArea / frameArea < MIN_FACE_BOUNDS_RATIO) {
                                DocumentValidationResult.Invalid(
                                    "Please upload a closer photo where your face fills more of the frame."
                                )
                            } else {
                                DocumentValidationResult.Valid
                            }
                        }
                    }
                    cont.resume(result)
                }
                .addOnFailureListener { e ->
                    if (cont.isActive) cont.resume(
                        DocumentValidationResult.Invalid(
                            "Face detection failed. Please try again."
                        )
                    )
                }
        }

    private suspend fun runTextRecognition(bitmap: Bitmap): String? =
        suspendCancellableCoroutine { cont ->
            val image = InputImage.fromBitmap(bitmap, 0)
            textRecognizer.process(image)
                .addOnSuccessListener { result ->
                    if (cont.isActive) cont.resume(result.text)
                }
                .addOnFailureListener {
                    if (cont.isActive) cont.resume(null)
                }
        }

    fun decodeBitmap(context: Context, uri: Uri): Bitmap? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream)
            }
        } catch (_: Exception) {
            null
        }
    }
}
