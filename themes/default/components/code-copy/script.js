export function mount(block, runtime) {
  const button = block.querySelector('[data-code-copy]');
  const code = block.querySelector('code');
  const status = block.querySelector('[data-code-copy-status]');
  if (!button || !code) return;
  const copyLabel = button.dataset.copyLabel || button.getAttribute('aria-label') || 'Copy code';
  const copiedLabel = button.dataset.copiedLabel || 'Copied';
  const failedLabel = button.dataset.failedLabel || 'Copy failed';
  let resetTimer = 0;

  const copyText = async value => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('copy command was rejected');
  };

  button.addEventListener('click', async () => {
    window.clearTimeout(resetTimer);
    try {
      await copyText(code.textContent || '');
      button.textContent = copiedLabel;
      button.setAttribute('aria-label', copiedLabel);
      if (status) status.textContent = copiedLabel;
    } catch {
      button.textContent = failedLabel;
      button.setAttribute('aria-label', failedLabel);
      if (status) status.textContent = failedLabel;
    }
    resetTimer = window.setTimeout(() => {
      button.textContent = copyLabel;
      button.setAttribute('aria-label', copyLabel);
    }, 1600);
  }, { signal: runtime.signal });
  runtime.signal.addEventListener('abort', () => window.clearTimeout(resetTimer), { once: true });
}
