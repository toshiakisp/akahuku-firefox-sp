
const arIAkahukuP2PServant2 = Components.interfaces.arIAkahukuP2PServant2;

const arIAkahukuP2PServantListener = Components.interfaces.arIAkahukuP2PServantListener;

const nsISupports           = Components.interfaces.nsISupports;

const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIFactory            = Components.interfaces.nsIFactory;
const nsIModule             = Components.interfaces.nsIModule;

const nsIServerSocket           = Components.interfaces.nsIServerSocket;
const nsIServerSocketListener   = Components.interfaces.nsIServerSocketListener;
const nsITransport              = Components.interfaces.nsITransport;
const nsISocketTransport        = Components.interfaces.nsISocketTransport;
const nsISocketTransportService = Components.interfaces.nsISocketTransportService;
const nsITransportEventSink     = Components.interfaces.nsITransportEventSink;

const nsIFile      = Components.interfaces.nsIFile;
const nsILocalFile = Components.interfaces.nsILocalFile;

const nsIFileInputStream       = Components.interfaces.nsIFileInputStream;
const nsIBinaryInputStream     = Components.interfaces.nsIBinaryInputStream;
const nsIFileOutputStream      = Components.interfaces.nsIFileOutputStream;
const nsIInputStreamPump       = Components.interfaces.nsIInputStreamPump;
const nsIBufferedOutputStream  = Components.interfaces.nsIBufferedOutputStream;
const nsIStringInputStream     = Components.interfaces.nsIStringInputStream;
const nsIScriptableInputStream = Components.interfaces.nsIScriptableInputStream;

const nsICryptoHash = Components.interfaces.nsICryptoHash;

const nsITimer         = Components.interfaces.nsITimer;
const nsITimerCallback = Components.interfaces.nsITimerCallback;

const nsIWindowMediator     = Components.interfaces.nsIWindowMediator;

const nsIIOService       = Components.interfaces.nsIIOService;
const nsIObserverService = Components.interfaces.nsIObserverService;

const nsIThread = Components.interfaces.nsIThread;
const nsIThreadManager = Components.interfaces.nsIThreadManager;
const nsIEventTarget = Components.interfaces.nsIEventTarget;
const nsIRunnable = Components.interfaces.nsIRunnable;

/**
 * ポートチェッカ
 *   Inherits From: nsITimerCallback
 *                  nsITransportEventSink
 */
function arAkahukuP2PServantPortChecker () {
}
arAkahukuP2PServantPortChecker.prototype = {
  /* 通信関連 */
  transport : null,    /* nsISocketTransport  通信 */
  inputStream : null,  /* nsIInputStream  ソケットの入力 */
  outputStream : null, /* nsIOutputStream  ソケットの入力 */
    
  checkTimer : null,  /* nsITimer  通信管理用のタイマ */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsITransportEventSink/nsITimerCallback
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsITimerCallback)
        || iid.equals (nsITransportEventSink)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * ポートチェックする
   *
   * @param  String address
   *         IP アドレス/ホスト名
   * @param  Number port 
   *         ポート番号
   */
  checkPort : function (address, port) {
    try {
      this.transport
      = Components.classes
      ["@mozilla.org/network/socket-transport-service;1"]
      .getService (nsISocketTransportService)
      .createTransport (null, 0, address, port, null);
            
      this.transport.setTimeout (nsISocketTransport.TIMEOUT_READ_WRITE,
                                 arAkahukuP2PServant2.READ_WRITE_TIMEOUT);
      this.transport.setTimeout (nsISocketTransport.TIMEOUT_CONNECT,
                                 arAkahukuP2PServant2.CONNECT_TIMEOUT);
            
      var currentThread
        = Components.classes ["@mozilla.org/thread-manager;1"]
        .getService (nsIThreadManager).currentThread;
      this.transport.setEventSink (this, currentThread);
            
      this.inputStream
      = this.transport.openInputStream (0, 0, 0);
      this.outputStream
      = this.transport.openOutputStream (nsITransport.OPEN_BLOCKING,
                                         0, 0);
            
      this.checkTimer
      = Components.classes ["@mozilla.org/timer;1"]
      .createInstance (nsITimer);
      this.checkTimer.initWithCallback
      (this,
       arAkahukuP2PServant2.PORT_CHECK_TIMEOUT,
       nsITimer.TYPE_ONE_SHOT);
    }
    catch (e) {
    }
  },
    
  /**
   * 接続状態変更イベント
   *   nsITransportEventSink.onTransportStatus
   *
   * @param  nsITransport transport
   *         呼び出し元の通信
   * @param  Number status
   *         ステータス
   * @param  Number progress
   *         進行状況
   * @param  Number progressMax
   *         進行状況の最大
   */
  onTransportStatus : function (transport, status, progress, progressMax) {
    if (status == nsISocketTransport.STATUS_CONNECTED_TO) {
      /* 接続完了 */
      this.notify (null);
    }
  },
    
  /**
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (timer) {
    if (this.checkTimer != null) {
      this.checkTimer.cancel ();
      this.checkTimer = null;
    }
        
    var inputStream = this.inputStream;
    var outputStream = this.outputStream;
    var transport = this.transport;
        
    this.transport = null;
    this.inputStream = null;
    this.outputStream = null;
        
    if (inputStream) {
      try {
        inputStream.close ();
      }
      catch (e) {
      }
    }
        
    if (outputStream) {
      try {
        outputStream.close ();
      }
      catch (e) {
      }
    }
        
    if (transport) {
      try {
        transport.close (0);
      }
      catch (e) {
      }
    }
        
  },
};    

/**
 * 各ノードとの通信
 *   Inherits From: nsIStreamListener, nsIRequestObserver
 *                  nsITimerCallback
 *                  nsITransportEventSink
 */
function arAkahukuP2PNode () {
  this.boardList = new Object ();
  this.relayBoardList = new Object ();
}
arAkahukuP2PNode.prototype = {
  /* ノード自身の情報 */
  nodeName : "",       /* String  ノード文字列
                        *   襲い専のノードは空 */
  address : "",        /* String  IP アドレス／ホスト名 */
  port : 0,            /* Number  ポート番号 */
  version : "",        /* String  プロトコルのバージョン */
  akahukuVersion : "", /* String  赤福のバージョン */
    
  boardList : null,      /* Object  板の閲覧状況
                          *   <String サーバ名/ディレクトリ名,
                          *    Number 最終閲覧の時間 [s]> */
  relayBoardList : null, /* Object  リレーできる板の状況
                          *   <String サーバ名/ディレクトリ名,
                          *    Number 最終閲覧の時間 [s]> */
    
  connected : false,  /* Boolean  受動接続かどうか */
    
  prev : false,       /* Boolean  前回接続していたか */
    
  lastAliveTime : 0,  /* Number  最後に生存を確認した時刻
                       *   板で発見した場合、PING／PONG を受けた場合に更新する */
    
  /* 接続制御関連 */
  priority : 0,       /* Number  優先度 */
    
  emptySlotCount : 0, /* Number  接続の空き枠数 */
    
  connectTime : 0,    /* Number  接続した時刻 [ms] */
  disconnectTime : 0, /* Number  切断した時刻 [ms]
                       *   一度も切断していない場合は 0 */
  reconnectDelay : 0, /* Number  再接続するまでの時間 [ms] */
    
  failedCount : 0,    /* Number  接続に失敗した回数 */
    
  bye : false, /* Boolean  BYE を受信したか */
    
  /* 通信制御 */
  checkTimer : null,  /* Number  通信管理用のタイマ
                       *   PING、ノードリストの送信に使用する*/
    
  statTime : 0,       /* Number  最後に STAT を打った時刻 [ms] */
  nodeTime : 0,       /* Number  最後に NODE を打った時刻 [ms] */
  pingTime : 0,       /* Number  最後に PING を打った時刻 [ms] */
  ping : -1,          /* Number  PING 値 [ms]
                       *   受信前は -1 */
    
  /* 接続情報 */
  status : 0,         /* Number  ステータス
                       *   arAkahukuP2PServant2.STATUS_? */
  errorCode : 0,      /* Number  エラーコード、切断した理由
                       *   arAkahukuP2PServant2.ERROR_? */
  isWorst : false,    /* Boolean  優先順位が最下位か */
  worstTime : -1,     /* Number  優先順位が最下位になった時刻 [ms]
                       *   最下位でなければ -1 */
  whoamiBad : false,  /* Boolean  WHOAMI の応答が異常
                       *   同じ LAN 内の可能性あり */
    
  /* 送受信情報 */
  successTime : 0,    /* Number  最後にファイルの送受信に成功した時刻 [ms]
                       *   まだ成功していない場合はは 0 */
  sendSuccess : 0,    /* Number  ファイルを自分が送信した回数 */
  recvSuccess : 0,    /* Number  ファイルを自分が受信した回数 */
    
  relayTime : 0,      /* Number  最後にファイルのリレーに成功した時刻 [ms]
                       *   まだ成功していない場合はは 0 */
  relaySuccess : 0,   /* Number  ファイルをリレーした回数 */
    
  /* 通信関連 */
  transport : null,    /* nsISocketTransport  通信 */
  inputStream : null,  /* nsIInputStream  ソケットの入力 */
  bstream : null,      /* nsIBinaryInputStream  ソケットのバイナリ入力
                        *   入力にはこちらを使用する*/
  outputStream : null, /* nsIOutputStream  ソケットの入力 */
    
  currentData : "",    /* String  入力データ */
  currentMethod : "",  /* String  現在処理しているメソッド */
  currentLength : -1,  /* Number  現在取得しているデータの長さ
                        *   ヘッダを取得している場合は -1 */
  currentRelayed : "", /* String  現在取得しているデータの relayed ヘッダ */
  currentHash : "",    /* String  現在取得しているデータの hash ヘッダ */
  currentID : "",      /* String  現在取得しているデータの id ヘッダ */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIStreamListener
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsITimerCallback)
        || iid.equals (nsITransportEventSink)
        || iid.equals (nsIRequestObserver)
        || iid.equals (nsIStreamListener)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 優先度を更新する
   *
   * @param  Number now
   *         現在の時刻
   */
  updatePriority : function (now) {
    var i, j;
    var priority = 0;
        
    /* 見ている板が同じ数だけ優先度を上げる */
    for (board in this.boardList) {
      if (board in arAkahukuP2PServant2.boardList) {
        priority += 100;
      }
    }
        
    if (this.status == arAkahukuP2PServant2.STATUS_WAIT) {
      /* 待機中 */
      if (this.prev) {
        /* 前回接続していれば 1 上げる */
        priority += 10000;
      }
      if (this.version != arAkahukuP2PServant2.PROTOCOL_VERSION) {
        /* バージョンが違うと 1 下げる */
        priority -= 10000;
      }
    }
    else {
      /* 接続中 */
            
      for (board in this.relayBoardList) {
        if (board in arAkahukuP2PServant2.boardList) {
          priority += 30;
        }
      }
            
      if (arAkahukuP2PServant2.isSleep) {
        /* 休止中はリレーをメインに計算する */
                
        priority
        += (this.sendSuccess + this.recvSuccess) / 10;
                
        priority
        += this.relaySuccess;
                
        if (now < this.relayTime
            + arAkahukuP2PServant2.PRIORITY_BONUS_TIME) {
          /* 最近送受信した場合 */
                    
          /* 全体の合計を加算する */
          priority += arAkahukuP2PServant2.relaySuccess;
        }
      }
      else {
        /* 動作中は自分の送受信をメインに計算する */
                
        priority
        += this.sendSuccess + this.recvSuccess;
                
        priority
        += this.relaySuccess / 10;
                
        if (now < this.successTime
            + arAkahukuP2PServant2.PRIORITY_BONUS_TIME) {
          /* 最近送受信した場合 */
                    
          /* 全体の合計を加算する */
          priority += arAkahukuP2PServant2.sendSuccess
            + arAkahukuP2PServant2.recvSuccess;
        }
      }
    }
        
    this.priority = priority;
  },
    
  /**
   * 通信から初期化
   *
   * @param  nsISocketTransport transport
   *         通信
   * @param  Boolean connected
   *         受動接続かどうか
   * @return Boolean
   *         初期化できたか
   */
  setTransport : function (transport, connected) {
    try {
      this.successTime = 0;
      this.relayTime = 0;
      this.currentData = "";
            
      this.transport = transport;
            
      /* タイムアウト設定 */
      this.transport.setTimeout (nsISocketTransport.TIMEOUT_READ_WRITE,
                                 arAkahukuP2PServant2.READ_WRITE_TIMEOUT);
      this.transport.setTimeout (nsISocketTransport.TIMEOUT_CONNECT,
                                 arAkahukuP2PServant2.CONNECT_TIMEOUT);

      /* 能動接続の場合、接続完了をチェック */
      if (!connected) {
        var currentThread
          = Components.classes ["@mozilla.org/thread-manager;1"]
          .getService (nsIThreadManager).currentThread;
        this.transport.setEventSink (this, currentThread);
      }
            
      /* 送受信開始 */
      this.inputStream
      = this.transport.openInputStream (0, 0, 0);
      this.outputStream
      = this.transport.openOutputStream (nsITransport.OPEN_BLOCKING,
                                         0, 0);
      this.bstream
      = Components.classes ["@mozilla.org/binaryinputstream;1"]
      .createInstance (nsIBinaryInputStream);
      this.bstream.setInputStream (this.inputStream);
            
      var pump
      = Components.classes ["@mozilla.org/network/input-stream-pump;1"]
      .createInstance (nsIInputStreamPump);
      pump.init (this.inputStream, -1, -1, 0, 0, false);
      pump.asyncRead (this, null);
      /* チェック開始 */
      this.checkTimer
      = Components.classes ["@mozilla.org/timer;1"]
      .createInstance (nsITimer);
      this.checkTimer.initWithCallback
      (this,
       arAkahukuP2PServant2.NODE_CHECK_INTERVAL,
       nsITimer.TYPE_REPEATING_SLACK);
    }
    catch (e) {
      this.failedCount ++;
      this.disconnect (arAkahukuP2PServant2.ERROR_UNREACHABLE, 0);
            
      return false;
    }
        
    return true;
  },
    
  /**
   *  接続する
   *
   * @return Boolean
   *         接続中か
   */
  connect : function () {
    this.connected = false;
    this.bye = false;
    this.prev = false;
        
    //dump ("                   connect: " + this.nodeName + ":" + this.address + ":" + this.status + "\n");
        
    try {
      var transport
        = Components.classes
        ["@mozilla.org/network/socket-transport-service;1"]
        .getService (nsISocketTransportService)
        .createTransport (null, 0, this.address, this.port, null);
    }
    catch (e) {
      this.status = arAkahukuP2PServant2.STATUS_WAIT;
      this.errorCode = arAkahukuP2PServant2.ERROR_UNREACHABLE;
      this.failedCount ++;
            
      return false;
    }
        
    this.status = arAkahukuP2PServant2.STATUS_CONNECTING;
    this.errorCode = arAkahukuP2PServant2.ERROR_NO;
        
    var now = (new Date ()).getTime ();
        
    return this.setTransport (transport, false);
  },
    
  /**
   * 接続が確立した
   */
  onConnect : function () {
    var now = (new Date ()).getTime ();
        
    //dump ("                 onconnect: " + this.nodeName + ":" + this.address + "\n");
        
    this.connectTime = now;
    this.status = arAkahukuP2PServant2.STATUS_START;
    this.errorCode = arAkahukuP2PServant2.ERROR_NO;
    this.failedCount = 0;
        
    arAkahukuP2PServant2.activeNodeList.push (this); 
        
    if (!this.connected) {
      /* 能動接続の場合、ステータスを送信する */
      arAkahukuP2PServant2.sendStatus (this);
    }
  },
    
  /**
   * 切断する
   *
   * @param  Number errorCode
   *         エラーコード
   * @param  Number state
   *         切断の状態
   *           0: こちらからの切断、BYE 送信
   *           1: こちらからの切断、BYE 非送信
   *           2: BYE 受信
   */
  disconnect : function (errorCode, state) {
    this.disconnectTime = (new Date ()).getTime ();
        
    //dump ("                disconnect: " + this.nodeName + ":" + this.address + ":" + this.status + ":" + this.errorCode + "->" + errorCode + "\n");
        
    if (state == 2) {
      this.bye = true;
      this.errorCode = errorCode;
    }
    else {
      if (!this.bye
          && this.errorCode < errorCode) {
        this.errorCode = errorCode;
      }
    }
        
    this.reconnectDelay
    = arAkahukuP2PServant2.RECONNECT_DELAY;
    if (this.connected) {
      /* 相手から接続された場合には同時に再接続しないように遅らせる */
      this.reconnectDelay
        += arAkahukuP2PServant2.RECONNECT_DELAY_DIFF;
    }
        
    if (this.nodeName
        && errorCode <  arAkahukuP2PServant2.ERROR_BORDER) {
      /* 次回の接続待ち */
      this.status = arAkahukuP2PServant2.STATUS_WAIT;
    }
    else {
      /* 削除する */
      this.status = arAkahukuP2PServant2.STATUS_REMOVING;
    }
        
    /* チェックを終了 */
    if (this.checkTimer != null) {
      this.checkTimer.cancel ();
      this.checkTimer = null;
    }
        
    /* 通信まわりを終了する */
    var inputStream = this.inputStream;
    var outputStream = this.outputStream;
    var bstream = this.bstream;
    var transport = this.transport;
        
    this.transport = null;
    this.inputStream = null;
    this.bstream = null;
    this.outputStream = null;
    this.currentData = "";
    this.currentLength = -1;
    this.currentRelayed = "";
    this.currentHash = "";
        
    if (bstream && inputStream) {
      try {
        /* Firefox のバージョンによっては
         * inputStream のチェックをしないので
         * 設定しないとクラッシュする事がある */
        bstream.setInputStream (inputStream);
        bstream.close ();
      }
      catch (e) {
      }
    }
        
    if (inputStream) {
      try {
        inputStream.close ();
      }
      catch (e) {
      }
    }
        
    if (state == 1) {
      var code = 0;
            
      if (errorCode == arAkahukuP2PServant2.ERROR_STOPPING
          || errorCode == arAkahukuP2PServant2.ERROR_PEER_LIMIT) {
        code = 100;
      }
      else if (errorCode == arAkahukuP2PServant2.ERROR_VERSION) {
        code = 200;
      }
      else if (errorCode == arAkahukuP2PServant2.ERROR_DUP) {
        code = 300;
      }
            
      if (transport && outputStream) {
        arAkahukuP2PServant2.sendBye (transport, outputStream, code);
                
        /* BYE を送信する場合、あとは完了してから */
        return;
      }
    }
        
    if (outputStream) {
      try {
        outputStream.close ();
      }
      catch (e) {
      }
    }
        
    if (transport) {
      try {
        transport.close (0);
      }
      catch (e) {
      }
    }
  },
    
  /**
   * 接続が終了したイベント
   */
  onDisconnect : function () {
    this.disconnect (arAkahukuP2PServant2.ERROR_CONNECTION_TIMEOUT, 0);
  },
    
  /**
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (timer) {
    var now = (new Date ()).getTime ();
        
    if (this.status == arAkahukuP2PServant2.STATUS_ALIVE) {
      /* 初回の STAT 受信完了後 */
            
      if (now > this.nodeTime
          + arAkahukuP2PServant2.NODE_INTERVAL) {
        arAkahukuP2PServant2.sendNode (this);
      }
            
      if (!this.connected) {
        /* 能動接続の場合 */
                
        if (now > this.statTime
            + arAkahukuP2PServant2.STATUS_INTERVAL) {
          /* 2 回目以降の STAT 送信 */
          arAkahukuP2PServant2.sendStatus (this);
        }
                
        arAkahukuP2PServant2.sendPING (this, 0);
      }
    }
    else {
      /* 初回の STAT 受信前 */
            
      if (now > this.connectTime
          + arAkahukuP2PServant2.STATUS_TIMEOUT) {
        this.disconnect (arAkahukuP2PServant2.ERROR_STATUS_TIMEOUT, 0);
      }
    }
  },
    
  /**
   * 接続状態変更イベント
   *   nsITransportEventSink.onTransportStatus
   *
   * @param  nsITransport transport
   *         呼び出し元の通信
   * @param  Number status
   *         ステータス
   * @param  Number progress
   *         進行状況
   * @param  Number progressMax
   *         進行状況の最大
   */
  onTransportStatus : function (transport, status, progress, progressMax) {
    if (status == nsISocketTransport.STATUS_CONNECTED_TO) {
      /* 接続完了 */
      this.onConnect ();
            
      transport.setEventSink (null, null);
    }
  },
    
  /**
   * リクエスト開始のイベント
   *   nsIRequestObserver.onStartRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   */
  onStartRequest : function (request, context) {
  },
    
  /**
   * リクエスト終了のイベント
   *   nsIRequestObserver.onStopRequest
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  Number statusCode
   *         終了コード
   */
  onStopRequest : function (request, context, statusCode) {
    this.onDisconnect ();
        
    arAkahukuP2PServant2.onStop (this);
  },
    
  /**
   * データ到着のイベント
   *   nsIStreamListener.onDataAvailable
   *
   * @param  nsIRequest request
   *         対象のリクエスト
   * @param  nsISupports context
   *         ユーザ定義
   * @param  nsIInputStream inputStream
   *         データを取得するストリーム
   * @param  PRUint32 offset
   *         データの位置
   * @param  PRUint32 count 
   *         データの長さ
   */
  onDataAvailable : function (request, context, inputStream, offset, count) {
    try {
      var chunk = this.bstream.readBytes (count);
      this.currentData += chunk;
    }
    catch (e) {
      request.cancel (0);
    }
        
    while (true) {
      /* 受信完了しているヘッダ、ボディを全て処理する */
            
      if (this.currentLength != -1) {
        /* ボディ受信中 */
        if (this.currentData.length >= this.currentLength) {
          /* ボディ受信完了 */
          var data = this.currentData.substr (0, this.currentLength);
          this.currentData
          = this.currentData.substr (this.currentLength);
          arAkahukuP2PServant2.onData (data, this);
          this.currentLength = -1;
        }
        else {
          /* 続きのデータを待つ */
          break;
        }
      }
            
      /* ヘッダの末尾を検索 */
      var pos = this.currentData.indexOf ("\r\n\r\n");
      if (pos != -1) {
        /* ヘッダ受信完了 */
        var request = this.currentData.substr (0, pos + 2);
        this.currentData = this.currentData.substr (pos + 4);
        var result = arAkahukuP2PServant2.onRequest (request, this);
        if (result == 1) {
          /* バージョンが違う場合、エラー終了する */
          this.disconnect (arAkahukuP2PServant2.ERROR_VERSION, 1);
          break;
        }
        else if (result == 2) {
          /* プロトコルが違う場合、エラー終了する */
          this.disconnect (arAkahukuP2PServant2.ERROR_UNKNOWN_HEADER,
                           0);
          break;
        }
      }
      else if (this.currentData.length
               > arAkahukuP2PServant2.HEADER_LIMIT) {
        /* ヘッダが大きすぎる場合、エラー終了する */
        this.disconnect (arAkahukuP2PServant2.ERROR_LONG_HEADER, 0);
        break;
      }
      else {
        /* 続きのデータを待つ */
        break;
      }
    }
  }
};

