import type { BookingDetail, VisibilityRule } from "@/types/bookings";
import { evaluateVisibilityRule, getRuleDependency, STANDARD_FIELD_MAP } from "../layoutUtils";

/** Reads a top-level booking property by (layout-mapped) name. */
export function readBookingField(booking: BookingDetail, key: string): unknown {
  return (booking as unknown as Record<string, unknown>)[key];
}

/** Visibility of a layout field/section in the details view, based on the saved booking values. */
export function isFieldVisibleForBooking(booking: BookingDetail, rule: VisibilityRule | null | undefined): boolean {
  if (!rule) return true;
  const dependsOnKey = getRuleDependency(rule);
  if (!dependsOnKey) return true;
  const depFieldName = STANDARD_FIELD_MAP[dependsOnKey] || dependsOnKey;
  const standardDepVal = readBookingField(booking, depFieldName);
  const depVal = (standardDepVal !== undefined && standardDepVal !== null && standardDepVal !== '')
    ? standardDepVal
    : booking.customData?.[depFieldName] || booking.customData?.[dependsOnKey];

  return evaluateVisibilityRule(rule, depVal);
}
