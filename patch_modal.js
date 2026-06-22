const fs = require('fs');
const path = './src/components/dashboard/BookingDetailsModal.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* 3 Main Columns */}'));
const endIndex = lines.findIndex(l => l.includes('{/* Package & Payment */}'));

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `                {/* 3 Main Columns for Dynamic Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {layoutSchema && layoutSchema.sections && layoutSchema.sections.map((section: any) => {
                    // Evaluate section visibility
                    if (section.visibilityRule && section.visibilityRule.fieldId) {
                      const depVal = (booking as any)[section.visibilityRule.fieldId] || booking.customData?.[section.visibilityRule.fieldId];
                      if (section.visibilityRule.operator === 'EQUALS' && depVal !== section.visibilityRule.value) return null;
                      if (section.visibilityRule.operator === 'NOT_EQUALS' && depVal === section.visibilityRule.value) return null;
                    }

                    // For the Financial section, we skip it here and show it in the dedicated Package & Payment block
                    if (section.id === 'sec_booking_financial') return null;

                    return (
                      <div key={section.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-2.5">
                            <i className={\`ph-duotone \${section.icon || 'ph-squares-four'} text-indigo-500 text-xl\`}></i>
                            <h3 className="text-[1.05rem] font-black text-[#0B1E40]">{section.title}</h3>
                          </div>
                        </div>
                        <div className="flex flex-col gap-5">
                          {section.fields.map((field: any) => {
                            // Evaluate field visibility
                            if (field.visibilityRule && field.visibilityRule.fieldId) {
                              const depVal = (booking as any)[field.visibilityRule.fieldId] || booking.customData?.[field.visibilityRule.fieldId];
                              if (field.visibilityRule.operator === 'EQUALS' && depVal !== field.visibilityRule.value) return null;
                              if (field.visibilityRule.operator === 'NOT_EQUALS' && depVal === field.visibilityRule.value) return null;
                            }

                            const fieldName = standardFieldMap[field.id] || field.id;
                            const val = (booking as any)[fieldName] !== undefined ? (booking as any)[fieldName] : booking.customData?.[fieldName];

                            let displayVal: React.ReactNode = val || 'N/A';

                            if (field.type === 'DATE' && val) {
                              displayVal = new Date(val).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            } else if (field.type === 'USER_PICKLIST') {
                              const user = teamUsers.find((u: any) => u.id === val);
                              displayVal = user ? user.name : (val || 'Unassigned');
                            } else if (field.type === 'MULTI_USER_PICKLIST') {
                              let userIds: string[] = [];
                              if (Array.isArray(val)) userIds = val;
                              else if (typeof val === 'string') userIds = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                              const users = userIds.map((id: string) => teamUsers.find((u: any) => u.id === id)?.name || id);
                              displayVal = users.length > 0 ? users.join(', ') : 'Unassigned';
                            } else if (field.type === 'MULTI_SELECT' && Array.isArray(val)) {
                              displayVal = val.join(', ');
                            } else if (field.type === 'CURRENCY' && val) {
                              displayVal = \`₹\${parseFloat(val).toLocaleString()}\`;
                            }

                            const iconClass = getFieldIcon(field);
                            const [iconName, iconColor] = iconClass.split(' ');
                            const bgClass = iconColor.replace('text-', 'bg-').replace('500', '50').replace('400', '50');

                            return (
                              <div key={field.id} className="flex items-center gap-4">
                                <div className={\`w-8 h-8 rounded-full \${bgClass} flex items-center justify-center shrink-0\`}>
                                  <i className={\`ph-fill \${iconName} \${iconColor} text-[1.1rem]\`}></i>
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest truncate">{field.name}</span>
                                  <span className="font-bold text-[#0B1E40] text-[0.95rem] break-words whitespace-pre-wrap">{displayVal}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                   {/* Timeline */}
                   <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[1.05rem] font-black text-[#0B1E40]">Timeline</h3>
                      </div>
                      <div className="flex flex-col relative">
                         {(() => {
                           const activeIndex = statusOptions.findIndex((o: any) => o.label === booking.status);
                           const isCompleted = activeIndex === statusOptions.length - 1 && booking.status === 'Completed';
                           
                           return statusOptions.map((opt: any, idx: number) => {
                             const isPast = activeIndex > idx || isCompleted;
                             const isCurrent = activeIndex === idx && !isCompleted;
                             
                             let circleClass = '';
                             let icon = null;
                             
                             if (isPast) {
                               circleClass = 'bg-emerald-500 shadow-[0_0_0_4px_white] z-20';
                               icon = <i className="ph-bold ph-check text-white text-xs"></i>;
                             } else if (isCurrent) {
                               circleClass = 'bg-blue-500 border-[6px] border-white shadow-[0_0_0_1px_#3b82f6] z-20';
                               icon = <div className="w-1.5 h-1.5 rounded-full bg-white"></div>;
                             } else {
                               circleClass = 'bg-gray-200 border-[4px] border-white z-20';
                             }
                             
                             return (
                               <div key={idx} className="flex gap-4 mb-5 relative">
                                  {idx < statusOptions.length - 1 && (
                                     <div className={\`absolute left-[11px] top-6 h-[calc(100%+20px)] w-0.5 z-0 \${isPast ? 'bg-emerald-500' : 'bg-gray-100'}\`}></div>
                                  )}
                                  <div className={\`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 \${circleClass}\`}>
                                     {icon}
                                  </div>
                                  <div className="flex flex-col z-10 bg-white/50 pr-2">
                                     <span className={\`font-bold text-[0.9rem] \${isCurrent || isPast ? 'text-[#0B1E40]' : 'text-slate-500'}\`}>{opt.label}</span>
                                     <span className="text-slate-400 text-[0.7rem] font-semibold mt-0.5">{isCurrent ? 'In Progress' : isPast ? 'Completed' : 'Pending'}</span>
                                  </div>
                               </div>
                             );
                           });
                         })()}
                      </div>
                   </div>
                </div>`;
  lines.splice(startIndex, endIndex - startIndex, replacement);
  fs.writeFileSync(path, lines.join('\n'));
  console.log('Success!');
} else {
  console.log('Could not find start or end index.');
}
