document.addEventListener('mouseover', e => {
  const card = e.target.closest('.card');
  if (!card || card.contains(e.relatedTarget)) return;
  if (card.dataset.copy === '1') return;
  const url = card.dataset.url || '';
  if (!url || url === 'javascript:void(0);') return;
  let tooltip = card.querySelector('.card-url-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'card-url-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    card.appendChild(tooltip);
  }
  tooltip.textContent = url;
  card.classList.add('has-url-tooltip');
});
