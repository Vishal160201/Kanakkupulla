"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { FormField, FormLayout } from "@/types/settings";

export interface UsageModalData {
  formKey: string;
  fieldId: string;
  oldValue: string;
  availableOptions: string[];
  inUseCount: number;
}

interface UseOptionMigrationArgs {
  activeLayout: FormLayout | undefined;
  selectedField: FormField | null;
  updateSelectedField: (updates: Partial<FormField>) => void;
}

/**
 * Safe deletion of pick-list options: checks whether a value is in use and,
 * if so, lets the user migrate existing records to a replacement first.
 */
export function useOptionMigration({ activeLayout, selectedField, updateSelectedField }: UseOptionMigrationArgs) {
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [usageModalData, setUsageModalData] = useState<UsageModalData | null>(null);
  const [migrationValue, setMigrationValue] = useState("");
  const [migrating, setMigrating] = useState(false);

  const handleRemoveOption = async (idx: number) => {
    if (!activeLayout || !selectedField || !selectedField.options) return;
    const options = selectedField.options;
    const oldValue = options[idx];

    setCheckingUsage(true);
    try {
      const res = await fetch("/api/settings/layouts/check-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formKey: activeLayout.formKey, fieldId: selectedField.id, value: oldValue }),
      });
      const data: { inUse?: boolean; count: number } = await res.json();
      if (data.inUse) {
        setUsageModalData({
          formKey: activeLayout.formKey,
          fieldId: selectedField.id,
          oldValue,
          inUseCount: data.count,
          availableOptions: options.filter((o) => o !== oldValue),
        });
      } else {
        const newOpts = options.filter((_, i) => i !== idx);
        updateSelectedField({ options: newOpts });
      }
    } catch {
      toast.error("Failed to check usage");
    } finally {
      setCheckingUsage(false);
    }
  };

  const handleMigrateOption = async () => {
    if (!usageModalData || !migrationValue) return;
    setMigrating(true);
    try {
      const res = await fetch("/api/settings/layouts/migrate-value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...usageModalData, newValue: migrationValue }),
      });
      if (res.ok) {
        toast.success("Successfully migrated existing records!");
        const newOpts = (selectedField?.options || []).filter((o) => o !== usageModalData.oldValue);
        updateSelectedField({ options: newOpts });
        setUsageModalData(null);
        setMigrationValue("");
      } else {
        throw new Error("Failed to migrate");
      }
    } catch {
      toast.error("Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return {
    checkingUsage,
    usageModalData,
    closeUsageModal: () => setUsageModalData(null),
    migrationValue,
    setMigrationValue,
    migrating,
    handleRemoveOption,
    handleMigrateOption,
  };
}

export type OptionMigration = ReturnType<typeof useOptionMigration>;
