"use client";

import { mutate as globalMutate } from "swr";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { DEFAULT_LAYOUTS } from "@/lib/defaultLayouts";
import type { FormField, FormLayout, FormSection, UserOption } from "@/types/settings";
import { createField, timestampId } from "./constants";

export function useLayoutBuilder() {
  const [layouts, setLayouts] = useState<FormLayout[]>([]);
  const [activeFormKey, setActiveFormKey] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    const fetchLayouts = async () => {
      try {
        const res = await fetch("/api/settings/layouts");
        if (!res.ok) throw new Error("Failed to fetch layouts");
        const data: FormLayout[] = await res.json();

        const merged: FormLayout[] = [...(DEFAULT_LAYOUTS as unknown as FormLayout[])];
        data.forEach((dbLayout) => {
          const idx = merged.findIndex((m) => m.formKey === dbLayout.formKey);
          if (idx >= 0) merged[idx] = dbLayout;
          else merged.push(dbLayout);
        });

        setLayouts(merged);
      } catch {
        toast.error("Failed to load form layouts");
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data: UserOption[] = await res.json();
          setAllUsers(data);
        }
      } catch {
        // Users are only needed for the user pick-list config; ignore failures.
      }
    };

    fetchLayouts();
    fetchUsers();
  }, []);

  const activeLayout = layouts.find((l) => l.formKey === activeFormKey);

  // Derive the currently selected field object and its parent section
  let selectedField: FormField | null = null;
  let selectedSectionId: string | null = null;

  if (activeLayout && selectedFieldId) {
    for (const section of activeLayout.schema.sections) {
      const field = section.fields.find((f) => f.id === selectedFieldId);
      if (field) {
        selectedField = field;
        selectedSectionId = section.id;
        break;
      }
    }
  }

  const handleSave = async () => {
    if (!activeLayout) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeLayout),
      });
      if (!res.ok) throw new Error("Failed to save layout");
      toast.success(`${activeLayout.name} saved successfully!`);
      globalMutate(`/api/settings/layouts/${activeLayout.formKey}`);
      globalMutate(`/api/settings/layouts`);
    } catch {
      toast.error("Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const updateActiveLayout = (updated: FormLayout) => {
    setLayouts((prev) => prev.map((l) => (l.formKey === updated.formKey ? updated : l)));
  };

  /** Replace the sections of the layout with this `formKey` (unique per layout; `id` is unset for unsaved defaults). */
  const replaceSections = (formKey: string, sections: FormSection[]) => {
    setLayouts((prev) => prev.map((pl) => (pl.formKey === formKey ? { ...pl, schema: { ...pl.schema, sections } } : pl)));
  };

  const updateSections = (sections: FormSection[]) => {
    if (!activeLayout) return;
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
  };

  const addSection = () => {
    if (!activeLayout) return;
    const newSection: FormSection = {
      id: timestampId("sec"),
      title: `Untitled Section ${activeLayout.schema.sections.length + 1}`,
      description: "Section description goes here.",
      icon: "ph-squares-four",
      fields: [],
    };
    updateSections([...(activeLayout.schema.sections || []), newSection]);
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    if (!activeLayout) return;
    updateSections(activeLayout.schema.sections.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s)));
  };

  const updateSectionIcon = (sectionId: string, newIcon: string) => {
    const l = activeLayout;
    if (!l) return;
    const sIdx = l.schema.sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const newS = [...l.schema.sections];
    newS[sIdx] = { ...newS[sIdx], icon: newIcon };
    replaceSections(l.formKey, newS);
  };

  const updateSectionDescription = (sectionId: string, newDesc: string) => {
    if (!activeLayout) return;
    updateSections(activeLayout.schema.sections.map((s) => (s.id === sectionId ? { ...s, description: newDesc } : s)));
  };

  const removeSection = (sectionId: string) => {
    if (!activeLayout) return;
    updateSections(activeLayout.schema.sections.filter((s) => s.id !== sectionId));
    if (selectedSectionId === sectionId) {
      setSelectedFieldId(null);
    }
  };

  const addFieldToSection = (sectionId: string, fieldType: string = "SINGLE_LINE") => {
    if (!activeLayout) return;
    const newField = createField(fieldType);
    updateSections(
      activeLayout.schema.sections.map((s) => (s.id === sectionId ? { ...s, fields: [...(s.fields || []), newField] } : s))
    );
    setSelectedFieldId(newField.id);
  };

  const updateSelectedField = (updates: Partial<FormField>) => {
    if (!activeLayout || !selectedFieldId || !selectedSectionId) return;
    updateSections(
      activeLayout.schema.sections.map((s) => {
        if (s.id !== selectedSectionId) return s;
        const fields = s.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f));
        return { ...s, fields };
      })
    );
  };

  const removeField = (sectionId: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeLayout) return;
    updateSections(
      activeLayout.schema.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
      })
    );
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleCreateForm = () => {
    if (!newFormName) return;
    const key = timestampId(newFormName.toUpperCase().replace(/[^A-Z0-9]/g, "_"));
    const newForm: FormLayout = {
      formKey: key,
      name: newFormName,
      description: newFormDescription,
      schema: { sections: [] },
    };
    setLayouts([...layouts, newForm]);
    setActiveFormKey(key);
    setShowNewFormModal(false);
    setNewFormName("");
    setNewFormDescription("");
  };

  const closeEditor = () => {
    setActiveFormKey(null);
    setSelectedFieldId(null);
  };

  return {
    layouts,
    loading,
    saving,
    allUsers,
    activeLayout,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    setActiveFormKey,
    closeEditor,
    newForm: {
      show: showNewFormModal,
      setShow: setShowNewFormModal,
      name: newFormName,
      setName: setNewFormName,
      description: newFormDescription,
      setDescription: setNewFormDescription,
      create: handleCreateForm,
    },
    handleSave,
    updateActiveLayout,
    replaceSections,
    addSection,
    updateSectionTitle,
    updateSectionIcon,
    updateSectionDescription,
    removeSection,
    addFieldToSection,
    updateSelectedField,
    removeField,
  };
}

export type LayoutBuilder = ReturnType<typeof useLayoutBuilder>;
