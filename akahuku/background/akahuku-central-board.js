'strict mode';
/* global arAkahukuServerData */

(() => {
  let createBoardEntry = (name) => {
    return {
      name: String(name),
      stdName: '',
      shortName: '',
      trueName: '',
      newestNum: 0,
      maxNum: -1,
      preserveMin: -1,
      hasCatalog: false,
      isInternal: false,
    };
  };

  if (arAkahukuServerData) {
    for (let id in arAkahukuServerData) {
      let board = createBoardEntry(id);
      board.isInternal = true;
      board.stdName = arAkahukuServerData [id][0];
      board.shortName = arAkahukuServerData [id][1];
      board.trueName = arAkahukuServerData [id][2];
      if (arAkahukuServerData [id][3] != -1) {
        board.maxNum = arAkahukuServerData [id][3];
      }
      if (arAkahukuServerData [id][4]) {
        board.hasCatalog = (arAkahukuServerData [id][4] == true);
      }
      if (arAkahukuServerData [id].length > 5) {
        var extra = arAkahukuServerData [id][5];
        for (var prop in extra) {
          board [prop] = extra [prop];
        }
      }
      AkahukuCentral.register('board', board);
    }
  }

  let listener = {
    observe: (subject, topic, dataNoUse) => {
      let data = JSON.parse(subject.data);
      AkahukuCentral.get('board', {name: data.name})
        .then(async (cands) => {
          let props = (cands.length > 0 ? cands[0] : undefined);
          if (!props) {
            props = createBoardEntry(data.name);
          }

          if (topic == 'arakahuku-board-newest-num-updated') {
            if (data.value > props.newestNum) {
              props.newestNum = data.value;
            }
          }
          else if (topic == 'arakahuku-board-lifetime-updated') {
            switch (data.property) {
              case "maxNum":
                props.maxNum = data.value;
                break;
              case "preserveMin":
                props.preserveMin = data.value;
                break;
            }
          }

          if (!props.id) {
            AkahukuCentral.register('board', props);
          }
        })
        .catch((e) => {
          console.error(String(e));
        });
    },
  };

  ObserverService.addObserver(listener, "arakahuku-board-newest-num-updated");
  ObserverService.addObserver(listener, "arakahuku-board-lifetime-updated");

})();

