
Akahuku.debug = new AkahukuConsole();
Akahuku.debug.prefix = 'Akahuku debug(content)';

Prefs.initialize()
  .then(() => {
    AkahukuVersion = Prefs.getItem('version');
    Akahuku.init();

    Loader.addEventListener('DOMContentLoaded', (event) => {
      try {
        Akahuku.onDOMContentLoaded(event);
      }
      catch (e) {
        Akahuku.debug.exception(e);
      }
    });
    Loader.setPending(false);
  })
  .catch((err) => Akahuku.debug.exception(err));