/**
 * リクエスト
 */
function arAkahukuP2PRequest () {
}
arAkahukuP2PRequest.prototype = {
  node : null,          /* arAkahukuP2PNode  使用しているノード */
    
  id : "",              /* String  リクエストの ID */
    
  relayNode : null,     /* arAkahukuP2PNode  リレー元のノード
                         *   自分のリクエストの場合は null */
  relayedList : null,   /* Object  リレーで経由したノードリスト
                         *   <String ノード文字列, Boolean ダミー> */
  relayCount : 0,       /* Number  リレーする回数 */
  relayID : "",         /* String  リレーリクエストの ID */
    
  timeoutCount : 0,     /* Number  タイムアウトになった回数 */
    
  path : "",            /* String  対象のファイルのパス */
  server : "",          /* String  対象のファイルのサーバ名 */
  dir : "",             /* String  対象のファイルのディレクトリ名 */
  type : "",            /* String  対象のファイルの種類 */
  leafName : "",        /* String  対象のファイルのファイル名 */
    
  targetFileName : "",  /* String  変換先のファイル名 */
    
  nodeList : null,      /* Array  取得を試行するノード
                         *   [arAkahukuP2PNode, ...] */
  firstNodeList : null, /* Array  リレーなしで最初に取得を試行するノード
                         *   [arAkahukuP2PNode, ...] */
  startTime : 0,        /* Number  取得を開始した時刻 [ms]
                         *   リクエストを中断するかどうかのチェックに使用する */
  timeout : 0,     /* Number  リクエストを中断する時間 [ms] */
  totalStartTime : 0,   /* Number  全体の取得を開始した時刻 [ms]
                         *   リクエストを中断するかどうかのチェックに使用する */
  totalTimeout : 0,     /* Number  リクエスト全体を中断する時間 [ms] */
    
  listener : null       /* arIAkahukuP2PServantListener  リクエストのリスナ
                         *   リレー中の場合は null */
};

/**
 * P2P の Servant
 *   Inherits From: nsIServerSocketListener
 *                  nsITransportEventSink
 *                  nsITimerCallback
 *                  arIAkahukuP2PServant2
 */
