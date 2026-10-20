import { STUDIO_DETAILS } from '@/lib/constants';

// Dynamic Data Model
export const invoiceData = {
  invoiceNumber: '#INV-0245',
  status: 'PENDING',
  invoiceDate: '20 June 2026',
  dueDate: '10 July 2026',
  billTo: {
    name: 'Arun Kumar',
    phone: '+91 98765 43210',
    email: 'arun.kumar@email.com',
    eventDate: '28 June 2026',
    venue: 'Le Royal Meridien, Kochi',
  },
  from: {
    name: STUDIO_DETAILS.name,
    address: STUDIO_DETAILS.address,
    gstin: '32ABCDE1234F1Z5',
    phone: STUDIO_DETAILS.phone,
    email: STUDIO_DETAILS.email,
  },
  eventInformation: {
    date: '28 June 2026',
    venue: 'Le Royal Meridien, Kochi',
    package: 'Engagement Premium',
    photographer: 'Team Moondot',
  },
  items: [
    {
      description: 'Engagement Premium Package',
      subDescription: 'Full day photography coverage',
      qty: 1,
      unitPrice: 30000,
      total: 30000,
      icon: 'camera',
    },
    {
      description: 'Premium Photo Album (Optional)',
      subDescription: '12x18 inch, 40 pages',
      qty: 1,
      unitPrice: 6000,
      total: 6000,
      icon: 'book',
    },
    {
      description: 'Drone Coverage',
      subDescription: 'Aerial shots & video',
      qty: 1,
      unitPrice: 3000,
      total: 3000,
      icon: 'drone',
    },
    {
      description: 'Extra Lighting Setup',
      subDescription: 'Additional professional lights',
      qty: 1,
      unitPrice: 2000,
      total: 2000,
      icon: 'light',
    },
  ],
  financials: {
    subtotal: 41000,
    discount: 1000,
    gst: 0,
    amountPaid: 10000,
    balanceDue: 30000,
  },
  paymentProgress: {
    percentage: 24,
    paid: 10000,
    total: 41000,
    stages: [
      { step: 1, label: 'Advance', sublabel: 'Paid', percentage: '24%', completed: true },
      { step: 2, label: 'Second Payment', sublabel: 'Due', percentage: 'Before Event', completed: false },
      { step: 3, label: 'Final Payment', sublabel: 'Due', percentage: 'On Delivery', completed: false },
    ]
  },
  paymentMethods: {
    bankTransfer: {
      accountName: 'Moondot Studio',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      bank: 'HDFC Bank',
    },
    upi: 'moondotstudio@okaxis',
    whatsappPhone: STUDIO_DETAILS.phone,
  },
  terms: [
    '50% advance is required to confirm the booking.',
    'Balance to be cleared before the event or delivery.',
    'Album delivery within 30 working days after the event.',
    'Raw photos/videos will not be shared.',
    'Cancellation 15 days before the event is non-refundable.',
  ],
  socials: {
    instagram: 'instagram.com/moondot.studio',
    website: 'www.moondotstudio.com',
    phone: STUDIO_DETAILS.phone,
    email: STUDIO_DETAILS.email,
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
