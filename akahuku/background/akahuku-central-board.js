
'strict mode';

(() => {
  let createBoardEntry = (name) => {
    return {
      name: String(name),
      newestNum: 0,
      maxNum: -1,
      preserveMin: -1,
    };
  };

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

