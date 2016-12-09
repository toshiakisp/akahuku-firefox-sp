
/**
 * ドキュメントごとの情報
 */
function arAkahukuDocumentParam () {
}
arAkahukuDocumentParam.prototype = {
  targetDocument : null,
  location_info : null,
    
  catalog_param : null,
  catalogpopup_param : null,
  mht_param : null,
  popupquote_param : null,
  postform_param : null,
  reload_param : null,
  gotop_scroll : null,
  threadoperator_param : null,
  
  layout : false,

  // see Akahuku.collectLinks
  links : {
    home : "", // ホーム
    homeAnchors : [],
    back : "", // 掲示板へ戻る
    backAnchors : [],
    catalog : "", // カタログ
    catalogAnchors : [],
  },
};

