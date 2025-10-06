var $ = require('jquery');
var createCgiObj = require('./cgi');
var util = require('./util');
var NetworkModal = require('./network-modal');
var storage = require('./storage');
var events = require('./events');
var workers = require('./workers');
var message = require('./message');

var updateWorkers = workers.updateWorkers;
var createCgi = createCgiObj.createCgi;
var MAX_INCLUDE_LEN = 5120;
var MAX_EXCLUDE_LEN = 5120;
var MAX_FRAMES_LENGTH = (exports.MAX_FRAMES_LENGTH = 256);
var TIMEOUT = 1000 * 36;
var LONG_TIMEOUT = TIMEOUT + 1000 * 10;
var dataCallbacks = [];
var serverInfoCallbacks = [];
var framesUpdateCallbacks = [];
var logCallbacks = [];
var directCallbacks = [];
var dataList = [];
var logList = [];
var svrLogList = [];
var setDataCenter = NetworkModal.setDataCenter;
var networkModal = new NetworkModal(dataList);
var curServerInfo;
var initialDataPromise, initialData, startedLoad;
var lastPageLogTime = -2;
var lastSvrLogTime = -2;
var curLogId;
var curSvrLogId;
var dataIndex = 1000000;
var MAX_PATH_LENGTH = 1024;
var MAX_LOG_LENGTH = 360;
var lastRowId;
var endId;
var hashFilterObj;
var clearNetwork;
var inited;
var logId;
var port;
var clientId;
var account;
var dataKeys = [];
var dumpCount = 0;
var updateCount = 0;
var MAX_UPDATE_COUNT = 4;
var MAX_WAIT_TIME = 1000 * 60 * 3;
var onlyViewOwnData = storage.get('onlyViewOwnData') == 1;
var pluginsMap = {};
var disabledPlugins = {};
var disabledAllPlugins;
var reqTabList = [];
var resTabList = [];
var tabList = [];
var toolTabList = [];
var comTabList = [];
var pluginColumns = [];
var webWorkerList = [];
var reqIndex = 0;
var composeDataMap = {};
var DEFAULT_CONF = {
  timeout: TIMEOUT,
  xhrFields: {
    withCredentials: true
  },
  data: {}
};
var composerItem;

exports.setComposerItem = function(item) {
  composerItem = item;
};

exports.clientIp = '127.0.0.1';
exports.MAX_INCLUDE_LEN = MAX_INCLUDE_LEN;
exports.MAX_EXCLUDE_LEN = MAX_EXCLUDE_LEN;
exports.MAX_LOG_LENGTH = MAX_LOG_LENGTH - 20;
exports.changeLogId = function (id) {
  logId = id;
};

exports.getPort = function () {
  return port;
};

exports.setDumpCount = function (count) {
  dumpCount = count > 0 ? count : 0;
};

exports.clearLogList = function() {
  logList = [];
};

exports.clearSvgLogList = function() {
  svrLogList = [];
};

exports.setOnlyViewOwnData = function (enable) {
  onlyViewOwnData = enable !== false;
  storage.set('onlyViewOwnData', onlyViewOwnData ? 1 : 0);
};
exports.isOnlyViewOwnData = function () {
  return onlyViewOwnData;
};

exports.filterIsEnabled = function () {
  if (onlyViewOwnData) {
    return true;
  }
  var settings = getFilterText();
  if (
    !settings ||
    (settings.disabledFilterText && settings.disabledExcludeText)
  ) {
    return;
  }
  var text = !settings.disabledFilterText && settings.filterText.trim();
  return text || (!settings.disabledExcludeText && settings.excludeText.trim());
};

function compareFilter(filter) {
  if (filter !== hashFilterObj) {
    return false;
  }
  if (!filter) {
    return true;
  }
  if (filter.url !== hashFilterObj.url || filter.ip !== hashFilterObj.ip) {
    return false;
  }
  return (
    filter.name === hashFilterObj.name && filter.value === hashFilterObj.value
  );
}

function handleHashFilterChanged(e) {
  var hash = location.hash.substring(1);
  var index = hash.indexOf('?');
  var filter;
  if (index !== -1) {
    var obj = util.parseQueryString(
      hash.substring(index + 1),
      null,
      null,
      decodeURIComponent
    );
    var curRuleName = obj.rulesName || obj.ruleName;
    var curValueName = obj.valuesName || obj.valueName;
    if (curRuleName !== exports.activeRulesName) {
      exports.activeRulesName = curRuleName;
      events.trigger('activeRules');
    }
    if (curValueName !== exports.activeValuesName) {
      exports.activeValuesName = curValueName;
      events.trigger('activeValues');
    }
    if (obj.url) {
      filter = {};
      filter.url = obj.url;
    }
    for (var i = 0; i < 6; i++) {
      var key = 'name' + (i || '');
      var header = obj[key];
      if (header) {
        filter = filter || {};
        filter[key] = header;
        var value = 'value' + (i || '');
        filter[value] = obj[value] || '';
      }
    }
    if (obj.ip) {
      filter = filter || {};
      filter.ip = obj.ip;
    }
    if (filter && filter.name && obj.mtype === 'exact') {
      filter.mtype = 1;
    }
    if (!inited && obj.clearNetwork === 'true') {
      clearNetwork = true;
    }
  }
  exports.hashFilterObj = filter;
  if (e && !compareFilter(filter)) {
    events.trigger('hashFilterChange');
  }
  hashFilterObj = filter;
}
handleHashFilterChanged();
$(window).on('hashchange', handleHashFilterChanged);

function setFilterText(settings) {
  settings = settings || {};
  storage.set(
    'filterText',
    JSON.stringify({
      disabledFilterText: settings.disabledFilterText,
      filterText: settings.filterText,
      disabledExcludeText: settings.disabledExcludeText,
      excludeText: settings.excludeText
    })
  );
}
exports.setFilterText = setFilterText;

function getFilterText() {
  var settings = util.parseJSON(storage.get('filterText'));
  return settings
    ? {
      disabledFilterText: settings.disabledFilterText,
      filterText: util
          .toString(settings.filterText)
          .substring(0, MAX_INCLUDE_LEN),
      disabledExcludeText: settings.disabledExcludeText,
      excludeText: util
          .toString(settings.excludeText)
          .substring(0, MAX_EXCLUDE_LEN)
    }
    : {
      filterText: '',
      excludeText: ''
    };
}
exports.getFilterText = getFilterText;

function setNetworkColumns(settings) {
  settings = settings || {};
  storage.set(
    'networkColumns',
    JSON.stringify({
      columns: settings.columns
    })
  );
}

exports.setNetworkColumns = setNetworkColumns;

function getNetworkColumns() {
  return util.parseJSON(storage.get('networkColumns')) || {};
}

exports.getNetworkColumns = getNetworkColumns;

var FILTER_TYPES_RE = /^(m|i|h|b|c|d|H):/;
var FILTER_TYPES = {
  m: 'method',
  i: 'ip',
  h: 'headers',
  b: 'body',
  c: 'body',
  d: 'host',
  H: 'host'
};
var filterCache = [];

