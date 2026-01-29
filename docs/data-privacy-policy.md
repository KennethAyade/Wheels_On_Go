# Wheels On Go - Data Privacy Policy

**Last Updated:** 2026-01-29
**Version:** 1.0
**Status:** Active

## 1. Introduction

This document outlines the data protection standards and privacy compliance protocols for the Wheels On Go ride-hailing platform. It defines how personally identifiable information (PII) and sensitive data are collected, processed, stored, and protected throughout the system.

### 1.1 Purpose

- Establish clear data protection standards for all PII and sensitive business data
- Define encryption requirements for data at rest and in transit
- Outline data retention and deletion policies
- Document user rights regarding their personal data
- Ensure compliance with data protection regulations

### 1.2 Scope

This policy applies to all data collected and processed by the Wheels On Go platform, including:
- User account information (riders and drivers)
- Location and ride history data
- Financial transactions and payment information
- Biometric verification data
- Communication and support records

---

## 2. Data Classification

### 2.1 Personally Identifiable Information (PII)

The following fields are classified as PII and are **encrypted at rest** using AES-256-GCM:

| Model | Field | Encryption Type | Searchable |
|-------|-------|----------------|------------|
| `User` | `phoneNumber` | AES-256-GCM | Yes (HMAC-SHA256 hash) |
| `User` | `email` | AES-256-GCM | Yes (HMAC-SHA256 hash) |
| `EmergencyContact` | `phoneNumber` | AES-256-GCM | No |
| `DriverWallet` | `accountNumber` | AES-256-GCM | No |
| `RiderPaymentMethod` | `cardToken` | AES-256-GCM | No |

**Searchable Fields:** For fields marked as searchable, a deterministic HMAC-SHA256 hash is stored in a separate column (e.g., `phoneNumberHash`, `emailHash`) to enable lookups without decrypting the entire database.

### 2.2 Sensitive Business Data

The following data types are considered sensitive and require enhanced protection:

- **Location Data**: Real-time and historical location information (`DriverLocationHistory`)
- **Ride History**: Complete ride records including routes, timestamps, and participants
- **Financial Transactions**: All payment processing, driver earnings, and payout records
- **Biometric Data**: Facial recognition verification results and challenge data
- **KYC Documents**: Driver license, ORCR, government IDs, and profile photos
- **SOS Incidents**: Emergency alerts and safety-related communications

### 2.3 Non-Sensitive Data

- Aggregated analytics (anonymized)
- System configuration settings
- Public-facing ratings and reviews (without personal details)

---

## 3. Encryption Standards

### 3.1 Data at Rest

All PII fields are encrypted at rest using the following specification:

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)
- **Key Length**: 256 bits (32 bytes)
- **Initialization Vector (IV)**: 12 bytes, randomly generated per encryption operation
- **Authentication Tag**: 16 bytes (GCM mode provides authenticated encryption)
- **Storage Format**: `iv:authTag:ciphertext` (all Base64-encoded)

**Example Encrypted Value:**
```
aBcDeFgHiJkL:MnOpQrStUvWx:YzAbCdEfGhIjKlMnOpQrStUvWxYz...
```

### 3.2 Searchable Field Hashing

For fields that require lookup functionality (e.g., `phoneNumber`, `email`):

- **Algorithm**: HMAC-SHA256 (Hash-based Message Authentication Code with SHA-256)
- **Key**: Same encryption key used for AES-256-GCM
- **Normalization**: Values are lowercased and trimmed before hashing
- **Output**: 64-character hexadecimal string
- **Storage**: Separate column (e.g., `phoneNumberHash`, `emailHash`)

### 3.3 Key Management

- **Key Storage**: Encryption keys are stored as environment variables and never committed to version control
- **Key Rotation**: Keys should be rotated annually or immediately if compromised
- **Key Generation**: Use cryptographically secure random number generators (CSRNG)
  ```bash
  openssl rand -hex 32
  ```
- **Backup**: Keys are securely backed up in encrypted key management systems

### 3.4 Data in Transit

All data transmitted between clients and servers is protected using:

- **Protocol**: TLS 1.3 minimum (Transport Layer Security)
- **Certificate**: Valid SSL/TLS certificates from trusted certificate authorities
- **HSTS**: HTTP Strict Transport Security enabled with `max-age=31536000` (1 year)
- **Cipher Suites**: Modern, secure cipher suites only (no deprecated algorithms)

