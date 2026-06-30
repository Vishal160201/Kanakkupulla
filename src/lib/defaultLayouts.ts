export const DEFAULT_LAYOUTS = [
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
              { label: "Shoot Completed", color: "bg-blue-500" },
              { label: "Cancelled", color: "bg-slate-500" }
            ] },
          ]
        },
        {
          id: "sec_booking_album",
          title: "Album Details",
          description: "Details regarding the album design and delivery.",
          icon: "ph-book-open",
          fields: [
            { id: "fld_b_album_type", name: "Album Type", type: "PICK_LIST", mandatory: false, options: ["Standard", "Premium", "Mini", "None"] },
            { id: "fld_b_album_status", name: "Album Status", type: "STATUS_PICKER", mandatory: false, statusOptions: [
              { label: "Pending", color: "#f43f5e" },
              { label: "Designing", color: "#f59e0b" },
              { label: "Sent for printing", color: "#3b82f6" },
              { label: "Ready for delivery", color: "#8b5cf6" },
              { label: "Delivered", color: "#10b981" }
            ] },
            { id: "fld_gallery_delivered", name: "Gallery Delivered", type: "CHECKBOX", mandatory: false }
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
            { id: "fld_tx_date", name: "Date", type: "DATE", mandatory: true, isRecordDate: true },
            { id: "fld_tx_category", name: "Category", type: "PICK_LIST", mandatory: true, options: [
              "Photography Session",
              "Equipment Rent",
              "Salary",
              "Travel",
              "Other",
              "Printout",
              "Xerox",
              "PP",
              "Others",
              "Chit fund",
              "Tea & snacks",
              "Bus fare",
              "E-Sevai",
              "Booking Advance",
              "Passport Photo",
              "Frame Sales",
              "Editing Charges",
              "Album Payment"
            ] },
            { id: "fld_tx_mode", name: "Payment Mode", type: "PICK_LIST", mandatory: true, options: ["Cash", "Bank Transfer", "UPI", "Cheque"] },
            { id: "fld_tx_desc", name: "Description", type: "MULTI_LINE", mandatory: false },
          ]
        }
      ] 
    }
  },
  {
    formKey: "GIFT_ORDER_FORM",
    name: "Gift Order Form",
    description: "Fields used when creating a new gift order.",
    schema: {
      sections: [
        {
          id: "sec_gift_details",
          title: "Order Details",
          icon: "ph-gift",
          fields: [
            { id: "fld_g_product", name: "Product", type: "PICK_LIST", mandatory: true, options: ["Keychain", "Mug Print", "Lamination", "Photoframe", "Mobile Case", "Fridge Magnet", "Backlight Photo", "Frontlight Photo", "Visiting Card", "Invitation", "Voter ID", "Aadhaar Card", "Smart Card"] },
            { id: "fld_g_quantity", name: "Quantity", type: "NUMBER", mandatory: true },
            { id: "fld_g_due_date", name: "Target Delivery Date", type: "DATE", mandatory: false },
            { id: "fld_g_reference_image", name: "Reference Image", type: "FILE", mandatory: false },
            { id: "fld_g_size", name: "Size", type: "PICK_LIST", mandatory: false, options: ["A4", "A3", "ID Card", "12x18", "16x20", "20x30"], visibilityRule: { fieldId: "fld_g_product", operator: "CONTAINS", values: ["Lamination"] } },
            { id: "fld_g_model", name: "Phone Model", type: "SINGLE_LINE", mandatory: false, visibilityRule: { fieldId: "fld_g_product", operator: "EQUALS", values: ["Mobile Case"] } },
            { id: "fld_g_type", name: "Type", type: "PICK_LIST", mandatory: false, options: ["Matte", "Glossy", "Textured"], visibilityRule: { fieldId: "fld_g_product", operator: "EQUALS", values: ["Visiting Card"] } },
            { id: "fld_g_event", name: "Event Type", type: "SINGLE_LINE", mandatory: false, visibilityRule: { fieldId: "fld_g_product", operator: "EQUALS", values: ["Invitation"] } }
          ]
        },
        {
          id: "sec_gift_client",
          title: "Client Information",
          icon: "ph-user",
          fields: [
            { id: "fld_g_client_name", name: "Client Name", type: "SINGLE_LINE", mandatory: true },
            { id: "fld_g_client_phone", name: "Client Phone", type: "PHONE", mandatory: false }
          ]
        },
        {
          id: "sec_gift_payment",
          title: "Payment Details",
          icon: "ph-currency-inr",
          locked: true,
          fields: [
            { id: "fld_g_amount", name: "Total Amount (₹)", type: "CURRENCY", mandatory: true },
            { id: "fld_g_advance", name: "Advance Amount (₹)", type: "CURRENCY", mandatory: false },
            { id: "fld_g_due", name: "Due Amount (₹)", type: "CURRENCY", mandatory: false },
            { id: "fld_g_payment_mode", name: "Payment Mode", type: "PICK_LIST", mandatory: true, options: ["Cash", "UPI", "Bank Transfer", "Card"] }
          ]
        }
      ]
    }
  }
];
