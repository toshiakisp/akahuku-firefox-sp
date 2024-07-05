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
      isFutaba: false,
    };
  };

  if (arAkahukuServerData) {
    for (let id in arAkahukuServerData) {
      let board = createBoardEntry(id);
      board.isInternal = true;
      board.isFutaba = true;
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

          let info;
          if (data.info && !props.isInternal) {
            // 未定義の板は板名の情報を更新する
            try {
              info = JSON.parse(data.info);
            } catch (e) {
            }
            if (props.stdName != info.board && info.board)
              props.stdName = info.board;
            if (props.shortName != info.board2 && info.board2)
              props.shortName = info.board2;
            if (props.trueName != info.board3 && info.board3)
              props.trueName = info.board3;
            if (!props.isFutaba && info.isFutaba)
              props.isFutaba = info.isFutaba;
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

