
'strict mode';

(() => {
  let createThreadEntry = (name, thread, boardName) => {
    return {
      name: name,
      num: thread,
      boardName: boardName,
      posts: [],
      lastApplied: null,
      lastModified: (new Date()).getTime(),
      threadTime: -1,
      isNotFound: false,
    };
  };
  const THREADS_LIMIT = 256;
  let lastCleanup = 0;
  let cleanupThreads = async () => {
    let now = (new Date()).getTime();
    if (lastCleanup + 60000 > now) {//once a minute
      return;
    }
    lastCleanup = now;
    //console.log('AkahukuCentral(thread): Running cleanup at', now);
    AkahukuCentral.get('thread', null)
      .then(async (threads) => {
        if (threads.length < THREADS_LIMIT) return;
        const boards = new Map();
        for (let thread of threads) {
          boards.set(thread.boardName, null);
        }
        for (let [boardName, value] of boards) {
          let res = await AkahukuCentral.get('board', {name: boardName});
          if (res.length > 0) {
            let info = {
              info: res[0],
              expiredNum: res[0].newestNum - res[0].maxNum,
              preserve: now,
            }
            if (res[0].preserveMin > 0) {
              info.preserve -= res[0].preserveMin*60*1000;
            }
            boards.set(boardName, info);
          }
        }
        const candidates = [];
        for (let thread of threads) {
          let board = boards.get(thread.boardName);
          let expired;
          if (board) {
            if (board.expiredNum <= thread.num) {
              continue;
            }
            if (board.preserve <= thread.threadTime) {
              continue;
            }
          }
          candidates.push(thread);
        }
        let unregisterMax = threads.length - THREADS_LIMIT, unregistered = 0;
        for (let thread of candidates) {
          AkahukuCentral.unregister('thread', thread);
          unregistered++;
          if (unregistered >= unregisterMax) break;
        }
        if (unregistered > 0) {
          console.log('AkahukuCentral(thread): cleanup unregistered',
            unregistered, 'threads,', threads.length - unregistered, 'remains.')
        }
      })
      .catch((e) => {
        console.error(String(e));
      });
  };

  let listenerPosted = { observe: (subject, topic, dataNotUsed) => {
      let data = JSON.parse(subject.data);
      let board = data.server + ':' + data.dir;
      let name = board + ':' + data.thread;
      AkahukuCentral.get('thread', {name: name})
        .then((cands) => {
          let entry = (cands.length > 0 ? cands[0] : undefined);
          if (!entry) {
            entry = createThreadEntry(name, data.thread, board);
          }
          if (data.posted > 0 && !entry.posts.includes(data.posted)) {
            entry.posts.push(data.posted);
          }
          if (!entry.id) {
            AkahukuCentral.register('thread', entry);
          }
        })
        .catch((e) => {
          console.error(String(e));
        });
    },
  };
  let listenerInfo = { observe: (subject, topic, text) => {
      if (text != 'thread-applied' && text != 'thread-updated') {
        return;
      }
      let info = JSON.parse(subject.data);
      if (!(info.isReply && info.isFutaba)) {
        return;
      }
      let board = info.server + ':' + info.dir;
      let name = board + ':' + info.threadNumber;
      AkahukuCentral.get('thread', {name: name})
        .then((cands) => {
          let entry = (cands.length > 0 ? cands[0] : undefined);
          if (!entry) {
            if (info.isNotFound) {
              return;
            }
            entry = createThreadEntry(name, info.threadNumber, board);
          }
          if (entry.threadTime < 0) {
            let threadDatetime = new Date(2000+parseInt(info.year),
              parseInt(info.month)-1, parseInt(info.day),
              parseInt(info.hour), parseInt(info.min), parseInt(info.sec));
            entry.threadTime = threadDatetime.getTime();
          }
          if (text == 'thread-applied') {
            entry.lastApplied = (new Date()).getTime();
            entry.lastModified = entry.lastApplied
          } else { //'thread-updated'
            entry.lastModified = (new Date()).getTime();
          }
          entry.replyCount = info.replyCount;
          entry.isNotFound = !!(info.isNotFound);
          if (!entry.id) {
            AkahukuCentral.register('thread', entry);
            cleanupThreads();
          }
        })
        .catch((e) => {
          console.error(String(e));
        });
    },
  };

  ObserverService.addObserver(listenerPosted, 'arakahuku-thread-posted');
  ObserverService.addObserver(listenerInfo, 'arakahuku-location-info-changed');

})();