---

## 4. Data Retention Policies

| Data Type | Retention Period | Deletion Method | Legal Basis |
|-----------|------------------|-----------------|-------------|
| Active user accounts | Duration of account | N/A | Contractual necessity |
| Inactive user accounts | 3 years after last activity | Anonymization | Legitimate interest |
| Ride history | 7 years | Anonymization | Legal obligation (tax/financial records) |
| Location breadcrumbs | 30 days | Hard delete | Legitimate interest (safety/support) |
| Financial transactions | 7 years | Archive (encrypted) | Legal obligation (accounting) |
| Audit logs | 7 years | Archive (encrypted) | Legal obligation (compliance) |
| OTP codes | 24 hours | Hard delete | Technical necessity |
| Biometric verification data | 90 days | Hard delete | Consent + safety |
| Support ticket data | 3 years | Anonymization | Legitimate interest |
| KYC documents | Duration of account + 7 years | Secure deletion | Legal obligation |

**Deletion Methods:**
- **Hard Delete**: Complete removal from database and backups
- **Anonymization**: Removal of all PII, retaining anonymized statistical data
- **Archive**: Move to secure, encrypted cold storage

---

## 5. User Rights

### 5.1 Right to Access

Users can request all personal data held about them:

- **Request Method**: In-app request or email to privacy@wheelongo.com
- **Response Time**: Within 30 days
- **Data Format**: JSON export containing all personal data
- **Included Data**: Profile information, ride history, transactions, communications

### 5.2 Right to Rectification

Users can request correction of inaccurate or incomplete personal data:

- **Request Method**: In-app profile updates or support request
- **Response Time**: Immediate for profile updates, within 7 days for document corrections

### 5.3 Right to Erasure ("Right to be Forgotten")

Users can request deletion of their personal data:

- **Request Method**: In-app account deletion or email request
- **Processing Time**: 30 days
- **Exceptions**: Financial records retained for 7 years for legal compliance
- **Process**:
  1. User submits deletion request
  2. System verifies user identity
  3. Financial records are anonymized (PII removed, transaction IDs retained)
  4. All other personal data is hard deleted
  5. User receives confirmation email

### 5.4 Right to Data Portability

Users can receive their personal data in a structured, machine-readable format:

- **Format**: JSON
- **Delivery**: Secure download link (expires in 7 days)
- **Response Time**: Within 30 days

### 5.5 Right to Object

Users can object to processing of their personal data for:
- Direct marketing (opt-out available)
- Profiling and automated decision-making

---

## 6. Audit Requirements

All critical actions involving personal data MUST be logged to the `AuditLog` table:

### 6.1 Mandatory Audit Events

| Category | Events |
|----------|--------|
| **Authentication** | LOGIN_SUCCESS, LOGIN_FAILED, TOKEN_REFRESHED, LOGOUT |
| **PII Access** | PII_ACCESS (whenever encrypted data is decrypted for viewing) |
| **Data Exports** | DATA_EXPORT_REQUESTED, DATA_EXPORT_COMPLETED |
| **Account Deletions** | DATA_DELETION_REQUESTED, DATA_DELETION_COMPLETED |
| **Payment Processing** | PAYMENT_INITIATED, PAYMENT_PROCESSED, PAYMENT_FAILED, PAYMENT_REFUNDED |
| **Driver Payouts** | PAYOUT_REQUESTED, PAYOUT_COMPLETED, PAYOUT_FAILED |
| **Safety Incidents** | SOS_TRIGGERED, SOS_RESOLVED |
| **Suspensions** | DRIVER_SUSPENDED, DRIVER_REACTIVATED, USER_SUSPENDED, USER_REACTIVATED |
| **KYC Changes** | KYC_UPLOAD_REQUESTED, DRIVER_APPROVED, DRIVER_REJECTED |

### 6.2 Audit Log Retention

- **Retention Period**: 7 years
- **Storage**: Encrypted at rest
- **Access**: Restricted to authorized administrators and compliance officers

---

## 7. Data Breach Response

### 7.1 Detection and Assessment

- Automated monitoring for unusual access patterns
- Regular security audits and penetration testing
- Immediate investigation of suspected breaches

### 7.2 Notification Requirements

If a breach affects user data:

