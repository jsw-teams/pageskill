const blocks = [...document.querySelectorAll('[data-code-block]')];

const copyText = async value => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy command was rejected');
};

for (const block of blocks) {
  const button = block.querySelector('[data-code-copy]');
  const code = block.querySelector('code');
  const status = block.querySelector('[data-code-copy-status]');
  if (!button || !code) continue;
  const copyLabel = button.dataset.copyLabel || button.getAttribute('aria-label') || 'Copy code';
  const copiedLabel = button.dataset.copiedLabel || 'Copied';
  const failedLabel = button.dataset.failedLabel || 'Copy failed';
  button.addEventListener('click', async () => {
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
    window.setTimeout(() => {
      button.textContent = copyLabel;
      button.setAttribute('aria-label', copyLabel);
    }, 1600);
  });
}