function getFilterCache(text) {
  var len = filterCache.length;
  var result = len
    ? util.findArray(filterCache, function (item) {
      return item.text === text;
    })
    : null;
  len -= 10;
  if (len > 2) {
    filterCache = filterCache.slice(len);
    if (result && filterCache.indexOf(result) === -1) {
      filterCache.push(result);
    }
  }
  return result && result.filter;
}

function resolveFilterText(text) {
  text = text && text.trim();
  if (!text) {
    return;
  }
  var result = getFilterCache(text);
  if (result) {
    return result;
  }
  var pattern;
  text.split(/\s+/).forEach(function (line) {
    if (FILTER_TYPES_RE.test(line)) {
      var type = FILTER_TYPES[RegExp.$1];
      var not = line[2] === '!';
      line = line.substring(not ? 3 : 2);
      if (line) {
        result = result || [];
        pattern = util.toRegExp(line);
        result.push({
          type: type,
          not: not,
          pattern: pattern,
          keyword: pattern ? null : line.toLowerCase()
        });
      }
    } else if (line) {
      result = result || [];
      pattern = util.toRegExp(line);
      result.push({
        pattern: pattern,
        keyword: pattern ? null : line.toLowerCase()
      });
    }
  });
  if (result) {
    filterCache.push({
      text: text,
      filter: result
    });
  }
  return result;
}

function checkFilterField(str, filter, needDecode) {
  if (!str) {
    return false;
  }
  var result;
  if (filter.pattern) {
    result = filter.pattern.test(str);
  } else {
    if (needDecode) {
      try {
        var text = decodeURIComponent(str);
        if (text !== str) {
          str += '\n' + text;
        }
      } catch (e) {}
    }
    result = toLowerCase(str).indexOf(filter.keyword) !== -1;
  }
  return filter.not ? !result : result;
}

function checkFilter(item, list) {
  for (var i = 0, len = list.length; i < len; i++) {
    var filter = list[i];
    switch (filter.type) {
    case 'method':
      if (checkFilterField(item.req.method, filter)) {
        return true;
      }
      break;
    case 'ip':
      if (checkFilterField(item.req.ip || '127.0.0.1', filter)) {
        return true;
      }
      break;
    case 'headers':
      if (
          checkFilterField(util.objectToString(item.req.headers), filter, true)
        ) {
        return true;
      }
      break;
    case 'host':
      if (
          checkFilterField(
            item.isHttps ? item.url : util.getHost(item.url),
            filter
          )
        ) {
        return true;
      }
      break;
    case 'body':
      if (checkFilterField(util.getBody(item.req, true), filter)) {
        return true;
      }
      break;
    default:
      if (
          checkFilterField((item.isHttps ? 'tunnel://' : '') + item.url, filter)
        ) {
        return true;
      }
    }
  }
  return false;
}

var POST_CONF = $.extend(
  {
    type: 'post'
  },
  DEFAULT_CONF
);
var GET_CONF = $.extend(
  {
    cache: false
  },
  DEFAULT_CONF
);
var cgi = createCgiObj(
  {
    getData: 'cgi-bin/get-data',
    getInitial: 'cgi-bin/init'
  },
  GET_CONF
);

exports.createCgi = function (url, cancel, post) {
  return createCgi(
    {
      url: url,
      mode: cancel ? 'cancel' : null
    },
    post ? POST_CONF : GET_CONF
  );
};

function toLowerCase(str) {
  return String(str == null ? '' : str)
    .trim()
    .toLowerCase();
}

var certs = createCgiObj(
  {
    remove: 'cgi-bin/certs/remove',
    upload: {
      url: 'cgi-bin/certs/upload',
      contentType: 'application/json'
    },
    all: {
      url: 'cgi-bin/certs/all',
      type: 'get'
    }
  },
  POST_CONF
);

exports.certs = certs;

exports.uploadCerts = function (data, cb) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return certs.upload(data, function (data, xhr) {
    if (!data) {
      return util.showSystemError(xhr);
    }
    if (typeof cb === 'function') {
      cb(data);
    } else {
      events.trigger('showCustomCerts');
    }
  });
};

exports.values = createCgiObj(
  {
    recycleList: {
      type: 'get',
      url: 'cgi-bin/values/recycle/list'
    },
    recycleView: {
      type: 'get',
      url: 'cgi-bin/values/recycle/view'
    },
    recycleRemove: 'cgi-bin/values/recycle/remove',
    moveTo: {
      mode: 'chain',
      url: 'cgi-bin/values/move-to'
    },
    list: {
      type: 'get',
      url: 'cgi-bin/values/list'
    },
    add: 'cgi-bin/values/add',
    remove: 'cgi-bin/values/remove',
    rename: 'cgi-bin/values/rename'
  },
  POST_CONF
);

exports.plugins = createCgiObj(
  {
    disablePlugin: 'cgi-bin/plugins/disable-plugin',
    disableAllPlugins: 'cgi-bin/plugins/disable-all-plugins',
    getRegistryList: 'cgi-bin/plugins/registry-list',
    installPlugins: 'cgi-bin/plugins/install',
    uninstallPlugins: 'cgi-bin/plugins/uninstall',
    addRegistry: 'cgi-bin/plugins/add-registry'
  },
  POST_CONF
);

exports.rules = createCgiObj(
  {
    disableAllRules: 'cgi-bin/rules/disable-all-rules',
    recycleList: {
      type: 'get',
      url: 'cgi-bin/rules/recycle/list'
    },
    recycleView: {
      type: 'get',
      url: 'cgi-bin/rules/recycle/view'
    },
    recycleRemove: 'cgi-bin/rules/recycle/remove',
    moveTo: {
      mode: 'chain',
      url: 'cgi-bin/rules/move-to'
    },
    list: {
      type: 'get',
      url: 'cgi-bin/rules/list'
    },
    add: 'cgi-bin/rules/add',
    disableDefault: 'cgi-bin/rules/disable-default',
    enableDefault: 'cgi-bin/rules/enable-default',
    remove: 'cgi-bin/rules/remove',
    rename: 'cgi-bin/rules/rename',
    select: 'cgi-bin/rules/select',
    unselect: 'cgi-bin/rules/unselect',
    allowMultipleChoice: {
      mode: 'ignore',
      url: 'cgi-bin/rules/allow-multiple-choice'
    },
    enableBackRulesFirst: {
      mode: 'ignore',
      url: 'cgi-bin/rules/enable-back-rules-first'
    },
    setSysHosts: 'cgi-bin/rules/set-sys-hosts'
  },
  POST_CONF
);

exports.log = createCgiObj(
  {
    set: 'cgi-bin/log/set'
  },
  POST_CONF
);

var COMPOSE_CONF = $.extend(
  {
    type: 'post',
    contentType: 'application/json',
    processData: false
  },
    DEFAULT_CONF
  );

function createCompose(cancel) {
  return createCgiObj( {
    _: {
      url: 'cgi-bin/composer',
      mode: cancel ? 'cancel' : null
    }
  }, COMPOSE_CONF)._;
}

exports.createCompose = createCompose;

var composeParallel = createCompose();
var composeInner = createCompose(true);

function handleCompose(data, cb, options, handler) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  return handler(data, cb, options);
}

exports.composeInner = function (data, cb, options) {
  data.reqId = getReqId();
  return handleCompose(data, cb, options, composeInner);
};

