const fs = require('fs');

const path = './src/components/settings/LayoutsFieldsBuilder.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Imports
content = content.replace(
  'import { ColorPicker } from "../ui/color-picker";',
  `import { ColorPicker } from "../ui/color-picker";\nimport { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";\nimport { APP_ICONS_BY_CATEGORY } from "@/lib/appIcons";`
);

// 2. Add updateSectionIcon function
content = content.replace(
  'const updateSectionDescription = (sectionId: string, description: string) => {',
  `const updateSectionIcon = (sectionId: string, newIcon: string) => {
    const l = activeLayout;
    if (!l) return;
    const sIdx = l.schema.sections.findIndex((s) => s.id === sectionId);
    if (sIdx === -1) return;
    const newS = [...l.schema.sections];
    newS[sIdx] = { ...newS[sIdx], icon: newIcon };
    setLayouts((prev) => prev.map((pl) => (pl.id === l.id ? { ...pl, schema: { ...pl.schema, sections: newS } } : pl)));
  };

  const updateSectionDescription = (sectionId: string, description: string) => {`
);

// 3. Replace Icon rendering with Popover
const iconSearch = `<div className="text-orange-500 mt-1">
                      <i className={\`ph-fill \${section.icon || 'ph-squares-four'} text-2xl\`}></i>
                    </div>`;

const iconReplace = `<Popover>
                      <PopoverTrigger asChild>
                        <button className="text-orange-500 mt-1 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer border border-orange-100 outline-none">
                          <i className={\`ph-fill \${section.icon || 'ph-squares-four'} text-2xl\`}></i>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 rounded-2xl border-slate-100 shadow-xl" align="start">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Section Icon</p>
                        </div>
                        <div className="p-2 max-h-72 overflow-y-auto">
                          {Object.entries(APP_ICONS_BY_CATEGORY).map(([cat, icons]) => (
                            <div key={cat} className="mb-3 last:mb-0">
                              <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">{cat}</p>
                              <div className="grid grid-cols-5 gap-1">
                                {icons.map(icon => (
                                  <button
                                    key={icon.id}
                                    onClick={() => updateSectionIcon(section.id, icon.className)}
                                    title={icon.label}
                                    className={\`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all \${section.icon === icon.className ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-600 hover:bg-slate-100 hover:text-orange-600'}\`}
                                  >
                                    <i className={\`ph-fill \${icon.className}\`}></i>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>`;

content = content.replace(iconSearch, iconReplace);

// 4. Implement Section Drag & Drop
// Add state
content = content.replace(
  'const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);',
  `const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);`
);

// Add Section drop handler
content = content.replace(
  'const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {',
  `const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    if (!draggedSectionId || draggedSectionId === targetSectionId) return;

    const l = activeLayout;
    if (!l) return;

    const sections = [...l.schema.sections];
    const sourceIdx = sections.findIndex(s => s.id === draggedSectionId);
    const targetIdx = sections.findIndex(s => s.id === targetSectionId);
    
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = sections.splice(sourceIdx, 1);
    sections.splice(targetIdx, 0, moved);

    setLayouts(prev => prev.map(pl => pl.id === l.id ? { ...pl, schema: { ...pl.schema, sections } } : pl));
    setDraggedSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {`
);

// Add drag handlers to section div
content = content.replace(
  /<div \n\s*key=\{section\.id\} \n\s*className=\{`group\/section relative bg-slate-50 border rounded-2xl p-8 transition-colors \$\{/g,
  `<div 
                  key={section.id} 
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedSectionId(section.id);
                  }}
                  onDragEnd={() => {
                    setDraggedSectionId(null);
                    setDragOverSectionId(null);
                  }}
                  className={\`group/section relative bg-slate-50 border rounded-2xl p-8 transition-colors \${
                    dragOverSectionId === section.id ? 'border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.3)] -translate-y-1' : ''} \${`
);

// We need to also fix the inner div onDragOver
content = content.replace(
  /onDragOver=\{\(e\) => \{\n\s*e\.preventDefault\(\);\n\s*e\.dataTransfer\.dropEffect = draggedNewFieldType \? "copy" : "move";\n\s*setDragOverTarget\(\{ sectionId: section\.id, fieldIndex: section\.fields\.length \}\);\n\s*\}\}\n\s*onDrop=\{\(e\) => \{\n\s*e\.preventDefault\(\);\n\s*handleDrop\(e, section\.id, section\.fields\.length\);\n\s*\}\}/g,
  `onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedSectionId) {
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverSectionId !== section.id) setDragOverSectionId(section.id);
                    } else {
                      e.dataTransfer.dropEffect = draggedNewFieldType ? "copy" : "move";
                      setDragOverTarget({ sectionId: section.id, fieldIndex: section.fields.length });
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedSectionId) {
                      handleSectionDrop(e, section.id);
                    } else {
                      handleDrop(e, section.id, section.fields.length);
                    }
                  }}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched Layout Builder successfully');
