"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface FormField {
  id: string;
  name: string;
  type: string;
  mandatory: boolean;
  options?: string[];
  statusOptions?: { label: string; color: string }[];
  placeholder?: string;
  defaultValue?: string;
  userPicklistConfig?: {
    mode: 'ALL' | 'ROLES' | 'USERS';
    roles?: string[];
    userIds?: string[];
  };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: FormField[];
}

interface FormSchema {
  sections: FormSection[];
}

interface FormLayout {
  id?: string;
  formKey: string;
  name: string;
  description: string;
  schema: FormSchema;
}

const FIELD_TYPES = [
  { value: "SINGLE_LINE", label: "Single-Line", icon: "ph-text-t" },
  { value: "MULTI_LINE", label: "Multi-Line", icon: "ph-text-align-left" },
  { value: "PICK_LIST", label: "Pick List", icon: "ph-list-dashes" },
  { value: "STATUS_PICKER", label: "Status Picker", icon: "ph-palette" },
  { value: "MULTI_SELECT", label: "Multi Select", icon: "ph-list-checks" },
  { value: "DATE", label: "Date", icon: "ph-calendar-blank" },
  { value: "CHECKBOX", label: "Checkbox", icon: "ph-check-square" },
  { value: "CURRENCY", label: "Currency", icon: "ph-currency-dollar" },
  { value: "PERCENTAGE", label: "% Percentage", icon: "ph-percent" },
  { value: "NUMBER", label: "Number", icon: "ph-hash" },
  { value: "DECIMAL", label: ".00 Decimal", icon: "ph-math-operations" },
  { value: "EMAIL", label: "Email", icon: "ph-envelope-simple" },
  { value: "PHONE", label: "Phone", icon: "ph-phone" },
  { value: "USER_PICKLIST", label: "User (Single)", icon: "ph-user" },
  { value: "MULTI_USER_PICKLIST", label: "Users (Multiple)", icon: "ph-users" },
];

const DEFAULT_LAYOUTS: FormLayout[] = [
  {
    formKey: "BOOKING_FORM",
    name: "Booking Form",
    description: "Fields used when creating a new client booking.",
    schema: { 
      sections: [
        {
          id: "sec_booking_basic",
          title: "Client Info",
          description: "Contact details for communication and contract signing.",
          icon: "ph-user-circle",
          fields: [
            { id: "fld_b_client", name: "Client Full Name", type: "SINGLE_LINE", mandatory: true },
            { id: "fld_b_phone", name: "Phone Number", type: "PHONE", mandatory: true },
            { id: "fld_b_email", name: "Email Address", type: "EMAIL", mandatory: false },
          ]
        },
        {
          id: "sec_booking_event",
          title: "Event Details",
          description: "Logistics for the shoot session and categorization.",
          icon: "ph-calendar-blank",
          fields: [
            { id: "fld_b_date", name: "Shoot Date", type: "DATE", mandatory: true },
            { id: "fld_b_time", name: "Start Time", type: "SINGLE_LINE", mandatory: true },
            { id: "fld_b_category", name: "Shoot Category", type: "PICK_LIST", mandatory: true, options: ["Wedding", "Fashion", "Baby & Kids", "Corporate", "Maternity", "Pre-Wedding", "Other"] },
            { id: "fld_b_location", name: "Location", type: "SINGLE_LINE", mandatory: true },
            { id: "fld_b_photographers", name: "Photographers", type: "MULTI_USER_PICKLIST", mandatory: false },
            { id: "fld_b_status", name: "Status", type: "STATUS_PICKER", mandatory: false, statusOptions: [
              { label: "Pending", color: "bg-red-500" },
              { label: "Confirmed", color: "bg-emerald-500" },
              { label: "Completed", color: "bg-blue-500" },
              { label: "Cancelled", color: "bg-slate-500" }
            ] },
          ]
        },
        {
          id: "sec_booking_financial",
          title: "Financials",
          description: "Package value, advance paid, and calculated remainder.",
          icon: "ph-currency-inr",
          fields: [
            { id: "fld_b_package", name: "Total Package Price (₹)", type: "CURRENCY", mandatory: true },
            { id: "fld_b_advance", name: "Advance Paid (₹)", type: "CURRENCY", mandatory: false },
          ]
        }
      ] 
    }
  },
  {
    formKey: "CLIENT_FORM",
    name: "Client Profile",
    description: "Fields collected for a client's profile.",
    schema: { 
      sections: [
        {
          id: "sec_client_contact",
          title: "Contact Information",
          fields: [
            { id: "fld_c_name", name: "Client Full Name", type: "SINGLE_LINE", mandatory: true },
            { id: "fld_c_phone", name: "Phone Number", type: "PHONE", mandatory: true },
            { id: "fld_c_email", name: "Email Address", type: "EMAIL", mandatory: false },
          ]
        }
      ] 
    }
  },
  {
    formKey: "TRANSACTION_FORM",
    name: "Transaction Form",
    description: "Fields used when recording a new income or expense.",
    schema: { 
      sections: [
        {
          id: "sec_tx_details",
          title: "Transaction Details",
          fields: [
            { id: "fld_tx_amount", name: "Amount", type: "CURRENCY", mandatory: true },
            { id: "fld_tx_type", name: "Transaction Type", type: "PICK_LIST", mandatory: true, options: ["INCOME", "EXPENSE"] },
            { id: "fld_tx_date", name: "Date", type: "DATE", mandatory: true },
            { id: "fld_tx_category", name: "Category", type: "PICK_LIST", mandatory: true, options: ["Booking Advance", "Full Payment", "Equipment Rent", "Salary", "Travel", "Other"] },
            { id: "fld_tx_mode", name: "Payment Mode", type: "PICK_LIST", mandatory: true, options: ["Cash", "Bank Transfer", "UPI", "Cheque"] },
            { id: "fld_tx_desc", name: "Description", type: "MULTI_LINE", mandatory: false },
          ]
        }
      ] 
    }
  }
];