exports.createComposeInterrupt = function () {
  var composeInterrupt = createCompose(true);
  return function (data, cb, options) {
    return handleCompose(data, cb, options, composeInterrupt);
  };
};

exports.compose = function (data, cb, options) {
  return handleCompose(data, cb, options, composeParallel);
};

$.extend(
  exports,
  createCgiObj(
    {
      interceptHttpsConnects: 'cgi-bin/intercept-https-connects',
      enableHttp2: 'cgi-bin/enable-http2',
      abort: 'cgi-bin/abort',
      setCustomColumn: 'cgi-bin/set-custom-column',
      addRulesAndValues: {
        url: 'cgi-bin/add-rules-values',
        contentType: 'application/json'
      },
      setIPv6Only: 'cgi-bin/set-ipv6-only',
      createTempFile: {
        url: 'cgi-bin/sessions/create-temp-file',
        contentType: 'application/json'
      },
      setDnsOrder: 'cgi-bin/set-dns-order',
      save: {
        url: 'cgi-bin/service/save',
        contentType: 'application/json'
      }
    },
    POST_CONF
  )
);
$.extend(
  exports,
  createCgiObj(
    {
      donotShowAgain: 'cgi-bin/do-not-show-again',
      checkUpdate: 'cgi-bin/check-update',
      importRemote: 'cgi-bin/import-remote',
      getHistory: 'cgi-bin/history',
      getCookies: 'cgi-bin/cookies',
      getTempFile: 'cgi-bin/sessions/get-temp-file',
      getComposeData: 'cgi-bin/compose-data'
    },
    GET_CONF
  )
);

exports.socket = $.extend(
  createCgiObj(
    {
      changeStatus: {
        mode: 'cancel',
        url: 'cgi-bin/socket/change-status'
      },
      abort: {
        mode: 'ignore',
        url: 'cgi-bin/socket/abort'
      },
      send: {
        mode: 'ignore',
        url: 'cgi-bin/socket/data'
      }
    },
    POST_CONF
  )
);

function updateCertStatus(data) {
  if (exports.hasInvalidCerts != data.hasInvalidCerts) {
    exports.hasInvalidCerts = data.hasInvalidCerts;
    events.trigger('updateUI');
  }
}

exports.getReqTabs = function () {
  return reqTabList;
};

exports.getResTabs = function () {
  return resTabList;
};

exports.getTabs = function () {
  return tabList;
};

exports.getToolTabs = function() {
  return toolTabList;
};

exports.getComTabs = function () {
  return comTabList;
};

exports.getAccount = function() {
  return account;
};

function filterComposeData(key) {
  return composeDataMap[key];
}

function getComposeData(keys, cb) {
  return exports.getComposeData({ ids: keys.join() }, cb);
}

var INTERVAL = 1500;

function loadComposeData(keys) {
  var len = keys && keys.length;
  if (len) {
    keys = keys.filter(filterComposeData);
    len = keys.length;
  } else {
    keys = Object.keys(composeDataMap);
    len = keys.length;
  }
  if (!len) {
    return setTimeout(loadComposeData, INTERVAL);
  }
  var curKeys = keys.slice(0, 5);
  keys = keys.slice(5);
  getComposeData(curKeys, function (data) {
    if (data) {
      curKeys.forEach(function(key) {
        var base64 = data[key];
        if (base64 === '') {
          return;
        }
        var list = composeDataMap[key];
        if (base64 == null) {
          delete composeDataMap[key];
        }
        list && list.forEach(function(cb) {
          cb(base64 || '');
        });
      });
    }
    setTimeout(function() {
      loadComposeData(keys);
    }, INTERVAL);
  });
}

exports.getInitialData = function (callback) {
  if (!initialDataPromise) {
    initialDataPromise = $.Deferred();

    var load = function () {
      cgi.getInitial(function (data) {
        if (!data) {
          return setTimeout(load, 1000);
        }
        loadComposeData();
        exports.isCapture = !!data.interceptHttpsConnects;
        var server = data.server;
        port = server && server.port;
        account = server && server.account;
        exports.version = server && server.version;
        exports.enablePluginMgr = data.epm;
        exports.supportH2 = data.supportH2;
        exports.isWin = server && server.isWin;
        exports.tokenId = server && server.tokenId;
        exports.backRulesFirst = data.rules.backRulesFirst;
        exports.custom1 = data.custom1;
        exports.custom2 = data.custom2;
        exports.custom1Key = data.custom1Key;
        exports.custom2Key = data.custom2Key;
        initialData = data;
        clientId = data.clientId;
        DEFAULT_CONF.data.clientId = clientId;
        if (data.lastLogId) {
          lastPageLogTime = data.lastLogId;
        }
        if (data.lastSvrLogId) {
          lastSvrLogTime = data.lastSvrLogId;
        }
        curLogId = data.curLogId;
        curSvrLogId = data.curSvrLogId;
        if (data.lastDataId) {
          lastRowId = data.lastDataId;
        }
        exports.pluginsRoot = data.pluginsRoot;
        exports.whistleName = data.wName;
        exports.account = data.account;
        exports.disableInstaller = data.disableInstaller;
        exports.upload = createCgiObj(
          {
            importSessions: 'cgi-bin/sessions/import?clientId=' + clientId,
            importRules: 'cgi-bin/rules/import?clientId=' + clientId,
            importValues: 'cgi-bin/values/import?clientId=' + clientId
          },
          $.extend(
            {
              type: 'post'
            },
            DEFAULT_CONF,
            {
              contentType: false,
              processData: false,
              timeout: LONG_TIMEOUT
            }
          )
        );
        initialDataPromise.resolve(data);
        if (data.clientIp) {
          exports.clientIp = data.clientIp;
        }
        updateCertStatus(data);
      });
    };
    load();
  }

  initialDataPromise.done(callback);
};

function checkDataChanged(data, mclientName, mtimeName) {
  if (!data[mtimeName] || initialData.clientId === data[mclientName]) {
    return false;
  }

  var mclient = data[mclientName];
  var mtime = data[mtimeName];
  if (
    initialData[mclientName] === mclient &&
    initialData[mtimeName] === mtime
  ) {
    return false;
  }
  initialData[mclientName] = mclient;
  initialData[mtimeName] = mtime;
  return true;
}

function emitRulesChanged(data) {
  if (checkDataChanged(data, 'mrulesClientId', 'mrulesTime')) {
    events.trigger('rulesChanged');
  }
}

function emitValuesChanged(data) {
  if (checkDataChanged(data, 'mvaluesClientId', 'mvaluesTime')) {
    events.trigger('valuesChanged');
  }
}

function checkTabList(list1, list2, len) {
  for (var i = 0; i < len; i++) {
    var tab1 = list1[i];
    var tab2 = list2[i];
    if (tab1.name !== tab2.name || tab1.action !== tab2.action) {
      return true;
    }
  }
}

function hasPluginColsChange(curCols, oldClos) {
  var len = curCols.length;
  if (len !== oldClos.length) {
    return true;
  }
  for (var i = 0; i < len; i++) {
    var cur = curCols[i];
    var old = oldClos[i];
    if (cur.title !== old.title || cur.key !== old.key ||
      cur.iconKey !== old.iconKey || cur.width !== old.width) {
      return true;
    }
  }
}

