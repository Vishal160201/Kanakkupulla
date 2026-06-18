const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Modals.tsx', 'utf8');

// Add imports
content = content.replace(
  'import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";',
  `import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, BookingFormData } from "@/lib/validations/booking";
import { saveBookingAction } from "@/app/actions";`
);

// Remove old state
content = content.replace(
`  // Add/Edit Form State
  const [formData, setFormData] = useState<Partial<Booking>>({
    title: '', category: 'Wedding', date: '', time: '10:00 AM', 
    location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
  });

  const timeInputRef = useRef<HTMLInputElement>(null);
  const [timeFpInstance, setTimeFpInstance] = useState<flatpickr.Instance | null>(null);
  const [errors, setErrors] = useState<{title?: boolean, phone?: boolean, location?: boolean}>({});`,
`  // Add/Edit Form State (React Hook Form)
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      title: '', category: 'Wedding', date: '', time: '10:00 AM', 
      location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
    }
  });

  const timeInputRef = useRef<HTMLInputElement>(null);
  const [timeFpInstance, setTimeFpInstance] = useState<flatpickr.Instance | null>(null);`
);

// Update useEffect for reset
content = content.replace(
`        if (b) {
          setFormData(b);
        }
      } else {
        const defaultDate = selectedDateForNew || new Date().toISOString().split('T')[0];
        setFormData({
          title: '', category: 'Wedding', date: defaultDate, time: '10:00 AM', 
          location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
        });
        if (timeFpInstance) timeFpInstance.setDate('10:00 AM');
      }
      setErrors({}); // Clear errors when modal opens
    }
  }, [isAddModalOpen, activeEditId, selectedDateForNew]);`,
`        if (b) {
          reset(b);
        }
      } else {
        const defaultDate = selectedDateForNew || new Date().toISOString().split('T')[0];
        reset({
          title: '', category: 'Wedding', date: defaultDate, time: '10:00 AM', 
          location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
        });
        if (timeFpInstance) timeFpInstance.setDate('10:00 AM');
      }
    }
  }, [isAddModalOpen, activeEditId, selectedDateForNew, reset]);`
);

// Update timeFpInstance
content = content.replace(
`          defaultDate: formData.time || '10:00 AM',
          onChange: (selectedDates, dateStr) => setFormData(prev => ({ ...prev, time: dateStr }))`,
`          defaultDate: watch('time') || '10:00 AM',
          onChange: (selectedDates, dateStr) => setValue('time', dateStr)`
);

// Calculations
content = content.replace(
`  useEffect(() => {
    const total = parseCurrency(formData.package || '0');
    const advance = parseCurrency(formData.advance || '0');
    const outstanding = Math.max(0, total - advance);
    if (total > 0 || advance > 0) {
      setFormData(prev => ({ ...prev, due: formatCurrencyInput(outstanding) }));
    } else {
      setFormData(prev => ({ ...prev, due: '' }));
    }
  }, [formData.package, formData.advance]);`,
`  useEffect(() => {
    const total = parseCurrency(watch('package') || '0');
    const advance = parseCurrency(watch('advance') || '0');
    const outstanding = Math.max(0, total - advance);
    if (total > 0 || advance > 0) {
      setValue('due', formatCurrencyInput(outstanding));
    } else {
      setValue('due', '');
    }
  }, [watch('package'), watch('advance'), setValue]);`
);

// Save booking
content = content.replace(
`  const handleSaveBooking = () => {
    const newErrors = {
      title: !formData.title?.trim(),
      phone: !formData.phone?.trim(),
      location: !formData.location?.trim()
    };
    if (newErrors.title || newErrors.phone || newErrors.location) {
      setErrors(newErrors);
      return;
    }
    
    const newBooking: Booking = {
      id: activeEditId || ('ABK-' + Math.floor(1000 + Math.random() * 9000)),
      title: formData.title || '',
      category: formData.category || 'Wedding',
      date: formData.date || new Date().toISOString().split('T')[0],
      time: formData.time || '10:00 AM',
      location: formData.location || '',
      phone: formData.phone || '',
      email: formData.email || '',
      package: formData.package || '',
      advance: formData.advance || '',
      due: formData.due || '',
      status: (formData.status as any) || 'Confirmed'
    };

    if (activeEditId) updateBooking(activeEditId, newBooking);
    else addBooking(newBooking);

    setIsAddModalOpen(false);
    setActiveEditId(null);
    setSelectedDateForNew(null);
  };`,
`  const onSubmit = async (data: BookingFormData) => {
    const formDataObj = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) formDataObj.append(key, value as string);
    });

    const result = await saveBookingAction(formDataObj);

    if (result.success && result.data) {
      const finalBooking = { ...result.data, id: activeEditId || ('ABK-' + Math.floor(1000 + Math.random() * 9000)) } as Booking;
      if (activeEditId) updateBooking(activeEditId, finalBooking);
      else addBooking(finalBooking);

      setIsAddModalOpen(false);
      setActiveEditId(null);
      setSelectedDateForNew(null);
    }
  };`
);

