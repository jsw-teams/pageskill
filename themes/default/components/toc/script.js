const media = window.matchMedia('(max-width: 760px)');

export function mount(drawer, runtime) {
  const sync = () => {
    if (media.matches) drawer.removeAttribute('open');
    else drawer.setAttribute('open', '');
  };
  sync();
  media.addEventListener?.('change', sync, { signal: runtime.signal });
}
