import type { FieldTypeDef, FormField, FormLayout } from "@/types/settings";

export const FIELD_TYPES: FieldTypeDef[] = [
  { value: "SINGLE_LINE", label: "Single-Line", icon: "ph-text-t" },
  { value: "MULTI_LINE", label: "Multi-Line", icon: "ph-text-align-left" },
  { value: "PICK_LIST", label: "Pick List", icon: "ph-list-dashes" },
  { value: "STATUS_PICKER", label: "Status Picker", icon: "ph-palette" },
  { value: "MULTI_SELECT", label: "Multi Select", icon: "ph-list-checks" },
  { value: "DATE", label: "Date", icon: "ph-calendar-blank" },
  { value: "TIME", label: "Time", icon: "ph-clock" },
  { value: "CHECKBOX", label: "Checkbox", icon: "ph-check-square" },
  { value: "CURRENCY", label: "Currency", icon: "ph-currency-dollar" },
  { value: "PERCENTAGE", label: "% Percentage", icon: "ph-percent" },
  { value: "NUMBER", label: "Number", icon: "ph-hash" },
  { value: "DECIMAL", label: ".00 Decimal", icon: "ph-math-operations" },
  { value: "EMAIL", label: "Email", icon: "ph-envelope-simple" },
  { value: "PHONE", label: "Phone", icon: "ph-phone" },
  { value: "FILE", label: "Attachment", icon: "ph-paperclip" },
  { value: "USER_PICKLIST", label: "User (Single)", icon: "ph-user" },
  { value: "MULTI_USER_PICKLIST", label: "Users (Multiple)", icon: "ph-users" },
];

export const getFieldTypeDef = (type: string | undefined) => FIELD_TYPES.find((t) => t.value === type);

/** Time-based id used for new sections/fields/forms (called from event handlers only). */
export const timestampId = (prefix: string) => `${prefix}_${Date.now()}`;

export const createField = (fieldType: string): FormField => {
  const typeDef = getFieldTypeDef(fieldType);
  return {
    id: timestampId("field"),
    name: typeDef ? typeDef.label : "New Field",
    type: fieldType,
    mandatory: false,
    options: ["Option 1", "Option 2", "Option 3"],
  };
};

export const allFields = (layout: FormLayout) => layout.schema.sections.flatMap((s) => s.fields);

export const isLockedSection = (section: { id: string; locked?: boolean }) =>
  section.id === "sec_booking_financial" || section.locked;