// Form Inputs replacement
content = content.replace(
`                      value={formData.title || ''}
                      onChange={val => { setFormData({...formData, title: val}); setErrors(prev => ({...prev, title: false})); }}
                      placeholder="e.g. Rahul Sharma"
                      error={errors.title}`,
`                      value={watch('title') || ''}
                      onChange={val => setValue('title', val, { shouldValidate: true })}
                      placeholder="e.g. Rahul Sharma"
                      error={!!errors.title}`
);

content = content.replace(
`                    <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Phone Number <span className="text-red-500">*</span></label>
                    <input type="text" className={\`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 \${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}\`} value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setErrors(prev => ({...prev, phone: false})); }} placeholder="+91 98765 43210" />`,
`                    <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Phone Number <span className="text-red-500">*</span></label>
                    <input type="text" className={\`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 \${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}\`} {...register('phone')} placeholder="+91 98765 43210" />
                    {errors.phone && <span className="text-xs text-red-500 mt-1">{errors.phone.message}</span>}`
);

content = content.replace(
`                    <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Email Address</label>
                    <input type="email" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="rahul@example.com" />`,
`                    <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-[0.5px]">Email Address</label>
                    <input type="email" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('email')} placeholder="rahul@example.com" />
                    {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}`
);

content = content.replace(
`                    <DatePickerInput value={formData.date || ''} onChange={(date) => setFormData({...formData, date})} placeholder="Select Date..." />`,
`                    <DatePickerInput value={watch('date') || ''} onChange={(date) => setValue('date', date)} placeholder="Select Date..." />`
);

content = content.replace(
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" ref={timeInputRef} value={formData.time || ''} onChange={(e) => setFormData({...formData, time: e.target.value})} placeholder="Select Time..." />`,
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" ref={timeInputRef} {...register('time')} placeholder="Select Time..." />`
);

content = content.replace(
`                      value={formData.category || 'Wedding'}
                      onChange={(val) => setFormData({...formData, category: val})}`,
`                      value={watch('category') || 'Wedding'}
                      onChange={(val) => setValue('category', val)}`
);

content = content.replace(
`                      value={formData.location || ''}
                      onChange={val => { setFormData({...formData, location: val}); setErrors(prev => ({...prev, location: false})); }}
                      placeholder="e.g. Grand Hyatt, City"
                      error={errors.location}`,
`                      value={watch('location') || ''}
                      onChange={val => setValue('location', val, { shouldValidate: true })}
                      placeholder="e.g. Grand Hyatt, City"
                      error={!!errors.location}`
);

content = content.replace(
`                      value={formData.status || 'Confirmed'}
                      onChange={(val) => setFormData({...formData, status: val as any})}`,
`                      value={watch('status') || 'Confirmed'}
                      onChange={(val) => setValue('status', val as any)}`
);

content = content.replace(
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" value={formData.package} onChange={e => setFormData({...formData, package: e.target.value})} placeholder="0.00" />`,
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('package')} placeholder="0.00" />`
);

content = content.replace(
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" value={formData.advance} onChange={e => setFormData({...formData, advance: e.target.value})} placeholder="0.00" />`,
`                    <input type="text" className="flex h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" {...register('advance')} placeholder="0.00" />`
);

content = content.replace(
`                    <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{formData.due || '0.00'}</span>`,
`                    <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{watch('due') || '0.00'}</span>`
);

content = content.replace(
`            <button className="px-6 py-2.5 rounded-full font-bold text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2" onClick={handleSaveBooking}>
              <i className="ph-fill ph-calendar-plus"></i> {activeEditId ? "Save Changes" : "Register Booking"}
            </button>`,
`            <button className="px-6 py-2.5 rounded-full font-bold text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
              <i className="ph-fill ph-calendar-plus"></i> {isSubmitting ? "Saving..." : activeEditId ? "Save Changes" : "Register Booking"}
            </button>`
);

fs.writeFileSync('src/components/dashboard/Modals.tsx', content);