function emitCustomTabsChange(curList, oldList, name) {
  var curLen = curList.length;
  var oldLen = oldList.length;
  if (!curLen) {
    oldLen && events.trigger(name);
    return;
  }
  if (curLen === 1) {
    if (
      !oldLen ||
      oldLen > 1 ||
      curList[0].name !== oldList[0].name ||
      curList[0].action !== oldList[0].action
    ) {
      events.trigger(name);
    }
    return;
  }
  if (!oldLen || oldLen === 1) {
    return events.trigger(name);
  }
  if (curLen !== oldLen || checkTabList(curList, oldList, curLen)) {
    events.trigger(name);
  }
}

function getBase64Len(base64) {
  if (!base64) {
    return 0;
  }
  var len = base64.length;
  if (base64[len - 1] === '=') {
    len -= 2;
    if (base64[len] === '=') {
      --len;
    }
  }
  return len;
}

function updateItem(item, newItem) {
  Object.keys(newItem).forEach(function(key) {
    var data = newItem[key];
    if (key === 'rules' || key === 'rulesHeaders' || key === 'url') {
      data = data || item[key];
    } else if (key === 'req' || key === 'res') {
      var oldData = item[key];
      var base64 = oldData.base64;
      data.headers = data.headers || oldData.headers;
      data.rawHeaderNames = data.rawHeaderNames || oldData.rawHeaderNames;
      if (data.base64) {
        if (data.preLen > 0) {
          data.base64 = (base64 ? base64.substring(0, data.preLen) : '') + data.base64;
        }
      } else {
        data.base64 = base64;
        data[util.BODY_KEY] = oldData[util.BODY_KEY];
        data[util.HEX_KEY] = oldData[util.HEX_KEY];
        data[util.JSON_KEY] = oldData[util.JSON_KEY];
      }
    }
    item[key] = data;
  });
}

function getStatus(item) {
  var result = [''];
  // 跟后台联动，不能改成 &
  if (!item.requestTime) {
    result[0] = getBase64Len(item.req.base64);
  }
  if (!item.endTime) {
    result[1] = getBase64Len(item.res.base64);
  }
  return result.join('-');
}

function getComposerItem() {
  var elem = document.querySelector('#whistleComposerFrames');
  return elem && elem.offsetWidth ? composerItem : null;
}

