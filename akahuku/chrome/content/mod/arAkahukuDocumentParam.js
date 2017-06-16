
/**
 * ドキュメントごとの情報
 */
function arAkahukuDocumentParam () {
  this.links = {
    // see Akahuku.collectLinks
    home : "", // ホーム
    homeAnchors : [],
    back : "", // 掲示板へ戻る
    backAnchors : [],
    catalog : "", // カタログ
    catalogAnchors : [],
  };
}
arAkahukuDocumentParam.prototype = {
  targetDocument : null,
  targetInnerWindowID : -1,
  targetOuterWindowID : -1,

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

  links : null,
};

