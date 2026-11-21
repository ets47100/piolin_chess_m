// SPDX-License-Identifier: GPL-3.0-or-later
(() => {
  const get = id => document.getElementById(id);
  const dialog = get('install-dialog');
  const status = get('install-status');
  let offer, installed = false;
  const standalone = () => installed || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    offer = event;
  });
  window.addEventListener('appinstalled', () => {
    offer = undefined;
    installed = true;
    status.textContent = 'Piolín Chess se ha instalado.';
  });
  get('install-app').addEventListener('click', () => {
    status.textContent = standalone() ? 'Piolín Chess está instalado.' : 'Elige cómo quieres abrir Piolín Chess.';
    dialog.showModal();
  });
  get('install-shortcut').addEventListener('click', () => {
    status.textContent = 'En Android, abre ⋮ → Añadir a pantalla de inicio → Crear acceso directo, si aparece. En iPhone o iPad, abre Safari → Compartir → Añadir a pantalla de inicio y desactiva «Abrir como app web» si aparece. Si tu navegador no ofrece acceso directo, puedes guardar la página en Marcadores.';
  });
  get('install-native').addEventListener('click', async () => {
    if (standalone()) {
      status.textContent = 'Piolín Chess ya está instalado.';
      return;
    }
    if (!offer) {
      status.textContent = 'Abre el menú del navegador y busca «Instalar app» o «Añadir a pantalla de inicio». En Safari, usa Compartir → Añadir a pantalla de inicio. Si el menú solo permite un acceso directo, este navegador no ofrece instalación como aplicación.';
      return;
    }
    const prompt = offer;
    offer = undefined;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'dismissed') status.textContent = 'Instalación cancelada.';
    } catch {
      status.textContent = 'No se abrió la instalación. Prueba desde el menú del navegador.';
    }
  });
})();
