const fs = require('fs');
const path = './src/components/dashboard/BookingDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace state
content = content.replace(
  /const \[isEditing, setIsEditing\] = useState\(false\);\n  const \[editData, setEditData\] = useState<any>\(\{\}\);\n  const \[formErrors, setFormErrors\] = useState<Record<string, boolean>>\(\{\}\);\n  const \[installments, setInstallments\] = useState<\{amount: string, date: string\}\[\]>\(\[\]\);\n  const timeInputRef = useRef<HTMLInputElement>\(null\);/,
  `const isEditing = false;
  const editData: any = {};
  const formErrors: Record<string, boolean> = {};
  const installments: {amount: string, date: string}[] = [];
  const timeInputRef = useRef<HTMLInputElement>(null);`
);

// We'll leave the functions there, they just won't be called, or we can replace their body.
content = content.replace(
  /const handleEditToggle = \(\) => \{[\s\S]*?\n  \};\n\n  useEffect\(\(\) => \{[\s\S]*?return \(\) => \{ if \(fp\) fp\.destroy\(\); \};\n  \}, \[isEditing\]\);/,
  `const handleEditToggle = () => {};`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched isEditing!');
