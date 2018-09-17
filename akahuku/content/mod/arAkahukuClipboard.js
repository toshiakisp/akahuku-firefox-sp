/**
 * クリップボード処理
 */
var arAkahukuClipboard = {
  /**
   * クリップボードに文字列をコピー
   *
   * @param  String aString
   *         コピーするUnicode文字列
   * @parma  Document aDocument
   *         ドキュメント(オプション)
   */
  copyString : function (aString, aDocument) {
    try {
      navigator.clipboard.writeText(aString); // Fx63+
    }
    catch (e) {
      browser.runtime.sendMessage({
        target: 'clipboard-polyfill.js',
        command: 'writeText',
        args: [aString],
      });
    }
  },

  /**
   * クリップボードから画像を取得
   *
   * @parma  string flavor MIME/type
   * @return Promise to be a DOM File
   */
  getImage: async function (flavor, options={}) {
    const filelist = await this.getFiles();
    if (filelist.length == 0)
      throw new Error('No image from clipboard');
    const file = filelist[0];

    let byteLimit = Number.MAX_SAFE_INTEGER;
    if ('byteLimit' in options && options.byteLimit >= 1024) {
      byteLimit = options.byteLimit;
    }
    if (byteLimit >= file.size) {
      // No conversion (type may not be in flavor, png)
      return file;
    }

    return this.encodeImage(file, flavor, options)
      .catch((e) => {
        Akahuku.debug.exception(e);
        return file;
      });
  },

  encodeImage: async function (srcBlob, flavor, options={}) {
    const img = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error('Image loading error'));
      };
      img.src = URL.createObjectURL(srcBlob);
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', {
      // Clipboard image misses aplha due to mozilla [Bug 460969]
      alpha: false,
    });
    ctx.drawImage(img, 0, 0);

    let byteLimit = Number.MAX_SAFE_INTEGER;
    if ('byteLimit' in options && options.byteLimit >= 1024) {
      byteLimit = options.byteLimit;
    }

    let qualityBase = 1;
    if ('quality' in options
      && options.quality <= 1 && options.quality > 0)
      qualityBase = options.quality;

    // Encode with reducing quality
    let filename = 'encoded-image.jpg';
    if (srcBlob.name) {
      filename = 'encoded-' + srcBlob.name.replace(/\.[^.]*$/,'.jpg');
    }
    const scales = [1, 0.98, 0.95, 0.92, 0.88, 0.8, 0.75, 0.7, 0.6, 0.5];
    for (let scale of scales) {
      let blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, flavor, qualityBase*scale);
      });
      if (blob.size <= byteLimit) {
        return new File([blob], filename);
      }
    }
    throw new Error('Failed encoding into limitted byte size');
  },

  /**
   * クリップボードからファイルを取得
   * @return Promise to be a DOM File
   */
  getFile : async function () {
    const filelist = await this.getFiles();
    if (filelist.length > 0) {
      return filelist[0];
    }
    throw new Error('No file');
  },

  /**
   * クリップボードからファイルリストを取得
   * @return Promise to be a FileList
   */
  getFiles: async function () {
    const data = await browser.runtime.sendMessage({
      target: 'clipboard-polyfill.js',
      command: 'read',
      args: [],
    });

    // const dt = new DataTransfer(); // Fx62+
    const dt = new ClipboardEvent('').clipboardData;
    for (let src of data) {
      try {
        const blob = await (await fetch(src)).blob();
        // Dummy file name from mime type
        let filename = blob.type.split('/').join('.');
        filename = filename.replace(/\.jpeg$/, '.jpg');
        dt.items.add(new File([blob], filename));
      }
      catch (e) {
        Akahuku.debug.exception(e);
      }
    }
    return dt.files;
  },

};