var hiddenTime = Date.now();
function startLoadData() {
  if (startedLoad) {
    return;
  }
  startedLoad = true;
  function load() {
    if (document.hidden) {
      if (Date.now() - hiddenTime > MAX_WAIT_TIME) {
        return setTimeout(load, 100);
      }
    } else {
      hiddenTime = Date.now();
    }

    if (networkModal.clearNetwork) {
      lastRowId = endId || lastRowId;
      networkModal.clearNetwork = false;
    }

    var startTime = getStartTime();
    var len = logList.length;
    var svrLen = svrLogList.length;
    var startLogTime = -1;
    var startSvrLogTime = -1;
    var pendingIds = [];
    var statusIds = [];
    var tunnelIds = [];
    dataList.forEach(function (item) {
      if (!item.endTime && !item.lost) {
        pendingIds.push(item.id);
        statusIds.push(getStatus(item));
      }
      if (item.reqPlugin > 0 && item.reqPlugin < 10) {
        ++item.reqPlugin;
        tunnelIds.push(item.id);
      }
    });
    var clearedLogs = exports.clearedLogs;
    var clearedSvrLogs = exports.clearedSvrLogs;
    exports.clearedLogs = exports.clearedSvrLogs = false;
    if (!exports.pauseConsoleRefresh && len < MAX_LOG_LENGTH) {
      startLogTime = (clearedLogs && curLogId) || lastPageLogTime;
    }

    if (!exports.pauseServerLogRefresh && svrLen < MAX_LOG_LENGTH) {
      startSvrLogTime =  (clearedSvrLogs && curSvrLogId) || lastSvrLogTime;
    }

    var curActiveItem = getComposerItem() || networkModal.getActive();
    var curFrames = curActiveItem && curActiveItem.frames;
    var lastFrameId, curReqId;
    if (curFrames && !curActiveItem.pauseRecordFrames) {
      if (curActiveItem.stopRecordFrames) {
        curReqId = curActiveItem.id;
        lastFrameId = -3;
      } else if (curFrames.length <= MAX_FRAMES_LENGTH) {
        curReqId = curActiveItem.id;
        lastFrameId = curActiveItem.lastFrameId;
      }
    }
    var count = inited ? 20 : networkModal.getDisplayCount();
    var options = {
      startLogTime: exports.stopConsoleRefresh ? -3 : startLogTime,
      startSvrLogTime: exports.stopServerLogRefresh ? -3 : startSvrLogTime,
      ids: pendingIds.join(),
      status: statusIds.join(),
      startTime: startTime,
      dumpCount: dumpCount,
      lastRowId: inited || !count ? lastRowId : undefined,
      curReqId: curReqId,
      lastFrameId: lastFrameId,
      logId: logId || '',
      count: count || 20,
      tunnelIds: tunnelIds
    };
    inited = true;
    $.extend(options, hashFilterObj);
    if (onlyViewOwnData) {
      options.ip = 'self';
    }
    cgi.getData(options, function (data) {
      var hasNewData = data && data.data && data.data.hasNew;
      setTimeout(load, hasNewData ? 100 : 900);
      updateServerInfo(data);
      if (!data || data.ec !== 0) {
        return;
      }
      var preCapture = exports.isCapture;
      if (preCapture === 0) {
        exports.isCapture = false;
      } else if (preCapture === 1) {
        exports.isCapture = true;
      } else {
        var capture = !!data.interceptHttpsConnects;
        if (exports.isCapture !== capture) {
          exports.isCapture = capture;
          events.trigger('reqTabsChange');
          events.trigger('resTabsChange');
        }
      }
      var server = data.server;
      port = server && server.port;
      account = server && server.account;
      exports.pluginsRoot = data.pluginsRoot;
      exports.whistleName = data.wName;
      exports.account = data.account;
      exports.disableInstaller = data.disableInstaller;
      exports.enablePluginMgr = data.epm;
      exports.supportH2 = data.supportH2;
      exports.version = server && server.version;
      exports.isWin = server && server.isWin;
      exports.tokenId = server && server.tokenId;
      exports.backRulesFirst = data.backRulesFirst;
      exports.custom1 = data.custom1;
      exports.custom2 = data.custom2;
      exports.custom1Key = data.custom1Key;
      exports.custom2Key = data.custom2Key;
      if (options.dumpCount > 0) {
        dumpCount = 0;
      }
      if (data.clientIp) {
        exports.clientIp = data.clientIp;
      }
      updateCertStatus(data);
      emitRulesChanged(data);
      emitValuesChanged(data);
      directCallbacks.forEach(function (cb) {
        cb(data);
      });
      var len = data.log.length;
      var svrLen = data.svrLog.length;
      var _reqTabList = reqTabList;
      var _resTabList = resTabList;
      var _tabList = tabList;
      var _comTabList = comTabList;
      var _toolTabList = toolTabList;
      var _pluginCols = [];
      var _workers = [];
      var hasWorkerChanged;
      var curTabList = [];
      pluginsMap = data.plugins || {};
      disabledPlugins = data.disabledPlugins || {};
      if (!disabledAllPlugins) {
        Object.keys(pluginsMap).forEach(function (name) {
          var pluginName = name.slice(0, -1);
          if (!disabledPlugins[pluginName]) {
            var plugin = pluginsMap[name];
            curTabList.push({
              mtime: plugin.mtime,
              priority: plugin.priority,
              _key: name,
              plugin: pluginName,
              reqTab: plugin.reqTab,
              resTab: plugin.resTab,
              tab: plugin.tab,
              comTab: plugin.comTab,
              toolTab: plugin.toolTab,
              col: plugin.networkColumn
            });
            var worker = plugin.webWorker;
            if (worker && _workers.indexOf(worker) === -1) {
              _workers.push(worker);
              hasWorkerChanged = hasWorkerChanged ||  webWorkerList.indexOf(worker) === -1;
            }
          }
        });
      }
      curTabList.sort(util.comparePlugin);
      reqTabList = [];
      resTabList = [];
      tabList = [];
      comTabList = [];
      toolTabList = [];
      dataKeys = [];
      curTabList.forEach(function (info) {
        var reqTab = info.reqTab;
        var resTab = info.resTab;
        var tab = info.tab;
        var toolTab = info.toolTab;
        var comTab = info.comTab;
        var plugin = info.plugin;
        var col = info.col;
        if (reqTab) {
          reqTab.plugin = plugin;
          reqTabList.push(reqTab);
        }
        if (resTab) {
          resTab.plugin = plugin;
          resTabList.push(resTab);
        }
        if (tab) {
          tab.plugin = plugin;
          tabList.push(tab);
        }
        if (comTab) {
          comTab.plugin = plugin;
          comTabList.push(comTab);
        }
        if (toolTab) {
          toolTab.plugin = plugin;
          toolTabList.push(toolTab);
        }
        if (col) {
          col.name = col.className = 'whistle.' + info.plugin;
          col.isPlugin = true;
          _pluginCols.push(col);
          dataKeys.push(col.key);
        }
      });
      emitCustomTabsChange(reqTabList, _reqTabList, 'reqTabsChange');
      emitCustomTabsChange(resTabList, _resTabList, 'resTabsChange');
      emitCustomTabsChange(tabList, _tabList, 'tabsChange');
      emitCustomTabsChange(comTabList, _comTabList, 'comTabsChange');
      emitCustomTabsChange(toolTabList, _toolTabList, 'toolTabsChange');
      if (hasPluginColsChange(_pluginCols, pluginColumns)) {
        pluginColumns = _pluginCols;
        events.trigger('pluginColumnsChange');
      }
      if (hasWorkerChanged || webWorkerList.length !== _workers.length) {
        webWorkerList = _workers;
        updateWorkers(webWorkerList);
      }
      disabledAllPlugins = data.disabledAllPlugins;
      if (len || svrLen) {
        if (len) {
          logList.push.apply(logList, data.log);
          lastPageLogTime = data.log[len - 1].id;
        }

        if (svrLen) {
          svrLogList.push.apply(svrLogList, data.svrLog);
          lastSvrLogTime = data.svrLog[svrLen - 1].id;
        }

        logCallbacks.forEach(function (cb) {
          cb(logList, svrLogList);
        });
      }
      if (data.lastLogId) {
        lastPageLogTime = data.lastLogId;
      }
      if (data.lastSvrLogId) {
        lastSvrLogTime = data.lastSvrLogId;
      }
      data = data.data;
      var hasChanged;
      var framesLen = data.frames && data.frames.length;

      if (framesLen) {
        curActiveItem.lastFrameId = data.frames[framesLen - 1].frameId;
        curFrames.push.apply(curFrames, data.frames);
      } else if (data.lastFrameId) {
        curActiveItem.lastFrameId = data.lastFrameId;
      }
      if (curReqId) {
        var status = data.socketStatus;
        if (status) {
          curActiveItem.closed = undefined;
          if (status.sendStatus > -1) {
            hasChanged = curActiveItem.sendStatus !== status.sendStatus;
            curActiveItem.sendStatus = status.sendStatus;
          }
          if (status.receiveStatus > -1) {
            hasChanged =
              hasChanged ||
              curActiveItem.receiveStatus !== status.receiveStatus;
            curActiveItem.receiveStatus = status.receiveStatus;
          }
        } else {
          if (!curActiveItem.closed) {
            hasChanged = true;
            curActiveItem.closed = true;
          }
        }
      }
      if (data.lastId) {
        lastRowId = data.lastId;
      }
      if (data.endId) {
        endId = data.endId;
      }
      var tunnelIps = data.tunnelIps || '';
      if (
        (!data.ids.length && !data.newIds.length) ||
        networkModal.clearNetwork
      ) {
        if (hasChanged || framesLen) {
          framesUpdateCallbacks.forEach(function (cb) {
            cb();
          });
        }
        if (Object.keys(tunnelIps).length) {
          var hasNewIp;
          dataList.forEach(function (item) {
            var realIp = tunnelIps[item.id];
            if (realIp) {
              delete item.reqPlugin;
              item.realIp = realIp;
              hasNewIp = true;
            }
          });
          hasNewIp && events.trigger('updateUI');
        }
        return;
      }
      var ids = data.newIds;
      data = data.data;
      dataList.forEach(function (item) {
        var newItem = data[item.id];
        if (newItem) {
          updateItem(item, newItem);
          setReqData(item);
          workers.postMessage(item);
        } else {
          item.lost = true;
          if (!item.endTime) {
            workers.postMessage(item);
          }
        }
        var realIp = tunnelIps[item.id];
        if (realIp) {
          delete item.reqPlugin;
          item.realIp = realIp;
        }
      });
      if (ids.length) {
        var filter = getFilterText();
        var excludeFilter = filter.disabledExcludeText
          ? null
          : resolveFilterText(filter.excludeText);
        var includeFilter = filter.disabledFilterText
          ? null
          : resolveFilterText(filter.filterText);
        exports.curNewIdList = ids.filter(function (id) {
          var item = data[id];
          if (item) {
            workers.postMessage(item);
            if (
              (!excludeFilter || !checkFilter(item, excludeFilter)) &&
              (!includeFilter || checkFilter(item, includeFilter))
            ) {
              setReqData(item);
              dataList.push(item);
              return true;
            }
          }
        });
      }
      dataCallbacks.forEach(function (cb) {
        cb(networkModal);
      });
    });
  }
  load();
}

function getRawHeaders(headers, rawHeaderNames) {
  if (!headers || !rawHeaderNames) {
    return;
  }
  var rawHeaders = {};
  Object.keys(headers).forEach(function (name) {
    rawHeaders[rawHeaderNames[name] || name] = headers[name];
  });
  return rawHeaders;
}

exports.getRawHeaders = getRawHeaders;

window.getWhistlePageId = window.getWhistleClientId = function () {
  return clientId;
};

function getReqId() {
  return clientId + '/' + (reqIndex++);
}

