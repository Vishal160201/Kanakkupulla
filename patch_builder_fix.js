const fs = require('fs');
const path = './src/components/settings/LayoutsFieldsBuilder.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add updateSectionIcon
content = content.replace(
  'const updateSectionDescription = (sectionId: string, newDesc: string) => {',
  `const updateSectionIcon = (sectionId: string, newIcon: string) => {
    const l = activeLayout;
    if (!l) return;
    const sIdx = l.schema.sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const newS = [...l.schema.sections];
    newS[sIdx] = { ...newS[sIdx], icon: newIcon };
    setLayouts((prev) => prev.map((pl) => (pl.id === l.id ? { ...pl, schema: { ...pl.schema, sections: newS } } : pl)));
  };

  const updateSectionDescription = (sectionId: string, newDesc: string) => {`
);

// 2. Fix PopoverTrigger asChild issue
content = content.replace(
  '<PopoverTrigger asChild>',
  '<PopoverTrigger>'
);
content = content.replace(
  '<button className="text-orange-500 mt-1 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer border border-orange-100 outline-none">',
  '<div className="text-orange-500 mt-1 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer border border-orange-100 outline-none">'
);
content = content.replace(
  '</button>\n                      </PopoverTrigger>',
  '</div>\n                      </PopoverTrigger>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Layout Builder compilation errors!');
