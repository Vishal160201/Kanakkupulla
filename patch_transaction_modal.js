const fs = require('fs');
const path = './src/components/dashboard/TransactionModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useSearchParams import
content = content.replace(
  'import { useRouter } from "next/navigation";',
  'import { useRouter, useSearchParams } from "next/navigation";'
);

// 2. Add useSearchParams hook
content = content.replace(
  '  const router = useRouter();\n  const isOpen = true;\n  const onClose = () => router.back();',
  '  const router = useRouter();\n  const searchParams = useSearchParams();\n  const isOpen = true;\n  const onClose = () => router.back();'
);

// 3. Populate default form from URL
content = content.replace(
  '        setForm(defaultForm);\n      }\n      setErrors({});\n    }\n  }, [isOpen, editTransaction, layoutSchema]);',
  `        const urlType = searchParams.get('type');
        const urlCategory = searchParams.get('category');
        if (urlType) defaultForm.type = urlType;
        if (urlCategory) defaultForm.category = urlCategory;
        
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [isOpen, editTransaction, layoutSchema, searchParams]);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched TransactionModal.tsx');
