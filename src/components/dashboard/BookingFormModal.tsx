"use client";

import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import flatpickr from "flatpickr";

import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import Autocomplete from "../ui/Autocomplete";
import UserPicklist from "../ui/UserPicklist";
import MultiUserPicklist, { UserItem } from "../ui/MultiUserPicklist";
import { bookingSchema, BookingFormData } from "@/lib/validations/booking";
import { saveBookingAction } from "@/app/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "../ui/DatePickerInput";
import TimePickerInput from "../ui/TimePickerInput";
import FileAttachment from "@/components/ui/FileAttachment";

import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { uploadFileToDrive } from "@/lib/uploadHelper";

const fetcher = (url: string) => fetch(url).then(r => r.json());

import { Suspense } from "react";

function BookingFormModalInner() {
  const { isBookingFormOpen, bookingToEditId, bookingInitialDate, closeBookingForm } = useGlobalForm();
  
  const { data: fetchedBooking, isLoading: isBookingLoading } = useSWR(
    bookingToEditId ? `/api/bookings/${bookingToEditId}` : null,
    fetcher
  );
  
  const booking = bookingToEditId ? fetchedBooking : null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateForNew = bookingInitialDate;
  const isAddModalOpen = isBookingFormOpen;

  const clientSuggestions: string[] = [];
  const locationSuggestions: string[] = [];

  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

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
  const [isMultiInstallment, setIsMultiInstallment] = useState(false);
  const [installments, setInstallments] = useState<{amount: string, date: string, paymentMode: string, transactionId?: string}[]>([
    { amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' }
  ]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  
  const standardFieldMap: Record<string, string> = {
    fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
    fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
    fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance',
    fld_gallery_delivered: 'galleryDelivered'
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
      const staff = (Array.isArray(usersData) ? usersData : usersData?.users ?? []).filter((u: any) => u.role !== 'CLIENT');
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

  // Edit mode pre-fill
  useEffect(() => {
    if (isAddModalOpen && !isBookingLoading && booking && layoutSchema) {
      const b = booking as any;
      
      let parsedCustomData: any = {};
      if (typeof b.customData === 'string') {
        try { parsedCustomData = JSON.parse(b.customData); } catch (e) {}
      } else if (b.customData && typeof b.customData === 'object') {
        parsedCustomData = b.customData;
      }
      
      const formValues: any = {
        id: b.id,
        title: b.client?.name || b.title || parsedCustomData.fld_b_client || '',
        phone: b.client?.phone || b.phone || parsedCustomData.fld_b_phone || '',
        email: b.client?.email || b.email || parsedCustomData.fld_b_email || '',
        date: b.date ? (typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0]) : (parsedCustomData.fld_b_date || ''),
        time: parsedCustomData.fld_b_time || b.time || '',
        category: b.category || parsedCustomData.fld_b_category || '',
        location: b.location || parsedCustomData.fld_b_location || '',
        status: b.status || parsedCustomData.fld_b_status || '',
        package: b.order?.package ? b.order.package.toString() : (parsedCustomData.fld_b_package || ''),
        advance: b.order?.advance ? b.order.advance.toString() : (parsedCustomData.fld_b_advance || ''),
        due: b.order?.due ? b.order.due.toString() : '',
        ...parsedCustomData
      };

      reset(formValues);
      
      if (timeFpInstance && formValues.time) {
        timeFpInstance.setDate(formValues.time);
      }
      
      
      const validTransactions = (b.transactions || []).filter((tx: any) => !tx.deletedAt);
      if (validTransactions.length > 0) {
        setIsMultiInstallment(validTransactions.length > 1);
        setInstallments(validTransactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((tx: any) => ({
          amount: tx.amount.toString(),
          date: new Date(tx.date).toISOString().split('T')[0],
          paymentMode: tx.paymentMode || 'Cash',
          transactionId: tx.id
        })));
      } else if (b.order?.installments && Array.isArray(b.order.installments) && b.order.installments.length > 0) {
        setIsMultiInstallment(b.order.installments.length > 1);
        setInstallments(b.order.installments);
      } else {
        setIsMultiInstallment(false);
        setInstallments([{
          amount: b.order?.advance ? b.order.advance.toString() : (formValues.advance || ''),
          date: new Date().toISOString().split('T')[0],
          paymentMode: formValues.paymentMode || 'Cash'
        }]);
      }
    }
  }, [isAddModalOpen, booking?.id, isBookingLoading, reset, timeFpInstance, layoutSchema]);

  // Add mode default initialization
  useEffect(() => {
    if (isAddModalOpen && !isBookingLoading && !bookingToEditId) {
      const defaultDate = selectedDateForNew || new Date().toISOString().split('T')[0];
      const defaultValues: any = {
        title: '', category: 'Wedding', date: defaultDate, time: '10:00 AM', 
        location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
      };
      
      let statusFieldId = 'fld_b_status';
      if (layoutSchema?.sections) {
        const statusF = layoutSchema.sections.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER');
        if (statusF) statusFieldId = statusF.id;
      }

      if (layoutSchema?.sections) {
        layoutSchema.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            const fname = (f.id === statusFieldId && f.type === 'STATUS_PICKER') ? 'status' : (standardFieldMap[f.id] || f.id);
            
            if (f.type === 'STATUS_PICKER' && f.statusOptions && f.statusOptions.length > 0) {
              defaultValues[fname] = f.statusOptions[0].label;
            } else if ((f.type === 'PICK_LIST' || f.type === 'CATEGORY_PICKER' || f.id === 'fld_b_category') && f.options && f.options.length > 0) {
              defaultValues[fname] = f.options[0].label || f.options[0] || '';
            }

            if (f.defaultValue) {
              defaultValues[fname] = f.defaultValue;
            }
          });
        });
      }
      reset(defaultValues);
      if (timeFpInstance) timeFpInstance.setDate(defaultValues.time || '10:00 AM');
      clearErrors();
    }
  }, [isAddModalOpen, bookingToEditId, isBookingLoading, selectedDateForNew, reset, clearErrors, layoutSchema, timeFpInstance]);

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
    if (!rule) return true;
    
    const dependsOnKey = rule.dependsOn || rule.fieldId;
    if (!dependsOnKey) return true;
    
    const depFieldName = standardFieldMap[dependsOnKey] || dependsOnKey;
    const depValue = formValues[depFieldName as keyof BookingFormData] !== undefined 
      ? formValues[depFieldName as keyof BookingFormData] 
      : (formValues as any)[dependsOnKey];
    
    const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);
    
    if (rule.dependsOn || rule.fieldId) {
    }
    
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
    
    // For pure dependsOn + values format without operator
    if (rule.dependsOn && Array.isArray(rule.values) && !rule.operator) {
      return rule.values.includes(depValue);
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

    // Handle file uploads
    setIsSubmittingLocal(true);
    try {
      const uploadPromises = [];
      for (const [key, value] of Object.entries(data)) {
        if (typeof window !== 'undefined' && (value instanceof File || value instanceof Blob)) {
          uploadPromises.push(
            uploadFileToDrive(value as File, 'Bookings', data.category || 'Uncategorized', data.date)
              .then(uploaded => ({ key, uploaded }))
          );
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          (data as any)[key] = JSON.stringify(value);
        }
      }
      
      const uploadResults = await Promise.all(uploadPromises);
      for (const result of uploadResults) {
        (data as any)[result.key] = JSON.stringify(result.uploaded);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
      setIsSubmittingLocal(false);
      return;
    }

    const formDataObj = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          formDataObj.append(key, JSON.stringify(value));
        } else if (Array.isArray(value)) {
          formDataObj.append(key, value.join(', '));
        } else {
          formDataObj.append(key, value as string);
        }
      }
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
        let needsReSave = false;
        const newInstallments = [...installments];
        const txPromises = newInstallments.map(async (inst) => {
          if (inst.amount && parseFloat(inst.amount) > 0) {
            const isLegacy = inst.transactionId?.toString().startsWith('legacy');
            if (!inst.transactionId || isLegacy) {
              try {
                const res = await fetch('/api/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: parseFloat(inst.amount),
                    type: 'INCOME',
                    category: 'BOOKING',
                    description: `Advance Payment for Booking ${result.data.bookingNumber || '#' + result.data.id} - ${data.title || 'Client'}`,
                    date: new Date(inst.date).toISOString(),
                    bookingId: result.data.id,
                    paymentMode: inst.paymentMode || 'Cash'
                  })
                });
                if (res.ok) {
                  const txData = await res.json();
                  inst.transactionId = txData.id;
                  needsReSave = true;
                }
              } catch(e) {
                 console.error("Failed to create transaction for installment", e);
              }
            } else {
              // Update existing transaction
              try {
                await fetch(`/api/transactions/${inst.transactionId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: parseFloat(inst.amount),
                    date: new Date(inst.date).toISOString(),
                    paymentMode: inst.paymentMode || 'Cash'
                  })
                });
              } catch(e) {
                 console.error("Failed to update transaction for installment", e);
              }
            }
          }
        });
        await Promise.all(txPromises);

        if (needsReSave) {
          formDataObj.set('id', result.data.id);
          formDataObj.set('installments', JSON.stringify(newInstallments));
          await saveBookingAction(formDataObj);
        }

        toast.success(booking ? "Booking updated successfully!" : "Booking created successfully!");
        
        // Use SWR mutate to update cache immediately without full page reload
        mutate(
          (key: any) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard') || key.startsWith('/api/transactions')),
          undefined,
          { revalidate: true }
        );
        router.refresh();
        
        closeBookingForm();
    } else {
      toast.error("Failed to save booking. Please check your inputs.");
    }
    setIsSubmittingLocal(false);
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

  const handleDeleteInstallment = async (idx: number) => {
    const inst = installments[idx];
    if (inst.transactionId) {
      if (!confirm('Are you sure you want to delete this payment transaction?')) return;
      try {
        await fetch(`/api/transactions/${inst.transactionId}`, { method: 'DELETE' });
        toast.success('Transaction deleted');
      } catch (err) {
        toast.error('Failed to delete transaction');
        return;
      }
    }
    setInstallments(installments.filter((_, i) => i !== idx));
  };

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
        <DatePickerInput value={watch(fieldName as any) || ''} onChange={(date) => setValue(fieldName as any, date, { shouldValidate: true })} placeholder={field.placeholder || "Select Date..."} disableFutureDates={!!field.restrictFutureDate} />
      );
    }
    if (field.type === 'TIME') {
      return (
        <TimePickerInput value={watch(fieldName as any) || ''} onChange={(time) => setValue(fieldName as any, time, { shouldValidate: true })} placeholder={field.placeholder || "e.g. HH:MM AM/PM"} hasError={!!isError} />
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
    
    
    
    if (field.type === 'IMAGE' || field.type === 'FILE') {
      const value = watch(fieldName as any);
      return (
        <FileAttachment
          id={fieldName}
          type={field.type}
          value={value}
          onChange={(val) => setValue(fieldName as any, val as any)}
          driveStatus={driveStatus}
          moduleName="Bookings"
          categoryName={formValues.category || "Uncategorized"}
        />
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
      if (!open) { closeBookingForm(); }
    }}>
      <DialogContent className="max-w-[800px] sm:max-w-[800px] w-[95vw] sm:w-full p-0 bg-transparent overflow-visible border-0 shadow-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] relative overflow-hidden"
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
                
                <div className={`grid gap-5 items-start ${section.id === 'sec_booking_financial' ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1 md:grid-cols-2'}`}>
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
                    
                    if (fieldName === 'advance') {
                      const pmOptions = ['Cash', 'UPI'].map(m => ({ label: m, value: m }));
                      return (
                        <React.Fragment key="installments-section">
                          <AnimatePresence mode="popLayout">
                            {!isMultiInstallment ? (
                              <React.Fragment key="single-installment">
                                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="md:col-span-4 flex flex-col gap-1.5 relative">
                                  <div className="flex justify-between items-center h-[20px]">
                                    <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Advance Paid (₹)</label>
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setIsMultiInstallment(true);
                                        setInstallments([
                                          ...installments, 
                                          { amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' }
                                        ]);
                                      }}
                                      className="text-[0.75rem] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors whitespace-nowrap"
                                    >
                                      <i className="ph-bold ph-plus"></i> Add Installment
                                    </button>
                                  </div>
                                  <div className="relative mt-1">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</div>
                                    <input type="text" value={installments[0]?.amount || ''} onChange={(e) => {
                                      const newInst = [...installments];
                                      if(newInst.length === 0) newInst.push({ amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' });
                                      newInst[0].amount = e.target.value.replace(/[^0-9.]/g, '');
                                      setInstallments(newInst);
                                    }} className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" placeholder="Amount" />
                                  </div>
                                </motion.div>
                                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="md:col-span-4 w-full flex flex-col gap-1.5 relative">
                                  <div className="h-[20px] flex items-center">
                                    <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Payment Mode</label>
                                  </div>
                                  <div className="relative custom-dropdown-container mt-1">
                                    <CustomDropdown
                                      options={pmOptions}
                                      value={installments[0]?.paymentMode || 'Cash'}
                                      onChange={(val: any) => {
                                        const newInst = [...installments];
                                        if(newInst.length === 0) newInst.push({ amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' });
                                        newInst[0].paymentMode = val;
                                        setInstallments(newInst);
                                      }}
                                      placeholder="Select Payment Mode"
                                    />
                                  </div>
                                </motion.div>
                              </React.Fragment>
                            ) : (
                              <motion.div key="multi-installment" layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="md:col-span-8 flex flex-col gap-1.5">
                                <div className="flex justify-between items-center h-[20px]">
                                  <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Payments & Installments</label>
                                  <button 
                                    type="button" 
                                    onClick={() => setInstallments([...installments, { amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'Cash' }])}
                                    className="text-[0.7rem] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors bg-orange-50 px-3 py-1.5 rounded-lg -mr-1"
                                  >
                                    <i className="ph-bold ph-plus"></i> Add Installment
                                  </button>
                                </div>
                                
                                <div className="flex flex-col gap-3 mt-1">
                                  {installments.map((inst, idx) => (
                                    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                      <div className="flex-[1.5] relative w-full">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[0.95rem] z-10 pointer-events-none">₹</div>
                                        <input type="text" value={inst.amount || ''} onChange={(e) => {
                                          const newInst = [...installments];
                                          newInst[idx].amount = e.target.value.replace(/[^0-9.]/g, '');
                                          setInstallments(newInst);
                                        }} className="flex h-[42px] w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" placeholder="Amount" />
                                      </div>
                                      <div className="w-full sm:w-[130px] shrink-0 h-[42px] relative">
                                        <DatePickerInput
                                          value={inst.date ? new Date(inst.date).toISOString().split('T')[0] : ''}
                                          onChange={(val: any) => {
                                            const newInst = [...installments];
                                            newInst[idx].date = val;
                                            setInstallments(newInst);
                                          }}
                                        />
                                      </div>
                                      <div className="w-full sm:w-[130px] shrink-0 h-[42px] relative custom-dropdown-container">
                                        <CustomDropdown
                                          options={pmOptions}
                                          value={inst.paymentMode || 'Cash'}
                                          onChange={(val: any) => {
                                            const newInst = [...installments];
                                            newInst[idx].paymentMode = val;
                                            setInstallments(newInst);
                                          }}
                                          placeholder="Mode"
                                        />
                                      </div>
                                      <button type="button" onClick={() => {
                                        if (installments.length === 2) {
                                          setIsMultiInstallment(false);
                                        }
                                        handleDeleteInstallment(idx);
                                      }} className="w-[42px] h-[42px] shrink-0 rounded-xl bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors">
                                        <i className="ph-bold ph-trash"></i>
                                      </button>
                                    </motion.div>
                                  ))}
                                </div>
                                <div className="text-[0.8rem] text-slate-500 font-bold bg-slate-100 rounded-lg px-3 py-2 mt-1 w-fit border border-slate-200">
                                  Total Advance: <span className="text-slate-800">₹{installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0).toLocaleString('en-IN')}</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    }
                    
                    return (
                      <div key={field.id} id={`field-container-${fieldName}`} className={`flex flex-col gap-1.5 ${section.id === 'sec_booking_financial' ? 'md:col-span-4' : (field.type === 'MULTI_LINE' ? 'md:col-span-2' : '')}`}>
                        <div className="flex justify-between items-center">
                          <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">
                            {field.name} {field.mandatory && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          
                        </div>
                        {renderField(field)}
                        {isError && <span className="text-[0.7rem] font-semibold text-red-500 mt-1">{isError.message as string || `${field.name} is required`}</span>}
                      </div>
                    );
                  })}
                  
                  

                  {section.id === 'sec_booking_financial' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner md:col-span-8 md:col-start-5 mt-4">
                      <span className="text-[0.75rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
                      <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">
                        ₹{(() => {
                          const pkg = parseFloat((watch('package') || '0').toString().replace(/,/g, '')) || 0;
                          const adv = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
                          return (pkg - adv).toLocaleString('en-IN');
                        })()}
                      </span>
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
          <button className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-transparent text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => closeBookingForm()}>Cancel</button>
          <button className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50" disabled={isSubmitting || isSubmittingLocal} onClick={handleSubmit(onSubmit, onError)}>
            <i className="ph-fill ph-calendar-plus"></i> {(isSubmitting || isSubmittingLocal) ? "Saving..." : booking ? "Save Changes" : "Confirm"}
          </button>
        </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingFormModal() {
  return (
    <Suspense fallback={null}>
      <BookingFormModalInner />
    </Suspense>
  );
}