- **Internal Notification**: Immediate escalation to security team and management
- **User Notification**: Within 72 hours if high risk to user rights
- **Regulatory Notification**: Within 72 hours to relevant data protection authorities
- **Public Disclosure**: If breach affects large number of users (>10,000)

### 7.3 Remediation

- Immediate containment of breach
- Root cause analysis
- Implementation of corrective measures
- Post-incident review and policy updates

---

## 8. Third-Party Data Processors

Any third-party services that process user data must:

- Sign a Data Processing Agreement (DPA)
- Comply with equivalent data protection standards
- Undergo security assessment before integration
- Be subject to regular audits

**Current Third-Party Processors:**
- Payment gateway providers (e.g., PayMongo, GCash)
- Cloud storage providers (e.g., Cloudflare R2)
- SMS/OTP providers (e.g., Twilio)
- Analytics providers (anonymized data only)

---

## 9. Data Transfer and Cross-Border Processing

- **Primary Data Center**: [Specify location, e.g., Singapore/US]
- **Backup Locations**: [Specify backup data center locations]
- **Cross-Border Transfers**: Only to jurisdictions with adequate data protection laws
- **Safeguards**: Standard Contractual Clauses (SCCs) for international transfers

---

## 10. Employee Access and Internal Controls

### 10.1 Access Control

- **Principle of Least Privilege**: Employees have access only to data necessary for their role
- **Role-Based Access Control (RBAC)**: Separate roles for riders, drivers, admins, and support staff
- **Multi-Factor Authentication (MFA)**: Required for all administrative access

### 10.2 Employee Training

- Annual data privacy and security training for all employees
- Specialized training for roles with access to PII
- Regular phishing simulations and security awareness campaigns

---

## 11. Compliance and Certification

### 11.1 Regulatory Compliance

This policy is designed to comply with:

- **GDPR** (General Data Protection Regulation) - EU
- **CCPA** (California Consumer Privacy Act) - USA
- **Data Privacy Act of 2012** (Republic Act No. 10173) - Philippines
- **PCI-DSS** (Payment Card Industry Data Security Standard) - for payment data

### 11.2 Regular Reviews

This policy is reviewed and updated:
- Annually
- After significant system changes
- Following data breach incidents
- When new regulations come into effect

---

## 12. Contact Information

For privacy-related inquiries, requests, or concerns:

- **Email**: privacy@wheelongo.com
- **Data Protection Officer**: [Name and contact details]
- **Support Portal**: [Link to privacy request form]

---

## 13. Technical Implementation Details

### 13.1 Encryption Service

- **Location**: `apps/api/src/encryption/encryption.service.ts`
- **Methods**:
  - `encrypt(plaintext: string): string` - Encrypts PII
  - `decrypt(ciphertext: string): string` - Decrypts PII
  - `hashForSearch(value: string): string` - Creates searchable hash
  - `isEncrypted(value: string): boolean` - Checks if value is encrypted

### 13.2 Prisma Middleware

- **Location**: `apps/api/src/prisma/prisma.service.ts`
- **Functionality**: Automatically encrypts PII fields on write and decrypts on read
- **Models Affected**: User, EmergencyContact, DriverWallet, RiderPaymentMethod

### 13.3 Audit Logging

- **Service**: `apps/api/src/audit/audit.service.ts`
- **Convenience Methods**:
  - `logPayment()` - Logs payment transactions
  - `logSosIncident()` - Logs safety incidents
  - `logPiiAccess()` - Logs PII access events
  - `logDataExport()` - Logs data export requests

---

## Appendix A: Encryption Key Generation

To generate a secure 256-bit encryption key:

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated key to your `.env` file:
```env
ENCRYPTION_KEY=<64-hex-character-string>
```

---

## Appendix B: Data Privacy Checklist

- [ ] ENCRYPTION_KEY environment variable configured
- [ ] All PII fields encrypted at rest (verified via database inspection)
- [ ] Hash columns populated for searchable fields
- [ ] Helmet security headers configured
- [ ] CORS properly restricted to known origins
- [ ] Audit logging enabled for all critical actions
- [ ] TLS/HTTPS enforced on all endpoints
- [ ] Data retention policies implemented
- [ ] User data export functionality tested
- [ ] Account deletion functionality tested
- [ ] Employee access controls configured
- [ ] Third-party DPAs signed
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

---

**Document Control:**
- **Author**: Wheels On Go Development Team
- **Approved By**: [Name, Title]
- **Next Review Date**: 2027-01-29
