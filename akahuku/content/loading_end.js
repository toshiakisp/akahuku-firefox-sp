
Akahuku.debug = new AkahukuConsole();
Akahuku.debug.prefix = 'Akahuku debug(content)';

Promise.all([
  Prefs.initialize(),
  AkahukuCentral.get('board', null)
    .catch((e) => {
      Akahuku.debug.exception(e);
      return [];
    }),
])
  .then((values) => {
    AkahukuVersion = Prefs.getItem('version');
    Akahuku.init();

    // Update board info from shared central data
    let boards = values[1];
    for (let b of boards) {
      ['newestNum', 'maxNum', 'preserveMin'
      ].forEach((prop) => {
        if (b[prop] > 0) {
          arAkahukuBoard.updatePropertyNum(b.name, prop, b[prop], true);
        }
      });
    }

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