exports.getReqId = getReqId;

exports.onComposeData = function(reqId, cb) {
  var index = util.isString(reqId) && typeof cb === 'function' ? reqId.indexOf(clientId + '/') : -1;
  if (index) {
    return;
  }
  index = reqId.substring(clientId.length + 1);
  if (/[^\d]/.test(index) || !(index >= 0 && index < reqIndex)) {
    return;
  }
  var list = composeDataMap[reqId] || [];
  if (list.indexOf(cb) === -1) {
    list.push(cb);
  }
  composeDataMap[reqId] = list;
  return true;
};

exports.offComposeData = function(reqId, cb) {
  var list = composeDataMap[reqId];
  if (list) {
    if (cb) {
      var index = list.indexOf(cb);
      if (index !== -1) {
        list.splice(index, 1);
      }
    } else {
      delete composeDataMap[reqId];
    }
  }
};

function getIframe(win) {
  if (win.parent !== window) {
    return;
  }
  var list = document.querySelectorAll('iframe');
  for (var i = 0, len = list.length; i < len; i++) {
    var iframe = list[i];
    if (iframe.contentWindow === win) {
      return iframe;
    }
  }
}

window.disableWhistleDarkModeIframe = function(win) {
  var iframe = getIframe(win);
  if (iframe) {
    iframe.setAttribute('disabledDarkMode', '1');
  }
};

window.enableWhistleDarkModeIframe = function(win) {
  var iframe = getIframe(win);
  if (iframe) {
    iframe.removeAttribute('disabledDarkMode');
  }
};

exports.getPageId = function () {
  return clientId;
};

function isFrames(item) {
  if (!item) {
    return false;
  }
  if (item.useFrames) {
    return true;
  }
  if (item.reqError || item.resError) {
    return false;
  }
  var status = item.res.statusCode;
  if (/^wss?:\/\//.test(item.url)) {
    return status == 101;
  }
  return item.inspect && status == 200;
}

exports.isFrames = isFrames;

function getStyleValue(style) {
  var index = style.indexOf('&');
  if (index !== -1) {
    style = style.substring(0, index);
  }
  index = style.indexOf('!');
  if (index !== -1) {
    style = style.substring(0, index);
  }
  if (style[0] === '@') {
    style = '#' + style.substring(1);
  }
  return style.length > 32 ? undefined : style;
}

function getCustomValue(style, isFirst) {
  var index = style.lastIndexOf('&custom' + (isFirst ? '1=' : '2='));
  if (index === -1) {
    return;
  }
  style = style.substring(index + 9);
  index = style.indexOf('&');
  style = index === -1 ? style : style.substring(0, index);
  if (style.indexOf('%') !== -1) {
    try {
      return decodeURIComponent(style);
    } catch (e) {}
  }
  return style;
}

function setStyle(item) {
  item.style = undefined;
  var style = item.rules && item.rules.style;
  style = style && style.list;
  if (!style) {
    return;
  }
  style =
    '&' +
    style
      .map(function (rule) {
        rule = rule.value || rule.matcher;
        return rule.substring(rule.indexOf('://') + 3);
      })
      .join('&');
  var color, fontStyle, bgColor;
  var colorIndex = style.lastIndexOf('&color=');
  if (colorIndex !== -1) {
    color = getStyleValue(style.substring(colorIndex + 7));
  }
  var styleIndex = style.lastIndexOf('&fontStyle=');
  if (styleIndex !== -1) {
    fontStyle = getStyleValue(style.substring(styleIndex + 11));
  }
  var bgIndex = style.lastIndexOf('&bgColor=');
  if (bgIndex !== -1) {
    bgColor = getStyleValue(style.substring(bgIndex + 9));
  }
  if (color || fontStyle || bgColor) {
    item.style = {
      color: color,
      fontStyle: fontStyle,
      backgroundColor: bgColor
    };
  }
  var key1 = exports.custom1Key;
  var key2 = exports.custom2Key;
  if (!util.notEStr(key1)) {
    item.custom1 = getCustomValue(style, true);
  }
  if (!util.notEStr(key2)) {
    item.custom2 = getCustomValue(style);
  }
}

var APPS = 'alipay,baidu,brave,chrome,mac,android,ipad,iphone,windows,crmo,crios,cicc,edge,electron,firefox,huawei,opera,jd,pdd,qq,safari,uc,wework,wechat,dingtalk,weibo'.split(',');
var APP_RE = /w[ex]work\/|Alipay|Brave\/|%e6%b7%98%e5%ae%9d\/|opera|%e6%94%af%e4%bb%98%e5%ae%9d\/|%e5%a4%a9%e7%8c%ab\/|uc%e6%b5%8f%e8%a7%88%e5%99%a8\/|pinduoduo|%e9%92%89%e9%92%89\/|UCBrowser\/|dingtalk|jd(?:4|mall)|weibo|tmall|qq\/|Firefox\/|FxiOS\/|ciccwm\/|WhistleClient\/|edg(?:e|ios|a)?\/|zztapp|baidu/i;
var COMMON_APP_RE = /MicroMessenger|taobao|amap_sdk|Electron\/|CFNetwork\/|cronet/i;

function getAppName(ua) {
  var result = ua && (APP_RE.exec(ua) || COMMON_APP_RE.exec(ua));
  if (!result) {
    if (ua) {
      if (/\b(?:chrome|crmo|crios)\//i.test(ua) || /^Chrome\s/.test(ua)) {
        return 'chrome';
      }
      if (/Version\//.test(ua) && /Safari\//.test(ua)) {
        return 'safari';
      }
      if (/Windows NT|Microsoft NCSI|Win64|Win32|Windows 10|Windows 11/i.test(ua)) {
        return 'windows';
      }
      if (/android/i.test(ua)) {
        return 'android';
      }
      if (/HarmonyOS|HMSCore|huawei/i.test(ua)) {
        return 'huawei';
      }
      if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) {
        return 'ipad';
      }
      if (/iPhone|iPod/i.test(ua)) {
        return 'iphone';
      }
      if (/Macintosh/i.test(ua)) {
        return 'mac';
      }
    }
    return 'browser';
  }
  result = result[0].toLowerCase();
  switch (result) {
  case 'micromessenger':
    return 'wechat';
  case 'brave/':
    return 'brave';
  case 'qq/':
    return 'qq';
  case 'firefox/':
  case 'fxios/':
    return 'firefox';
  case 'cfnetwork/':
    return 'cfnetwork';
  case 'ciccwm/':
  case 'zztapp':
    return 'cicc';
  case 'wework/':
  case 'wxwork/':
    return 'wework';
  case 'amap_sdk':
    return 'amap';
  case '%e6%94%af%e4%bb%98%e5%ae%9d/':
    return 'alipay';
  case 'electron/':
    return 'electron';
  case 'whistleclient/':
    return 'whistle';
  case '%e6%b7%98%e5%ae%9d/':
    return 'taobao';
  case '%e5%a4%a9%e7%8c%ab/':
    return 'tmall';
  case '%e9%92%89%e9%92%89/':
    return 'dingtalk';
  case 'ucbrowser/':
  case 'uc%e6%b5%8f%e8%a7%88%e5%99%a8/':
    return 'uc';
  case 'pinduoduo':
    return 'pdd';
  case 'jd4':
  case 'jdmall':
    return 'jd';
  case 'edg/':
  case 'edge/':
  case 'edga/':
  case 'edgios/':
    return 'edge';
  default:
    return result;
  }
}

