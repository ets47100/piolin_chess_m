// SPDX-License-Identifier: GPL-3.0-or-later
(() => {
  const button = document.getElementById('install-app');
  let installPrompt;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    button.hidden = true;
    try {
      await prompt.prompt();
    } catch (error) {
      console.error('No se pudo abrir el diálogo de instalación:', error);
    }
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
  });
})();
