"use client";

import { useEffect, useRef, useState } from "react";
import flatpickr from "flatpickr";
import { useBookings } from "../providers/BookingProvider";
import { Booking } from "@/types";
import CustomSelect from "../ui/CustomSelect";
import Autocomplete from "../ui/Autocomplete";
import { bookingSchema, BookingFormData } from "@/lib/validations/booking";
import { saveBookingAction } from "@/app/actions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "../ui/DatePickerInput";

export default function BookingFormModal() {
  const { 
    isAddModalOpen, setIsAddModalOpen,
    activeEditBooking, setActiveEditBooking,
    selectedDateForNew, setSelectedDateForNew
  } = useBookings();

  const clientSuggestions: string[] = [];
  const locationSuggestions: string[] = [];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '', category: 'Wedding', date: '', time: '10:00 AM', 
      location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
    }
  });

  const timeInputRef = useRef<HTMLInputElement>(null);
  const [timeFpInstance, setTimeFpInstance] = useState<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (isAddModalOpen) {
      if (activeEditBooking) {
        reset(activeEditBooking);
      } else {
        const defaultDate = selectedDateForNew || new Date().toISOString().split('T')[0];
        reset({
          title: '', category: 'Wedding', date: defaultDate, time: '10:00 AM', 
          location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
        });
        if (timeFpInstance) timeFpInstance.setDate('10:00 AM');
      }
    }
  }, [isAddModalOpen, activeEditBooking, selectedDateForNew, reset, timeFpInstance]);

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
    const total = parseCurrency(watch('package') || '0');
    const advance = parseCurrency(watch('advance') || '0');
    const outstanding = Math.max(0, total - advance);
    if (total > 0 || advance > 0) {
      setValue('due', formatCurrencyInput(outstanding));
    } else {
      setValue('due', '');
    }
  }, [watch('package'), watch('advance'), setValue, watch]);

  const onSubmit = async (data: BookingFormData) => {
    const formDataObj = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) formDataObj.append(key, value as string);
    });

    const result = await saveBookingAction(formDataObj);

    if (result.success && result.data) {
      toast.success(activeEditBooking ? "Booking updated successfully!" : "Booking created successfully!");
      setIsAddModalOpen(false);
      setActiveEditBooking(null);
      setSelectedDateForNew(null);
    } else {
      toast.error("Failed to save booking. Please check your inputs.");
    }
  };

  return (
    <Dialog open={isAddModalOpen} onOpenChange={(open) => {
      if (!open) { setIsAddModalOpen(false); setActiveEditBooking(null); setSelectedDateForNew(null); }
    }}>
      <DialogContent className="max-w-[800px] sm:max-w-[800px] p-0 bg-transparent overflow-hidden border-0 shadow-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl"
        >
        <DialogHeader className="bg-slate-50 border-b border-gray-100 px-10 py-8 relative">
          <div className="flex flex-col">
            <span className="text-[0.75rem] font-bold text-orange-500 uppercase tracking-[1px] mb-2">Booking Registration</span>
            <DialogTitle className="text-[1.8rem] font-extrabold text-slate-900 leading-tight">
              {activeEditBooking ? "Edit Booking" : "Create Studio Booking"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-10 py-8 max-h-[70vh] overflow-y-auto">
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <div className="flex flex-col mb-6">
                <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                  <i className="ph-fill ph-user-circle text-orange-500 text-[1.2rem]"></i> Client Info
                </div>
                <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">Contact details for communication and contract signing.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Client Full Name <span className="text-red-500">*</span></label>
                  <Autocomplete 
                    suggestions={clientSuggestions}
                    value={watch('title') || ''}
                    onChange={val => setValue('title', val, { shouldValidate: true })}
                    placeholder="e.g. Rahul Sharma"
                    error={!!errors.title}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Phone Number <span className="text-red-500">*</span></label>
                  <input type="text" className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}`} {...register('phone')} placeholder="+91 98765 43210" />
                  {errors.phone && <span className="text-xs text-red-500 mt-1">{errors.phone.message}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Email Address</label>
                  <input type="email" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('email')} placeholder="rahul@example.com" />
                  {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-gray-100">
              <div className="flex flex-col mb-6">
                <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                  <i className="ph-fill ph-calendar-blank text-orange-500 text-[1.2rem]"></i> Event Details
                </div>
                <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">Logistics for the shoot session and categorization.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Shoot Date</label>
                  <DatePickerInput value={watch('date') || ''} onChange={(date) => setValue('date', date)} placeholder="Select Date..." />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Start Time</label>
                  <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('time')} ref={(e) => { register('time').ref(e); (timeInputRef as any).current = e; }} placeholder="Select Time..." />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Shoot Category</label>
                  <CustomSelect 
                    options={['Wedding', 'Fashion', 'Baby & Kids', 'Corporate']}
                    value={watch('category') || 'Wedding'}
                    onChange={(val) => setValue('category', val || 'Wedding')}
                    className="flex h-[45px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Location <span className="text-red-500">*</span></label>
                  <Autocomplete 
                    suggestions={locationSuggestions}
                    value={watch('location') || ''}
                    onChange={val => setValue('location', val, { shouldValidate: true })}
                    placeholder="e.g. Grand Hyatt, City"
                    error={!!errors.location}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Status</label>
                  <CustomSelect 
                    options={['Confirmed', 'Pending', 'Partial']}
                    value={watch('status') || 'Confirmed'}
                    onChange={(val) => setValue('status', (val as any) || 'Confirmed')}
                    className="flex h-[45px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex flex-col mb-6">
                <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                  <i className="ph-bold ph-currency-inr text-orange-500 text-[1.2rem]"></i> Financials
                </div>
                <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">Package value, advance paid, and calculated remainder.</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Total Package Price (₹)</label>
                  <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('package')} placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Advance Paid (₹)</label>
                  <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('advance')} placeholder="0.00" />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner lg:col-span-1 md:col-span-2">
                  <span className="text-[0.7rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
                  <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{watch('due') || '0.00'}</span>
                </div>
              </div>
            </div>
        </div>
        <div className="bg-slate-50 border-t border-gray-100 px-10 py-6 flex justify-end gap-3 rounded-b-3xl">
          <button className="px-5 py-2.5 rounded-full font-bold text-[0.95rem] bg-transparent text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => { setIsAddModalOpen(false); setActiveEditBooking(null); setSelectedDateForNew(null); }}>Cancel</button>
          <button className="px-6 py-2.5 rounded-full font-bold text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
            <i className="ph-fill ph-calendar-plus"></i> {isSubmitting ? "Saving..." : activeEditBooking ? "Save Changes" : "Register Booking"}
          </button>
        </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
