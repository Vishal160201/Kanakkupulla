"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import flatpickr from "flatpickr";

import { cn } from "@/lib/utils";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import { Booking } from "@/types";
import CustomSelect from "../ui/CustomSelect";
import Autocomplete from "../ui/Autocomplete";
import UserPicklist from "../ui/UserPicklist";
import MultiUserPicklist, { UserItem } from "../ui/MultiUserPicklist";
import { bookingSchema, BookingFormData } from "@/lib/validations/booking";
import { saveBookingAction } from "@/app/actions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "../ui/DatePickerInput";
import GooglePicker from "@/components/shared/GooglePicker";

import { useRouter, useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BookingFormModal({ booking }: { booking: Booking | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateForNew = searchParams.get('date');
  const isAddModalOpen = true;

  const clientSuggestions: string[] = [];
  const locationSuggestions: string[] = [];

  const { register, handleSubmit, reset, setValue, watch, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '', category: 'Wedding', date: '', time: '10:00 AM', 
      location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
    }
  });

  const timeInputRef = useRef<HTMLInputElement>(null);
  const [timeFpInstance, setTimeFpInstance] = useState<flatpickr.Instance | null>(null);

  const [categoryOptions, setCategoryOptions] = useState<string[]>(['Wedding', 'Fashion', 'Baby & Kids', 'Corporate']);
  const [statusOptions, setStatusOptions] = useState<string[]>(['Confirmed', 'Pending', 'Partial']);
  const [layoutSchema, setLayoutSchema] = useState<any>(null);
  const [teamUsers, setTeamUsers] = useState<UserItem[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [installments, setInstallments] = useState<{amount: string, date: string}[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const standardFieldMap: Record<string, string> = {
    fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
    fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
    fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance'
  };

  const { data: layoutData } = useSWR("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersData } = useSWR("/api/users", fetcher);
  const { data: driveStatus } = useSWR("/api/integrations/google", fetcher);
  
  const selectedDateStr = watch('date');
  const { data: bookingsData } = useSWR(selectedDateStr ? `/api/bookings?startDate=${selectedDateStr}&endDate=${selectedDateStr}` : null, fetcher);

  useEffect(() => {
    if (layoutData?.schema?.sections) {
      setLayoutSchema(layoutData.schema);
      layoutData.schema.sections.forEach((section: any) => {
        section.fields.forEach((field: any) => {
          if (field.id === "fld_b_category" && field.options?.length > 0) {
            setCategoryOptions(field.options);
          }
          if (field.id === "fld_b_status" && field.options?.length > 0) {
            setStatusOptions(field.options);
          }
        });
      });
    }
  }, [layoutData]);

  useEffect(() => {
    if (usersData) {
      const staff = usersData.filter((u: any) => u.role !== 'CLIENT');
      setTeamUsers(staff.map((u: any) => ({
        id: u.id, name: u.name || 'Unknown', image: u.image, role: u.role
      })));
    }
  }, [usersData]);

  useEffect(() => {
    if (bookingsData) setAllBookings(bookingsData?.items || []);
  }, [bookingsData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.custom-dropdown-container')) {
          setStatusDropdownOpen(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  useEffect(() => {
    if (isAddModalOpen) {
      if (booking) {
        const { customData, ...rest } = booking;
        const b = booking as any;
        reset({ 
          ...rest, 
          package: b.order?.package ? b.order.package.toString() : '',
          advance: b.order?.advance ? b.order.advance.toString() : '',
          due: b.order?.due ? b.order.due.toString() : '',
          ...(customData || {}) 
        });
        if (b.order?.installments && Array.isArray(b.order.installments)) {
          setInstallments(b.order.installments);
        }
      } else {
        const defaultDate = selectedDateForNew || new Date().toISOString().split('T')[0];
        const defaultValues: any = {
          title: '', category: 'Wedding', date: defaultDate, time: '10:00 AM', 
          location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
        };
        // Find the STATUS_PICKER field ID and map it to 'status'
        let statusFieldId = 'fld_b_status';
        if (layoutSchema?.sections) {
          const statusF = layoutSchema.sections.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER');
          if (statusF) statusFieldId = statusF.id;
        }

        // Auto-initialize STATUS_PICKER fields to their first option
        if (layoutSchema?.sections) {
          layoutSchema.sections.forEach((sec: any) => {
            sec.fields.forEach((f: any) => {
              if (f.type === 'STATUS_PICKER' && f.statusOptions && f.statusOptions.length > 0) {
                const fname = (f.id === statusFieldId) ? 'status' : (standardFieldMap[f.id] || f.id);
                defaultValues[fname] = f.statusOptions[0].label;
              }
            });
          });
        }
        reset(defaultValues);
        if (timeFpInstance) timeFpInstance.setDate('10:00 AM');
      }
    }
  }, [isAddModalOpen, booking, selectedDateForNew, reset, timeFpInstance]);

  useEffect(() => {
    if (isAddModalOpen) {
      let timeFp: flatpickr.Instance | null = null;
      if (timeInputRef.current) {
        timeFp = flatpickr(timeInputRef.current, {
          enableTime: true,
          noCalendar: true,
          dateFormat: "h:i K",
          defaultDate: watch('time') || '10:00 AM',
          onChange: (selectedDates, dateStr) => setValue('time', dateStr)
        }) as flatpickr.Instance;
        setTimeFpInstance(timeFp);
      }

      return () => {
        if (timeFp) timeFp.destroy();
        setTimeFpInstance(null);
      };
    }
  }, [isAddModalOpen, setValue, watch]);

  const parseCurrency = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;
  const formatCurrencyInput = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    // If installments change, auto-update the advance
    if (installments.length > 0) {
      const sum = installments.reduce((acc, curr) => acc + parseCurrency(curr.amount || '0'), 0);
      setValue('advance', sum > 0 ? sum.toString() : '');
    }

    const total = parseCurrency(watch('package') || '0');
    const advance = parseCurrency(watch('advance') || '0');
    const outstanding = Math.max(0, total - advance);
    if (total > 0 || advance > 0) {
      setValue('due', formatCurrencyInput(outstanding));
    } else {
      setValue('due', '');
    }
  }, [watch('package'), watch('advance'), installments, setValue, watch]);

  // The previous useEffect that registered all mandatory fields was removed to support dynamic visibility.
  // We now register mandatory fields manually inside `renderField` and handle custom component validation inside `onSubmit`.
  
  const formValues = watch();

  const evaluateVisibility = (rule: any) => {
    if (!rule || !rule.fieldId) return true;
    const depFieldName = standardFieldMap[rule.fieldId] || rule.fieldId;
    const depValue = formValues[depFieldName as keyof BookingFormData];
    
    // Support both new rule.values and old rule.value
    const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);
    
    if (rule.operator === 'EQUALS') {
      return ruleValues.includes(depValue as string);
    } else if (rule.operator === 'NOT_EQUALS') {
      return !ruleValues.includes(depValue as string);
    } else if (rule.operator === 'CONTAINS') {
      if (typeof depValue === 'string') {
        return ruleValues.some(v => depValue.includes(v));
      }
      if (Array.isArray(depValue)) {
        return ruleValues.some(v => depValue.includes(v));
      }
      return false;
    }
    return true;
  };

  const onSubmit = async (data: BookingFormData) => {
    let hasManualErrors = false;
    clearErrors();

    // Evaluate visibility and apply manual validation for custom/hidden fields
    if (layoutSchema && layoutSchema.sections) {
      layoutSchema.sections.forEach((section: any) => {
        const secVisible = evaluateVisibility(section.visibilityRule);
        if (!secVisible) return;
        
        section.fields.forEach((field: any) => {
          const fieldVisible = evaluateVisibility(field.visibilityRule);
          if (!fieldVisible) return;
          
          const fieldName = standardFieldMap[field.id] || field.id;
          
          // Manual required check for fields that use setValue (not natively registered with required)
          // or fields that bypassed native validation
          if (field.mandatory && (!data[fieldName as keyof BookingFormData] || (Array.isArray(data[fieldName as keyof BookingFormData]) && data[fieldName as keyof BookingFormData].length === 0))) {
             setError(fieldName as any, { type: 'manual', message: `${field.name} is required` });
             hasManualErrors = true;
          }
        });
      });
    }

    if (hasManualErrors) {
      // Find the first manual error field to scroll to
      let firstErrField = null;
      if (layoutSchema && layoutSchema.sections) {
        for (const section of layoutSchema.sections) {
          if (firstErrField) break;
          if (!evaluateVisibility(section.visibilityRule)) continue;
          
          for (const field of section.fields) {
            if (!evaluateVisibility(field.visibilityRule)) continue;
            const fieldName = standardFieldMap[field.id] || field.id;
            if (field.mandatory && (!data[fieldName as keyof BookingFormData] || (Array.isArray(data[fieldName as keyof BookingFormData]) && data[fieldName as keyof BookingFormData].length === 0))) {
              firstErrField = fieldName;
              break;
            }
          }
        }
      }

      if (firstErrField) {
        setTimeout(() => {
          const element = document.getElementById(`field-container-${firstErrField}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash red background momentarily for better UX
            element.classList.add('bg-red-50', 'p-2', 'rounded-xl', 'transition-colors', 'duration-500');
            setTimeout(() => {
              element.classList.remove('bg-red-50', 'p-2', 'rounded-xl');
            }, 1500);
          }
        }, 50);
      }
      return;
    }

    // Filter out hidden fields from submission
    if (layoutSchema && layoutSchema.sections) {
      layoutSchema.sections.forEach((section: any) => {
        const secVisible = evaluateVisibility(section.visibilityRule);
        section.fields.forEach((field: any) => {
          const fieldVisible = secVisible && evaluateVisibility(field.visibilityRule);
          const fieldName = standardFieldMap[field.id] || field.id;
          if (!fieldVisible) {
             delete data[fieldName as keyof BookingFormData];
          }
        });
      });
    }

    const formDataObj = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formDataObj.append(key, value as string);
    });

    // Check for recordDate
    if (layoutSchema?.sections) {
      const recordDateField = layoutSchema.sections
        .flatMap((s: any) => s.fields)
        .find((f: any) => f.isRecordDate);
      if (recordDateField) {
        const fname = standardFieldMap[recordDateField.id] || recordDateField.id;
        const recordDateValue = data[fname as keyof BookingFormData];
        if (recordDateValue) {
          formDataObj.append('recordDate', recordDateValue as string);
        }
      }
    }

    const result = await saveBookingAction(formDataObj);

    if (result.success && result.data) {
      toast.success(booking ? "Booking updated successfully!" : "Booking created successfully!");
      router.back();
    } else {
      toast.error("Failed to save booking. Please check your inputs.");
    }
  };

  const onError = (errors: any) => {
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      const element = document.getElementById(`field-container-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const currentDate = watch('date');
  const currentTime = watch('time');

  const usersWithAvailability = teamUsers.map(user => {
    const isBusy = allBookings.some(b => {
      if (booking && b.id === booking.id) return false;
      
      const bDateStr = typeof b.date === 'string' ? b.date.split('T')[0] : '';
      if (bDateStr === currentDate && b.time === currentTime) {
        if (b.customData) {
          return Object.values(b.customData).some(val => {
            if (typeof val === 'string' && val.includes(user.id)) return true;
            return false;
          });
        }
      }
      return false;
    });
    return { ...user, isBusy };
  });

  const renderField = (field: any) => {
    const fieldName = standardFieldMap[field.id] || field.id;
    const isError = errors[fieldName as keyof BookingFormData];

    if (field.id === 'fld_b_client') {
      return (
        <input type="text" autoComplete="new-password" className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isError ? 'border-red-500' : 'border-gray-200'}`} {...register(fieldName as any, { required: field.mandatory })} placeholder={field.placeholder || "e.g. Rahul Sharma"} />
      );
    }
    if (field.id === 'fld_b_location') {
      return (
        <Autocomplete suggestions={locationSuggestions} value={watch(fieldName as any) || ''} onChange={val => setValue(fieldName as any, val, { shouldValidate: true })} placeholder={field.placeholder || "e.g. Grand Hyatt, City"} error={!!isError} />
      );
    }
    if (field.type === 'DATE') {
      return (
        <DatePickerInput value={watch(fieldName as any) || ''} onChange={(date) => setValue(fieldName as any, date, { shouldValidate: true })} placeholder={field.placeholder || "Select Date..."} />
      );
    }
    if (field.id === 'fld_b_time') {
      return (
        <input type="text" autoComplete="off" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register(fieldName as any, { required: field.mandatory })} ref={(e) => { register(fieldName as any).ref(e); (timeInputRef as any).current = e; }} placeholder={field.placeholder || "Select Time..."} />
      );
    }
    if (field.type === 'PICK_LIST') {
      const opts = field.options || [];
      return (
        <CustomDropdown 
          options={opts} 
          value={watch(fieldName as any) || (opts.length > 0 ? opts[0] : '')} 
          onChange={(val) => setValue(fieldName as any, val as any, { shouldValidate: true })} 
          error={!!isError}
          placeholder={`Select ${field.name}...`}
        />
      );
    }

    if (field.type === 'MULTI_SELECT') {
      const opts = field.options || [];
      const currentSelected = watch(fieldName as any) || '';
      const selectedArray = typeof currentSelected === 'string' && currentSelected.trim() ? currentSelected.split(',').map((s:string) => s.trim()) : (Array.isArray(currentSelected) ? currentSelected : []);
      
      return (
        <CustomMultiDropdown
          options={opts.map((opt: any) => opt.label || opt.value || opt)}
          value={selectedArray}
          onChange={(val: any) => setValue(fieldName as any, Array.isArray(val) ? val.join(', ') : val as any, { shouldValidate: true })}
          error={!!isError}
          placeholder={`Select ${field.name}...`}
        />
      );
    }

    if (field.type === 'STATUS_PICKER') {
      const opts = field.statusOptions || [];
      const currentValue = watch(fieldName as any) || (opts.length > 0 ? opts[0].label : '');
      const currentOpt = opts.find((o: any) => o.label === currentValue);

      // Handle future date restriction
      let isRestrictedDate = false;
      if (field.futureDateRestriction?.enabled && field.futureDateRestriction?.dateFieldId) {
        const dependentDateFieldName = standardFieldMap[field.futureDateRestriction.dateFieldId] || field.futureDateRestriction.dateFieldId;
        const dependentDateVal = watch(dependentDateFieldName as any);
        if (dependentDateVal) {
          const dateObj = new Date(dependentDateVal);
          dateObj.setHours(0,0,0,0);
          const today = new Date();
          today.setHours(0,0,0,0);
          if (dateObj > today) {
            isRestrictedDate = true;
          }
        }
      }

      // Filter options if restricted (CustomDropdown doesn't currently support disabled individual options, but the user requested replacing custom inline UIs with CustomDropdown. For restricted statuses, we can omit them or just pass them if CustomDropdown doesn't support disabled. Let's omit them if restricted so they can't be selected).
      const availableOpts = opts.filter((opt: any) => {
          return !(isRestrictedDate && field.futureDateRestriction?.restrictedStatuses?.includes(opt.label));
      });

      return (
        <div className="relative custom-dropdown-container">
          <CustomDropdown
            options={availableOpts.map((opt: any) => ({ label: opt.label, value: opt.label, color: opt.color }))}
            value={currentValue}
            onChange={(val: any) => setValue(fieldName as any, val as any, { shouldValidate: true })}
            error={!!isError}
            placeholder={`Select Status...`}
          />
        </div>
      );
    }

    if (field.type === 'USER_PICKLIST' || field.type === 'MULTI_USER_PICKLIST') {
      let filteredUsers = usersWithAvailability;
      if (field.userPicklistConfig) {
        if (field.userPicklistConfig.mode === 'ROLES' && field.userPicklistConfig.roles?.length > 0) {
          filteredUsers = usersWithAvailability.filter(u => field.userPicklistConfig.roles.includes(u.role));
        } else if (field.userPicklistConfig.mode === 'USERS' && field.userPicklistConfig.userIds?.length > 0) {
          filteredUsers = usersWithAvailability.filter(u => field.userPicklistConfig.userIds.includes(u.id));
        }
      }

      if (field.type === 'USER_PICKLIST') {
        return (
          <UserPicklist users={filteredUsers} value={watch(fieldName as any) || ''} onChange={(val) => setValue(fieldName as any, val, { shouldValidate: true })} placeholder={`Select ${field.name}...`} error={!!isError} showAvailability={field.userPicklistConfig?.showAvailability} />
        );
      }
      
      return (
        <MultiUserPicklist users={filteredUsers} value={watch(fieldName as any) || ''} onChange={(val) => setValue(fieldName as any, val, { shouldValidate: true })} placeholder={`Select ${field.name}...`} error={!!isError} showAvailability={field.userPicklistConfig?.showAvailability} />
      );
    }
    if (field.type === 'MULTI_LINE') {
      return (
        <textarea className={`flex w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 min-h-[80px] ${isError ? 'border-red-500' : 'border-gray-200'}`} {...register(fieldName as any, { required: field.mandatory })} placeholder={field.placeholder || `Enter ${field.name}...`} />
      );
    }
    
    if (field.type === 'CHECKBOX') {
      return (
        <div className={`flex items-center h-[45px] w-full rounded-xl border bg-white px-4 transition-colors ${isError ? 'border-red-500' : 'border-gray-200'}`}>
          <label className="flex items-center gap-3 cursor-pointer w-full h-full">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-orange-500 rounded border-gray-300 cursor-pointer" 
              {...register(fieldName as any, { required: field.mandatory })} 
            />
            <span className="text-[0.95rem] text-slate-600 font-medium select-none">{field.name}</span>
          </label>
        </div>
      );
    }
    
    if (field.id === 'fld_b_advance') {
      return (
        <div className="flex flex-col gap-2 w-full">
          {installments.length === 0 ? (
            <input type="text" autoComplete="off" className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isError ? 'border-red-500' : 'border-gray-200'}`} {...register(fieldName as any, { required: field.mandatory })} placeholder={field.placeholder || "e.g. Enter Advance Paid..."} onChange={(e) => {
              setValue(fieldName as any, e.target.value, { shouldValidate: true });
            }} />
          ) : (
            <div className="flex flex-col gap-2">
              {installments.map((inst, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      value={inst.amount} 
                      onChange={(e) => {
                        const newInst = [...installments];
                        newInst[idx].amount = e.target.value;
                        setInstallments(newInst);
                      }} 
                      className="h-[45px] w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-[0.95rem] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-colors"
                      placeholder="Amount"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <DatePickerInput 
                      value={inst.date} 
                      onChange={(date) => {
                        const newInst = [...installments];
                        newInst[idx].date = date;
                        setInstallments(newInst);
                      }} 
                      placeholder="Date"
                      className="flex h-[45px] w-full items-center justify-between rounded-xl border bg-white px-2 py-2 text-[0.85rem] transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 border-gray-200"
                    />
                  </div>
                  <button type="button" onClick={() => setInstallments(installments.filter((_, i) => i !== idx))} className="w-[45px] h-[45px] rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0">
                    <i className="ph-bold ph-trash text-[1.1rem]"></i>
                  </button>
                </div>
              ))}
              <div className="text-[0.8rem] text-slate-500 font-bold bg-slate-100 rounded-lg px-3 py-2 mt-1 w-fit border border-slate-200">Total Advance: <span className="text-slate-800">₹{watch('advance') || '0'}</span></div>
            </div>
          )}
        </div>
      );
    }
    
    if (field.type === 'IMAGE' || field.type === 'FILE') {
      const value = watch(fieldName as any);
      const isDriveFile = (value as any)?.driveFile;
      
      if (value) {
        return (
          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
            <div className="flex items-center gap-3 overflow-hidden">
              {isDriveFile ? (
                 <img src={(value as any).driveFile.iconUrl} alt="icon" className="w-6 h-6 object-contain" />
              ) : (
                 <i className="ph-fill ph-file text-2xl text-slate-400"></i>
              )}
              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                {isDriveFile ? (value as any).driveFile.name : "Local File Selected"}
              </span>
            </div>
            <button type="button" onClick={() => setValue(fieldName as any, '' as any)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
              <i className="ph-bold ph-x"></i>
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="file"
              accept={field.type === 'IMAGE' ? "image/*" : undefined}
              disabled={uploadProgress[fieldName] !== undefined}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                  toast.error("File exceeds 10MB limit. Please choose a smaller file.");
                  e.target.value = '';
                  return;
                }

                if (driveStatus?.connected) {
                  setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));
                  
                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", "/api/integrations/google/upload", true);
                  
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const percent = Math.round((event.loaded / event.total) * 100);
                      setUploadProgress(prev => ({ ...prev, [fieldName]: percent }));
                    }
                  };
                  
                  xhr.onload = () => {
                    setUploadProgress(prev => {
                      const next = { ...prev };
                      delete next[fieldName];
                      return next;
                    });
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const responseData = JSON.parse(xhr.responseText);
                        setValue(fieldName as any, { driveFile: responseData } as any);
                        toast.success("File uploaded to Google Drive");
                      } catch (err) {
                        toast.error("Failed to parse upload response");
                      }
                    } else {
                      try {
                        const errData = JSON.parse(xhr.responseText);
                        toast.error(errData.error || "Upload failed");
                      } catch {
                        toast.error("Upload failed");
                      }
                    }
                  };
                  
                  xhr.onerror = () => {
                    setUploadProgress(prev => {
                      const next = { ...prev };
                      delete next[fieldName];
                      return next;
                    });
                    toast.error("Network error during upload");
                  };
                  
                  const uploadData = new FormData();
                  uploadData.append("file", file);
                  uploadData.append("module", "Bookings");
                  const categoryName = formValues.category || "Uncategorized";
                  uploadData.append("category", categoryName);
                  
                  xhr.send(uploadData);
                } else {
                  const reader = new FileReader();
                  reader.onloadend = () => setValue(fieldName as any, reader.result as any);
                  reader.readAsDataURL(file);
                }
              }}
              className="h-[45px] w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-[0.95rem] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            />
            {uploadProgress[fieldName] !== undefined && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 rounded-b-xl overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${uploadProgress[fieldName]}%` }}
                />
              </div>
            )}
          </div>
          {driveStatus?.connected && (
             <div className="flex items-center gap-3">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">OR</span>
               <div className="h-px bg-slate-200 flex-1"></div>
             </div>
          )}
          {driveStatus?.connected && (
            <GooglePicker 
              onPick={(file) => setValue(fieldName as any, { driveFile: file } as any)} 
              className="w-full justify-center py-2.5 shadow-sm border border-blue-100"
            />
          )}
        </div>
      );
    }

    // Default fallback to text/number input
    const typeAttr = field.type === 'EMAIL' ? 'email' : (field.type === 'NUMBER' || field.type === 'CURRENCY' ? 'text' : 'text');
    return (
      <input type={typeAttr} autoComplete="new-password" className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isError ? 'border-red-500' : 'border-gray-200'}`} {...register(fieldName as any, { required: field.mandatory })} placeholder={field.placeholder || `e.g. Enter ${field.name}...`} />
    );
  };

  return (
    <Dialog open={isAddModalOpen} onOpenChange={(open) => {
      if (!open) { router.back(); }
    }}>
      <DialogContent className="max-w-[800px] sm:max-w-[800px] w-[95vw] sm:w-full p-0 bg-transparent overflow-hidden border-0 shadow-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90dvh]"
        >
        <DialogHeader className="bg-slate-50 border-b border-gray-100 px-5 py-5 sm:px-10 sm:py-8 relative shrink-0">
          <div className="flex flex-col">
            <span className="text-[0.65rem] sm:text-[0.75rem] font-bold text-orange-500 uppercase tracking-[1px] mb-1 sm:mb-2">Booking Registration</span>
            <DialogTitle className="text-[1.4rem] sm:text-[1.8rem] font-extrabold text-slate-900 leading-tight">
              {booking ? "Edit Booking" : "Create Studio Booking"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-5 py-5 sm:px-10 sm:py-8 flex-1 overflow-y-auto">
          <form id="booking-form" onSubmit={handleSubmit(onSubmit, onError)} className="hidden">
            <input type="hidden" {...register('installments' as any)} value={JSON.stringify(installments)} />
          </form>
          {layoutSchema && layoutSchema.sections ? (
            layoutSchema.sections.map((section: any) => {
              if (section.visibilityRule && !evaluateVisibility(section.visibilityRule)) {
                return null;
              }

              return (
              <div key={section.id} className="bg-slate-50 rounded-2xl p-6 mb-8 border border-gray-100 relative">
                <div className="flex flex-col mb-6">
                  <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                    <i className={`ph-fill ${section.icon || 'ph-squares-four'} text-orange-500 text-[1.2rem]`}></i> {section.title}
                  </div>
                  {section.description && <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">{section.description}</div>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  {section.fields.map((field: any) => {
                    // Map STATUS_PICKER to 'status' if it's the main one
                    const statusF = layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER');
                    let fieldName = standardFieldMap[field.id] || field.id;
                    if (statusF && field.id === statusF.id) fieldName = 'status';

                    if (field.visibilityRule && !evaluateVisibility(field.visibilityRule)) {
                      return null;
                    }

                    const isError = errors[fieldName as keyof BookingFormData];
                    
                    if (!booking && field.type === 'STATUS_PICKER') return null;
                    
                    return (
                      <div key={field.id} id={`field-container-${fieldName}`} className={`flex flex-col gap-1.5 ${field.type === 'MULTI_LINE' ? 'md:col-span-2' : ''}`}>
                        <div className="flex justify-between items-center">
                          <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">
                            {field.name} {field.mandatory && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          {field.id === 'fld_b_advance' && (
                            <button 
                              type="button" 
                              onClick={() => setInstallments([...installments, { amount: '', date: new Date().toISOString().split('T')[0] }])}
                              className="text-[0.7rem] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                            >
                              <i className="ph-bold ph-plus"></i> Add Installment
                            </button>
                          )}
                        </div>
                        {renderField(field)}
                        {isError && <span className="text-[0.7rem] font-semibold text-red-500 mt-1">{isError.message as string || `${field.name} is required`}</span>}
                      </div>
                    );
                  })}
                  
                  {/* Append outstanding balance UI dynamically if this is the financials section */}
                  {section.id === 'sec_booking_financial' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner md:col-span-1 md:col-start-2 md:mt-2">
                      <span className="text-[0.7rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
                      <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{watch('due') || '0.00'}</span>
                    </div>
                  )}
                </div>
              </div>
            )})
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500">
               <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin mr-3"></div> Loading form layout...
            </div>
          )}
        </div>
        <div className="bg-slate-50 border-t border-gray-100 px-5 py-4 sm:px-10 sm:py-6 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl shrink-0">
          <button className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-transparent text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => router.back()}>Cancel</button>
          <button className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50" disabled={isSubmitting} onClick={handleSubmit(onSubmit, onError)}>
            <i className="ph-fill ph-calendar-plus"></i> {isSubmitting ? "Saving..." : booking ? "Save Changes" : "Register Booking"}
          </button>
        </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
