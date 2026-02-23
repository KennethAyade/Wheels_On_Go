/**
 * PII (Personally Identifiable Information) field definitions
 * These fields will be encrypted at rest
 */
export const PII_FIELDS: Record<string, string[]> = {
  User: ['phoneNumber', 'email'],
  EmergencyContact: ['phoneNumber'],
  DriverWallet: ['accountNumber'],
  RiderPaymentMethod: ['cardToken'],
};

/**
 * Fields that need deterministic hashes for searching
 * These fields will have corresponding *Hash columns
 */
export const SEARCHABLE_ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['phoneNumber', 'email'],
};

/**
 * Get hash column name for a field
 * @param fieldName - The original field name
 * @returns The hash column name (e.g., 'phoneNumber' -> 'phoneNumberHash')
 */
export function getHashColumnName(fieldName: string): string {
  return `${fieldName}Hash`;
}
