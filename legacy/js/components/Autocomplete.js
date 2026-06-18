export const initAutocomplete = (store) => {
  const clientSuggestions = document.getElementById('client-suggestions');
  const locationSuggestions = document.getElementById('location-suggestions');

  const updateSuggestions = (state) => {
    if (!clientSuggestions || !locationSuggestions) return;

    const clients = [...new Set(state.bookings.map(b => b.title))].filter(Boolean);
    clientSuggestions.innerHTML = clients.map(c => `<option value="${c}">`).join('');

    const locations = [...new Set(state.bookings.map(b => b.location))].filter(Boolean);
    locationSuggestions.innerHTML = locations.map(l => `<option value="${l}">`).join('');
  };

  // Initial populate
  updateSuggestions(store.getState());

  // Subscribe to store changes so suggestions update when bookings change
  store.subscribe(updateSuggestions);

  // Dynamic autocomplete datalists to prevent empty suggestions showing up immediately
  const dynamicDatalistInputs = document.querySelectorAll('input[data-list-id]');
  dynamicDatalistInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const listId = e.target.getAttribute('data-list-id');
      if (e.target.value.length > 0) {
        e.target.setAttribute('list', listId);
      } else {
        e.target.removeAttribute('list');
      }
    });
  });
};