export default function LayoutsFieldsBuilder() {
  const [layouts, setLayouts] = useState<FormLayout[]>([]);
  const [activeFormKey, setActiveFormKey] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Safe Deletion states
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [usageModalData, setUsageModalData] = useState<{ formKey: string, fieldId: string, oldValue: string, availableOptions: string[], inUseCount: number } | null>(null);
  const [migrationValue, setMigrationValue] = useState("");
  const [migrating, setMigrating] = useState(false);

  // Drag and drop state
  const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);
  
  // Field Drag and drop state
  const [draggedNewFieldType, setDraggedNewFieldType] = useState<string | null>(null);
  const [draggedFieldContext, setDraggedFieldContext] = useState<{ sectionId: string, fieldIndex: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ sectionId: string, fieldIndex: number } | null>(null);

  const fetchLayouts = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/layouts");
      if (!res.ok) throw new Error("Failed to fetch layouts");
      const data: FormLayout[] = await res.json();
      
      const merged = [...DEFAULT_LAYOUTS];
      data.forEach(dbLayout => {
        const idx = merged.findIndex(m => m.formKey === dbLayout.formKey);
        if (idx >= 0) merged[idx] = dbLayout;
        else merged.push(dbLayout);
      });
      
      setLayouts(merged);
    } catch (error) {
      toast.error("Failed to load form layouts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  }, []);

  useEffect(() => {
    fetchLayouts();
    fetchUsers();
  }, [fetchLayouts, fetchUsers]);

  const activeLayout = layouts.find(l => l.formKey === activeFormKey);

  // Derive the currently selected field object and its parent section
  let selectedField: FormField | null = null;
  let selectedSectionId: string | null = null;
  
  if (activeLayout && selectedFieldId) {
    for (const section of activeLayout.schema.sections) {
      const field = section.fields.find(f => f.id === selectedFieldId);
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
      fetchLayouts();
    } catch (error) {
      toast.error("Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const updateActiveLayout = (updated: FormLayout) => {
    setLayouts(prev => prev.map(l => l.formKey === updated.formKey ? updated : l));
  };

  const addSection = () => {
    if (!activeLayout) return;
    const newSection: FormSection = {
      id: `sec_${Date.now()}`,
      title: `Untitled Section ${activeLayout.schema.sections.length + 1}`,
      description: "Section description goes here.",
      icon: "ph-squares-four",
      fields: []
    };
    updateActiveLayout({
      ...activeLayout,
      schema: { ...activeLayout.schema, sections: [...(activeLayout.schema.sections || []), newSection] }
    });
  };

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    if (!activeLayout) return;
    const sections = activeLayout.schema.sections.map(s => 
      s.id === sectionId ? { ...s, title: newTitle } : s
    );
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
  };

  const updateSectionDescription = (sectionId: string, newDesc: string) => {
    if (!activeLayout) return;
    const sections = activeLayout.schema.sections.map(s => 
      s.id === sectionId ? { ...s, description: newDesc } : s
    );
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
  };

  const removeSection = (sectionId: string) => {
    if (!activeLayout) return;
    const sections = activeLayout.schema.sections.filter(s => s.id !== sectionId);
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
    if (selectedSectionId === sectionId) {
      setSelectedFieldId(null);
    }
  };

  const addFieldToSection = (sectionId: string, fieldType: string = "SINGLE_LINE") => {
    if (!activeLayout) return;
    const typeDef = FIELD_TYPES.find(t => t.value === fieldType);
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: typeDef ? typeDef.label : "New Field",
      type: fieldType,
      mandatory: false,
      options: ["Option 1", "Option 2", "Option 3"]
    };
    const sections = activeLayout.schema.sections.map(s => 
      s.id === sectionId ? { ...s, fields: [...(s.fields || []), newField] } : s
    );
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
    setSelectedFieldId(newField.id);
  };

  const updateSelectedField = (updates: Partial<FormField>) => {
    if (!activeLayout || !selectedFieldId || !selectedSectionId) return;
    const sections = activeLayout.schema.sections.map(s => {
      if (s.id !== selectedSectionId) return s;
      const fields = s.fields.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f);
      return { ...s, fields };
    });
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    if (!activeLayout) return;

    if (draggedNewFieldType) {
      // Create new field and insert at targetIndex
      const typeDef = FIELD_TYPES.find(t => t.value === draggedNewFieldType);
      const newField: FormField = {
        id: `field_${Date.now()}`,
        name: typeDef ? typeDef.label : "New Field",
        type: draggedNewFieldType,
        mandatory: false,
        options: ["Option 1", "Option 2", "Option 3"]
      };

      const sections = activeLayout.schema.sections.map(s => {
        if (s.id === targetSectionId) {
          const newFields = [...(s.fields || [])];
          newFields.splice(targetIndex, 0, newField);
          return { ...s, fields: newFields };
        }
        return s;
      });
      updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
      setSelectedFieldId(newField.id);
    } else if (draggedFieldContext) {
      // Reorder existing field
      const { sectionId: sourceSectionId, fieldIndex: sourceIndex } = draggedFieldContext;
      
      let movedField: FormField | null = null;
      
      // Extract the field
      let tempSections = activeLayout.schema.sections.map(s => {
        if (s.id === sourceSectionId) {
          const fields = [...s.fields];
          movedField = fields.splice(sourceIndex, 1)[0];
          return { ...s, fields };
        }
        return s;
      });

      if (!movedField) return;

      // Calculate adjusted target index if moving down in the same section
      let adjustedTargetIndex = targetIndex;
      if (sourceSectionId === targetSectionId && sourceIndex < targetIndex) {
        adjustedTargetIndex--;
      }

      // Insert the field
      const finalSections = tempSections.map(s => {
        if (s.id === targetSectionId) {
          const fields = [...s.fields];
          fields.splice(adjustedTargetIndex, 0, movedField!);
          return { ...s, fields };
        }
        return s;
      });

      updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections: finalSections } });
    }

    setDraggedNewFieldType(null);
    setDraggedFieldContext(null);
    setDragOverTarget(null);
  };

  const removeField = (sectionId: string, fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeLayout) return;
    const sections = activeLayout.schema.sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, fields: s.fields.filter(f => f.id !== fieldId) };
    });
    updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleCreateForm = () => {
    if (!newFormName) return;
    const key = newFormName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + "_" + Date.now();
    const newForm: FormLayout = {
      formKey: key,
      name: newFormName,
      description: newFormDescription,
      schema: { sections: [] }
    };
    setLayouts([...layouts, newForm]);
    setActiveFormKey(key);
    setShowNewFormModal(false);
    setNewFormName("");
    setNewFormDescription("");
  };

  const handleRemoveOption = async (idx: number) => {
    if (!activeLayout || !selectedField || !selectedField.options) return;
    const oldValue = selectedField.options[idx];
    
    setCheckingUsage(true);
    try {
      const res = await fetch('/api/settings/layouts/check-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formKey: activeLayout.formKey, fieldId: selectedField.id, value: oldValue })
      });
      const data = await res.json();
      if (data.inUse) {
        setUsageModalData({
          formKey: activeLayout.formKey,
          fieldId: selectedField.id,
          oldValue,
          inUseCount: data.count,
          availableOptions: selectedField.options.filter(o => o !== oldValue)
        });
      } else {
        const newOpts = selectedField.options.filter((_, i) => i !== idx);
        updateSelectedField({ options: newOpts });
      }
    } catch (error) {
      toast.error("Failed to check usage");
    } finally {
      setCheckingUsage(false);
    }
  };

  const handleMigrateOption = async () => {
    if (!usageModalData || !migrationValue) return;
    setMigrating(true);
    try {
      const res = await fetch('/api/settings/layouts/migrate-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...usageModalData, newValue: migrationValue })
      });
      if (res.ok) {
        toast.success("Successfully migrated existing records!");
        const newOpts = (selectedField?.options || []).filter(o => o !== usageModalData.oldValue);
        updateSelectedField({ options: newOpts });
        setUsageModalData(null);
        setMigrationValue("");
      } else {
        throw new Error("Failed to migrate");
      }
    } catch (e) {
      toast.error("Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex items-center justify-center text-slate-400">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin mr-3"></div>
        Loading Layouts...
      </div>
    );
  }

  // --- View 1: List of Forms ---
  if (!activeLayout) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[750px] flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Form Layouts</h2>
            <p className="text-slate-500 text-sm mt-0.5">Manage and customize your data entry forms.</p>
          </div>
          <button
            onClick={() => setShowNewFormModal(true)}
            className="px-5 py-2.5 bg-orange-500 text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="ph-bold ph-plus"></i> Create Form
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layouts.map(layout => (
              <div 
                key={layout.formKey}
                onClick={() => setActiveFormKey(layout.formKey)}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  <i className="ph-fill ph-layout"></i>
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">{layout.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{layout.description}</p>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>{layout.schema.sections?.length || 0} Sections</span>
                  <span className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Edit Layout <i className="ph-bold ph-arrow-right"></i>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showNewFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewFormModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[450px] mx-4 overflow-hidden animate-fade-in p-7">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Form</h3>
              <p className="text-sm text-slate-500 mb-6">Define a new dynamic form to collect custom information.</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Form Name</label>
                  <input
                    type="text"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    placeholder="e.g. Employee Feedback"
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-400 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea
                    value={newFormDescription}
                    onChange={(e) => setNewFormDescription(e.target.value)}
                    placeholder="What is this form used for?"
                    rows={2}
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewFormModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleCreateForm} disabled={!newFormName} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Create Form</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- View 2: Form Editor (3-Column Layout) ---
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[850px] flex flex-col font-sans">
      
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setActiveFormKey(null);
              setSelectedFieldId(null);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <i className="ph-bold ph-arrow-left text-lg"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 text-[0.65rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Layout Editor</span>
            </div>
            <h2 className="font-extrabold text-slate-900 text-lg leading-tight">{activeLayout.name}</h2>
          </div>
        </div>
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="ph-bold ph-check"></i>}
            Save Layout
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        
        {/* Left Column: Palette */}
        <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="flex border-b border-gray-100 px-4 py-3">
            <span className="text-[0.75rem] font-extrabold text-slate-500 uppercase tracking-wider">New Fields</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((type) => (
                <button
                  key={type.value}
                  draggable
                  onDragStart={(e) => {
                    setDraggedNewFieldType(type.value);
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", `new_${type.value}`);
                  }}
                  onDragEnd={() => setDraggedNewFieldType(null)}
                  onClick={() => {
                    if (activeLayout.schema.sections.length === 0) {
                      toast.error("Please add a section first!");
                      return;
                    }
                    addFieldToSection(activeLayout.schema.sections[0].id, type.value);
                  }}
                  className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm hover:text-orange-600 transition-all text-left group bg-white cursor-grab active:cursor-grabbing"
                >
                  <i className={`ph ${type.icon} text-lg text-slate-400 group-hover:text-orange-500`}></i>
                  <span className="text-[0.75rem] font-semibold text-slate-700 group-hover:text-orange-700 truncate">{type.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-8 px-2">
              <button
                onClick={addSection}
                className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm font-bold text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 bg-slate-50"
              >
                <i className="ph-bold ph-plus"></i> Add Section
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Canvas (WYSIWYG Form Representation) */}
        <div className="flex-1 overflow-y-auto p-10 relative bg-white" onClick={() => setSelectedFieldId(null)}>
          <div className="max-w-[850px] mx-auto flex flex-col gap-8 pb-20">
            {activeLayout.schema.sections.length === 0 ? (
               <div className="border-2 border-dashed border-gray-200 bg-slate-50/50 rounded-2xl p-16 text-center shadow-sm">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                   <i className="ph ph-layout text-3xl text-slate-400"></i>
                 </div>
                 <h3 className="font-extrabold text-slate-900 text-lg mb-2">No Sections Yet</h3>
                 <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Start building your form by adding a section. Sections help group related fields together logically.</p>
                 <button onClick={(e) => { e.stopPropagation(); addSection(); }} className="px-5 py-2.5 bg-orange-100 text-orange-700 font-bold text-sm rounded-xl hover:bg-orange-200 transition-colors">
                   Add First Section
                 </button>
               </div>
            ) : (
              activeLayout.schema.sections.map((section) => (
                <div 
                  key={section.id} 
                  className={`group/section relative bg-slate-50 border rounded-2xl p-8 transition-colors ${
                    dragOverTarget?.sectionId === section.id && dragOverTarget?.fieldIndex === section.fields.length
                      ? 'border-orange-400 shadow-[0_0_0_2px_rgba(249,115,22,0.2)]'
                      : 'border-gray-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = draggedNewFieldType ? "copy" : "move";
                    setDragOverTarget({ sectionId: section.id, fieldIndex: section.fields.length });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(e, section.id, section.fields.length);
                  }}
                >
                  {/* Section Header */}
                  <div className="flex items-start gap-4 mb-8">
                    <div className="text-orange-500 mt-1">
                      <i className={`ph-fill ${section.icon || 'ph-squares-four'} text-2xl`}></i>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        className={`font-extrabold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 text-xl placeholder:text-slate-300 w-full mb-1 ${section.id === 'sec_booking_financial' ? 'pointer-events-none' : ''}`}
                        placeholder="Section Title"
                        readOnly={section.id === 'sec_booking_financial'}
                      />
                      <input
                        type="text"
                        value={section.description || ""}
                        onChange={(e) => updateSectionDescription(section.id, e.target.value)}
                        className={`text-[0.95rem] text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-full placeholder:text-slate-300 ${section.id === 'sec_booking_financial' ? 'pointer-events-none' : ''}`}
                        placeholder="Section Description..."
                        readOnly={section.id === 'sec_booking_financial'}
                      />
                    </div>
                    {section.id !== 'sec_booking_financial' && (
                      <button
                        onClick={() => removeSection(section.id)}
                        className="opacity-0 group-hover/section:opacity-100 text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                        title="Delete Section"
                      >
                        <i className="ph-bold ph-trash text-lg"></i>
                      </button>
                    )}
                  </div>

                  {/* Section Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                    {section.fields.map((field, idx) => {
                      const isSelected = selectedFieldId === field.id;
                      const typeDef = FIELD_TYPES.find(t => t.value === field.type);
                      const isDragOver = dragOverTarget?.sectionId === section.id && dragOverTarget?.fieldIndex === idx;
                      
                      return (
                        <div key={field.id} className="relative">
                          {isDragOver && section.id !== 'sec_booking_financial' && (
                            <div className="absolute -left-3 -top-3 bottom-0 w-1.5 bg-orange-500 rounded-full z-20 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"></div>
                          )}
                          <div 
                            draggable={section.id !== 'sec_booking_financial'}
                            onDragStart={(e) => {
                              if (section.id === 'sec_booking_financial') return;
                              setDraggedFieldContext({ sectionId: section.id, fieldIndex: idx });
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", `field_${field.id}`);
                            }}
                            onDragEnd={() => {
                              if (section.id === 'sec_booking_financial') return;
                              setDraggedFieldContext(null);
                              setDragOverTarget(null);
                            }}
                            onDragOver={(e) => {
                              if (section.id === 'sec_booking_financial') return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = draggedNewFieldType ? "copy" : "move";
                              setDragOverTarget({ sectionId: section.id, fieldIndex: idx });
                            }}
                            onDrop={(e) => {
                              if (section.id === 'sec_booking_financial') return;
                              e.stopPropagation();
                              handleDrop(e, section.id, idx);
                            }}
                            onClick={(e) => { 
                              if (section.id === 'sec_booking_financial') return;
                              e.stopPropagation(); 
                              setSelectedFieldId(field.id); 
                            }}
                            className={`relative transition-all group/field rounded-2xl p-3 -m-3 ${
                              section.id === 'sec_booking_financial' ? '' : 'cursor-grab active:cursor-grabbing'
                            } ${
                              isSelected 
                                ? 'bg-orange-50/50 outline outline-2 outline-orange-500 z-10' 
                                : section.id === 'sec_booking_financial' ? '' : 'hover:bg-slate-100/50 hover:outline hover:outline-1 hover:outline-gray-200'
                            }`}
                          >
                            {/* Realistic Label */}
                            {field.type !== 'CHECKBOX' && (
                              <label className="text-[0.7rem] font-bold text-slate-600 uppercase tracking-wider mb-2 block truncate cursor-grab active:cursor-grabbing">
                                {field.name || 'Untitled Field'} {field.mandatory && <span className="text-red-500">*</span>}
                              </label>
                            )}
                            
                            {/* Realistic Input Field */}
                            {field.type === 'CHECKBOX' ? (
                              <div className="w-full h-[52px] bg-white border border-gray-200 rounded-xl flex items-center px-4 shadow-sm pointer-events-none gap-3">
                                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex shrink-0"></div>
                                <span className="text-[0.95rem] text-slate-600 font-semibold truncate">{field.name || 'Untitled Field'}</span>
                              </div>
                            ) : (
                              <div className="w-full h-[52px] bg-white border border-gray-200 rounded-xl flex items-center justify-between px-4 shadow-sm pointer-events-none">
                                <span className="text-[0.95rem] text-slate-400 truncate">
                                  {field.placeholder || (field.type === 'PICK_LIST' || field.type === 'DATE' ? `Select ${field.name.toLowerCase()}...` : `e.g. Enter ${field.name.toLowerCase()}...`)}
                                </span>
                                <i className={`ph ${typeDef?.icon || 'ph-text-t'} text-slate-400 text-lg`}></i>
                              </div>
                            )}

                            {/* Floating Action Menu (Delete) */}
                            {section.id !== 'sec_booking_financial' && (
                              <div className={`absolute -right-2 -top-2 bg-white border border-gray-200 rounded-full shadow-sm flex items-center transition-opacity z-20 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/field:opacity-100'}`}>
                                <button 
                                  onClick={(e) => removeField(section.id, field.id, e)}
                                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-50"
                                  title="Delete Field"
                                >
                                  <i className="ph-bold ph-trash"></i>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    
                  {/* Inline Add Field Area (Drop Zone) */}
                  {section.id !== 'sec_booking_financial' && (
                    <button
                      onClick={() => addFieldToSection(section.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTarget({ sectionId: section.id, fieldIndex: section.fields.length });
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDrop(e, section.id, section.fields.length);
                      }}
                      className={`mt-8 w-full py-3.5 border border-dashed rounded-xl text-[0.85rem] font-bold transition-colors flex items-center justify-center gap-2 ${
                        dragOverTarget?.sectionId === section.id && dragOverTarget?.fieldIndex === section.fields.length
                          ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm outline outline-2 outline-orange-200'
                          : 'border-gray-300 text-slate-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <i className="ph-bold ph-plus"></i> Add Field Here
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Properties Panel */}
        <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col shrink-0">
          {selectedField ? (
            <>
              <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-600 shadow-sm">
                  <i className={`ph ${FIELD_TYPES.find(t => t.value === selectedField?.type)?.icon || 'ph-text-t'} text-xl`}></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-[0.95rem]">Field Properties</h3>
                  <p className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wider">{FIELD_TYPES.find(t => t.value === selectedField?.type)?.label || 'Field'}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Field Label */}
                <div>
                  <label className="text-[0.75rem] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedField.name}
                    onChange={(e) => updateSelectedField({ name: e.target.value })}
                    className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>

                {/* Mandatory Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${selectedField.mandatory ? 'bg-orange-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${selectedField.mandatory ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mandatory Field</span>
                  </label>
                </div>

                {/* Options for PICK_LIST or MULTI_SELECT */}
                {(selectedField.type === "PICK_LIST" || selectedField.type === "MULTI_SELECT") && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1">
                        Pick List Values <span className="text-red-500">*</span>
                      </label>
                    </div>
                    
                    <div className="bg-slate-50 border border-gray-200 rounded-xl p-2 space-y-2">
                      {(selectedField.options || []).map((opt, idx) => (
                        <div 
                          key={idx} 
                          draggable
                          onDragStart={(e) => {
                            setDraggedOptionIdx(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedOptionIdx === null || draggedOptionIdx === idx) return;
                            const newOpts = [...(selectedField?.options || [])];
                            const [moved] = newOpts.splice(draggedOptionIdx, 1);
                            newOpts.splice(idx, 0, moved);
                            updateSelectedField({ options: newOpts });
                            setDraggedOptionIdx(null);
                          }}
                          onDragEnd={() => setDraggedOptionIdx(null)}
                          className={`flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm group/opt ${draggedOptionIdx === idx ? 'opacity-50' : 'cursor-grab active:cursor-grabbing'}`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center text-slate-300">
                            <i className="ph-bold ph-dots-six-vertical"></i>
                          </div>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(selectedField?.options || [])];
                              newOpts[idx] = e.target.value;
                              updateSelectedField({ options: newOpts });
                            }}
                            className="flex-1 text-[0.85rem] font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0"
                          />
                          <button
                            onClick={() => handleRemoveOption(idx)}
                            disabled={checkingUsage}
                            className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <i className="ph-fill ph-x-circle"></i>
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          const newOpts = [...(selectedField?.options || []), "New Option"];
                          updateSelectedField({ options: newOpts });
                        }}
                        className="w-full mt-2 py-2.5 bg-white border border-dashed border-gray-300 rounded-lg text-[0.8rem] font-bold text-slate-500 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center gap-2 px-3"
                      >
                        <i className="ph-bold ph-plus"></i> Add Value
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedField.type === "STATUS_PICKER" && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1">
                        Status Options <span className="text-red-500">*</span>
                      </label>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {(selectedField.statusOptions || []).map((opt, idx) => (
                        <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2">
                            <i className="ph-bold ph-dots-six-vertical text-slate-400 cursor-grab"></i>
                            <input 
                              type="text" 
                              value={opt.label} 
                              onChange={(e) => {
                                const newOpts = [...(selectedField.statusOptions || [])];
                                newOpts[idx].label = e.target.value;
                                updateSelectedField({ statusOptions: newOpts });
                              }}
                              className="flex-1 bg-white px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-orange-300 text-[0.85rem] font-medium text-slate-800"
                              placeholder={`Status ${idx + 1}`}
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                const newOpts = (selectedField.statusOptions || []).filter((_, i) => i !== idx);
                                updateSelectedField({ statusOptions: newOpts });
                              }}
                              className="w-7 h-7 rounded-md bg-white hover:bg-red-100 border border-gray-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                            >
                              <i className="ph-bold ph-trash text-[0.85rem]"></i>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                            {['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-slate-500', 'bg-rose-500'].map(colorClass => (
                               <button
                                 key={colorClass}
                                 onClick={() => {
                                   const newOpts = [...(selectedField.statusOptions || [])];
                                   newOpts[idx].color = colorClass;
                                   updateSelectedField({ statusOptions: newOpts });
                                 }}
                                 className={`w-6 h-6 rounded-full border-2 ${opt.color === colorClass ? 'border-slate-800 scale-110' : 'border-transparent'} ${colorClass} hover:scale-110 transition-transform`}
                               />
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      <button 
                        type="button" 
                        onClick={() => {
                          const newOpts = [...(selectedField.statusOptions || []), { label: "New Status", color: "bg-slate-500" }];
                          updateSelectedField({ statusOptions: newOpts });
                        }}
                        className="flex items-center justify-center gap-2 w-full p-2.5 mt-1 border border-dashed border-slate-300 rounded-xl text-[0.8rem] font-bold text-slate-500 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        <i className="ph-bold ph-plus"></i> Add Status
                      </button>
                    </div>
                  </div>
                )}

                {/* Options for USER_PICKLIST or MULTI_USER_PICKLIST */}
                {(selectedField.type === "USER_PICKLIST" || selectedField.type === "MULTI_USER_PICKLIST") && (
                  <div className="pt-4 border-t border-gray-100">
                    <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1 mb-3">
                      User Pick List Values
                    </label>
                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={!selectedField.userPicklistConfig || selectedField.userPicklistConfig.mode === 'ALL'} onChange={() => updateSelectedField({ userPicklistConfig: { mode: 'ALL', roles: [], userIds: [] }})} />
                        <span className="text-sm font-semibold text-slate-700">All Users</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={selectedField.userPicklistConfig?.mode === 'ROLES'} onChange={() => updateSelectedField({ userPicklistConfig: { mode: 'ROLES', roles: selectedField?.userPicklistConfig?.roles || [], userIds: [] }})} />
                        <span className="text-sm font-semibold text-slate-700">Select Roles</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="upConfigMode" className="accent-orange-500 w-4 h-4" checked={selectedField.userPicklistConfig?.mode === 'USERS'} onChange={() => updateSelectedField({ userPicklistConfig: { mode: 'USERS', roles: [], userIds: selectedField?.userPicklistConfig?.userIds || [] }})} />
                        <span className="text-sm font-semibold text-slate-700">Select Users</span>
                      </label>
                    </div>

                    {(!selectedField.userPicklistConfig || selectedField.userPicklistConfig.mode === 'ALL') && (
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 text-sm font-semibold text-slate-500 text-center">
                        The pick-list will include all project users.
                      </div>
                    )}

                    {selectedField.userPicklistConfig?.mode === 'ROLES' && (
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                        {['ADMIN', 'STAFF', 'PHOTOGRAPHER'].map(role => (
                          <label key={role} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="accent-orange-500 w-4 h-4 rounded" 
                              checked={selectedField.userPicklistConfig?.roles?.includes(role) || false}
                              onChange={(e) => {
                                const currentRoles = selectedField?.userPicklistConfig?.roles || [];
                                const newRoles = e.target.checked ? [...currentRoles, role] : currentRoles.filter(r => r !== role);
                                updateSelectedField({ userPicklistConfig: { ...selectedField.userPicklistConfig!, roles: newRoles } });
                              }}
                            />
                            <span className="text-sm font-semibold text-slate-700">{role}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {selectedField.userPicklistConfig?.mode === 'USERS' && (
                      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 max-h-[200px] overflow-y-auto flex flex-col gap-3">
                        {allUsers.length === 0 && <span className="text-sm text-slate-400">Loading users...</span>}
                        {allUsers.map(user => (
                          <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="accent-orange-500 w-4 h-4 rounded" 
                              checked={selectedField.userPicklistConfig?.userIds?.includes(user.id) || false}
                              onChange={(e) => {
                                const currentUserIds = selectedField?.userPicklistConfig?.userIds || [];
                                const newUserIds = e.target.checked ? [...currentUserIds, user.id] : currentUserIds.filter(id => id !== user.id);
                                updateSelectedField({ userPicklistConfig: { ...selectedField.userPicklistConfig!, userIds: newUserIds } });
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                              <span className="text-[0.6rem] font-bold text-slate-400 uppercase">{user.role}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <i className="ph ph-cursor-click text-2xl"></i>
              </div>
              <h3 className="font-bold text-slate-700 mb-1">No Field Selected</h3>
              <p className="text-[0.8rem] leading-relaxed">Click on a field in the canvas to view and edit its properties.</p>
            </div>
          )}
        </div>
      </div>

      {/* Migration Modal */}
      {usageModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !migrating && setUsageModalData(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[450px] mx-4 overflow-hidden animate-fade-in p-7">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-100">
              <i className="ph-fill ph-warning-circle text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Value in Use</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              The value <strong className="text-slate-800">"{usageModalData.oldValue}"</strong> is currently used in <strong className="text-orange-600">{usageModalData.inUseCount} record(s)</strong>. 
              Before you can delete this option, please select a replacement value to migrate the existing records to.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Replacement Value</label>
                <select
                  value={migrationValue}
                  onChange={(e) => setMigrationValue(e.target.value)}
                  className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-orange-400 focus:bg-white transition-colors"
                >
                  <option value="" disabled>Select an option...</option>
                  {usageModalData.availableOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setUsageModalData(null)} 
                disabled={migrating}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleMigrateOption} 
                disabled={!migrationValue || migrating} 
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {migrating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Migrate & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
