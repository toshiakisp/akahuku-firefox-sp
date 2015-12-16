/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */

/**
 * 文字コード変換器
 */
var arAkahukuConverter = {
  converter : null, /* nsIScriptableUnicodeConverter  文字コード変換器 */
    
  /**
   * 初期化処理
   */
  init : function () {
    arAkahukuConverter.converter
    = Components.classes ["@mozilla.org/intl/scriptableunicodeconverter"]
    .getService (Components.interfaces.nsIScriptableUnicodeConverter);
  },
    
  /**
   * 色々マズい文字をよろしくする
   *
   * @param  String text
   *         文字列
   * @return String
   *         よろしくした文字列
   */
  normalize : function (text) {
    return text
    .replace (/&nbsp;/g, " ")
    .replace (/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, "");
  },
    
  /**
   * 古い Mozilla Suite でエスケープ解除できない %uXXXX を解除する
   *
   * @param  String text
   *         解除する文字列
   * @return String
   *         解除した文字列
   */
  unescapeExtra : function (text) {
    return text
    .replace (/%u([0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f])/g,
              function (match, part) {
                return String.fromCharCode (parseInt (part, 16));
              });
  },
    
  /**
   * UTF-8 から UTF-16 に変換する
   *
   * @param  String text
   *         UTF-8 の文字列
   * @return String
   *         UTF-16 に変換した文字列
   */
  convertFromUTF8 : function (text) {
    arAkahukuConverter.converter.charset = "UTF-8";
    return arAkahukuConverter.converter.ConvertToUnicode (text);
  },
    
  /**
   * UTF-16 から UTF-8 に変換する
   *
   * @param  String text
   *         UTF-16 の文字列
   * @return String
   *         UTF-8 に変換した文字列
   */
  convertToUTF8 : function (text) {
    arAkahukuConverter.converter.charset = "UTF-8";
    return arAkahukuConverter.converter.ConvertFromUnicode (text);
  },
    
  /**
   * UTF-16 から ISO-2022-JP に変換する
   *
   * @param  String text
   *         UTF-16 の文字列
   * @return String
   *         ISO-2002-JP に変換した文字列
   */
  convertToISO2022JP : function (text) {
    arAkahukuConverter.converter.charset = "iso-2022-jp";
    return arAkahukuConverter.converter.ConvertFromUnicode (text);
  },
    
  /**
   * Shift_JIS から UTF-16 に変換する
   *
   * @param  String text
   *         Shift_JIS の文字列
   * @return String
   *         UTF-16 に変換した文字列
   */
  convertFromSJIS : function (text, retcode) {
    var sjis = text;
        
    arAkahukuConverter.converter.charset = "shift_jis";
    return arAkahukuConverter.converter.ConvertToUnicode (sjis);
  },
    
  /**
   * EUC-JP から UTF-16 に変換する
   *
   * @param  String text
   *         EUC-JP の文字列
   * @return String
   *         UTF-16 に変換した文字列
   */
  convertFromEUC : function (text, retcode) {
    var euc = text;
        
    arAkahukuConverter.converter.charset = "euc-jp";
    return arAkahukuConverter.converter.ConvertToUnicode (euc);
  },
    
  /**
   * 指定の文字コードから UTF-16 に変換する
   *
   * @param  String text
   *         文字列
   * @param  String charset
   *         文字コード
   * @return String
   *         UTF-16 に変換した文字列
   */
  convert : function (text, charset) {
    arAkahukuConverter.converter.charset = charset;
    return arAkahukuConverter.converter.ConvertToUnicode (text);
  },
    
  /**
   * UTF-16 から Shift_JIS に変換する
   * 変換できない文字は参照にする
   *
   * @param  String text
   *         UTF-16 の文字列
   * @param  String retcode
   *         改行コード
   * @return String
   *         Shift_JIS に変換した文字列
   */
  convertToSJIS : function (text, retcode) {
    var utf16 = text;
        
    arAkahukuConverter.converter.charset = "shift_jis";
    var sjis = arAkahukuConverter.converter.ConvertFromUnicode (utf16);
    var sjis2 = "";
        
    var utf16_i = 0;
    var sjis_i = 0;
    var sjis_c;
    var utf16_c, utf16_c2;
        
    while (sjis_i < sjis.length) {
      sjis_c = sjis.charCodeAt (sjis_i);
            
      utf16_c = utf16.charCodeAt (utf16_i);
            
      if (sjis_c >= 0x80) {
        if (sjis_c >= 0xa0 && sjis_c <= 0xdf) {
          /* 半角カナの場合 */
                    
          sjis2 += sjis [sjis_i];
          sjis_i ++;
                    
          utf16_i ++;
        }
        else {
          /* 2バイト文字の1バイト目の場合 */
                    
          sjis2 += sjis [sjis_i];
          sjis_i ++;
          sjis2 += sjis [sjis_i];
          sjis_i ++;
                    
          utf16_i ++;
        }
      }
      else {
        if (sjis_c == 63) {
          /* ? か、もしくは変換できなかった場合 */
                    
          utf16_c = utf16.charCodeAt (utf16_i);
          if (utf16_c != 63) {
            /* 変換できなかった場合 */
                        
            if (utf16_c >= 0xd800 && utf16_c <= 0xdbff) {
              /* サロゲートペアの場合 */
                            
              sjis_i ++;
              utf16_i ++;
              utf16_c2 = utf16.charCodeAt (utf16_i);
                            
              utf16_c
                = ((utf16_c & 0x03ff) << 10)
                + (utf16_c & 0x03ff) + 0x10000;
            }
                        
            sjis2 += "&#" + utf16_c + ";";
          }
          else {
            /* それ以外の場合 */
            sjis2 += sjis [sjis_i];
          }
        }
        else if (sjis_c == 10) {
          /* 改行コードの場合 */
          sjis2 += retcode;
        }
        else {
          sjis2 += sjis [sjis_i];
        }
                
        sjis_i ++;
        utf16_i ++;
      }
    }
        
    return sjis2;
  },
    
  /**
   * Shift_JIS 換算の文字列のバイト長を取得する
   * 変換できない文字は参照にする
   *   convertToSJIS を使ってから長さを取得するよりも高速
   *
   * @param  String text
   *         UTF-16 の文字列
   * @param  Number retcore
   *         改行コードのバイト長
   * @return Number
   *         Shift_JIS 換算の文字列のバイト長
   */
  getSJISLength : function (text, retcode) {
    var utf16 = text;
    retcode --;
        
    arAkahukuConverter.converter.charset = "shift_jis";
    var sjis = arAkahukuConverter.converter.ConvertFromUnicode (utf16);
        
    var length = sjis.length;
        
    var utf16_i = 0;
    var sjis_i = 0;
    var sjis_c;
    var utf16_c, utf16_c2;
        
    while (sjis_i < sjis.length) {
      sjis_c = sjis.charCodeAt (sjis_i);
            
      utf16_c = utf16.charCodeAt (utf16_i);
            
      if (sjis_c > 0x80) {
        if (sjis_c >= 0xa0 && sjis_c <= 0xdf) {
          /* 半角カナの場合 */
                    
          sjis_i ++;
          utf16_i ++;
        }
        else {
          /* 2バイト文字の1バイト目の場合 */
                    
          sjis_i += 2;
          utf16_i ++;
        }
      }
      else {
        if (sjis_c == 63) {
          /* ? か、もしくは変換できなかった場合 */
                    
          utf16_c = utf16.charCodeAt (utf16_i);
          if (utf16_c != 63) {
            /* 変換できなかった場合 */
                        
            if (utf16_c >= 0xd800 && utf16_c <= 0xdbff) {
              /* サロゲートペアの場合 */
                            
              sjis_i ++;
              utf16_i ++;
              utf16_c2 = utf16.charCodeAt (utf16_i);
                            
              utf16_c
                = ((utf16_c & 0x03ff) << 10)
                + (utf16_c & 0x03ff) + 0x10000;
                            
              length -= 2;
            }
            else {
              /* それ以外の場合 */
                            
              length --;
            }
                        
            length += ("&#" + utf16_c + ";").length;
          }
        }
        else if (sjis_c == 10) {
          /* 改行コードの場合 */
          length += retcode;
        }
                
        sjis_i ++;
        utf16_i ++;
      }
    }
        
    return length;
  },

  /**
   * Shift_JIS 換算のバイト長分の先頭部分文字列を得る
   * @param  String text
   *         UTF-16 の文字列
   * @param  Number bytelen
   *         Shift_JIS 換算の文字列のバイト長
   * @return String
   *         指定バイト長に相当する UTF-16 の部分文字列
   */
  getSubstrForSJISByteLength : function (text, bytelen) {
    var utf16 = text.substr (0, bytelen);

    arAkahukuConverter.converter.charset = "shift_jis";
    var sjis = arAkahukuConverter.converter.ConvertFromUnicode (utf16);

    var utf16_i = 0;
    var sjis_i = 0;
    var sjis_c;
    var utf16_c;

    while (sjis_i < sjis.length && sjis_i < bytelen) {
      sjis_c = sjis.charCodeAt (sjis_i);
      utf16_c = utf16.charCodeAt (utf16_i);

      if (sjis_c > 0x80) {
        if (sjis_c >= 0xa0 && sjis_c <= 0xdf) {
          /* 半角カナの場合 */
          sjis_i ++;
        }
        else {
          /* 2バイト文字の1バイト目の場合 */
          sjis_i += 2;
          if (sjis_i > bytelen) {
            /* 2バイト目が溢れる場合は中断 */
            break;
          }
        }
      }
      else {
        sjis_i ++;
      }
      utf16_i ++;
    }

    return utf16.substr (0, utf16_i);
  },
    
  /**
   * HTML に使えない文字をエスケープする
   * 
   * @param  String text
   *         エスケープする文字列
   * @return String
   *         エスケープした文字列
   */
  escapeEntity : function (text) {
    return text
    .replace (/&/g, "&amp;")
    .replace (/\"/g, "&quot;")
    .replace (/\'/g, "&#x27;")
    .replace (/</g, "&lt;")
    .replace (/>/g, "&gt;")
    .replace (/\xa0/g, "&nbsp;");
  },
    
  /**
   * HTML に使えない文字のエスケープを解除する
   * 
   * @param  String text
   *         エスケープを解除する文字列
   * @return String
   *         エスケープを解除した文字列
   */
  unescapeEntity : function (text) {
    return text
    .replace (/&gt;/g, ">")
    .replace (/&lt;/g, "<")
    .replace (/&quot;/g, "\"")
    .replace (/&#x27;/g, "\'")
    .replace (/&nbsp;/g, " ")
    .replace (/&amp;/g, "&");
  }
};