var arAkahukuP2PServant2 = {
  /* 接続情報 */
  serverSocket : null, /* nsIServerSocket  サーバソケット */
    
  nodeName : "",       /* String  自分のノード名 */
  address : "",        /* String  自分の IP アドレス */
  port : 0,            /* Number  自分のポート番号 */
    
  noaccept : false,    /* Boolean  襲い専かどうか */
  dynamic : false,     /* Boolean  IP アドレスを自動更新するか */
  nocat : false,       /* Boolean  カタログ画像は P2P 経由しないか */
    
  akahukuVersion : "", /* String  赤福のバージョン */
    
  first : true,        /* Boolean  次が最初の開始か */
  started : false,     /* Boolean  開始したか */
  stopOffline : false, /* Boolean  オフラインモードで終了したか */
    
  /* キャッシュファイル */
  cacheCheckTime : 0,  /* Number  キャッシュをチェックした時刻 [ms] */
  cacheSrcLimit : 0,   /* Number  src キャッシュの最大個数 */
  cacheThumbLimit : 0, /* Number  thumb キャッシュの最大個数 */
  cacheCatLimit : 0,   /* Number  cat キャッシュの最大個数 */
  cacheBase : "",      /* String  キャッシュのディレクトリ */
  separator : "/",     /* String  ディレクトリの区切り */
    
  enableTreatAsSame : false, /* Boolean  feb, apr のキャッシュをまとめる */
    
  /* ノード関連 */
  nodeList : new Array (),       /* Array  保持しているノード
                                  *   [arAkahukuP2PNode, ...] */
  activeNodeList : new Array (), /* Array  使用中の接続
                                  *   [arAkahukuP2PNode, ...] */
    
  /* 自分の情報 */
  isSleep : false,               /* Boolean  休止モードか */
  boardList : new Object (),      /* Object  板の閲覧状況
                                   *   <String サーバ名/ディレクトリ名,
                                   *    Number 最終閲覧の時刻 [s]> */
    
  addList : new Object (),     /* Object  追加待ちのノード
                                *   チェックのタイマで追加する
                                *     開始時に初期化しない
                                *   <String ノード文字列,
                                *     [Boolean 終了前に接続していたか,
                                *      Number  追加した時刻 [s],
                                *      String  板のリスト]> */
  nodeList : new Array (),     /* Array  保持しているノード
                                *   接続していないノードも含む
                                *   [arAkahukuP2PNode, ...] */
  requestList : new Object (), /* Object  取得中のリクエスト
                                *   <String id, arAkahukuP2PRequest> */
  requestCount : 0,            /* Number  取得中のリクエストの数 */
  requestIndex : 0,            /* Number  リクエストの通し番号 */
    
  serverStartTime : 0,         /* サーバを開始した時刻 */
    
  transferCheckTimer : null, /* nsITimer  送信量チェック用のタイマー */
  checkCount : 0,            /* Number  自分のチェックタイマーのカウント */
  boardCheckCount : 0,       /* Number  板のチェックタイマーのカウント */
    
  startupTimer : null,       /* nsITimer  開始のタイマー */
  cacheClearTimer : null,    /* nsITimer  キャッシュ削除タイマー */
    
  lastDynamicSendTime : 0, /* Number  IP アドレスを取得しようとした時刻 [ms] */
  lastDynamicTime : 0,     /* Number  IP アドレスを更新した時刻 [ms]
                            *   接続が 0 になるとリセットする */
  dynamicID : 0,           /* Number  WHOAMI の id */
    
  /* キャッシュ削除情報 */
  forceClearCacheNow : false,     /* Boolean  強制削除をしているか */
  cacheCheckServerEntries : null, /* nsISimpleEnumerator server のエントリ */
  cacheCheckServer : null,        /* nsIFIle server */
  cacheCheckDirEntries : null,    /* nsISimpleEnumerator dir のエントリ */
  cacheCheckDir : null,           /* nsIFIle dir */
  cacheCheckTypeEntries : null,   /* nsISimpleEnumerator type のエントリ */
  cacheCheckType : null,          /* nsIFIle type */
  cacheCheckFileEntries : null,   /* nsISimpleEnumerator type 内のエントリ */
  cacheCheckFileList : null,      /* Array  ファイルのリスト
                                   *   [[ファイルの数値, ファイル名], ...] */
  cacheCheckCount : 0,            /* Number  前回の中断から処理したファイル数 */
  cacheCheckI : 0,                /* Number  処理中のファイルインデックス */
  cacheCheckState : 0,            /* Number  キャッシュチェックの状況
                                   *   0: 切り捨て境界サーチ
                                   *   1: ソート前
                                   *   2: 削除中 */

  /* ポートチェック情報 */
  portCheckFailed : 0,     /* Number  ポートチェックに失敗した回数 */
  portCheckState : 0,      /* Number  ポートチェックの状況
                            *   0: まだポートチェックしていない
                            *      もしくはする必要がない
                            *   1: CHECK を送信した
                            *   2: CHECK を受信した
                            *   3: ポートが開いていた */
  portCheckTime : 0,        /* Number  ポートチェックを開始した時刻 [ms] */
    
  /* 送受信情報 */
  sendSuccess : 0,    /* Number  ファイルを自分が送信した回数 */
  recvSuccess : 0,    /* Number  ファイルを自分が受信した回数 */
  relaySuccess : 0,   /* Number  ファイルをリレーした回数 */
  recvFail : 0,       /* Number  ファイルを自分が受信できなかった回数 */
    
  last1SecBytes : 0,   /* Number  過去 0-1 秒間の送信バイト数 */
  last2SecBytes : 0,   /* Number  過去 1-2 秒間の送信バイト数 */

  /* 定数 */
    
  CONNECT_SLOT : 3, /* 能動接続の数 */
  ACCEPT_SLOT : 32, /* 受動接続の数 */
    
  RECONNECT_DELAY : 5 * 60 * 1000, /* 再接続までの時間 [ms] */
  RECONNECT_DELAY_DIFF : 15 * 1000, /* 受動接続の場合の再接続までの時間の差 [ms] */
    
  READ_WRITE_TIMEOUT : 60,  /* Number  切断するまでの無通信の時間 [s] */
  CONNECT_TIMEOUT : 10,     /* Number  接続を諦めるまでの時間 [s] */
    
  NODE_TIMEOUT : 3 * 24 * 60 * 60, /* Number  最後の生存確認から無効に
                                    *   なるまでの時間 [s] */
    
  WORST_NODE_TIMEOUT : 10 * 60 * 1000, /* 優先順位が最下位のノードの
                                        * 切断期限 [ms] */

  PRIORITY_BONUS_TIME : 3 * 60 * 1000, /* 優先度にボーナスを与える
                                        * 最近送受信した時刻からの時間 [ms] */
    
  RESET_SERVER_INTERVAL : 10 * 60 * 1000, /* サーバを作り直す間隔 [ms] */
  RESET_SERVER_INTERVAL2 : 5 * 1000, /* 失敗後にサーバを作り直す間隔 [ms] */
    
  TRANSFER_CHECK_INTERVAL : 1 * 1000, /* 送信量チェックの間隔 [ms] */
  CHECK_INTERVAL : 3,                 /* 接続、送受信チェックの間隔 */
  NODE_CHECK_INTERVAL : 20 * 1000,    /* ノードごとの送受信チェック間隔 [ms]
                                       *   PING を打つ間隔 */
  BOARD_CHECK_INTERVAL : 60,          /* Number  板のリストをチェックする間隔 */
    
  BOARD_LIST_TIMEOUT : 10 * 60,  /* Number  板のリストから除外するまでの時間
                                  *   [s] */
    
  DYNAMIC_SEND_INTERVAL : 60 * 1000, /* Number  IP アドレスの自動更新の
                                      *   試行間隔 [ms] */
  DYNAMIC_INTERVAL : 30 * 60 * 1000, /* Number  IP アドレスの自動更新の
                                      *   間隔 [ms] */

  PORT_CHECK_TIMEOUT : 60 * 1000, /* Number  ポートチェックの応答の
                                   *  タイムアウト [ms] */

    
  NODE_INTERVAL : 5 * 60 * 1000, /* Number  NODE を送る間隔 [ms] */
  STATUS_INTERVAL : 60 * 1000,   /* Number  STAT を送る間隔 [ms] */
    
  STATUS_TIMEOUT : 15 * 1000, /* Number  初回の STAT 受信までの
                               *   タイムアウト [ms] */

  REQUEST_TIMEOUT : 2 * 1000,         /* Number  そのノードのリクエストを
                                       *   諦めるまでの時間 [ms] */
  REQUEST_TIMEOUT2 : 6 * 1000,        /* Number  プリフェッチで
                                       *   そのノードのリクエストを
                                       *   諦めるまでの時間 [ms] */
  REQUEST_TOTAL_TIMEOUT : 6 * 1000,   /* Number  全体のリクエストを
                                       *   諦めるまでの時間 [ms] */
  REQUEST_TOTAL_TIMEOUT2 : 20 * 1000, /* Number  プリフェッチの全体のリクエストを
                                       *   諦めるまでの時間 [ms] */
    
  SLEEP_TIMEOUT : 10 * 60 * 1000, /* Number  休止モードに入るまでの時間 [ms] */
    
  STARTUP_DELAY : 1000,             /* Number  初回の開始の遅延 */
    
  CACHE_CHECK_INTERVAL : 30 * 60 * 1000, /* Number  キャッシュチェックの
                                          *   間隔 [ms] */
  CACHE_CHECK_INTERVAL2 : 3 * 1000,      /* Number  キャッシュチェックの
                                          *   再試行の間隔 [ms] */
  CACHE_CHECK_ONETIME_LIMIT : 100,       /* Number  キャッシュを一度に処理する
                                          *   数 */
    
  MAX_RELAY_COUNT : 3, /* Number  リレーの最大数 */
    
  FAILED_LIMIT : 3, /* Number  削除するまでの接続失敗の数 */

  TIMEOUT_LIMIT : 2, /* Number  P2P からの取得を諦めるまでのタイムアウトの数 */
    
  REQUEST_LIMIT : 128, /* Number  同時に出すリクエストの最大数 */
    
  TRANSFER_LIMIT : 128 * 1024, /* Number  送信帯域制限 [Bytes/s] */
    
  HEADER_LIMIT : 32 * 1024, /* Number  ヘッダの最大長
                             *   32 kBytes */
    
  NODE_LIMIT : 50, /* Number  保持するノードの数 */
    
  PROTOCOL_NAME : "AKA",
  PROTOCOL_VERSION : "0.9",
    
  PROTOCOL_METHOD_GET : "GET",
  PROTOCOL_METHOD_PUT : "PUT",
  PROTOCOL_METHOD_NA : "NA",
  PROTOCOL_METHOD_PING : "PING",
  PROTOCOL_METHOD_NODE : "NODE",
  PROTOCOL_METHOD_STATUS : "STAT",
  PROTOCOL_METHOD_WHOAMI : "WHOAMI",
  PROTOCOL_METHOD_YOUARE : "YOUARE",
  PROTOCOL_METHOD_CHECK : "CHECK",
  PROTOCOL_METHOD_FULL : "FULL",
  PROTOCOL_METHOD_BYE : "BYE",
    
  STATUS_ALIVE        :   0, /* STAT 受信完了 */
  STATUS_START        :  10, /* 接続完了 */
  STATUS_CONNECTING   : 100, /* 接続中 */
  STATUS_ACTIVE_BORER : 199, /* 使用中の境界 */
    
  STATUS_WAIT         : 200, /* 待機中 */
  STATUS_REMOVING     : 300, /* 削除中 */
    
  ERROR_NO                    :   0, /* エラーなし */
  ERROR_STOPPING              :  10, /* 終了 */
  ERROR_FULL                  : 100, /* 満員 */
  ERROR_PEER_LIMIT            : 110, /* 最大接続数からあぶれた */
  ERROR_VERSION               : 200, /* バージョン違い */
  ERROR_UNREACHABLE           : 300, /* 接続不可 */
  ERROR_CONNECTION_TIMEOUT    : 310, /* 接続が切れた */
  ERROR_STATUS_TIMEOUT        : 400, /* STATUS が来なかった */
  ERROR_SEND_FAIL             : 500, /* 送信に失敗した */
  ERROR_BORDER                : 599, /* 次回の接続が望めるかどうかの境界 */
  ERROR_UNKNOWN_HEADER        : 600, /* ヘッダの内容が異常 */
  ERROR_LONG_HEADER           : 610, /* ヘッダの長さが異常 */
  ERROR_DUP                   : 700, /* 重複 */
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return arIAkahukuP2PServant2
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIServerSocketListener)
        || iid.equals (nsITransportEventSink)
        || iid.equals (nsITimerCallback)
        || iid.equals (arIAkahukuP2PServant2)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /** 
   * 接続されたイベント
   *   nsIServerSocketListener.onSocketAccepted
   * 
   * @param  nsIServerSocket serverSocket
   *         サーバソケット
   * @param  nsISocketTransport transport
   *         クライアントとの通信
   */
  onSocketAccepted : function  (serverSoskcet, transport) {
    if (arAkahukuP2PServant2.activeNodeList.length
        >= arAkahukuP2PServant2.CONNECT_SLOT
        + arAkahukuP2PServant2.ACCEPT_SLOT) {
      /* 接続枠が埋まっている場合、満員エラーを送信して終了する */
      arAkahukuP2PServant2.sendFull (transport);
            
      return;
    }
        
    /* 接続されればポートチェックは不要 */
    arAkahukuP2PServant2.portCheckState = 3;
    arAkahukuP2PServant2.portCheckFailed = 0;
        
    var node = new arAkahukuP2PNode ();
    node.address = transport.host;
    node.port = 0;
    node.connected = true;
    node.status = arAkahukuP2PServant2.STATUS_CONNECTING;
    node.errorCode = arAkahukuP2PServant2.ERROR_NO;
    if (!node.setTransport (transport, true)) {
      return;
    }
    node.onConnect ();
        
    arAkahukuP2PServant2.nodeList.push (node); 
        
    //dump ("                 connected: " + node.nodeName + ":" + node.address + "\n");
  },
    
  /*
   * 受け付けが終わったイベント
   *   nsIServerSocketListener.onStopListening
   * 
   * @param  nsIServerSocket serverSocket
   *         サーバソケット
   * @param  nsresult status
   *         ステータス
   */
  onStopListening : function (serverSocket, status) {
  },
    
  /**
   * ARFCOUR 暗号化/複合化
   *
   * @param  String key
   *         鍵
   * @param  String text
   *         平文
   * @return String
   *         暗号文
   */
  arcfour : function (key, text) {
    var S = new Array (256);
    var S2 = new Array (256);
    var i, j, k, t, temp;
        
    for (i = 0; i < 256; i ++){
      S [i] = i;
    }
        
    for (i = 0; i < 256; i ++){
      S2 [i] = key.charCodeAt (i % key.length);
    }
        
    j = 0;
    for (i = 0; i < 256; i ++) {
      j = (j + S [i] + S2 [i]) % 256;
      temp = S [i];
      S [i] = S [j];
      S [j] = temp;
    }
        
    i = 0;
    j = 0;
    var K = "";
    for (k = 0; k < text.length; k ++) {
      i = (i + 1) % 256;
      j = (j + S [i]) % 256;
      temp = S [i];
      S [i] = S [j];
      S [j] = temp;
      t = (S [i] + S [j]) % 256;
      K += String.fromCharCode (S [t] ^ text.charCodeAt (k));
    }
        
    return K;
  },
    
  /**
   * Base64 っぽいものをデコードする
   *
   * @param  String text
   *         デコードする文字列
   * @return String
   *         デコードした文字列
   */
  atob_mod : function (text) {
    var b
    = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.";
        
    var result = "";
    var part1, part2, part3, part4;

    for (var i = 0; i < text.length; i += 4) {
      part1 = b.indexOf (text.substr (i, 1));
      part2 = b.indexOf (text.substr (i + 1, 1));
      part3 = b.indexOf (text.substr (i + 2, 1));
      part4 = b.indexOf (text.substr (i + 3, 1));
            
      if (part1 != -1 && part2 != -1) {
        result += String.fromCharCode ((part1 << 2)
                                       | (part2 >> 4));
      }
      if (part2 != -1 && part3 != -1 && part3 != 64) {
        result += String.fromCharCode (((part2 & 0x0f) << 4)
                                       | (part3 >> 2));
      }
      if (part3 != -1 && part4 != -1 && part4 != 64) {
        result += String.fromCharCode (((part3 & 0x03) << 6)
                                       | (part4));
      }
    }
        
    return result;
  },
    
  /**
   * Base64 っぽいものにエンコードする
   *
   * @param  String text
   *         エンコードする文字列
   * @return String
   *         エンコードした文字列
   */
  btoa_mod : function (text) {
    var b
    = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.";
        
    var result = "";
    var c;
    var part1, part2, part3, part4;
        
    for (var i = 0; i < text.length; i += 3) {
      c = text.charCodeAt (i) & 0xff;
      part1 = c >> 2;
      part2 = (c & 0x3) << 4;
      if (i + 1 == text.length) {
        part3 = 64;
        part4 = 64;
      }
      else {
        c = text.charCodeAt (i + 1) & 0xff;
        part2 |= (c & 0xf0) >> 4;
        part3 = (c & 0x0f) << 2;
        if (i + 2 == text.length) {
          part4 = 64;
        }
        else {
          c = text.charCodeAt (i + 2) & 0xff;
          part3 |= (c & 0xc0) >> 6;
          part4 = c & 0x3f;
        }
      }
      result
        += b.substr (part1, 1)
        + b.substr (part2, 1)
        + b.substr (part3, 1)
        + b.substr (part4, 1);
    }
    return result;
  },
    
  /**
   * MD5 を 4 バイトずつ区切って XOR を取る
   *
   * @param  String data
   *         元の文字列
   * @return String
   *         MD5 を 4 バイトずつ区切って XOR を取ったもの
   */
  md5_4 : function (data) {
    var r
    = new Array (7, 12, 17, 22,
                 5,  9, 14, 20,
                 4, 11, 16, 23,
                 6, 10, 15, 21);
            
    var k = new Array ();
            
    for (var i = 0; i < 64; i ++) {
      k [i]
        = parseInt (Math.abs (Math.sin (i + 1)) * Math.pow (2, 32));
    }
                                
    var h0 = 0x67452301;
    var h1 = 0xEFCDAB89;
    var h2 = 0x98BADCFE;
    var h3 = 0x10325476;
            
    var length = data.length * 8;
    data += "\x80";
    while (data.length % 64 != 56) {
      data += "\x00";
    }
            
    data += String.fromCharCode ((length      )  & 0xff);
    data += String.fromCharCode ((length >>  8)  & 0xff);
    data += String.fromCharCode ((length >> 16)  & 0xff);
    data += String.fromCharCode ((length >> 24)  & 0xff);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
    data += String.fromCharCode (0x00);
            
    for (var j = 0; j < data.length; j += 64) {
      var w = new Array ();
      for (var i = 0; i < 16; i ++) {
        w [i]
          = (data.charCodeAt (j + i * 4    )      )
          | (data.charCodeAt (j + i * 4 + 1) <<  8)
          | (data.charCodeAt (j + i * 4 + 2) << 16)
          | (data.charCodeAt (j + i * 4 + 3) << 24);
      }
                
      var a = h0;
      var b = h1;
      var c = h2;
      var d = h3;
                
      for (var i = 0; i < 64; i ++) {
        var f, g, ii;
        if (0 <= i && i <= 15) {
          f = (b & c) | (~b & d);
          g = i;
          ii = i % 4;
        }
        else if (16 <= i && i <= 31) {
          f = (d & b) | (~d & c);
          g = (5 * i + 1) % 16;
          ii = 4 + (i % 4);
        }
        else if (32 <= i && i <= 47) {
          f = b ^ c ^ d;
          g = (3 * i + 5) % 16;
          ii = 8 + (i % 4);
        }
        else if (48 <= i && i <= 63) {
          f = c ^ (b | ~d);
          g = (7 * i) % 16;
          ii = 12 + (i % 4);
        }
                    
        var temp = d;
        d = c;
        c = b;
        var temp2 = a + f + k [i] + w [g];
        while (temp2 < 0) {
          temp2 += 4294967296;
        }
        while (temp2 > 4294967295) {
          temp2 -= 4294967296;
        }
        var temp3 = (temp2 << r [ii]) | (temp2 >>> (32 - r [ii]));
        temp3 += b;
        while (temp3 < 0) {
          temp3 += 4294967296;
        }
        while (temp3 > 4294967295) {
          temp3 -= 4294967296;
        }
        b = temp3;
        a = temp;
      }
                
      h0 = h0 + a;
      h1 = h1 + b;
      h2 = h2 + c;
      h3 = h3 + d;
    }
            
    data
    = String.fromCharCode ((h0      ) & 0xff)
    + String.fromCharCode ((h0 >>  8) & 0xff)
    + String.fromCharCode ((h0 >> 16) & 0xff)
    + String.fromCharCode ((h0 >> 24) & 0xff)
    + String.fromCharCode ((h1      ) & 0xff)
    + String.fromCharCode ((h1 >>  8) & 0xff)
    + String.fromCharCode ((h1 >> 16) & 0xff)
    + String.fromCharCode ((h1 >> 24) & 0xff)
    + String.fromCharCode ((h2      ) & 0xff)
    + String.fromCharCode ((h2 >>  8) & 0xff)
    + String.fromCharCode ((h2 >> 16) & 0xff)
    + String.fromCharCode ((h2 >> 24) & 0xff)
    + String.fromCharCode ((h3      ) & 0xff)
    + String.fromCharCode ((h3 >>  8) & 0xff)
    + String.fromCharCode ((h3 >> 16) & 0xff)
    + String.fromCharCode ((h3 >> 24) & 0xff);
        
    data
    = String.fromCharCode (data.charCodeAt (0)
                           ^ data.charCodeAt (4)
                           ^ data.charCodeAt (8)
                           ^ data.charCodeAt (12))
    + String.fromCharCode (data.charCodeAt (1)
                           ^ data.charCodeAt (5)
                           ^ data.charCodeAt (9)
                           ^ data.charCodeAt (13))
    + String.fromCharCode (data.charCodeAt (2)
                           ^ data.charCodeAt (6)
                           ^ data.charCodeAt (10)
                           ^ data.charCodeAt (14))
    + String.fromCharCode (data.charCodeAt (3)
                           ^ data.charCodeAt (7)
                           ^ data.charCodeAt (11)
                           ^ data.charCodeAt (15));
        
    return data;
  },
    
  /**
   * IP アドレス/ホスト名からノード名に変換する
   *   arIAkahukuP2PServant2.encodeNodeName
   *
   * @param  String address
   *         IP アドレス/ホスト名
   * @param  Number port 
   *         ポート番号
   * @return String
   *         ノード名
   */
  encodeNodeName : function (address, port) {
    var nodeName = "";
        
    if (address && port) {
      port
        = String.fromCharCode (port & 0xff)
        + String.fromCharCode ((port >> 8) & 0xff);
      address
        = arAkahukuP2PServant2.arcfour (port, address);

      var key
        = arAkahukuP2PServant2.md5_4 (address + port);
      var text
        = port + address;
            
      text
        = key + arAkahukuP2PServant2.arcfour (key, text);
      text
        = arAkahukuP2PServant2.btoa_mod (text);
            
      nodeName
        = "="
        + arAkahukuP2PServant2.PROTOCOL_NAME
        + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
        + ":" + text + "=";
    }
        
    return nodeName;
  },
    
  /**
   * ノード名からアドレスに変換する
   *   arIAkahukuP2PServant2.decodeNodeName
   *
   * @param  String nodeName
   *         ノード名
   * @return Array
   *           [String IP アドレス/ホスト名, Number ポート番号,
   *            String バージョン]
   */
  decodeNodeName : function (nodeName) {
    if (nodeName.match (/^=([^\/]+)\/([^:]+):([^=]+)=$/)) {
      var protocol = RegExp.$1;
      var version = RegExp.$2;
      var text = RegExp.$3;
            
      if (protocol != arAkahukuP2PServant2.PROTOCOL_NAME) {
        return null;
      }
      if (version != arAkahukuP2PServant2.PROTOCOL_VERSION) {
        /* バージョンチェックは一時的に外す */
        //return null;
      }
            
      text
      = arAkahukuP2PServant2.atob_mod (text);
            
      if (text.length <= 6) {
        /* キー: 4 バイト、ポート番号: 2 バイトなので
         * アドレスが空になる */
        return null;
      }
            
      var key = text.substr (0, 4);
      text = text.substr (4);
            
      text = arAkahukuP2PServant2.arcfour (key, text);
            
      var port = text.substr (0, 2);
      var address = text.substr (2);
            
      var key2 = arAkahukuP2PServant2.md5_4 (address + port);
      if (key != key2) {
        /* ハッシュが合わない */
        return null;
      }
            
      address
      = arAkahukuP2PServant2.arcfour (port, address);
      port
      = (port.charCodeAt (1) << 8)
      | port.charCodeAt (0);
            
      return new Array (address, port);
    }
        
    return null;
  },
  
  /**
   * 設定の変更、および終了のイベント
   *   nsIObserver.observe
   *
   * @param  nsISupports subject
   *         不明
   * @param  String topic
   *         通知の対象
   * @param  String data
   *         通知の内容
   */
  observe : function (subject, topic, data) {
    if (topic == "xpcom-shutdown") {
      /* 終了の場合 */
            
      var observerService
      = Components.classes ["@mozilla.org/observer-service;1"]
      .getService (Components.interfaces.nsIObserverService);
            
      arAkahukuP2PServant2.stop ();
            
      /* オブザーバの登録を削除する */
      observerService.removeObserver
      (arAkahukuP2PServant2, "xpcom-shutdown");
      observerService.removeObserver
      (arAkahukuP2PServant2, "network:offline-about-to-go-offline");
      observerService.removeObserver
      (arAkahukuP2PServant2, "network:offline-status-changed");
    }
    else if (topic == "network:offline-about-to-go-offline") {
      /* オフラインの状態変更の場合 */
            
      /* オフラインに移行前 */
      if (arAkahukuP2PServant2.started) {
        arAkahukuP2PServant2.stopOffline = true;
      }
            
      if (arAkahukuP2PServant2.started) {
        arAkahukuP2PServant2.stop ();
      }
    }
    else if (topic == "network:offline-status-changed") {
      /* オフラインの状態変更の場合 */
            
      if (data == "online") {
        /* オンラインに移行後 */
        if (arAkahukuP2PServant2.stopOffline) {
          arAkahukuP2PServant2.start (arAkahukuP2PServant2.noaccept);
        }
      }
    }
  },
    
  /**
   * サーバソケットを作り直す
   *
   * @param  Number now
   *         現在の時刻
   */
  resetServer : function (now) {
    if (!arAkahukuP2PServant2.noaccept
        && arAkahukuP2PServant2.serverStartTime
        && now > arAkahukuP2PServant2.serverStartTime
        + arAkahukuP2PServant2.RESET_SERVER_INTERVAL) {
      arAkahukuP2PServant2.serverStartTime = 0;
            
      if (arAkahukuP2PServant2.serverSocket) {
        try {
          arAkahukuP2PServant2.serverSocket.close ();
        }
        catch (e) {
        }
        arAkahukuP2PServant2.serverSocket = null;
      }
            
      arAkahukuP2PServant2.serverSocket
      = Components.classes ["@mozilla.org/network/server-socket;1"]
      .createInstance (nsIServerSocket);
            
      try {
        arAkahukuP2PServant2.serverSocket.init
          (arAkahukuP2PServant2.port, false, -1);
                
        arAkahukuP2PServant2.serverSocket.asyncListen
          (arAkahukuP2PServant2);
        arAkahukuP2PServant2.serverStartTime = now;
      }
      catch (e) {
        /* ポートが使用中 */
        arAkahukuP2PServant2.serverStartTime
        = now - arAkahukuP2PServant2.RESET_SERVER_INTERVAL
        + arAkahukuP2PServant2.RESET_SERVER_INTERVAL2;
      }
    }
  },
    
  /**
   * 開始する
   *   arIAkahukuP2PServant2.start
   *
   * @param  Boolean noaccept
   *         襲い専かどうか
   * @return Boolean
   *         開始したかどうか
   */
  start : function (noaccept) {
    arAkahukuP2PServant2.noaccept = noaccept;
        
    var observerService
    = Components.classes ["@mozilla.org/observer-service;1"]
    .getService (Components.interfaces.nsIObserverService);
    observerService.addObserver
    (arAkahukuP2PServant2, "network:offline-about-to-go-offline", false);
    observerService.addObserver
    (arAkahukuP2PServant2, "network:offline-status-changed", false);
    observerService.addObserver
    (arAkahukuP2PServant2, "xpcom-shutdown", false);
        
    /* 開始の度にポートチェックは初期化する */
    arAkahukuP2PServant2.portCheckState = 0;
    arAkahukuP2PServant2.portCheckFailed = 0;
        
    if (!arAkahukuP2PServant2.noaccept
        && !arAkahukuP2PServant2.dynamic
        && arAkahukuP2PServant2.nodeName == "") {
      return false;
    }
        
    if (arAkahukuP2PServant2.first) {
      /* 初回の開始は遅らせる */
            
      arAkahukuP2PServant2.first = false;
            
      arAkahukuP2PServant2.startupTimer
      = Components.classes ["@mozilla.org/timer;1"]
      .createInstance (nsITimer);
      arAkahukuP2PServant2.startupTimer.initWithCallback
      (arAkahukuP2PServant2,
       arAkahukuP2PServant2.STARTUP_DELAY,
       nsITimer.TYPE_ONE_SHOT);
            
      return true;
    }
        
    var ioService
    = Components.classes ["@mozilla.org/network/io-service;1"]
    .getService (Components.interfaces.nsIIOService);
    if (ioService.offline) {
      /* オフラインモードの場合は中断 */
      arAkahukuP2PServant2.stopOffline = true;
            
      return false;
    }
        
    if (arAkahukuP2PServant2.started) {
      arAkahukuP2PServant2.stop ();
    }
        
    if (arAkahukuP2PServant2.nodeList == null) {
      arAkahukuP2PServant2.nodeList = new Array ();
    }
    arAkahukuP2PServant2.activeNodeList = new Array ();
    arAkahukuP2PServant2.requestList = new Object ();
    arAkahukuP2PServant2.requestCount = 0;
        
    if (!noaccept) {
      /* 誘い可の場合はサーバを開始する */
            
      arAkahukuP2PServant2.serverSocket
        = Components.classes ["@mozilla.org/network/server-socket;1"]
        .createInstance (nsIServerSocket);
            
      try {
        arAkahukuP2PServant2.serverSocket.init
          (arAkahukuP2PServant2.port, false, -1);
                
        arAkahukuP2PServant2.serverSocket.asyncListen
          (arAkahukuP2PServant2);
                
        var now = (new Date ()).getTime ();
        arAkahukuP2PServant2.serverStartTime = now;
      }
      catch (e) {
        /* ポートが使用中 */
        arAkahukuP2PServant2.serverStartTime = 0;
        return false;
      }
    }
    else {
      arAkahukuP2PServant2.serverSocket = null;
    }
        
    /* チェックを開始 */
    arAkahukuP2PServant2.transferCheckTimer
    = Components.classes ["@mozilla.org/timer;1"]
    .createInstance (nsITimer);
    arAkahukuP2PServant2.transferCheckTimer.initWithCallback
    (arAkahukuP2PServant2,
     arAkahukuP2PServant2.TRANSFER_CHECK_INTERVAL,
     nsITimer.TYPE_ONE_SHOT);
        
    arAkahukuP2PServant2.started = true;
    arAkahukuP2PServant2.stopOffline = false;
        
    return true;
  },
    
  /**
   * 停止する
   *   arIAkahukuP2PServant2.stop
   */
  stop : function () {
    arAkahukuP2PServant2.started = false;
        
    /* サーバを終了 */
    if (arAkahukuP2PServant2.serverSocket) {
      try {
        arAkahukuP2PServant2.serverSocket.close ();
      }
      catch (e) {
      }
      arAkahukuP2PServant2.serverSocket = null;
    }
        
    /* チェックを終了 */
    if (arAkahukuP2PServant2.transferCheckTimer != null) {
      arAkahukuP2PServant2.transferCheckTimer.cancel ();
      arAkahukuP2PServant2.transferCheckTimer = null;
    }
        
    /* 全リクエストを中断する */
    for (var id in arAkahukuP2PServant2.requestList) {
      var request = arAkahukuP2PServant2.requestList [id];
      delete arAkahukuP2PServant2.requestList [id];
      arAkahukuP2PServant2.requestCount --;
            
      /* 終了 */
      arAkahukuP2PServant2.getFileCore
      (request.path,
       request.listener,
       new Array (),
       new Array (),
       request.timeoutCount,
       request.relayNode,
       request.relayedList,
       request.relayID,
       0,
       0,
       request.timeout,
       request.totalTimeout);
    }
    arAkahukuP2PServant2.requestList = new Object ();
    arAkahukuP2PServant2.requestCount = 0;
        
    /* 全ノードを切断する */
    for (var i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      var node = arAkahukuP2PServant2.nodeList [i];
      try {
        node.disconnect (arAkahukuP2PServant2.ERROR_STOPPING, 1);
      }
      catch (e) {
      }
    }
    arAkahukuP2PServant2.activeNodeList = new Array ();
  },
    
  /**
   * 時間経過イベント
   *   nsITimerCallback.notify
   *
   * @param  nsITimer timer
   *         呼び出し元のタイマ
   */
  notify : function (timer) {
    try {
      if (timer == arAkahukuP2PServant2.cacheClearTimer) {
        try {
          arAkahukuP2PServant2.checkCache ();
        }
        catch (e) {
        }
            
        if (arAkahukuP2PServant2.cacheCheckServerEntries != null) {
          arAkahukuP2PServant2.cacheClearTimer
          = Components.classes ["@mozilla.org/timer;1"]
          .createInstance (nsITimer);
          arAkahukuP2PServant2.cacheClearTimer.initWithCallback
          (arAkahukuP2PServant2,
           10,
           nsITimer.TYPE_ONE_SHOT);
        }
        else {
          arAkahukuP2PServant2.forceClearCacheNow = false;
        }
      }
      else if (timer == arAkahukuP2PServant2.transferCheckTimer) {
        /* 送信量の更新 */
        arAkahukuP2PServant2.last2SecBytes
        = arAkahukuP2PServant2.last1SecBytes;
        arAkahukuP2PServant2.last1SecBytes = 0;
            
        arAkahukuP2PServant2.transferCheckTimer.initWithCallback
        (arAkahukuP2PServant2,
         arAkahukuP2PServant2.TRANSFER_CHECK_INTERVAL,
         nsITimer.TYPE_ONE_SHOT);
            
        var now;
            
        arAkahukuP2PServant2.checkCount ++;
        if (arAkahukuP2PServant2.checkCount
            >= arAkahukuP2PServant2.CHECK_INTERVAL) {
          arAkahukuP2PServant2.checkCount = 0;
                
          now = (new Date ()).getTime ();
            
          arAkahukuP2PServant2.checkRequest (now);
            
          arAkahukuP2PServant2.cleanupNodes ();
            
          arAkahukuP2PServant2.reorderConnection (now);
            
          arAkahukuP2PServant2.addNodes ();
            
          arAkahukuP2PServant2.addConnection (now);
            
          arAkahukuP2PServant2.limitNodes ();
            
          arAkahukuP2PServant2.clearCache (now);
            
          arAkahukuP2PServant2.checkPortState (now);
            
          arAkahukuP2PServant2.updateAddress (now);
            
          arAkahukuP2PServant2.resetServer (now);
        }
            
        arakahukup2pservant2.boardCheckCount ++;
        if (arAkahukuP2PServant2.boardCheckCount
            >= arAkahukuP2PServant2.BOARD_CHECK_INTERVAL) {
          arAkahukuP2PServant2.boardCheckCount = 0;
          now = (new Date ()).getTime ();
                
          arAkahukuP2PServant2.updateBoardList (now);
        }
      }
      else if (timer == arAkahukuP2PServant2.startupTimer) {
        /* 開始の遅延 */
        arAkahukuP2PServant2.startupTimer.cancel ();
        arAkahukuP2PServant2.startupTimer = null;
            
        arAkahukuP2PServant2.start (arAkahukuP2PServant2.noaccept);
      }
    }
    catch (e) {
    }
  },
    
  /**
   * 見ている板のリストを更新する
   *
   * @param  Number now
   *         現在の時刻
   */
  updateBoardList : function (now) {
    var boardCount = 0;
    var diff;
        
    for (board in arAkahukuP2PServant2.boardList) {
      diff
        = parseInt (now / 1000)
        - arAkahukuP2PServant2.boardList [board];
      if (diff > arAkahukuP2PServant2.BOARD_LIST_TIMEOUT) {
        /* 時間切れ */
        delete arAkahukuP2PServant2.boardList [board];
      }
      else {
        boardCount ++;
      }
    }
        
    /* 板を見ているか */
    if (boardCount == 0) {
      arAkahukuP2PServant2.isSleep = true;
    }
    else {
      arAkahukuP2PServant2.isSleep = false;
    }
        
    var node;
    for (var i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      node = arAkahukuP2PServant2.nodeList [i];
            
      for (board in node.boardList) {
        diff = parseInt (now / 1000) - node.boardList [board];
        if (diff > arAkahukuP2PServant2.BOARD_LIST_TIMEOUT) {
          /* 時間切れ */
          delete node.boardList [board];
        }
      }
    }
  },
    
  /**
   * リクエストのタイムアウトをチェックする
   *
   * @param  Number now
   *         現在の時刻
   */
  checkRequest : function (now) {
    var requestCount = 0;
        
    var n = 0;
    for (var id in arAkahukuP2PServant2.requestList) {
      n ++;
      requestCount ++;
      var request = arAkahukuP2PServant2.requestList [id];
            
      if (now > request.totalStartTime + request.totalTimeout) {
        /* 全体が時間切れ */
        delete arAkahukuP2PServant2.requestList [id];
                
        /* 終了 */
        arAkahukuP2PServant2.getFileCore
          (request.path,
           request.listener,
           new Array (),
           new Array (),
           request.timeoutCount,
           request.relayNode,
           request.relayedList,
           request.relayID,
           0,
           0,
           request.timeout,
           request.totalTimeout);
      }
      else if (now > request.startTime + request.timeout) {
        /* ノードが時間切れ */
                
        delete arAkahukuP2PServant2.requestList [id];
                
        /* 次のノードを試行、もしくは終了 */
        arAkahukuP2PServant2.getFileCore
          (request.path,
           request.listener,
           request.nodeList,
           request.firstNodeList,
           request.timeoutCount + 1,
           request.relayNode,
           request.relayedList,
           request.relayID,
           request.relayCount,
           request.totalStartTime,
           request.timeout,
           request.totalTimeout);
      }
    }
    /* リクエストの数を更新 */
    arAkahukuP2PServant2.requestCount = requestCount;
  },
    
  /**
   * 不要なノードを削除する
   */
  cleanupNodes : function () {
    var i, j;
    var node, node2;
        
    /* 削除中、もしくは状態の悪いノードを削除する */
    for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      node = arAkahukuP2PServant2.nodeList [i];
      if (node.status == arAkahukuP2PServant2.STATUS_REMOVING
          || node.failedCount >= arAkahukuP2PServant2.FAILED_LIMIT) {
        arAkahukuP2PServant2.nodeList.splice (i, 1);
        i --;
      }
    }
        
    /* 既存ノード内の重複を省く */
    for (j = 0; j < arAkahukuP2PServant2.nodeList.length; j ++) {
      node = arAkahukuP2PServant2.nodeList [j];
      for (i = j + 1;
           i < arAkahukuP2PServant2.nodeList.length; i ++) {
        node2 = arAkahukuP2PServant2.nodeList [i];
                
        /* ノード文字列でチェックする */
        if (node.nodeName
            && node.nodeName == node2.nodeName) {
          /* 重複している */
                    
          var del = 0;
                    
          if (node.status
              == arAkahukuP2PServant2.STATUS_ALIVE) {
            if (node2.status
                == arAkahukuP2PServant2.STATUS_ALIVE) {
              /* 両方接続済み
               * 先に接続していた方を削除 */
              if (node.connectTime < node2.connectTime) {
                del = 1;
              }
              else {
                del = 2;
              }
            }
            else {
              /* node だけ接続済み
               * node2 を削除 */
              del = 2;
            }
          }
          else {
            if (node2.status
                == arAkahukuP2PServant2.STATUS_ALIVE) {
              /* node2 だけ接続済み
               * node を削除 */
              del = 1;
            }
            else {
              /* 両方未接続
               * とりあえず後のものを削除 */
              del = 2;
            }
          }
                    
          if (del == 1) {
            node.disconnect (arAkahukuP2PServant2.ERROR_DUP, 1);
                        
            arAkahukuP2PServant2.nodeList.splice (j, 1);
            j --;
                        
            /* 外のループ側を削除したので抜ける */
            break;
          }
          else {
            node2.disconnect (arAkahukuP2PServant2.ERROR_DUP, 1);
                        
            arAkahukuP2PServant2.nodeList.splice (i, 1);
            i --;
                        
            /* 中のループ側を削除したので抜けない */
          }
        }
      }
    }
  },
    
  /**
   * 接続枠を入れ替える
   *
   * @param  Number now
   *         現在の時刻
   */
  reorderConnection : function (now) {
    var i;
    var node;
        
    var activeNodeList = new Array ();
    for (i = 0; i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
      node = arAkahukuP2PServant2.activeNodeList [i];
            
      /* 使用中でないものは削除 */
      if (node.status == arAkahukuP2PServant2.STATUS_REMOVING
          || node.status == arAkahukuP2PServant2.STATUS_WAIT) {
        arAkahukuP2PServant2.activeNodeList.splice (i, 1);
        i --;
        continue;
      }
            
      /* 優先度を更新 */
      node.updatePriority (now);
            
      activeNodeList.push (node);
    }
        
    /* 優先度の高い順に並べ替え */
    activeNodeList.sort (function (a, b) {
        return b.priority - a.priority;
      });
        
    if (arAkahukuP2PServant2.noaccept) {
      i = arAkahukuP2PServant2.CONNECT_SLOT - 1;
    }
    else {
      i = arAkahukuP2PServant2.CONNECT_SLOT
      + arAkahukuP2PServant2.ACCEPT_SLOT - 1;
    }
    if (i < activeNodeList.length) {
      /* 接続枠が埋まっている場合 */
            
      node = activeNodeList [i];
            
      if (!node.isWorst) {
        /* 新しく最下位になったら時刻を更新 */
        node.worstTime = now;
      }
      node.isWorst = true;
            
      for (var j = 0; j < i; j ++) {
        var node2 = activeNodeList [j];
        node2.isWorst = false;
        node2.worstTime = -1;
      }
            
      /* 最下位のまま一定時間接続している場合、切断する */
      if (now > node.worstTime
          + arAkahukuP2PServant2.WORST_NODE_TIMEOUT) {
        node.disconnect (arAkahukuP2PServant2.ERROR_STOPPING, 1);
        activeNodeList.splice (i, 1);
      }
    }
        
    arAkahukuP2PServant2.activeNodeList = activeNodeList;
  },
        
  /**
   * ノードを追加する
   */
  addNodes : function () {
    var i;
    var node;
    var tmp;
    var boardList;
        
    var addList = arAkahukuP2PServant2.addList;
    arAkahukuP2PServant2.addList = new Object ();
        
    /* 追加ノードのうち、保持しているものは更新する */
    for (nodeName in addList) {
      for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
        node = arAkahukuP2PServant2.nodeList [i];
        if (node.nodeName == nodeName) {
          /* 同じものがあった */
                    
          if (addList [nodeName][0]) {
            node.prev = true;
          }
                    
          if (node.lastAliveTime < addList [nodeName][1]) {
            /* 自分が持っているよりも最近確認された場合は更新する */
            node.lastAliveTime = addList [nodeName][1];
          }
                    
          if (node.status == arAkahukuP2PServant2.STATUS_WAIT) {
            /* 接続していない時は板のリストを更新する */
            tmp = addList [nodeName][2];
            boardList = new Object ();
            tmp.replace
              (/([^:]+):([^;]+);/g,
               function (matched, board, time) {
                boardList [board] = parseInt (time);
                                
                return "";
              });
            node.boardList = boardList;
          }
                    
          delete addList [nodeName];
          break;
        }
      }
    }
        
    /* 追加ノードのうち、保持していないものは追加する */
    for (nodeName in addList) {
      node = new arAkahukuP2PNode ();
            
      node.status = arAkahukuP2PServant2.STATUS_WAIT;
      node.errorCode = arAkahukuP2PServant2.ERROR_NO;
      node.nodeName = nodeName;
      tmp = arAkahukuP2PServant2.decodeNodeName (node.nodeName);
      if (tmp) {
        node.address = tmp [0];
        node.port = tmp [1];
        node.version = tmp [2];
      }
                
      if (addList [nodeName][0]) {
        node.prev = true;
      }
            
      node.lastAliveTime = addList [nodeName][1];
                
      tmp = addList [nodeName][2];
      boardList = new Object ();
      tmp.replace
      (/([^:]+):([^;]+);/g,
       function (matched, board, time) {
        boardList [board] = parseInt (time);
                
        return "";
      });
      node.boardList = boardList;
                
      arAkahukuP2PServant2.nodeList.push (node); 
    }
  },
    
  /**
   * 接続を追加する
   * 1 回に 1 個ずつ追加する
   *
   * @param  Number now
   *         現在の時刻
   */
  addConnection : function (now) {
    var node;
    var add = false;
        
    if (arAkahukuP2PServant2.activeNodeList.length == 0) {
      /* 1 つも接続していない場合 */
      add = true;
    }
    else if (arAkahukuP2PServant2.noaccept) {
      /* 襲い専の場合は、接続は全て能動接続なのでそのままカウントする */
            
      if (arAkahukuP2PServant2.activeNodeList.length
          < arAkahukuP2PServant2.CONNECT_SLOT) {
        add = true;
      }
    }
    else {
      /* 誘い可の場合は、能動接続のみカウントする */
            
      if (arAkahukuP2PServant2.activeNodeList.length
          >= arAkahukuP2PServant2.CONNECT_SLOT
          + arAkahukuP2PServant2.ACCEPT_SLOT) {
        /* 枠が埋まっている時はカウントもしない */
        add = false;
      }
      else {
        var count = 0;
                
        for (var i = 0;
             i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
          node = arAkahukuP2PServant2.activeNodeList [i];
                    
          if (!node.connected) {
            /* 能動接続の場合 */
            count ++;
          }
        }
                
        if (count < arAkahukuP2PServant2.CONNECT_SLOT) {
          add = true;
        }
      }
    }
        
    if (add) {
      /* 接続数を増やす */
      node = arAkahukuP2PServant2.getMostPriorityNode (now);
      if (node) {
        node.connect ();
      }
    }
  },
    
  /**
   * 待機中のノードの中で最も優先度の高いノードを取得する
   *
   * @param  Number now
   *         現在の時刻
   * @return arAkahukuP2PNode
   *         待機中のノードの中で最も優先度の高いノード
   *         無ければ null
   */
  getMostPriorityNode : function (now) {
    var mostPriorityNode = null;
        
    var i;
        
    for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      var node = arAkahukuP2PServant2.nodeList [i];
            
      if (node.status != arAkahukuP2PServant2.STATUS_WAIT) {
        /* 待機中でなければ次へ */
        continue;
      }
            
      node.updatePriority (now);
            
      if (node.disconnectTime != 0
          && now < node.disconnectTime + node.reconnectDelay) {
        /* 再接続待ちならば次へ */
        continue;
      }
            
      if (mostPriorityNode == null) {
        /* 最初の候補 */
        mostPriorityNode = node;
        continue;
      }
            
      if (mostPriorityNode.disconnectTime != 0
          && node.disconnectTime == 0) {
        /* こちらだけ切断していない */
        mostPriorityNode = node;
        continue;
      }
            
      if (mostPriorityNode.disconnectTime != 0
          && node.disconnectTime != 0
          && node.disconnectTime < mostPriorityNode.disconnectTime) {
        /* こちらの方が先に切断した */
        mostPriorityNode = node;
        continue;
      }
            
      if (mostPriorityNode.priority < node.priority) {
        /* 優先度が高い */
        mostPriorityNode = node;
        continue;
      }
    }
        
    return mostPriorityNode;
  },
    
  /**
   * 保持しきれないノードを削除する
   */
  limitNodes : function () {
    if (arAkahukuP2PServant2.nodeList.length
        <= arAkahukuP2PServant2.NODE_LIMIT) {
      /* 最大数以下ならなにもしない */
      return;
    }
        
    var deleteCount;
    var deleteNodes = new Array ();
    var i, j;
    var node, node2;
    var newerCount;
        
    deleteCount
    = arAkahukuP2PServant2.nodeList.length
    - arAkahukuP2PServant2.NODE_LIMIT;
        
    for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      node = arAkahukuP2PServant2.nodeList [i];
            
      if (node.status < arAkahukuP2PServant2.STATUS_ACTIVE_BORER) {
        /* 使用中のものは削除しない */
        continue;
      }
            
      if (deleteNodes.length < deleteCount) {
        /* 候補が削除する数になるまでは、候補に入れる */
        deleteNodes.push (i);
      }
      else {
        /* 候補が削除する数になった場合 */
        var newestIndex;
        var newestTime;
                
        /* 候補の中で最も新しいものを探す */
        node2 = arAkahukuP2PServant2.nodeList [deleteNodes [0]];
        newestIndex = 0;
        newestTime = node2.lastAliveTime;
        for (j = 1; j < deleteNodes.length; j ++) {
          node2 = arAkahukuP2PServant2.nodeList [deleteNodes [j]];
                    
          if (node2.lastAliveTime > newestTime) {
            newestTime = node2.lastAliveTime;
            newestIndex = j;
          }
        }
                
        if (node.lastAliveTime < newestTime) {
          /* 自分の方が古かった */
          deleteNodes [newestIndex] = i;
        }
      }
    }
        
    /* インデックスの大きい方から削除する */
    deleteNodes.sort (function (a, b) {
        return b - a;
      });
    for (j = 0; j < deleteNodes.length; j ++) {
      node = arAkahukuP2PServant2.nodeList [deleteNodes [j]];
      node.status = arAkahukuP2PServant2.STATUS_REMOVING;
      arAkahukuP2PServant2.nodeList.splice (deleteNodes [j], 1);
    }
  },
        
  /**
   * キャッシュを削除する
   *
   * @param  Number now
   *         現在の時刻
   */
  clearCache : function (now) {
    if (arAkahukuP2PServant2.CACHE_CHECK_INTERVAL == 0) {
      /* キャッシュチェックをしない設定 */
      return;
    }
    if (arAkahukuP2PServant2.forceClearCacheNow) {
      /* 強制削除中 */
      return;
    }
    var interval = arAkahukuP2PServant2.CACHE_CHECK_INTERVAL;
    if (arAkahukuP2PServant2.cacheCheckServerEntries != null) {
      interval = arAkahukuP2PServant2.CACHE_CHECK_INTERVAL2;
    }
    if (now > arAkahukuP2PServant2.cacheCheckTime + interval) {
      arAkahukuP2PServant2.cacheCheckTime = now;
      try {
        arAkahukuP2PServant2.checkCache ();
      }
      catch (e) {
      }
    }
  },
    
  /**
   * P2P からファイルをプリフェッチする
   *   arIAkahukuP2PServant2.prefetchFile
   *
   * @param  String path
   *         対象のファイルのパス
   */
  prefetchFile : function (path) {
    arAkahukuP2PServant2.getFileCore
    (path, null,
     null, null,
     0, null, new Object (), "",
     arAkahukuP2PServant2.MAX_RELAY_COUNT,
     (new Date ()).getTime (),
     arAkahukuP2PServant2.REQUEST_TIMEOUT2,
     arAkahukuP2PServant2.REQUEST_TOTAL_TIMEOUT2);
  },
    
  /**
   * キャッシュを強制的に削除する
   *   arIAkahukuP2PServant2.forceClearCache
   *
   * @return  Boolean
   *          キャッシュ制限が設定されているか
   */
  forceClearCache : function () {
    if (arAkahukuP2PServant2.cacheSrcLimit == 0
        && arAkahukuP2PServant2.cacheThumbLimit == 0
        && arAkahukuP2PServant2.cacheCatLimit == 0) {
      /* キャッシュを削除しない設定 */
      return false;
    }
        
    arAkahukuP2PServant2.forceClearCacheNow = true;
        
    arAkahukuP2PServant2.cacheClearTimer
    = Components.classes ["@mozilla.org/timer;1"]
    .createInstance (nsITimer);
    arAkahukuP2PServant2.cacheClearTimer.initWithCallback
    (arAkahukuP2PServant2,
     10,
     nsITimer.TYPE_ONE_SHOT);
        
    return true;
  },
    
  /**
   * キャッシュ削除の状態を取得する
   *   arIAkahukuP2PServant2.getClearCacheState
   *
   * @return Boolean
   *         削除完了したか
   */
  getClearCacheState : function () {
    return arAkahukuP2PServant2.forceClearCacheNow;
  },
    
  /**
   * 古いキャッシュを削除する
   */
  checkCache : function () {
    if (arAkahukuP2PServant2.cacheSrcLimit == 0
        && arAkahukuP2PServant2.cacheThumbLimit == 0
        && arAkahukuP2PServant2.cacheCatLimit == 0) {
      /* キャッシュを削除しない設定 */
      return;
    }
    if (arAkahukuP2PServant2.cacheBase == ""
        || arAkahukuP2PServant2.separator == "") {
      /* 設定がおかしい */
      return;
    }
        
    var cacheDir
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    cacheDir.initWithPath (arAkahukuP2PServant2.cacheBase);
    if (!cacheDir.exists ()) {
      return;
    }
        
    if (arAkahukuP2PServant2.cacheCheckServerEntries == null) {
      arAkahukuP2PServant2.cacheCheckServerEntries
      = cacheDir.directoryEntries;
    }
    for (;;) {
      if (arAkahukuP2PServant2.cacheCheckServer == null) {
        if (arAkahukuP2PServant2.cacheCheckServerEntries
            .hasMoreElements ()) {
          arAkahukuP2PServant2.cacheCheckServer
          = arAkahukuP2PServant2.cacheCheckServerEntries
          .getNext ().QueryInterface (nsIFile);
        }
        else {
          arAkahukuP2PServant2.cacheCheckServerEntries = null;
          break;
        }
      }
      if (!arAkahukuP2PServant2.cacheCheckServer.isDirectory ()) {
        arAkahukuP2PServant2.cacheCheckServer = null;
        continue;
      }
      if (arAkahukuP2PServant2.cacheCheckDirEntries == null) {
        arAkahukuP2PServant2.cacheCheckDirEntries
        = arAkahukuP2PServant2.cacheCheckServer.directoryEntries;
      }
      for (;;) {
        if (arAkahukuP2PServant2.cacheCheckDir == null) {
          if (arAkahukuP2PServant2.cacheCheckDirEntries
              .hasMoreElements ()) {
            arAkahukuP2PServant2.cacheCheckDir
            = arAkahukuP2PServant2.cacheCheckDirEntries
            .getNext ().QueryInterface (nsIFile);
          }
          else {
            arAkahukuP2PServant2.cacheCheckDirEntries = null;
            break;
          }
        }
        if (!arAkahukuP2PServant2.cacheCheckDir.isDirectory ()) {
          arAkahukuP2PServant2.cacheCheckDir = null;
          continue;
        }
        if (arAkahukuP2PServant2.cacheCheckTypeEntries == null) {
          arAkahukuP2PServant2.cacheCheckTypeEntries
          = arAkahukuP2PServant2.cacheCheckDir.directoryEntries;
        }
        for (;;) {
          if (arAkahukuP2PServant2.cacheCheckType == null) {
            if (arAkahukuP2PServant2.cacheCheckTypeEntries
                .hasMoreElements ()) {
              arAkahukuP2PServant2.cacheCheckType
              = arAkahukuP2PServant2.cacheCheckTypeEntries
              .getNext ().QueryInterface (nsIFile);
            }
            else {
              arAkahukuP2PServant2.cacheCheckTypeEntries = null;
              break;
            }
          }
          if (!arAkahukuP2PServant2.cacheCheckType.isDirectory ()) {
            arAkahukuP2PServant2.cacheCheckType = null;
            continue;
          }
          var type = arAkahukuP2PServant2.cacheCheckType;
          if (arAkahukuP2PServant2.cacheSrcLimit != 0
              && type.leafName == "src") {
            if (!arAkahukuP2PServant2.limitCache
                (type, arAkahukuP2PServant2.cacheSrcLimit * 2)) {
              return;
            }
          }
          else if (arAkahukuP2PServant2.cacheThumbLimit != 0
                   && type.leafName == "thumb") {
            if (!arAkahukuP2PServant2.limitCache
                (type, arAkahukuP2PServant2.cacheThumbLimit * 2)) {
              return;
            }
          }
          if (arAkahukuP2PServant2.cacheCatLimit != 0
              && type.leafName == "cat") {
            if (!arAkahukuP2PServant2.limitCache
                (type, arAkahukuP2PServant2.cacheCatLimit * 2)) {
              return;
            }
          }
          arAkahukuP2PServant2.cacheCheckType = null;
        }
        arAkahukuP2PServant2.cacheCheckDir = null;
      }
      arAkahukuP2PServant2.cacheCheckServer = null;
    }
  },
    
  /**
   * キャッシュの量を制限する
   *
   * @param  nsILocalFile dir
   *         制限するディレクトリ
   * @param  Number limit
   *         制限する個数
   * @return Boolean
   *         終了したか
   */
  limitCache : function (dir, limit) {
    var old = (new Date ()).getTime ();
        
    if (arAkahukuP2PServant2.cacheCheckState == 0) {
      if (arAkahukuP2PServant2.cacheCheckFileEntries == null) {
        arAkahukuP2PServant2.cacheCheckFileEntries
          = dir.directoryEntries;
        arAkahukuP2PServant2.cacheCheckFileList = new Array ();
      }
            
      while (arAkahukuP2PServant2.cacheCheckFileEntries
             .hasMoreElements ()) {
        var file
          = arAkahukuP2PServant2.cacheCheckFileEntries
          .getNext ().QueryInterface (nsIFile);
        if (file.isDirectory ()) {
          continue;
        }
            
        arAkahukuP2PServant2.cacheCheckFileList.push
          (new Array (file.lastModifiedTime, file.leafName));
        arAkahukuP2PServant2.cacheCheckCount ++;
        if (arAkahukuP2PServant2.cacheCheckCount
            == arAkahukuP2PServant2.CACHE_CHECK_ONETIME_LIMIT) {
          arAkahukuP2PServant2.cacheCheckCount = 0;
          return false;
        }
      }
      arAkahukuP2PServant2.cacheCheckState = 1;
      arAkahukuP2PServant2.cacheCheckFileEntries = null;
    }
        
    if (arAkahukuP2PServant2.cacheCheckState == 1
        || arAkahukuP2PServant2.cacheCheckState == 2) {
      if (arAkahukuP2PServant2.cacheCheckState == 1) {
        if (arAkahukuP2PServant2.cacheCheckFileList.length > limit) {
          arAkahukuP2PServant2.cacheCheckFileList
          .sort (function (a, b) {
              return b [0] - a [0];
            });
          arAkahukuP2PServant2.cacheCheckFileList.splice (0, limit);
          arAkahukuP2PServant2.cacheCheckI = 0;
        }
        else {
          arAkahukuP2PServant2.cacheCheckState = 0;
          arAkahukuP2PServant2.cacheCheckFileEntries = null;
          return true;
        }
        arAkahukuP2PServant2.cacheCheckState = 2;
      }
      var file
      = Components.classes ["@mozilla.org/file/local;1"]
      .createInstance (nsILocalFile);
      for (;
           arAkahukuP2PServant2.cacheCheckI
             < arAkahukuP2PServant2.cacheCheckFileList.length;
           arAkahukuP2PServant2.cacheCheckI ++) {
        file.initWithFile (dir);
        file.appendRelativePath
          (arAkahukuP2PServant2.cacheCheckFileList
           [arAkahukuP2PServant2.cacheCheckI][1]);
        try {
          if (file.exists ()) {
            file.remove (false);
          }
        }
        catch (e) {
        }
                
        arAkahukuP2PServant2.cacheCheckCount ++;
        if (arAkahukuP2PServant2.cacheCheckCount
            == arAkahukuP2PServant2.CACHE_CHECK_ONETIME_LIMIT) {
          arAkahukuP2PServant2.cacheCheckCount = 0;
          return false;
        }
      }
      arAkahukuP2PServant2.cacheCheckState = 0;
      arAkahukuP2PServant2.cacheCheckFileEntries = null;
    }
        
    return true;
  },
    
  /**
   * IP アドレスを更新する
   *
   * @param  Number now
   *         現在の時刻
   */
  updateAddress : function (now) {
    var i;
    var node;
        
    if (arAkahukuP2PServant2.activeNodeList.length == 0) {
      /* 誰とも接続してない場合はアドレスを取得し直す */
      arAkahukuP2PServant2.lastDynamicTime = 0;
    }
        
    if (!arAkahukuP2PServant2.noaccept
        && arAkahukuP2PServant2.dynamic
        && now > arAkahukuP2PServant2.lastDynamicTime
        + arAkahukuP2PServant2.DYNAMIC_INTERVAL
        && now > arAkahukuP2PServant2.lastDynamicSendTime
        + arAkahukuP2PServant2.DYNAMIC_SEND_INTERVAL) {
      node = null;
      for (i = 0; i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
        node = arAkahukuP2PServant2.activeNodeList [i];
        if (node.status == arAkahukuP2PServant2.STATUS_ALIVE
            && !node.whoamiBad) {
          break;
        }
        node = null;
      }
            
      if (node) {
        arAkahukuP2PServant2.sendWHOAMI (node);
      }
    }
  },
    
  /**
   * ポート状況のチェック
   *
   * @param  Number now
   *         現在の時刻
   */
  checkPortState : function (now) {
    var i;
    var node;
        
    if (!arAkahukuP2PServant2.noaccept) {
      if (now > arAkahukuP2PServant2.portCheckTime
          + arAkahukuP2PServant2.PORT_CHECK_TIMEOUT) {
        /* ポートチェック開始から一定時間経った */
                
        if (arAkahukuP2PServant2.portCheckState == 1) {
          /* CHECK を送信した */
                    
          /* 相手が CHECK をサポートしない */
          arAkahukuP2PServant2.portCheckState = 0;
        }
        if (arAkahukuP2PServant2.portCheckState == 2) {
          /* CHECK を受信した */

          /* ポートが開いていない */
          arAkahukuP2PServant2.portCheckState = 0;
          arAkahukuP2PServant2.portCheckFailed ++;
        }
      }
            
      if (arAkahukuP2PServant2.portCheckState == 0
          && arAkahukuP2PServant2.portCheckFailed < 3) {
        /* まだ CHECK を送信しておらず
         * まだ 3 回失敗していない */
                
        /* CHECK を送信する */
                
        node = null;
        for (i = 0;
             i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
          node = arAkahukuP2PServant2.activeNodeList [i];
          if (node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
            break;
          }
          node = null;
        }
                
        if (node) {
          arAkahukuP2PServant2.portCheckState = 1;
                    
          arAkahukuP2PServant2.sendCHECK (node, 0,
                                          arAkahukuP2PServant2.port);
        }
      }
    }
  },
    
  /**
   * ファイルを取得する
   *   arIAkahukuP2PServant2.getFile
   *
   * @param  String path
   *         対象のファイルのパス
   * @param  arIAkahukuP2PServantListener listener
   *         イベントリスナ
   *           リレー中の場合は null
   */
  getFile : function (path, listener) {
    arAkahukuP2PServant2.getFileCore
    (path, listener,
     null, null,
     0, null, new Object (), "",
     arAkahukuP2PServant2.MAX_RELAY_COUNT,
     (new Date ()).getTime (),
     arAkahukuP2PServant2.REQUEST_TIMEOUT,
     arAkahukuP2PServant2.REQUEST_TOTAL_TIMEOUT);
  },
    
  /**
   * ファイルを取得する
   *
   * @param  String path
   *         対象のファイルのパス
   * @param  arIAkahukuP2PServantListener listener
   *         イベントリスナ
   *           リレーの場合は null
   * @param  Array nodeList
   *         試行するノードリスト
   *         null の場合は全部
   * @param  Array firstNodeList
   *         リレーなしで最初に試行するノードリスト
   *         null の場合は全部
   * @param  Number timeoutCount
   *         タイムアウトした回数
   * @param  arAkahukuP2PNode relayNode
   *         リレー元のノード
   *           自分からのリクエストの場合は null
   * @param  Object relayedList
   *         リレーで経由したノード
   * @param  String relayID
   *         リレーのリクエストの ID
   * @param  Number relayCount
   *         リレーする回数
   * @param  Number totalStartTime
   *         全体の開始時刻
   * @param  Number timeout
   *         中断する時間
   * @param  Number totalTimeout
   *         全体を中断する時間
   */
  getFileCore : function (path, listener,
                          nodeList, firstNodeList, timeoutCount,
                          relayNode, relayedList, relayID, relayCount,
                          totalStartTime, timeout, totalTimeout) {
    var node;
    var leafName = "";
    var server, dir, type, leafName, board;
        
    if (arAkahukuP2PServant2.nodeName) {
      relayedList [arAkahukuP2PServant2.nodeName] = true;
    }
        
    if (arAkahukuP2PServant2.requestCount
        > arAkahukuP2PServant2.REQUEST_LIMIT) {
      /* リクエストが多すぎる場合、諦める */
      if (relayNode) {
        arAkahukuP2PServant2.sendNotAvaliable
        (relayNode, path, relayedList, relayID);
      }
      else if (listener) {
        arAkahukuP2PServant2.recvFail ++;
        listener.onP2PFail ();
      }
      return;
    }
        
    if (timeoutCount >= arAkahukuP2PServant2.TIMEOUT_LIMIT) {
      /* タイムアウトが多い場合、諦める
       * リレー中は起きない */
      if (listener) {
        arAkahukuP2PServant2.recvFail ++;
        listener.onP2PFail ();
      }
      return;
    }
        
    /* パスを解析 */
    if (path.match
        (/^\/([^\/]+)\/([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+\.[a-z]+)$/)) {
      server = RegExp.$1;
      dir = RegExp.$2;
      type = RegExp.$3;
      leafName = RegExp.$4;
      board = server + "/" + dir;
      if (type == "cat") {
        board += "_cat";
      }
            
      if (!server.match (/^[a-z0-9\-]+$/)
          || !dir.match (/^[a-z0-9\-]+$/)
          || !type.match (/^[a-z]+$/)
          || !leafName.match (/^[A-Za-z0-9]+\.[A-Za-z0-9]+$/)) {
        /* パスがおかしい */
        if (relayNode) {
          arAkahukuP2PServant2.sendNotAvaliable
          (relayNode, path, relayedList, relayID);
        }
        else if (listener) {
          arAkahukuP2PServant2.recvFail ++;
          listener.onP2PFail ();
        }
        return;
      }
    }
    else {
      /* パスがおかしい */
      if (relayNode) {
        arAkahukuP2PServant2.sendNotAvaliable
        (relayNode, path, relayedList, relayID);
      }
      else if (listener) {
        arAkahukuP2PServant2.recvFail ++;
        listener.onP2PFail ();
      }
      return;
    }
        
    if (arAkahukuP2PServant2.nocat
        && !relayNode
        && type == "cat") {
      if (listener) {
        /* 自分からのカタログ画像のリクエストで
         * カタログ画像は P2P を経由しない 設定の場合 */
        arAkahukuP2PServant2.recvFail ++;
        listener.onP2PFail ();
      }
      return;
    }
        
    if (!nodeList) {
      /* 取得を試行するノードが指定されていない時は構築する */
      nodeList = new Array ();
      firstNodeList = new Array ();
            
      if (relayNode) {
        /* リレー中はリクエストと同じ板を見ているノードを優先 */
                
        for (var i = 0;
             i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
          node = arAkahukuP2PServant2.activeNodeList [i];
          if (node.nodeName
              && node.nodeName in relayedList) {
            /* リレー済みのものは追加しない */
            continue;
          }
                
          if (node != relayNode
              && node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
            if (board in node.boardList) {
              nodeList.push (node);
                            
              /* リレー中の場合は 2 つまで */
              if (nodeList.length == 2) {
                break;
              }
            }
          }
        }
      }
            
      if (nodeList.length < 2) {
        for (var i = 0;
             i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
          node = arAkahukuP2PServant2.activeNodeList [i];
          if (node.nodeName
              && node.nodeName in relayedList) {
            /* リレー済みのものは追加しない */
            continue;
          }
                
          if (node != relayNode
              && node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
            nodeList.push (node);
                        
            if (relayNode) {
              /* リレー中の場合は 2 つまで */
              if (nodeList.length == 2) {
                break;
              }
            }
            else {
              firstNodeList.push (node);
            }
          }
        }
      }
    }
        
    var first = false;
    node = null;
        
    for (;;) {
      if (firstNodeList.length > 0) {
        first = true;
        node = firstNodeList.pop ();
        if (server == "nijibox-3"
            && node
            && (node.akahukuVersion.match (/4\.3/)
                || node.akahukuVersion.match (/4\.4\.0/))) {
          node = null;
          continue;
        }
        break;
      }
      else if (nodeList.length > 0) {
        node = nodeList.pop ();
        if (server == "nijibox-3"
            && node
            && (node.akahukuVersion.match (/4\.3/)
                || node.akahukuVersion.match (/4\.4\.0/))) {
          node = null;
          continue;
        }
        break;
      }
      else {
        break;
      }
    }
        
    if (node) {
      /* ノードが残っている場合は試行する */
            
      var request = new arAkahukuP2PRequest ();
            
      request.node = node;
            
      request.listener = listener;
      request.nodeList = nodeList;
      request.firstNodeList = firstNodeList;
            
      arAkahukuP2PServant2.requestIndex ++;
      if (arAkahukuP2PServant2.requestIndex > 10000) {
        arAkahukuP2PServant2.requestIndex -= 10000;
      }
            
      request.id
      = new Date ().getTime ()
      + "_" + arAkahukuP2PServant2.requestIndex
      + "_" + Math.floor (Math.random () * 1000000);
      request.relayID = relayID;
            
      request.path = path;
      request.server = server;
      request.dir = dir;
      request.type = type;
      request.leafName = leafName;
            
      request.startTime = (new Date ()).getTime ();
      request.totalStartTime = totalStartTime;
      request.timeout = timeout;
      request.totalTimeout = totalTimeout;
            
      request.timeoutCount = timeoutCount;
            
      request.relayedList = relayedList;
      request.relayNode = relayNode;
      request.relayCount = relayCount;
            
      if (first) {
        relayCount = 0;
      }
            
      if (arAkahukuP2PServant2.enableTreatAsSame
          && dir.match (/^([^\-]+)\-([^\-]+)$/)) {
        server = RegExp.$1;
        dir = RegExp.$2;
      }
            
      request.targetFileName
      = arAkahukuP2PServant2.cacheBase
      + arAkahukuP2PServant2.separator
      + server
      + arAkahukuP2PServant2.separator
      + dir
      + arAkahukuP2PServant2.separator
      + type
      + arAkahukuP2PServant2.separator
      + leafName;
            
      arAkahukuP2PServant2.requestList [request.id] = request;
      arAkahukuP2PServant2.requestCount ++;
            
      var relayed = "";
      for (var tmp in request.relayedList) {
        relayed += tmp + ";";
      }
            
      var relaying = "false";
      if (relayNode) {
        relaying = "true";
        //dump (request.path + ":" + relayNode.address + "->" + node.address + "\n");
      }
            
      var data
      = arAkahukuP2PServant2.PROTOCOL_METHOD_GET
      + " " + request.path
      + " " + arAkahukuP2PServant2.PROTOCOL_NAME
      + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
      + "\r\n"
      + "id: " + request.id + "\r\n"
      + "relay: " + relayCount + "\r\n"
      + "relayed: " + relayed + "\r\n"
      + "relaying: " + relaying + "\r\n"
      + "\r\n";
            
      //dump ("-> GET:" + request.path + ":" + node.nodeName + ":" + node.address + "" + "\n");
      //dump (data);
      //dump ("GET: " + relayed + "\n");
            
      try {
        node.outputStream.write (data, data.length);
      }
      catch (e) {
        node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
                
        if (relayNode) {
          arAkahukuP2PServant2.sendNotAvaliable
            (relayNode, path, relayedList, relayID);
        }
        else if (listener) {
          arAkahukuP2PServant2.recvFail ++;
          listener.onP2PFail ();
        }
        return;
      }
    }
    else {
      if (relayNode) {
        arAkahukuP2PServant2.sendNotAvaliable
        (relayNode, path, relayedList, relayID);
      }
      else if (listener) {
        arAkahukuP2PServant2.recvFail ++;
        listener.onP2PFail ();
      }
      return;
    }
  },
    
  /**
   * ファイルのハッシュを算出する
   *
   * @param  nsILocalFile targetFile
   *         対象のファイル
   * @param  String leafName
   *         対象のファイルのファイル名
   * @return String
   *         ファイルのハッシュ
   */
  getHashFromFile : function (targetFile, leafName) {
    var fstream
    = Components
    .classes ["@mozilla.org/network/file-input-stream;1"]
    .createInstance (nsIFileInputStream);
    fstream.init (targetFile, 0x01, 0444, 0);
        
    var sstream
    = Components.classes ["@mozilla.org/io/string-input-stream;1"]
    .createInstance (nsIStringInputStream);
    sstream.setData (leafName, leafName.length);
        
    var crypt
    = Components.classes ["@mozilla.org/security/hash;1"]
    .createInstance (nsICryptoHash);
    crypt.init (nsICryptoHash.MD5);
    crypt.updateFromStream (sstream, leafName.length);
    crypt.updateFromStream (fstream, targetFile.fileSize);
        
    var hash = crypt.finish (false);
        
    fstream.close ();
        
    hash
    = arAkahukuP2PServant2.arcfour (leafName, hash);
        
    hash
    = arAkahukuP2PServant2.btoa_mod (hash);
        
    return hash;
  },
    
  /**
   * ハッシュファイルからハッシュを取得する
   *
   * @param  nsILocalFile targetFile
   *         対象のファイル
   * @return Boolean
   *         正しいファイルか
   */
  getHashFileInfo : function (targetFile) {
    var filename = targetFile.path + ".hash";
        
    try {
      var hashFile
        = Components.classes ["@mozilla.org/file/local;1"]
        .createInstance (nsILocalFile);
      hashFile.initWithPath (filename);
      if (hashFile.exists ()) {
        var fstream
          = Components
          .classes ["@mozilla.org/network/file-input-stream;1"]
          .createInstance (nsIFileInputStream);
        fstream.init (hashFile, 0x01, 0444, 0);
            
        var sstream
          = Components.classes
          ["@mozilla.org/scriptableinputstream;1"]
          .createInstance
          (nsIScriptableInputStream);
        sstream.init (fstream);
            
        return sstream.read (-1);
      }
      else {
        return "";
      }
    }
    catch (e) {
      return "";
    }
  },
    
  /**
   * ファイルのハッシュファイルを作成する
   *   arIAkahukuP2PServant2.createHash
   *
   * @param  nsILocalFile targetFile
   *         対象のファイル
   * @param  String leafName
   *         ファイル名
   * @param  String hash
   *         ハッシュ
   */
  createHashFile : function (targetFile, leafName, hash) {
    if (hash == "") {
      hash = arAkahukuP2PServant2.getHashFromFile (targetFile,
                                                   targetFile.leafName);
    }
        
    var filename
    = targetFile.path.replace (/[^\/\\:]+$/, "")
    + leafName + ".hash";
        
    var hashFile
    = Components.classes ["@mozilla.org/file/local;1"]
    .createInstance (nsILocalFile);
    hashFile.initWithPath (filename);
        
    if (!hashFile.exists ()) {
      hashFile.create (0x00, 0644);
    }
        
    var fstream
    = Components.classes
    ["@mozilla.org/network/file-output-stream;1"]
    .createInstance (nsIFileOutputStream);
    fstream.init (hashFile,
                  0x02 | 0x08 | 0x20, 0644, 0);
    fstream.write (hash, hash.length);
    fstream.close ();
  },
  /**
   * 板を訪れたイベント
   *   arIAkahukuP2PServant2.visitBoard
   *
   * @param  String board
   *         サーバ名/ディレクトリ名
   */
  visitBoard : function (board) {
    var now = (new Date ()).getTime ();
    arAkahukuP2PServant2.boardList [board] = parseInt (now / 1000);
  },
    
  /**
   * ノードを追加する
   *   arIAkahukuP2PServant2.addNode
   *
   * @param  String nodeName
   *         ノード文字列
   * @param  Boolean prev
   *         前回終了時に接続していたか
   * @param  Number lastAliveTime
   *         最後に生存を確認した時刻 [s]
   *           まだ生存を確認していない場合は 0
   *           (手動追加の場合等)
   * @param  String boardList
   *         板のリスト
   */
  addNode : function (nodeName, prev, lastAliveTime, boardList) {
    if (nodeName != arAkahukuP2PServant2.nodeName) {
      var now = (new Date ()).getTime ();
            
      var diff = parseInt (now / 1000) - lastAliveTime;
            
      if (arAkahukuP2PServant2.nodeList.length
          >= arAkahukuP2PServant2.NODE_LIMIT
          && diff > arAkahukuP2PServant2.NODE_TIMEOUT) {
        /* 現在ノードを最大数持っている場合は
         * 古いノードは追加しない */
        return;
      }
            
      var tmp = arAkahukuP2PServant2.decodeNodeName (nodeName);
      if (tmp) {
        if (nodeName in arAkahukuP2PServant2.addList
            && arAkahukuP2PServant2.addList [nodeName][1]
            > lastAliveTime) {
          /* 既に追加中の新しい項目があったら何もしない */
          return;
        }
                    
        arAkahukuP2PServant2.addList [nodeName]
          = new Array (prev, lastAliveTime, boardList);
      }
    }
  },
    
  /**
   * 自分のアドレスを指定する
   *   arIAkahukuP2PServant2.setAddress
   *
   * @param  String address
   *         IP アドレス
   */
  setAddress : function (address) {
    arAkahukuP2PServant2.address = address;
        
    if (arAkahukuP2PServant2.address) {
      arAkahukuP2PServant2.nodeName
        = arAkahukuP2PServant2.encodeNodeName (
          arAkahukuP2PServant2.address,
          arAkahukuP2PServant2.port);
    }
    else {
      arAkahukuP2PServant2.nodeName = "";
    }
  },
    
  /**
   * 自分のアドレスを指定する
   *   arIAkahukuP2PServant2.setPort
   *
   * @param  Number port 
   *         ポート番号
   */
  setPort : function (port) {
    arAkahukuP2PServant2.port = port;
        
    if (arAkahukuP2PServant2.address) {
      arAkahukuP2PServant2.nodeName
        = arAkahukuP2PServant2.encodeNodeName (
          arAkahukuP2PServant2.address,
          arAkahukuP2PServant2.port);
    }
    else {
      arAkahukuP2PServant2.nodeName = "";
    }
  },
    
  /**
   * IP アドレスを自動更新するかどうかを設定する
   *   arIAkahukuP2PServant2.setDynamic
   *
   * @param  Boolean dynamic 
   *         IP アドレスを自動更新するか
   */
  setDynamic : function (dynamic) {
    arAkahukuP2PServant2.dynamic = dynamic;
  },
    
  /**
   * カタログ画像は P2P を経由しないかを設定する
   *   arIAkahukuP2PServant2.setNoCat
   *
   * @param  Boolean relay 
   *         リレーを受け入れるか
   */
  setNoCat : function (nocat) {
    arAkahukuP2PServant2.nocat = nocat;
  },
    
  /**
   * 受動接続の数を指定する
   *   arIAkahukuP2PServant2.setAcceptSlot
   *
   * @param  Number acceptSlot 
   *         受動接続の数
   */
  setAcceptSlot : function (acceptSlot) {
    arAkahukuP2PServant2.ACCEPT_SLOT = acceptSlot;
        
    for (var i = arAkahukuP2PServant2.CONNECT_SLOT
           + arAkahukuP2PServant2.ACCEPT_SLOT;
         i < arAkahukuP2PServant2.activeNodeList.length;
         i ++) {
      var node = arAkahukuP2PServant2.activeNodeList [i];
      try {
        node.disconnect (arAkahukuP2PServant2.ERROR_STOPPING, 1);
      }
      catch (e) {
      }
    }
  },
    
  /**
   * 赤福のバージョンを設定する
   *   arIAkahukuP2PServant2.setAkahukuVersion
   *
   * @param  String akahukuVersion
   *         赤福のバージョン
   */
  setAkahukuVersion : function (akahukuVersion) {
    arAkahukuP2PServant2.akahukuVersion = akahukuVersion;
  },
    
  /**
   * 送信量制限を設定する
   *   arIAkahukuP2PServant2.setTransferLimit
   *
   * @param  Number limit 
   *         送信帯域制限 [KBytes/s]
   */
  setTransferLimit : function (limit) {
    arAkahukuP2PServant2.TRANSFER_LIMIT = limit * 1024;
  },
    
  /**
   * キャッシュチェックの間隔を指定する
   *   arIAkahukuP2PServant2.setCacheCheckInterval
   *
   * @param  Number interval
   *         キャッシュチェックの間隔
   */
  setCacheCheckInterval : function (interval) {
    arAkahukuP2PServant2.CACHE_CHECK_INTERVAL = interval;
  },

  /**
   * src キャッシュの最大個数を指定する
   *   arIAkahukuP2PServant2.setCacheSrcLimit
   *
   * @param  Number srcLimit
   *         キャッシュの最大個数
   */
  setCacheSrcLimit : function (srcLimit) {
    arAkahukuP2PServant2.cacheSrcLimit = srcLimit;
  },
    
  /**
   * thumb キャッシュの最大個数を指定する
   *   arIAkahukuP2PServant2.setCacheThumbLimit
   *
   * @param  Number thumbLimit
   *         キャッシュの最大個数
   */
  setCacheThumbLimit : function (thumbLimit) {
    arAkahukuP2PServant2.cacheThumbLimit = thumbLimit;
  },
    
  /**
   * cat キャッシュの最大個数を指定する
   *   arIAkahukuP2PServant2.setCacheCatLimit
   *
   * @param  Number catLimit
   *         キャッシュの最大個数
   */
  setCacheCatLimit : function (catLimit) {
    arAkahukuP2PServant2.cacheCatLimit = catLimit;
  },
    
  /**
   * キャッシュのディレクトリを指定する
   *   arIAkahukuP2PServant2.setCacheBase
   *
   * @param  String dir
   *         キャッシュのディレクトリ
   * @param  String sep
   *         ディレクトリの区切り
   */
  setCacheBase : function (dir, sep) {
    arAkahukuP2PServant2.cacheBase = dir;
    arAkahukuP2PServant2.separator = sep;
  },
    
  /**
   * feb, apr のキャッシュをまとめるかどうかを設定する
   *   arIAkahukuP2PServant2.setTreatAsSame
   *
   * @param  boolean enableTreatAsSame
   *         feb, apr のキャッシュをまとめるか
   */
  setTreatAsSame :function (enableTreatAsSame) {
    arAkahukuP2PServant2.enableTreatAsSame = enableTreatAsSame;
  },
    
  /**
   * feb, apr のキャッシュをまとめるかどうかを返す
   *   arIAkahukuP2PServant2.getTreatAsSame
   *
   * @return boolean
   *         feb, apr のキャッシュをまとめるか
   */
  getTreatAsSame : function () {
    return arAkahukuP2PServant2.enableTreatAsSame;
  },
    
  /**
   * キャッシュのディレクトリを取得する
   *   arIAkahukuP2PServant2.getCacheBase
   *
   * @return String
   *         キャッシュのディレクトリ
   */
  getCacheBase : function () {
    return arAkahukuP2PServant2.cacheBase;
  },
    
  /**
   * ステータスを取得する
   *   arIAkahukuP2PServant2.getStatus
   *
   * @param  Boolean self
   *         自分のステータスのみか
   * @return String
   *         ステータス
   *           自分のノード文字列,自分の IP アドレス,自分のポート番号,
   *             保持ノード数、接続ノード数,
   *             P2P 送功回数,P2P 受信回数,リレー成功回数,Web 受信回数,
   *             ポートチェック状況,
   *             見ている板;...
   *           襲い専かどうか,PING値,
   *             接続した時刻,最後に送受信した時刻,
   *             最後にリレーした時刻,最下位になった時刻,
   *             送信回数,受信回数,リレー回数
   *             見ている板;... ,
   *             リレーできる板;...,赤福のバージョン
   *           ...
   */
  getStatus : function (self) {
    var status = "";
        
    if (arAkahukuP2PServant2.started) {
      if (!arAkahukuP2PServant2.noaccept) {
        status
          += arAkahukuP2PServant2.nodeName + ","
          + arAkahukuP2PServant2.address + ","
          + arAkahukuP2PServant2.port + ",";
      }
      else {
        status
          += "noaccept,"
          + ","
          + ",";
      }
    }
    else {
      if (arAkahukuP2PServant2.stopOffline) {
        status
        += "offline,"
        + ","
        + ",";
      }
      else {
        status
        += "stop,"
        + ","
        + ",";
      }
    }
        
    var i, j;
        
    var namedNode = 0;
    for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      var node = arAkahukuP2PServant2.nodeList [i];
      if (node.nodeName) {
        namedNode ++;
      }
    }
    var aliveNode = 0;
    for (i = 0; i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
      var node = arAkahukuP2PServant2.activeNodeList [i];
      if (node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
        aliveNode ++;
      }
    }
        
    status
    += namedNode + ","
    + aliveNode + ","
    + arAkahukuP2PServant2.sendSuccess + ","
    + arAkahukuP2PServant2.recvSuccess + ","
    + arAkahukuP2PServant2.relaySuccess + ","
    + arAkahukuP2PServant2.recvFail + ",";
        
    if (arAkahukuP2PServant2.portCheckState == 3) {
      status += "ok,";
    }
    else if (arAkahukuP2PServant2.portCheckFailed >= 3) {
      status += "fail,";
    }
    else {
      status += "checking,";
    }
        
    var board;
    for (board in arAkahukuP2PServant2.boardList) {
      status
      += board + ":" + arAkahukuP2PServant2.boardList [board] + ";";
    }
    status += "\n";
        
    if (!self) {
      for (i = 0;
           i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
        var node = arAkahukuP2PServant2.activeNodeList [i];
                
        if (node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
          status
            += (node.nodeName == "") + ","
            + node.ping + ","
            + node.connectTime + ","
            + node.successTime + ","
            + node.relayTime + ","
            + node.worstTime + ","
            + node.sendSuccess + ","
            + node.recvSuccess + ","
            + node.relaySuccess + ",";
          for (board in node.boardList) {
            status
              += board + ":" + node.boardList [board] + ";";
          }
          status += ",";
          for (board in node.relayBoardList) {
            status
              += board + ":" + node.relayBoardList [board] + ";";
          }
          status
            += ","
            + node.akahukuVersion + ","
            + "\n";
        }
      }
    }
        
    return status;
  },
    
  /**
   * ノードリストを取得する
   *   arIAkahukuP2PServant2.getNodeList
   *
   * @return String
   *         ノードリスト
   *           ノード文字列|ステータス|最後に生存を確認した時刻|板;板;板;,
   *           ...
   */
  getNodeList : function () {
    var nodeList = "";
    var i;
    var node;
    for (i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      node = arAkahukuP2PServant2.nodeList [i];
      if (node.nodeName) {
        nodeList
          += node.nodeName
          + "|" + node.status
          + "|" + node.lastAliveTime
          + "|";
        for (board in node.boardList) {
          nodeList
            += board + ":" + node.boardList [board] + ";";
        }
        nodeList
          += ",";
      }
    }
    return nodeList;
  },
    
  /**
   * ノードからリクエスト、レスポンスが来たイベント
   *
   * @param  String request
   *         リクエスト、レスポンスのヘッダ
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @return Number
   *         結果
   *           0: 正常
   *           1: バージョンが違う
   *           2: プロトコルエラー
   */
  onRequest : function (request, node) {
    var pos;
    var method = "", path = "", protocol = "", version = "";
    var status = "";
    var headerMap = new Object  ();
        
    /* リクエストのヘッダを解析 */
    request.replace
    (/([^\r\n]*)\r\n/g,
     function (matched, line) {
      if (line.match (/^([^ \/]+) ([^ ]+) ([^\/]+)\/([0-9\.]+)$/)) {
        method = RegExp.$1;
        path = RegExp.$2;
        protocol = RegExp.$3;
        version = RegExp.$4;
      }
      else if (line.match (/^([^ \t:]+)[ \t]*:[ \t]*(.*)$/)) {
        var name = RegExp.$1;
        var value = RegExp.$2;
        headerMap [name.toLowerCase ()] = value;
      }
    });
        
    if (protocol != arAkahukuP2PServant2.PROTOCOL_NAME) {
      /* プロトコル名が違う、もしくはプロトコル自体が違う */
      return 2;
    }
    if (version != arAkahukuP2PServant2.PROTOCOL_VERSION) {
      /* バージョンが違う */
      /* バージョンチェックは一時的に外す */
      //return 1;
    }
    node.version = version;
        
    if (method) {
      //dump ("<- " + method + ":" + node.nodeName + ":" + node.address + ":" + "\n");
      //dump (request);
      if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_GET) {
        //dump ("<- GET:" + path + ":" + node.nodeName + ":" + node.address + ":" + "\n");
        //dump (request);
        if (path.match (/^\/([^\/]+)\/([^\/]+)\/(cat|thumb|src)\/([A-Za-z0-9]+\.[a-z]+)$/)) {
          var server = RegExp.$1;
          var dir = RegExp.$2;
          var type = RegExp.$3;
          var leafName = RegExp.$4;
          if (!server.match (/^[a-z0-9\-]+$/)
              || !dir.match (/^[a-z0-9\-]+$/)
              || !type.match (/^[a-z]+$/)
              || !leafName.match (/^[A-Za-z0-9]+\.[A-Za-z0-9]+$/)) {
            return 2;
          }
                    
          var relayCount = 0;
          if ("relay" in headerMap) {
            relayCount = parseInt (headerMap ["relay"]);
            if (relayCount > 3) {
              relayCount = 3;
            }
          }
                    
          var id = "";
          if ("id" in headerMap) {
            id = headerMap ["id"];
          }
          else {
            return 2;
          }
                    
          var relaying = "false";
          if ("relaying" in headerMap) {
            relaying = headerMap ["relaying"];
          }
                    
          var now = (new Date ()).getTime ();
                    
          var board = server + "/" + dir;
          if (type == "cat") {
            board += "_cat";
          }
                    
          if (relaying == "false") {
            /* 本人からのリクエスト
             * 本人の板リストを更新 */
            node.boardList [board] = parseInt (now / 1000);
          }
          else {
            /* リレー中のリクエスト
             * リレー可能板リストを更新 */
            node.relayBoardList [board] = parseInt (now / 1000);
          }
                    
          var relayed = "";
          if ("relayed" in headerMap) {
            relayed = headerMap ["relayed"];
          }
                    
          var relayedList = new Object ();
          relayed.replace
            (/([^;]+);/g,
             function (matched, name) {
              relayedList [name] = true;
                        
              return "";
            });
                    
                    
          if (arAkahukuP2PServant2.enableTreatAsSame
              && dir.match (/^([^\-]+)\-([^\-]+)$/)) {
            server = RegExp.$1;
            dir = RegExp.$2;
          }
                    
          var targetFile
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (nsILocalFile);
          var targetFileName
            = arAkahukuP2PServant2.cacheBase
            + arAkahukuP2PServant2.separator
            + server
            + arAkahukuP2PServant2.separator
            + dir
            + arAkahukuP2PServant2.separator
            + type
            + arAkahukuP2PServant2.separator
            + leafName;
          targetFile.initWithPath (targetFileName);
                    
          if (targetFile.exists ()
              && targetFile.fileSize > 1024 * 1024) {
            /* 1 MB 以上なら送らない */
            arAkahukuP2PServant2.sendNotAvaliable
              (node, path, relayedList, id);
            return 0;
          }
          if (arAkahukuP2PServant2.last1SecBytes
              + arAkahukuP2PServant2.last2SecBytes
              > arAkahukuP2PServant2.TRANSFER_LIMIT * 2) {
            /* 帯域制限を越えていたら送らない */
            /* 計算方法が微妙... */
            arAkahukuP2PServant2.sendNotAvaliable
              (node, path, relayedList, id);
            return 0;
          }
                    
          if (!targetFile.exists ()) {
            /* ファイルが無ければ */
            if (relayCount > 0) {
              /* リレー回数が残っていればリレーする */
              arAkahukuP2PServant2.getFileCore
                (path,
                 null,
                 null,
                 null,
                 0,
                 node,
                 relayedList,
                 id,
                 relayCount - 1,
                 (new Date ()).getTime (),
                 arAkahukuP2PServant2.REQUEST_TIMEOUT,
                 arAkahukuP2PServant2.REQUEST_TOTAL_TIMEOUT);
              return 0;
            }
            else {
              /* リレー回数が残っていなければあきらめる */
              arAkahukuP2PServant2.sendNotAvaliable
                (node, path, relayedList, id);
              return 0;
            }
          }
                    
          node.successTime = now;
          node.sendSuccess ++;
          arAkahukuP2PServant2.sendSuccess ++;
                    
          /* ファイルがあれば送る */
          arAkahukuP2PServant2.sendFile
            (node, targetFile, path, "", relayedList, id);
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_PUT) {
        //dump ("<- PUT:" + path + ":" + node.nodeName + ":" + node.address + ":" + "\n");
                
        if ("len" in headerMap
            && "id" in headerMap
            && "hash" in headerMap) {
          var len = parseInt (headerMap ["len"]);
          if (len > 1024 * 1024) {
            /* 1 MB 以上なら受け取らない */
            return 2;
          }
          node.currentMethod = method;
          node.currentID = headerMap ["id"];
          if (node.currentID == "0") {
            return 2;
          }
          node.currentLength = len;
          node.currentHash = headerMap ["hash"];
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_NA) {
        //dump ("<- NA:" + path + ":" + node.nodeName + ":" + node.address + ":" + "\n");
        //dump (request);
                
        if ("id" in headerMap) {
          var relayed = "";
          if ("relayed" in headerMap) {
            relayed = headerMap ["relayed"];
          }
          //dump ("NA:  " + relayed + "\n");
          //dump ("<- NA:" + path + ":" + node.nodeName + ":" + node.address + ":" + relayed + "\n");
                    
          node.currentMethod = method;
          node.currentRelayed = relayed;
          node.currentID = headerMap ["id"];
          if (node.currentID == "0") {
            return 2;
          }
                    
          arAkahukuP2PServant2.onData (null, node);
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_PING) {
        if (path == 0) {
          /* 能動側 -> 受動側 */
                    
          arAkahukuP2PServant2.sendPING (node, 1);
        }
        else if (path == 1) {
          /* 能動側 <- 受動側 */
          /* 能動側完了 */
                    
          var now = (new Date ()).getTime ();
          node.ping = now - node.pingTime;
          node.lastAliveTime = parseInt (now / 1000);
                    
          arAkahukuP2PServant2.sendPING (node, 2);
        }
        else if (path == 2) {
          /* 能動側 -> 受動側 */
          /* 受動側完了 */
                    
          var now = (new Date ()).getTime ();
          node.ping = now - node.pingTime;
          node.lastAliveTime = parseInt (now / 1000);
        }
                
        return 0;
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_STATUS) {
        if ("len" in headerMap) {
          var len = parseInt (headerMap ["len"]);
          if (len > 1024 * 100) {
            /* 100 kB 以上なら受け取らない */
            return 2;
          }
          node.currentMethod = method;
          node.currentLength = len;
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_WHOAMI) {
        arAkahukuP2PServant2.sendYOUARE (node, headerMap ["id"]);
                
        return 0;
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_YOUARE) {
        if (arAkahukuP2PServant2.dynamicID == headerMap ["id"]) {
          var bad = false;
          if (!path.match
              (/^[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$/)) {
            /* 固定のアドレスがおかしい場合 */
            bad = true;
          }
          if (path.match
              (/^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/)) {
            /* IP アドレス */
            var n1 = parseInt (RegExp.$1);
            var n2 = parseInt (RegExp.$2);
            var n3 = parseInt (RegExp.$3);
            var n4 = parseInt (RegExp.$4);
            if (n1 == 10
                || (n1 == 172 && n2 >= 16 && n2 <= 31)
                || (n1 == 192 && n2 == 168)
                || (n1 == 127 && n2 == 0 && n3 == 0 && n4 == 1)
                || (n1 == 169 && n2 == 254)) {
              /* プライベートアドレス、
               * リンクローカルアドレスの場合 */
              bad = true;
            }
          }
          else if (path.match (/^[0-9]/)) {
            /* IP アドレスが完結していない場合は */
            bad = true;
          }
          if (bad) {
            node.whoamiBad = true;
            return 0;
          }
                    
          var now = (new Date ()).getTime ();
          arAkahukuP2PServant2.lastDynamicTime = now;
          arAkahukuP2PServant2.setAddress (path);
                    
          /* 各ノードに知らせる */
          for (var i = 0;
               i < arAkahukuP2PServant2.nodeList.length; i ++) {
            var node2 = arAkahukuP2PServant2.nodeList [i];
                    
            node2.nodeTime = 0;
          }
                
          /* Akahuku に知らせる */
          var entries
            = Components.classes
            ["@mozilla.org/appshell/window-mediator;1"]
            .getService (nsIWindowMediator)
            .getEnumerator ("navigator:browser");
                    
          while (entries.hasMoreElements ()) {
            var targetWindow = entries.getNext ();
                    
            try {
              targetWindow.arAkahukuP2P.updateAddress (path);
            }
            catch (e) {
            }
          }
        }
                
        return 0;
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_CHECK) {
        if (path == 0) {
          var port = parseInt (headerMap ["port"]);
                    
          arAkahukuP2PServant2.sendCHECK (node, 1, port);
                    
          var checker = new arAkahukuP2PServantPortChecker ();
          checker.checkPort (node.address, port);
        }
        else if (path == 1) {
          if (arAkahukuP2PServant2.portCheckState == 1) {
            arAkahukuP2PServant2.portCheckState = 2;
          }
        }
                
        return 0;
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_NODE) {
        if ("len" in headerMap) {
          var len = parseInt (headerMap ["len"]);
          if (len > 100 * 1024) {
            /* 100 kB 以上なら受け取らない */
            return 2;
          }
          node.currentMethod = method;
          node.currentLength = len;
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_FULL) {
        if ("len" in headerMap) {
          var len = parseInt (headerMap ["len"]);
          if (len > 100 * 1024) {
            /* 100 kB 以上なら受け取らない */
            return 2;
          }
          node.currentMethod = method;
          node.currentLength = len;
                    
          return 0;
        }
      }
      else if (method == arAkahukuP2PServant2.PROTOCOL_METHOD_BYE) {
        var errorCode = 0;
        if (path == 100) {
          errorCode = arAkahukuP2PServant2.ERROR_STOPPING;
        }
        else if (path == 200) {
          errorCode = arAkahukuP2PServant2.ERROR_VERSION;
        }
        else if (path == 300) {
          errorCode = arAkahukuP2PServant2.ERROR_DUP;
        }
        node.disconnect (errorCode, 2);
                
        return 0;
      }
            
      /* 未知のメソッド */
      //return 1;
      /* とりあえず単に無視する */
      return 0;
    }
        
    /* プロコトルエラー */
    return 2;
  },
    
  /**
   * ノードからデータが来たイベント
   *
   * @param  String data
   *         データ
   *           失敗の場合は null
   * @param  arAkahukuP2PNode node
   *         対象のノード
   */
  onData : function (data, node) {
    if (node.currentMethod == arAkahukuP2PServant2.PROTOCOL_METHOD_PUT) {
      if (node.currentID in arAkahukuP2PServant2.requestList) {
        var request
        = arAkahukuP2PServant2.requestList [node.currentID];
        if (request.node == node) {
          /* リクエストを発行していた */
                    
          delete arAkahukuP2PServant2.requestList [node.currentID];
          arAkahukuP2PServant2.requestCount --;
                    
          /* キャッシュファイルを作成 */
          var targetFile
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (nsILocalFile);
          targetFile.initWithPath (request.targetFileName);
          if (!targetFile.exists ()) {
            targetFile.create (0x00, 0644);
          }
          var fstream
            = Components.classes
            ["@mozilla.org/network/file-output-stream;1"]
            .createInstance (nsIFileOutputStream);
          fstream.init (targetFile,
                        0x02 | 0x08 | 0x20, 0644, 0);
          fstream.write (data, data.length);
          fstream.close ();
                    
          /* ハッシュを算出 */
          targetFile
            = Components.classes ["@mozilla.org/file/local;1"]
            .createInstance (nsILocalFile);
          targetFile.initWithPath (request.targetFileName);
          var realHash
            = arAkahukuP2PServant2.getHashFromFile
            (targetFile, request.leafName);
                    
          if (node.currentHash == realHash) {
            /* ハッシュが正しければハッシュファイルを作成 */
            var targetFile
              = Components.classes
              ["@mozilla.org/file/local;1"]
              .createInstance (nsILocalFile);
            targetFile.initWithPath (request.targetFileName);
            arAkahukuP2PServant2.createHashFile
              (targetFile,
               request.leafName,
               node.currentHash);
                        
            if (request.relayNode) {
              /* リレー中の場合、リレー元に送信 */
                            
              var now = (new Date ()).getTime ();
              node.relayTime = now;
              node.relaySuccess ++;
              arAkahukuP2PServant2.relaySuccess ++;
                            
              var targetFile
                = Components.classes
                ["@mozilla.org/file/local;1"]
                .createInstance (nsILocalFile);
              targetFile.initWithPath
                (request.targetFileName);
                            
              arAkahukuP2PServant2.sendFile
                (request.relayNode, targetFile,
                 request.path,
                 realHash,
                 request.relayedList,
                 request.relayID);
            }
            else {
              var now = (new Date ()).getTime ();
              node.successTime = now;
              node.recvSuccess ++;
              arAkahukuP2PServant2.recvSuccess ++;
                            
              if (request.listener) {
                request.listener.onP2PSave ();
              }
            }
                        
            return;
          }
                
          /* 次のノードを試行、もしくは終了 */
          arAkahukuP2PServant2.getFileCore
            (request.path,
             request.listener,
             request.nodeList,
             request.firstNodeList,
             request.timeoutCount,
             request.relayNode,
             request.relayedList,
             request.relayID,
             request.relayCount,
             request.totalStartTime,
             request.timeout,
             request.totalTimeout);
        }
      }
    }
    else if (node.currentMethod
             == arAkahukuP2PServant2.PROTOCOL_METHOD_NA) {
      if (node.currentID in arAkahukuP2PServant2.requestList) {
        var request
        = arAkahukuP2PServant2.requestList [node.currentID];
        if (request.node == node) {
          delete arAkahukuP2PServant2.requestList [node.currentID];
          arAkahukuP2PServant2.requestCount --;
                    
          /* relayed を結合 */
          node.currentRelayed.replace
            (/([^;]+);/g,
             function (matched, name) {
              request.relayedList [name] = true;
                            
              return "";
            });
                    
          /* 次のノードを試行、もしくは終了 */
          arAkahukuP2PServant2.getFileCore
            (request.path,
             request.listener,
             request.nodeList,
             request.firstNodeList,
             request.timeoutCount,
             request.relayNode,
             request.relayedList,
             request.relayID,
             request.relayCount,
             request.totalStartTime,
             request.timeout,
             request.totalTimeout);
        }
      }
    }
    else if (node.currentMethod
             == arAkahukuP2PServant2.PROTOCOL_METHOD_STATUS) {
      var tmp = data.split (/,/);
      if (tmp.length >= 2) {
        var nodeName = tmp [0];
        var boardList = tmp [1];
        var relayBoardList = "";
        if (tmp.length >= 3) {
          relayBoardList = tmp [2];
        }
        if (tmp.length >= 4) {
          node.akahukuVersion = tmp [3];
          node.akahukuVersion
            = node.akahukuVersion.replace (/[\r\n]/g, "");
        }
                
        tmp
          = arAkahukuP2PServant2.decodeNodeName (nodeName);
        if (tmp) {
          node.nodeName = nodeName;
          node.address = tmp [0];
          node.port = tmp [1];
        }
                
        var list = new Object ();
        boardList.replace
          (/([^:]+):([^;]+);/g,
           function (matched, board, time) {
            list [board] = parseInt (time);
                        
            return "";
          });
        node.boardList = list;
                
        list = new Object ();
        relayBoardList.replace
          (/([^:]+):([^;]+);/g,
           function (matched, board, time) {
            list [board] = parseInt (time);
                        
            return "";
          });
        node.relayBoardList = list;
                
        if (node.status == arAkahukuP2PServant2.STATUS_START) {
          /* 初回の STAT 受信 */
          node.status = arAkahukuP2PServant2.STATUS_ALIVE;
                    
          if (node.connected) {
            /* 受動接続からの初回の STAT の場合、STAT を返す */
            arAkahukuP2PServant2.sendStatus (node);
          }
          else {
            /* 能動接続からの初回の STAT の場合、PING を返す */
            arAkahukuP2PServant2.sendPING (node, 0);
          }
        }
        else if (node.status == arAkahukuP2PServant2.STATUS_ALIVE) {
          if (node.connected) {
            /* 受動接続からの STAT の場合、STAT を返す */
            arAkahukuP2PServant2.sendStatus (node);
          }
        }
      }
    }
    else if (node.currentMethod
             == arAkahukuP2PServant2.PROTOCOL_METHOD_NODE) {
      data.replace
      (/([^\r\n]*)\r\n/g,
       function (matched, line) {
        var tmp = line.split (/,/);
        if (tmp.length >= 3) {
          var nodeName = tmp [0];
          var lastAliveTime = parseInt (tmp [1]);
          var boardList = tmp [2];
                    
          arAkahukuP2PServant2.addNode (nodeName,
                                        false, lastAliveTime,
                                        boardList);
        }
      });
    }
    else if (node.currentMethod
             == arAkahukuP2PServant2.PROTOCOL_METHOD_FULL) {
      data.replace
      (/([^\r\n]*)\r\n/g,
       function (matched, line) {
        var tmp = line.split (/,/);
        if (tmp.length >= 3) {
          var nodeName = tmp [0];
          var lastAliveTime = parseInt (tmp [1]);
          var boardList = tmp [2];
                    
          arAkahukuP2PServant2.addNode (nodeName,
                                        false, lastAliveTime,
                                        boardList);
        }
      });
            
      node.disconnect (arAkahukuP2PServant2.ERROR_FULL, 0);
    }
        
    if (node.currentMethod != arAkahukuP2PServant2.PROTOCOL_METHOD_PUT
        && node.currentMethod != arAkahukuP2PServant2.PROTOCOL_METHOD_NA) {
      //dump (data);
    }
  },
    
  /**
   * ノードの通信が中断したイベント
   * そのノードを使用しているリクエストを中断する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   */
  onStop : function (node) {
    for (var id in arAkahukuP2PServant2.requestList) {
      var request = arAkahukuP2PServant2.requestList [id];
      if (request.node == node) {
        delete arAkahukuP2PServant2.requestList [id];
        arAkahukuP2PServant2.requestCount --;
                
        /* 次のノードを試行、もしくは終了 */
        arAkahukuP2PServant2.getFileCore
          (request.path,
           request.listener,
           request.nodeList,
           request.firstNodeList,
           request.timeoutCount,
           request.relayNode,
           request.relayedList,
           request.relayID,
           request.relayCount,
           request.totalStartTime,
           request.timeout,
           request.totalTimeout);
      }
    }
  },
    
  /**
   * 送信完了イベント
   * FULL, BYE を送信完了したら閉じる
   *   nsITransportEventSink.onTransportStatus
   *
   * @param  nsITransport transport
   *         呼び出し元の通信
   * @param  Number status
   *         ステータス
   * @param  Number progress
   *         進行状況
   * @param  Number progressMax
   *         進行状況の最大
   */
  onTransportStatus : function (transport, status, progress, progressMax) {
    try {
      transport.close (0);
    }
    catch (e) {
    }
  },
    
  /**
   * 満員エラーを送信する
   *
   * @param  nsISocketTransport transport
   *         送信先
   */
  sendFull : function (transport) {
    transport.setTimeout (nsISocketTransport .TIMEOUT_READ_WRITE,
                          arAkahukuP2PServant2.READ_WRITE_TIMEOUT);
    var currentThread
      = Components.classes ["@mozilla.org/thread-manager;1"]
      .getService (nsIThreadManager).currentThread;
    transport.setEventSink (arAkahukuP2PServant2, currentThread);
        
    var outputStream
    = transport.openOutputStream (nsITransport.OPEN_BLOCKING, 0, 0);
        
    var data = "";
    var body = "";
        
    for (var i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      var node = arAkahukuP2PServant2.nodeList [i];
            
      if (node.nodeName == ""
          || node.status == arAkahukuP2PServant2.STATUS_REMOVING) {
        /* 襲い専か削除中のノードは無視する */
        continue;
      }
            
      body
        += node.nodeName + ","
        + node.lastAliveTime + ",";
      for (board in node.boardList) {
        body
          += board + ":" + node.boardList [board] + ";";
      }
            
      body += "\r\n";
    }
        
    data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_FULL
    + " " + "/"
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "len: " + body.length + "\r\n"
    + "\r\n"
    + body;
        
    try {
      outputStream.write (data, data.length);
    }
    catch (e) {
    }
        
    try {
      outputStream.close ();
    }
    catch (e) {
    }
  },
    
  /**
   * BYE を送信する
   *
   * @param  nsISocketTransport transport
   *         送信先
   * @param  nsIAsyncOutputStream outputStream
   *         送信先
   * @param  Number code
   *         終了コード
   */
  sendBye : function (transport, outputStream, code) {
    var currentThread
      = Components.classes ["@mozilla.org/thread-manager;1"]
      .getService (nsIThreadManager).currentThread;
    transport.setEventSink (arAkahukuP2PServant2, currentThread);
        
    var data = "";
        
    data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_BYE
    + " " + code
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "\r\n";
        
    try {
      outputStream.write (data, data.length);
    }
    catch (e) {
    }
        
    try {
      outputStream.close ();
    }
    catch (e) {
    }
  },
    
  /**
   * ノードにファイルを送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @param  nsILocalFile targetFile
   *         送信するファイル
   * @param  String path
   *         リクエストのパス
   * @param  String hash
   *         ハッシュ
   * @param  Object relayedList
   *         リレーで経由したノード
   * @param  String id
   *         リクエストの ID
   */
  sendFile : function (node, targetFile, path, hash, relayedList, id) {
    if (hash == "") {
      /* ハッシュが不明の場合ハッシュファイルから取得する */
      hash = arAkahukuP2PServant2.getHashFileInfo (targetFile);
            
      if (hash == "") {
        /* ハッシュを持っていない */
        arAkahukuP2PServant2.sendNotAvaliable
          (node, path, relayedList, id);
        return;
      }
    }
        
    var body = "";
        
    /* ファイルを読み込む */
    try {
      var fstream
        = Components
        .classes ["@mozilla.org/network/file-input-stream;1"]
        .createInstance (nsIFileInputStream);
      var bstream
        = Components.classes ["@mozilla.org/binaryinputstream;1"]
        .createInstance (nsIBinaryInputStream);
      fstream.init (targetFile, 0x01, 0444, 0);
      bstream.setInputStream (fstream);
      body = bstream.readBytes (targetFile.fileSize);
      bstream.close ();
      fstream.close ();
    }
    catch (e) {
      /* 読み込めなかった */
      arAkahukuP2PServant2.sendNotAvaliable
      (node, path, relayedList, id);
      return;
    }
        
    var contentType = "";
    if (targetFile.leafName.match (/\.jpg$/i)) {
      contentType = "image/jpeg";
    }
    else if (targetFile.leafName.match (/\.gif$/i)) {
      contentType = "image/gif";
    }
    else if (targetFile.leafName.match (/\.png$/i)) {
      contentType = "image/png";
    }
        
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_PUT
    + " " + path
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "len: " + targetFile.fileSize + "\r\n"
    + "hash: " + hash + "\r\n"
    + "id: " + id + "\r\n"
    + "\r\n"
    + body;
        
    arAkahukuP2PServant2.last1SecBytes += targetFile.fileSize;
    //dump ("-> PUT:" + path + ":" + node.nodeName + ":" + node.address + "" + "\n");
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
  },
    
  /**
   * ノードにエラーを送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @param  Object relayedList
   *         リレーで経由したノード
   * @param  String path
   *         リクエストのパス
   * @param  String id
   *         リクエストの ID
   */
  sendNotAvaliable : function (node, path, relayedList, id) {
    if (arAkahukuP2PServant2.nodeName) {
      relayedList [arAkahukuP2PServant2.nodeName] = true;
    }
        
    var relayed = "";
    for (var tmp in relayedList) {
      relayed += tmp + ";";
    }
        
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_NA
    + " " + path
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "id: " + id + "\r\n"
    + "relayed: " + relayed + "\r\n"
    + "\r\n";
        
    //dump ("-> NA:" + path + ":" + node.nodeName + ":" + node.address + "" + "\n");
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
  },
    
  /**
   * ノードに PING を送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @param  Number state
   *         進行状況
   */
  sendPING : function (node, state) {
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_PING
    + " " + state
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "\r\n";
        
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
        
    var now = (new Date ()).getTime ();
    node.pingTime = now;
  },
    
  /**
   * ノードに WHOAMI を送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   */
  sendWHOAMI : function (node) {
    arAkahukuP2PServant2.dynamicID
    = new Date ().getTime ()
    + "_" + arAkahukuP2PServant2.requestIndex
    + "_" + Math.floor (Math.random () * 1000000);
        
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_WHOAMI
    + " " + "/"
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "id: " + arAkahukuP2PServant2.dynamicID + "\r\n"
    + "\r\n";
        
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
        
    var now = (new Date ()).getTime ();
    arAkahukuP2PServant2.lastDynamicSendTime = now;
  },
    
  /**
   * ノードに YOUARE を送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @param  String id
   *         WHOAMI の ID
   */
  sendYOUARE : function (node, id) {
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_YOUARE
    + " " + node.transport.host
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "id: " + id + "\r\n"
    + "\r\n";
        
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
  },
    
  /**
   * ノードに CHECK を送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   * @param  Number state
   *         進行状況
   * @param  Number port
   *         ポート番号
   */
  sendCHECK : function (node, state, port) {
    var data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_CHECK
    + " " + state
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "port: " + port + "\r\n"
    + "\r\n";
        
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
        
    if (state == 0) {
      var now = (new Date ()).getTime ();
      arAkahukuP2PServant2.portCheckTime = now;
    }
  },
    
  /**
   * ノードにノードリストを送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   */
  sendNode : function (node) {
    var data = "";
    var body = "";
        
    for (var i = 0; i < arAkahukuP2PServant2.nodeList.length; i ++) {
      var node2 = arAkahukuP2PServant2.nodeList [i];
            
      if (node == node2) {
        continue;
      }
            
      if (node2.nodeName == ""
          || node2.status == arAkahukuP2PServant2.STATUS_REMOVING) {
        /* 襲い専か削除中のノードは無視する */
        continue;
      }
            
      body
        += node2.nodeName + ","
        + node2.lastAliveTime + ",";
      for (board in node2.boardList) {
        body
          += board + ":" + node2.boardList [board] + ";";
      }
            
      body += "\r\n";
    }
        
    if (body) {
      data
      = arAkahukuP2PServant2.PROTOCOL_METHOD_NODE
      + " " + "/"
      + " " + arAkahukuP2PServant2.PROTOCOL_NAME
      + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
      + "\r\n"
      + "len: " + body.length + "\r\n"
      + "\r\n"
      + body;
        
      try {
        node.outputStream.write (data, data.length);
      }
      catch (e) {
        node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
      }
    }
        
    var now = (new Date ()).getTime ();
    node.nodeTime = now;
  },
    
  /**
   * ノードにノードリストを送信する
   *
   * @param  arAkahukuP2PNode node
   *         対象のノード
   */
  sendStatus : function (node) {
    var data = "";
    var body = "";
        
    body
    += arAkahukuP2PServant2.nodeName + ",";
    for (board in arAkahukuP2PServant2.boardList) {
      body
        += board + ":" + arAkahukuP2PServant2.boardList [board] + ";";
    }
    body += ",";
        
    var node2;
    for (var i = 0; i < arAkahukuP2PServant2.activeNodeList.length; i ++) {
      node2 = arAkahukuP2PServant2.activeNodeList [i];
            
      if (node == node2) {
        continue;
      }
            
      for (board in node2.boardList) {
        body
          += board + ":" + node2.boardList [board] + ";";
      }
    }
        
    body += ",";
    body += arAkahukuP2PServant2.akahukuVersion;
        
    body += "\r\n";
        
    data
    = arAkahukuP2PServant2.PROTOCOL_METHOD_STATUS
    + " " + "/"
    + " " + arAkahukuP2PServant2.PROTOCOL_NAME
    + "/" + arAkahukuP2PServant2.PROTOCOL_VERSION
    + "\r\n"
    + "len: " + body.length + "\r\n"
    + "\r\n"
    + body;
        
    try {
      node.outputStream.write (data, data.length);
    }
    catch (e) {
      node.disconnect (arAkahukuP2PServant2.ERROR_SEND_FAIL, 0);
    }
        
    var now = (new Date ()).getTime ();
    node.statTime = now;
  }
};

function arAkahukuP2PServant2_P () {
}
arAkahukuP2PServant2_P.prototype = {
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェース ID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIContentPolicy
   *         this
   */
  QueryInterface : function (iid) {
    return arAkahukuP2PServant2;
    
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};

/**
 * 本体のファクトリー
 *   Inherits From: nsIFactory
 */
var arAkahukuP2PServant2Factory = {
  /**
   * 本体を生成する
   *   nsIFactory.createInstance
   *
   * @param  nsISupport outer
   *          統合する対象
   * @param  nsIIDRef iid
   *         生成する対象のインターフェース ID
   * @return arAkahukuP2PServant2
   *         本体
   */
  createInstance : function (outer, iid) {
    if (outer != null) {
      /* 統合する対象がある場合はエラー */
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
        
    return arAkahukuP2PServant2.QueryInterface (iid);
  }
};

/**
 * XPCOM のモジュール
 *   Inherits From: nsIModule
 */
var arAkahukuP2PServant2Module = {
  /* 本体に関する情報 */
  CONTRACTID: "@unmht.org/akahuku-p2p-servant;2",
  CID: Components.ID ("{e2470698-e238-40f5-8b09-c3e617aae84c}"),
  CNAME: "Akahuku P2P Servant Ver.2 Component",
    
  /**
   * インターフェースの要求
   *   nsISupports.QueryInterface
   *
   * @param  nsIIDRef iid
   *         インターフェースID
   * @throws Components.results.NS_NOINTERFACE
   * @return nsIModule
   *         this
   */
  QueryInterface : function (iid) {
    if (iid.equals (nsISupports)
        || iid.equals (nsIModule)) {
      return this;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 登録処理
   *   nsIModule.registerSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   * @param  String type
   *         ローダの種類
   */
  registerSelf : function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.registerFactoryLocation (this.CID,
                                     this.CNAME,
                                     this.CONTRACTID,
                                     fileSpec, location, type);
  },
    
  /**
   * 登録解除処理
   *   nsIModule.unregisterSelf
   *
   * @param  nsIComponentManager compMgr
   * @param  nsIFile fileSpec
   *         モジュールのファイル
   *           reference と他のソースコード中で並びが違う
   * @param  String location
   *         不明
   *           reference と他のソースコード中で並びが違う
   */
  unregisterSelf : function (compMgr, fileSpec, location) {
    compMgr = compMgr.QueryInterface (nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation (this.CID, fileSpec);
  },
    
  /**
   * ファクトリーオブジェクトを取得する
   *   nsIModule.getClassObject
   *
   * @param  nsIComponentManager compMgr
   * @param  nsCIDRef cid
   *         取得対象のクラス ID
   * @param  nsIIDRef iid
   *         取得対象のインターフェース ID
   * @throws Components.results.NS_ERROR_NOT_IMPLEMENTED
   *         Components.results.NS_ERROR_NO_INTERFACE
   * @return arAkahukuP2PServant2Factory
   *         本体のファクトリー
   */
  getClassObject : function (compMgr, cid, iid) {
    if (cid.equals (this.CID)) {
      return arAkahukuP2PServant2Factory;
    }
        
    if (!iid.equals (nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
        
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
    
  /**
   * 終了できるかどうか
   *   nsIModule.canUnload
   *
   * @param  nsIComponentManager compMgr
   * @return Boolean
   *         終了できるかどうか
   */
  canUnload : function (compMgr) {
    return true;
  }
};

/**
 * モジュールを取得する
 * @param  nsIComponentManager compMgr
 * @param  nsIFile fileSpec
 *         モジュールのファイル
 * @return arAkahukuP2PServant2Module
 *         モジュール
 */
function NSGetModule (compMgr, fileSpec) {
  return arAkahukuP2PServant2Module;
}

/**
 * Gecko 2.0 以降でのXPCOMコンポーネントのインタフェース
 */
var NSGetFactory;
try {
  Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
  
  arAkahukuP2PServant2_P.prototype.classID
    = Components.ID ("{e2470698-e238-40f5-8b09-c3e617aae84c}");
  NSGetFactory = XPCOMUtils.generateNSGetFactory ([arAkahukuP2PServant2_P]);
}
catch (e) {
  Components.utils.reportError (e);
}

