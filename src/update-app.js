// SPDX-License-Identifier: GPL-3.0-or-later
export async function updateApp(registration, initialWorker, save, report) {
  const serviceWorker = navigator.serviceWorker;
  if (!registration) throw Error('Abre Piolín Chess desde su enlace web para buscar actualizaciones.');
  await save();
  report('Buscando actualizaciones…');
  const current = serviceWorker.controller;
  await registration.update();
  const worker = registration.installing || registration.waiting;
  if (worker && ['installing', 'installed', 'activating'].includes(worker.state)) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(Error('La descarga sigue en curso. Vuelve a pulsar Actualizar en un momento.')), 60000);
      function finish(error) {
        clearTimeout(timer);
        worker.removeEventListener('statechange', check);
        if (error) reject(error);
        else resolve();
      }
      function check() {
        if (worker.state === 'activated') finish();
        if (worker.state === 'redundant') finish(Error('No se pudo instalar la actualización. Inténtalo de nuevo.'));
      }
      worker.addEventListener('statechange', check);
      check();
    });
  }
  if (current !== serviceWorker.controller || serviceWorker.controller !== initialWorker) {
    await save();
    location.reload();
    return;
  }
  report('Ya tienes la última versión.');
}
