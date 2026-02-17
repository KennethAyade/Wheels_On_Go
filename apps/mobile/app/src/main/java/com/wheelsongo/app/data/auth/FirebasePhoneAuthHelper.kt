package com.wheelsongo.app.data.auth

import android.app.Activity
import com.google.firebase.FirebaseException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Result from starting phone verification with Firebase
 */
sealed class FirebaseVerificationResult {
    /** SMS sent — user needs to enter code manually */
    data class CodeSent(
        val verificationId: String,
        val resendToken: PhoneAuthProvider.ForceResendingToken
    ) : FirebaseVerificationResult()

    /** Auto-verified (instant verification or auto-retrieval) — no code needed */
    data class AutoVerified(val credential: PhoneAuthCredential) : FirebaseVerificationResult()

    /** Verification failed */
    data class Failed(val exception: Exception) : FirebaseVerificationResult()

    /** Rate limited / device blocked — too many requests */
    data class RateLimited(val retryAfterSeconds: Long = 3600) : FirebaseVerificationResult()

    /** reCAPTCHA or app verification required */
    data class RecaptchaRequired(val exception: FirebaseException) : FirebaseVerificationResult()
}

/**
 * Helper that wraps Firebase Phone Auth API for use in ViewModels.
 *
 * Usage:
 * 1. Call [startVerification] to send SMS — returns [FirebaseVerificationResult]
 * 2. If CodeSent, user enters code → call [verifyCodeAndGetIdToken] to get Firebase ID token
 * 3. Send ID token to backend POST /auth/verify-firebase
 */
object FirebasePhoneAuthHelper {

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }

    /**
     * Start phone number verification.
     * Firebase will send an SMS with a verification code.
     *
     * @param phoneNumber E.164 format (e.g. +639XXXXXXXXX)
     * @param activity Required by Firebase for reCAPTCHA fallback
     * @return [FirebaseVerificationResult] indicating what happened
     */
    suspend fun startVerification(
        phoneNumber: String,
        activity: Activity
    ): FirebaseVerificationResult = suspendCancellableCoroutine { cont ->
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                if (cont.isActive) {
                    cont.resume(FirebaseVerificationResult.AutoVerified(credential))
                }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                android.util.Log.e("FirebasePhoneAuth", "Verification failed: ${e.javaClass.simpleName} - ${e.message}")
                val result = when (e) {
                    is FirebaseTooManyRequestsException -> FirebaseVerificationResult.RateLimited()
                    is FirebaseAuthInvalidCredentialsException -> FirebaseVerificationResult.RecaptchaRequired(e)
                    else -> FirebaseVerificationResult.Failed(e)
                }
                if (cont.isActive) {
                    cont.resume(result)
                }
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                if (cont.isActive) {
                    cont.resume(FirebaseVerificationResult.CodeSent(verificationId, token))
                }
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(120L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()

        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    /**
     * Verify a code entered by the user and get a Firebase ID token.
     *
     * @param verificationId From [FirebaseVerificationResult.CodeSent]
     * @param code 6-digit code entered by user
     * @return Firebase ID token string to send to backend
     */
    suspend fun verifyCodeAndGetIdToken(
        verificationId: String,
        code: String
    ): String {
        val credential = PhoneAuthProvider.getCredential(verificationId, code)
        return signInAndGetIdToken(credential)
    }

    /**
     * Sign in with an auto-verified credential and get Firebase ID token.
     */
    suspend fun getIdTokenFromCredential(credential: PhoneAuthCredential): String {
        return signInAndGetIdToken(credential)
    }

    private suspend fun signInAndGetIdToken(
        credential: PhoneAuthCredential
    ): String = suspendCancellableCoroutine { cont ->
        auth.signInWithCredential(credential)
            .addOnSuccessListener { authResult ->
                val user = authResult.user
                if (user == null) {
                    cont.resumeWithException(Exception("Firebase sign-in succeeded but user is null"))
                    return@addOnSuccessListener
                }
                user.getIdToken(true)
                    .addOnSuccessListener { tokenResult ->
                        val token = tokenResult.token
                        if (token != null) {
                            cont.resume(token)
                        } else {
                            cont.resumeWithException(Exception("Firebase ID token is null"))
                        }
                    }
                    .addOnFailureListener { e ->
                        cont.resumeWithException(e)
                    }
            }
            .addOnFailureListener { e ->
                cont.resumeWithException(e)
            }
    }

    /**
     * Sign out from Firebase Auth.
     * Call this after getting the ID token and completing backend verification.
     */
    fun signOut() {
        auth.signOut()
    }
}
