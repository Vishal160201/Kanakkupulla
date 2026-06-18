export const getCategoryIcon = (category) => {
  switch (category) {
    case 'Wedding': return { icon: 'ph-camera', class: '' };
    case 'Fashion': return { icon: 'ph-sparkle', class: 'orange' };
    case 'Baby & Kids': return { icon: 'ph-baby', class: 'orange' };
    case 'Corporate': return { icon: 'ph-buildings', class: '' };
    default: return { icon: 'ph-calendar-star', class: '' };
  }
};

export const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'Fashion': return 'badge-green';
    case 'Wedding': return '';
    default: return '';
  }
};
