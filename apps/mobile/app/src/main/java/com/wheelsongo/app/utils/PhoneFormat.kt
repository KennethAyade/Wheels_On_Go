package com.wheelsongo.app.utils

private val PHONE_REGEX = Regex("^\\+?\\d{7,15}$")

/**
 * True iff [value] looks like an E.164-ish phone number (optional leading +,
 * 7-15 digits). Used to guard against raw tokens or IDs accidentally being
 * rendered where a phone number was expected.
 */
fun String.isLikelyPhoneNumber(): Boolean = PHONE_REGEX.matches(this)

/**
 * Redact the middle portion of a phone number for display, keeping the last
 * four digits for user recognition. Non-phone input is returned unchanged.
 */
fun String.redactPhone(): String {
    if (!this.isLikelyPhoneNumber()) return this
    val digitsOnly = this.filter { it.isDigit() }
    if (digitsOnly.length < 4) return this
    val last4 = digitsOnly.takeLast(4)
    val maskedLen = (digitsOnly.length - 4).coerceAtLeast(0)
    val mask = "*".repeat(maskedLen)
    val prefix = if (this.startsWith("+")) "+" else ""
    return "$prefix$mask$last4"
}
