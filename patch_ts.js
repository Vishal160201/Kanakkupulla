const fs = require('fs');
const path = './src/components/dashboard/BookingDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace state
content = content.replace(
  /const isEditing = false;\n  const editData: any = \{\};\n  const formErrors: Record<string, boolean> = \{\};\n  const installments: \{amount: string, date: string\}\[\] = \[\];\n  const timeInputRef = useRef<HTMLInputElement>\(null\);/,
  `const isEditing = false;
  const setIsEditing = (v: boolean) => {};
  const editData: any = {};
  const setEditData = (v: any) => {};
  const formErrors: Record<string, boolean> = {};
  const setFormErrors = (v: any) => {};
  const installments: {amount: string, date: string}[] = [];
  const setInstallments = (v: any) => {};
  const timeInputRef = useRef<HTMLInputElement>(null);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched stub functions!');