function setAppName(item) {
  if (item.fc) {
    item.appName = 'whistle';
    return;
  }
  var appName = item.appName;
  if (!appName || !APPS.indexOf(appName) !== -1) {
    item.appName = getAppName(item.req.headers['user-agent']);
  }
}

function setReqData(item) {
  var url = item.url;
  var req = item.req;
  var res = item.res;
  item.method = req.method;
  var end = item.endTime;
  var defaultValue = end ? '' : '-';
  var resHeaders = res.headers || '';
  setAppName(item);
  item.hostIp = res.ip || defaultValue;
  item.clientIp = req.ip || '127.0.0.1';
  item.date = item.date || util.toLocaleString(new Date(item.startTime));
  item.clientPort = req.port;
  item.serverPort = item.res.port;
  item.contentEncoding =
    (resHeaders['content-encoding'] || '') +
    (item.res.hasGzipError ? ' (Incorrect header)' : '');
  var reqSize = req.size == null ? defaultValue : req.size;
  var resSize = res.size == null ? defaultValue : res.size;
  var reqSizeStr = util.getDisplaySize(reqSize, req.unzipSize);
  var resSizeStr = util.getDisplaySize(resSize, res.unzipSize);
  item.body =  reqSizeStr === '' && resSizeStr === '' ? '' : reqSizeStr  + ', ' + resSizeStr;
  item.bodySize = (req.size || 0) + (res.size || 0);
  var result = res.statusCode == null ? defaultValue : res.statusCode;
  item.result = (/^[1-9]/.test(result) && parseInt(result, 10)) || result;
  item.type = (resHeaders['content-type'] || '')
    .split(';')[0]
    .toLowerCase();
  item.dns =
    item.request =
    item.response =
    item.download =
    item.time =
      defaultValue;
  if (item.dnsTime > 0) {
    item.dns = item.dnsTime - item.startTime + 'ms';
    if (item.requestTime > 0) {
      item.request = item.requestTime - item.dnsTime + 'ms';
    }
    if (item.responseTime > 0) {
      if (!item.requestTime || item.requestTime > item.responseTime) {
        item.response = item.responseTime - item.dnsTime + 'ms';
      } else {
        item.response = item.responseTime - item.requestTime + 'ms';
      }
      if (end > 0) {
        item.download = end - item.responseTime + 'ms';
        item.time = end - item.startTime + 'ms';
      }
    }
  }
  req._hasError = item.reqError;
  res._hasError = item.resError;
  req.rawHeaders = getRawHeaders(req.headers, req.rawHeaderNames);
  res.rawHeaders = getRawHeaders(res.headers, res.rawHeaderNames);
  res.rawTrailers = getRawHeaders(res.trailers, res.rawTrailerNames);
  setStyle(item);
  if (item.rules && item.pipe) {
    item.rules.pipe = item.pipe;
  }
  if (!item.path) {
    if (item.isHttps) {
      item.protocol =  util.getTransProto(res) || util.getTransProto(req) || 'HTTP';
    } else {
      item.protocol =item.useH2
        ? 'H2' : util.getProtocol(url);
    }
    item.hostname = item.isHttps ? 'Tunnel to' : util.getHost(url);
    var pathIndex = url.indexOf('://');
    if (pathIndex !== -1) {
      pathIndex = url.indexOf('/', pathIndex + 3);
      item.path = pathIndex === -1 ? '/' : url.substring(pathIndex);
    } else {
      item.path = url;
    }
    if (item.path.length > MAX_PATH_LENGTH) {
      item.shortPath = item.path.substring(0, MAX_PATH_LENGTH) + '...';
    }
  } else if (item.useH2) {
    item.protocol = 'H2';
  } else if (item.protocol === 'H2') {
    item.protocol = item.isHttps ? 'HTTP' : util.getProtocol(url);
  }
  if (item.useHttp && (item.protocol === 'HTTPS' || item.protocol === 'WSS')) {
    item.protocol = item.protocol + ' > ' + item.protocol.slice(0, -1);
  }
  if (!item.frames && isFrames(item)) {
    item.frames = [];
  }
}

var PROTOCOL_RE = /^(?:https?|wss?):\/\//;

function checkUrl(data) {
  var url = data && data.url;
  if (!url || typeof url !== 'string' || url.indexOf('#') !== -1) {
    return false;
  }
  if (data.isHttps) {
    return url.indexOf('/') === -1 && url.indexOf('?') === -1;
  }
  return PROTOCOL_RE.test(url);
}

exports.addNetworkList = function (list) {
  if (!Array.isArray(list) || !list.length) {
    return;
  }
  var hasData;
  var curNewIdList = [];
  list.forEach(function (data) {
    if (
      !data ||
      !(data.startTime >= 0) ||
      !data.req ||
      !data.req.headers ||
      !data.res ||
      !checkUrl(data)
    ) {
      return;
    }
    var req = data.req;
    delete data.active;
    delete data.selected;
    delete data.hide;
    delete data.order;
    delete req.json;
    delete data.res.json;
    delete data.data;
    delete data.stopRecordFrames;
    delete data.pauseRecordFrames;
    if (!util.isString(data.fwdHost)) {
      delete data.fwdHost;
    }
    if (Array.isArray(data.frames)) {
      data.frames = data.frames.filter(function (frame) {
        if (frame) {
          delete frame.json;
          delete frame.data;
        }
        return frame;
      });
    }
    data.lost = true;
    data.importedData = true;
    data.id = data.startTime + '-' + ++dataIndex;
    setReqData(data);
    dataList.push(data);
    curNewIdList.push(data.id);
    hasData = true;
    workers.postMessage(data);
  });
  if (hasData) {
    exports.curNewIdList = curNewIdList;
    dataCallbacks.forEach(function (cb) {
      cb(networkModal);
    });
  }
};

function overflowCount() {
  return dataList.length - NetworkModal.MAX_COUNT - 1;
}

exports.overflowCount = overflowCount;

exports.networkModal = networkModal;

function getStartTime() {
  if (!inited) {
    return clearNetwork ? -2 : '';
  }
  if (overflowCount() > 0 || exports.stopRefresh) {
    return -1;
  }
  return lastRowId || '0';
}

