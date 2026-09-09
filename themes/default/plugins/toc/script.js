const media = window.matchMedia('(max-width: 760px)');
const drawers = [...document.querySelectorAll('.toc-drawer')];

const syncResponsiveState = () => {
  for (const drawer of drawers) {
    if (media.matches) drawer.removeAttribute('open');
    else drawer.setAttribute('open', '');
  }
};

syncResponsiveState();
media.addEventListener?.('change', syncResponsiveState);
