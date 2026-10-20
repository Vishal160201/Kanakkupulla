import type { CustomData, LayoutField, LayoutSchema, VisibilityRule } from "@/types/bookings";

/** Layout field ids that map onto first-class booking columns (everything else lives in customData). */
export const STANDARD_FIELD_MAP: Record<string, string> = {
  fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
  fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
  fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance',
  fld_gallery_delivered: 'galleryDelivered'
};

/**
 * Parses a JSON column that may arrive as a string or as an already-decoded value.
 * Invalid JSON yields `fallback`; a falsy non-string value also yields `fallback`.
 */
export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return (value || fallback) as T;
}

/** Parses booking customData into an object (`{}` when missing or invalid). */
export function parseCustomData<T extends CustomData = CustomData>(value: unknown): T {
  return parseJsonColumn<T>(value, {} as T);
}

/** All fields of a layout, flattened across sections. */
export function getAllFields(schema: LayoutSchema | null | undefined): LayoutField[] {
  return schema?.sections?.flatMap(s => s.fields) ?? [];
}

/** Evaluates a field/section visibility rule against the value of the field it depends on. */
export function evaluateVisibilityRule(rule: VisibilityRule, depValue: unknown): boolean {
  const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);

  if (rule.operator === 'EQUALS') return ruleValues.includes(depValue as string);
  if (rule.operator === 'NOT_EQUALS') return !ruleValues.includes(depValue as string);
  if (rule.operator === 'CONTAINS') {
    if (typeof depValue === 'string') return ruleValues.some(v => depValue.includes(v));
    if (Array.isArray(depValue)) return ruleValues.some(v => depValue.includes(v));
    return false;
  }

  // For pure dependsOn + values format without operator
  if (rule.dependsOn && Array.isArray(rule.values) && !rule.operator) {
    return rule.values.includes(depValue as string);
  }

  return true;
}

/** Key a rule depends on (`dependsOn` in older layouts, `fieldId` in newer ones). */
export function getRuleDependency(rule: VisibilityRule | null | undefined): string | null {
  if (!rule) return null;
  return rule.dependsOn || rule.fieldId || null;
}

/** Short display id used when a booking has no bookingNumber. */
export function shortBookingId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}