function updateServerInfo(data) {
  if (!serverInfoCallbacks.length) {
    updateCount = 0;
    return;
  }

  if (!(data = data && data.server)) {
    ++updateCount;
    if (updateCount >= MAX_UPDATE_COUNT) {
      curServerInfo = data;
      serverInfoCallbacks.forEach(function (cb) {
        cb(false);
      });
    }
    return;
  }
  updateCount = 0;
  if (exports.setServerInfo) {
    exports.setServerInfo(data);
  }
  if (curServerInfo) {
    if (curServerInfo.strictMode != data.strictMode) {
      curServerInfo.strictMode = data.strictMode;
      events.trigger('updateStrictMode');
    }
    if (curServerInfo.version !== data.version || curServerInfo.latestVersion !== data.latestVersion) {
      curServerInfo.version = data.version;
      curServerInfo.latestVersion = data.latestVersion;
      events.trigger('updateVersion', data);
    }
  }
  if (
    curServerInfo &&
    curServerInfo.version == data.version &&
    curServerInfo.rulesMode === data.rulesMode &&
    curServerInfo.cmdName === data.cmdName &&
    curServerInfo.networkMode === data.networkMode &&
    curServerInfo.pluginsMode === data.pluginsMode &&
    curServerInfo.multiEnv === data.multiEnv &&
    curServerInfo.baseDir == data.baseDir &&
    curServerInfo.username == data.username &&
    curServerInfo.nodeVersion == data.nodeVersion &&
    curServerInfo.port == data.port &&
    curServerInfo.host == data.host &&
    curServerInfo.pid == data.pid &&
    curServerInfo.ipv4.sort().join() == data.ipv4.sort().join() &&
    curServerInfo.ipv6.sort().join() == data.ipv6.sort().join()
  ) {
    curServerInfo = data;
    return;
  }
  curServerInfo = data;
  serverInfoCallbacks.forEach(function (cb) {
    cb(data);
  });
}

exports.isDiableCustomCerts = function () {
  return curServerInfo && curServerInfo.dcc;
};

exports.isMultiEnv = function () {
  return curServerInfo && (curServerInfo.multiEnv || curServerInfo.notHTTPS);
};

exports.isPureProxy = function () {
  return curServerInfo && curServerInfo.pureProxy;
};

exports.needEnableHttps = function () {
  return !exports.isMultiEnv() &&  !exports.isCapture;
};

exports.isStrictMode = function () {
  return (curServerInfo && curServerInfo.strictMode) || false;
};

exports.getServerInfo = function () {
  return curServerInfo || '';
};

exports.on = function (type, callback) {
  startLoadData();
  if (type == 'data') {
    if (typeof callback == 'function') {
      dataCallbacks.push(callback);
      callback(networkModal);
    }
  } else if (type == 'serverInfo') {
    if (typeof callback == 'function') {
      serverInfoCallbacks.push(callback);
    }
  } else if (type == 'log') {
    if (typeof callback == 'function') {
      logCallbacks.push(callback);
      callback(logList, svrLogList);
    }
  } else if (type === 'plugins' || type === 'settings' || type === 'rules') {
    if (typeof callback == 'function') {
      directCallbacks.push(callback);
    }
  } else if (type == 'framesUpdate') {
    if (typeof callback == 'function') {
      framesUpdateCallbacks.push(callback);
    }
  }
};

exports.networkModal = networkModal;

exports.stopNetworkRecord = function (stop) {
  if (!stop && exports.pauseRefresh) {
    networkModal.clearNetwork = false;
  } else {
    networkModal.clearNetwork = !stop;
  }
  exports.pauseRefresh = false;
  exports.stopRefresh = stop;
};
exports.pauseNetworkRecord = function () {
  networkModal.clearNetwork = false;
  exports.pauseRefresh = true;
  exports.stopRefresh = true;
};

exports.pauseConsoleRecord = function () {
  exports.stopConsoleRefresh = false;
  exports.pauseConsoleRefresh = true;
};

exports.stopConsoleRecord = function (stop) {
  exports.pauseConsoleRefresh = false;
  exports.stopConsoleRefresh = stop;
};

exports.pauseServerLogRecord = function () {
  exports.stopServerLogRefresh = false;
  exports.pauseServerLogRefresh = true;
};

exports.stopServerLogRecord = function (stop) {
  exports.pauseServerLogRefresh = false;
  exports.stopServerLogRefresh = stop;
};

function isDisabledPlugin(name) {
  return disabledAllPlugins || disabledPlugins[name.slice(0, -1)];
}

exports.getPlugin = function (name) {
  return isDisabledPlugin(name) ? null : pluginsMap[name];
};

exports.getInstalledPlugins = function () {
  return Object.keys(pluginsMap).sort(util.getPluginComparator(pluginsMap))
  .map(function (name) {
    var plugin = pluginsMap[name];
    var disabled = !!isDisabledPlugin(name);
    name = name.slice(0, -1);
    return {
      active: !disabledPlugins[name],
      disabled: disabled,
      name: name,
      moduleName: plugin.moduleName,
      version: plugin.version
    };
  });
};

exports.setDisabledPlugins = function(plugins) {
  disabledPlugins = plugins;
};

function getMenus(menuName) {
  var list = account && account[menuName];
  if (!Array.isArray(list)) {
    list = [];
  }
  if (disabledAllPlugins) {
    return list;
  }
  Object.keys(pluginsMap).forEach(function (name) {
    var plugin = pluginsMap[name];
    var menus = plugin[menuName];
    if (menus) {
      var simpleName = name.slice(0, -1);
      if (!disabledPlugins[simpleName]) {
        menus.forEach(function (menu) {
          menu.title = simpleName + ' extension menu';
          menu.mtime = plugin.mtime;
          menu.priority = plugin.priority;
          menu._key = name;
          menu._urlPattern = util.toRegExp(menu.urlPattern) || util.toRegExp(menu.namePattern);
          list.push(menu);
        });
      }
    }
  });
  return list.length > 1 ? list.sort(util.comparePlugin) : list;
}

exports.getNetworkMenus = function () {
  return getMenus('networkMenus');
};

exports.getRulesMenus = function () {
  return getMenus('rulesMenus');
};

exports.getValuesMenus = function () {
  return getMenus('valuesMenus');
};

exports.getPluginsMenus = function () {
  return getMenus('pluginsMenus');
};

exports.getPluginColumns = function() {
  return pluginColumns;
};

exports.getPluginRegistry = function() {
  var result = [];
  Object.keys(pluginsMap).forEach(function(key) {
    var registry = pluginsMap[key].registry;
    if (registry && result.indexOf(registry) === -1) {
      result.push(registry);
    }
  });
  return result;
};

var valuesModal;

exports.setValuesModal = function(modal) {
  valuesModal = modal;
};

exports.getValuesModal = function() {
  return valuesModal;
};

exports.getRulesModal = function() {
  return exports.rulesModal;
};

exports.getDataKeys = function() {
  var result = [];
  if (exports.custom1Key) {
    result.push('custom1');
  }
  if (exports.custom2Key) {
    result.push('custom2');
  }
  return result.concat(dataKeys);
};

exports.getRemoteData = function (url, callback) {
  var opts = {  url: url };
  exports.importRemote(opts,  function (data, xhr) {
    if (!data) {
      util.showSystemError(xhr);
      return callback(true);
    }
    if (data.ec !== 0) {
      message.error(data.em || 'Error');
      return callback(true);
    }
    try {
      var value = data.body || data.value;
      data = value && JSON.parse(value);
      return callback(false, data || {});
    } catch (e) {
      message.error(e.message);
    }
    callback(true);
  });
};

function toString(options) {
  return typeof options === 'string' ? options : JSON.stringify(options);
}

exports.saveToService = function(options, callback) {
  if (!exports.tokenId) {
    return;
  }
  exports.save(toString(options), callback);
};

setDataCenter(exports);

workers.setup(networkModal);
