require('../css/index.css');
var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var Clipboard = require('clipboard');
var EditorDialog = require('./editor-dialog');
var List = require('./list');
var ListModal = require('./list-modal');
var Network = require('./network');
var About = require('./about');
var Online = require('./online');
var MenuItem = require('./menu-item');
var RecordBtn = require('./record-btn');
var EditorSettings = require('./editor-settings');
var NetworkSettings = require('./network-settings');
var Plugins = require('./plugins');
var dataCenter = require('./data-center');
var util = require('./util');
var protocols = require('./protocols');
var events = require('./events');
var storage = require('./storage');
var Dialog = require('./dialog');
var ListDialog = require('./list-dialog');
var FilterBtn = require('./filter-btn');
var message = require('./message');
var UpdateAllBtn = require('./update-all-btn');
var ContextMenu = require('./context-menu');
var RulesDialog = require('./rules-dialog');
var SyncDialog = require('./sync-dialog');
var LargeDialog = require('./large-dialog');
var JSONDialog = require('./json-dialog');
var MockDialog = require('./mock-dialog');
var IframeDialog = require('./iframe-dialog');
var win = require('./win');
var ServiceBtn = require('./service-btn');
var SaveToServiceBtn = require('./share-via-url-btn');
var ImportDialog = require('./import-dialog');
var ExportDialog = require('./export-dialog');
var HttpsSettings = require('./https-settings');

var TEMP_LINK_RE = /^(?:[\w-]+:\/\/)?temp(?:\/([\da-z]{64}|blank))?(?:\.[\w-]+)?$/;
var FILE_PATH_RE = /^(?:[\w-]+:\/\/)?((?:[a-z]:[\\/]|\/).+)$/i;
var H2_RE = /http\/2\.0/i;
var JSON_RE = /^\s*(?:[\{｛][\w\W]+[\}｝]|\[[\w\W]+\])\s*$/;
var DEFAULT = 'Default';
var MAX_PLUGINS_TABS = 7;
var MAX_FILE_SIZE = 1024 * 1024 * 128;
var MAX_OBJECT_SIZE = 1024 * 1024 * 36;
var MAX_LOG_SIZE = 1024 * 1024 * 2;
var MAX_REPLAY_COUNT = 100;
var LINK_SELECTOR = '.cm-js-type, .cm-js-http-url, .cm-string, .cm-js-at';
var LINK_RE = /^"(https?:)?(\/\/[^/]\S+)"$/i;
var AT_LINK_RE = /^@(https?:)?(\/\/[^/]\S+)$/i;
var OPTIONS_WITH_SELECTED = [
  'removeSelected',
  'exportWhistleFile'
];
var HIDE_STYLE = { display: 'none' };
var search = window.location.search;
var query = util.getQuery();
var isClient = query.mode === 'client';
var hideMenus = !!(query.hideMenus || query.hideMenu);
var hideLeftMenu;
var showTreeView;
var dataUrl;
var TABS = ['Network', 'Rules', 'Values', 'Plugins'];
var TEXT_SUFFIX_RE = /[\w-]\.(?:txt|csv|tsv|json|xml|yaml|yml|ini|conf|log|html|htm|css|js|py|java|c|cpp|h|sh|php|sql|md|markdown|rtf|tex|bib|vcf)$/i;

function getString(url) {
  return typeof url === 'string' ? url.trim() : '';
}

function isTextFile(url) {
  if (!TEXT_SUFFIX_RE.test(url)) {
    return false;
  }
  var PATH_RE = dataCenter.isWin ? /^(?:[\w-]+:\/\/)?[a-z]:[\\/]/i : /^(?:[\w-]+:\/\/)?\//i;
  return PATH_RE.test(url);
}

window.setWhistleDataUrl = function(url) {
  url = getString(url);
  if (url) {
    if (dataCenter.handleDataUrl) {
      dataCenter.handleDataUrl(url);
    } else {
      dataUrl = url;
    }
    return true;
  }
  return false;
};

window.showWhistleMessage = function(options) {
  message[options.level || options.type || 'info'](options.text || options.msg || options.message);
};

window.showWhistleWebUI = function(name) {
  if (TABS.indexOf(name) !== -1) {
    events.trigger('show' + name);
  }
};

if (/[&#?]showTreeView=(0|false|1|true)(?:&|$|#)/.test(search)) {
  showTreeView = RegExp.$1 === '1' || RegExp.$1 === 'true';
}

if (/[&#?]hideLeft(?:Bar|Menu)=(0|false|1|true)(?:&|$|#)/.test(search)) {
  hideLeftMenu = RegExp.$1 === '1' || RegExp.$1 === 'true';
} else if (/[&#?]showLeft(?:Bar|Menu)=(0|false|1|true)(?:&|$|#)/.test(search)) {
  hideLeftMenu = RegExp.$1 === '0' || RegExp.$1 === 'false';
}

var TOP_BAR_MENUS = [
  {
    name: 'Scroll To Top',
    action: 'top'
  },
  {
    name: 'Scroll To Selected',
    action: 'selected'
  },
  {
    name: 'Scroll To Bottom',
    action: 'bottom'
  }
];

var LEFT_BAR_MENUS = [
  {
    name: 'Clear',
    icon: 'remove'
  },
  {
    name: 'Save',
    icon: 'save-file'
  },
  {
    name: 'Tree View',
    multiple: true
  },
  {
    name: 'Rules',
    multiple: true
  },
  {
    name: 'Plugins',
    multiple: true
  }
];

var RULES_ACTIONS = [
  {
    name: 'Import',
    icon: 'import',
    id: 'importRules',
    title: 'Ctrl[Command] + I'
  },
  {
    name: 'Export',
    icon: 'export',
    id: 'exportRules'
  }
];
var VALUES_ACTIONS = [
  {
    name: 'Import',
    icon: 'import',
    id: 'importValues',
    title: 'Ctrl[Command] + I'
  },
  {
    name: 'Export',
    icon: 'export',
    id: 'exportValues'
  }
];

var REMOVE_OPTIONS = [
  {
    name: 'Remove Selected',
    icon: 'remove',
    id: 'removeSelected',
    disabled: true,
    title: 'Ctrl[Command] + D'
  },
  {
    name: 'Remove Unselected',
    id: 'removeUnselected',
    disabled: true,
    title: 'Ctrl[Command] + Shift + D'
  }
];
var ABORT_OPTIONS = [
  {
    name: 'Abort',
    icon: 'ban-circle',
    id: 'abort'
  }
];

function checkJson(item) {
  if (/\.json$/i.test(item.name) && JSON_RE.test(item.value)) {
    try {
      JSON.parse(item.value);
    } catch (e) {
      message.warn(
        'Warning: Invalid JSON format in the value of \'' +
          item.name + '\'. ' +  e.message
      );
    }
  }
}

function getJsonForm(data, name) {
  var form = new FormData();
  var file = new File([JSON.stringify(data)], 'data.json', { type: 'application/json' });
  form.append(name || 'rules', file);
  return form;
}

function readFileJson(file, cb) {
  if (util.isString(file)) {
    if (file.length > MAX_OBJECT_SIZE) {
      win.alert('File exceeds maximum size limit');
      return cb();
    }
    return cb(parseJSON(file));
  }
  if (!file || !/\.(txt|json)$/i.test(file.name)) {
    win.alert('Supported file formats: .txt, .json');
    return cb();
  }

  if (file.size > MAX_OBJECT_SIZE) {
    win.alert('File exceeds maximum size limit');
    return cb();
  }
  util.readFileAsText(file, function(text) {
    cb(parseJSON(text));
  });
}

function handleImportData(file, cb) {
  readFileJson(file, function(data) {
    if (!data || util.handleImportData(data)) {
      return cb();
    }
    cb(data);
  });
}

function getPageName(options) {
  var hash = location.hash.substring(1);
  if (hash) {
    hash = hash.replace(/[?#].*$/, '');
  } else {
    hash = location.href.replace(/[?#].*$/, '').replace(/.*\//, '');
  }
  if (options.networkMode) {
    return 'network';
  }
  if (options.rulesMode && options.pluginsMode) {
    return 'plugins';
  }
  if (options.rulesOnlyMode) {
    return hash === 'values' ? 'values' : 'rules';
  }
  if (options.rulesMode) {
    return hash === 'network' ? 'rules' : hash;
  }

  if (options.pluginsMode) {
    return hash !== 'plugins' ? 'network' : hash;
  }
  if (isClient && !hash) {
    return storage.get('pageName') || 'network';
  }
  return hash;
}

function parseJSON(text) {
  try {
    var obj = JSON.parse(text);
    return obj && typeof obj === 'object' ? obj : null;
  } catch (e) {
    message.error(e.message);
  }
}

function compareSelectedNames(src, target) {
  var srcLen = src.length;
  var i;
  for (i = 0; i < srcLen; i++) {
    if ($.inArray(src[i], target) === -1) {
      return false;
    }
  }
  var targetLen = target.length;
  if (srcLen !== targetLen) {
    for (i = 0; i < targetLen; i++) {
      if ($.inArray(target[i], src) === -1) {
        return false;
      }
    }
  }
  return true;
}

function getKey(url) {
  if (url.indexOf('{') == 0) {
    var index = url.lastIndexOf('}');
    return index > 1 && url.substring(1, index);
  }

  return false;
}

function getValue(url) {
  if (url.indexOf('(') == 0) {
    var index = url.lastIndexOf(')');
    return (index != -1 && url.substring(1, index)) || '';
  }

  return false;
}

function appendList(list, _list) {
  if (!_list.length) {
    return;
  }
  for (var i = 0, len = list.length; i < len; i++) {
    if (util.isGroup(list[i])) {
      _list.unshift(i, 0);
      list.splice.apply(list, _list);
      return;
    }
  }
  list.push.apply(list, _list);
}

function updateData(list, data, modal) {
  var changedList = modal.getChangedList();
  if (!changedList.length) {
    return;
  }
  var hasChanged;
  var _list = [];
  var activeItem;
  changedList.forEach(function(item) {
    var name = item.name;
    var curItem = data[name];
    if (!curItem) {
      data[name] = item;
      _list.push(name);
      if (item.active) {
        activeItem = item;
      }
    } else if (curItem.value != item.value) {
      hasChanged = true;
      data[name] = item;
    }
  });
  appendList(list, _list);
  if (activeItem) {
    list.forEach(function(name) {
      data[name].active = false;
    });
    activeItem.active = true;
  }
  return hasChanged;
}

function getCAType(type) {
  if (type === 'crt' || type === 'pem') {
    return type;
  }
  return 'cer';
}

var Index = React.createClass({
  getInitialState: function () {
    var self = this;
    var modal = self.props.modal;
    var rules = modal.rules;
    var values = modal.values;
    var server = modal.server;
    var caUrlList = [];
    var caHash = util.getCAHash(server, caUrlList);
    var state = {
      replayCount: 1,
      tabs: [],
      caType: getCAType(storage.get('caType')),
      caHash: caHash,
      caUrlList: caUrlList,
      allowMultipleChoice: modal.rules.allowMultipleChoice,
      backRulesFirst: modal.rules.backRulesFirst,
      networkMode: !!server.networkMode,
      rulesMode: !!server.rulesMode,
      pluginsMode: !!server.pluginsMode,
      rulesOnlyMode: !!server.rulesOnlyMode,
      ndr: server.ndr,
      ndp: server.ndp,
      drb: server.drb,
      drm: server.drm,
      port: server.port,
      tokenId: server.tokenId,
      version: modal.version
    };
    if (hideLeftMenu !== false) {
      hideLeftMenu = hideLeftMenu || server.hideLeftMenu;
    }
    var pageName = getPageName(state);
    if (!pageName || pageName.indexOf('rules') != -1) {
      state.hasRules = true;
      state.name = 'rules';
    } else if (pageName.indexOf('values') != -1) {
      state.hasValues = true;
      state.name = 'values';
    } else if (pageName.indexOf('plugins') != -1) {
      state.hasPlugins = true;
      state.name = 'plugins';
    } else {
      state.hasNetwork = true;
      state.name = 'network';
    }

    var rulesList = [];
    var rulesOptions = [];
    var rulesData = {};
    var valuesList = [];
    var valuesOptions = [];
    var valuesData = {};

    var rulesTheme = storage.get('rulesTheme');
    var valuesTheme = storage.get('valuesTheme');
    var rulesFontSize = storage.get('rulesFontSize');
    var valuesFontSize = storage.get('valuesFontSize');
    var showRulesLineNumbers = storage.get('showRulesLineNumbers');
    var showValuesLineNumbers = storage.get('showValuesLineNumbers');
    var autoRulesLineWrapping = storage.get('autoRulesLineWrapping');
    var autoValuesLineWrapping = storage.get('autoValuesLineWrapping');
    var selectedName;

    if (rules) {
      selectedName = storage.get('activeRules') || rules.current;
      var selected = !rules.defaultRulesIsDisabled;
      if (!rulesTheme) {
        rulesTheme = rules.theme;
      }
      if (!rulesFontSize) {
        rulesFontSize = rules.fontSize;
      }
      if (!showRulesLineNumbers) {
        showRulesLineNumbers = rules.showLineNumbers ? 'true' : 'false';
      }
      rulesList.push(DEFAULT);
      rulesData.Default = {
        name: DEFAULT,
        fixed: true,
        value: rules.defaultRules,
        selected: selected,
        isDefault: true,
        active: selectedName === DEFAULT
      };

      rulesOptions.push(rulesData.Default);

      rules.list.forEach(function (item) {
        rulesList.push(item.name);
        item = rulesData[item.name] = {
          name: item.name,
          value: item.data,
          selected: item.selected,
          active: selectedName === item.name
        };
        rulesOptions.push(item);
      });
    }

    if (values) {
      selectedName = storage.get('activeValues') || values.current;
      if (!valuesTheme) {
        valuesTheme = values.theme;
      }
      if (!valuesFontSize) {
        valuesFontSize = values.fontSize;
      }
      if (!showValuesLineNumbers) {
        showValuesLineNumbers = values.showLineNumbers ? 'true' : 'false';
      }
      values.list.forEach(function (item) {
        valuesList.push(item.name);
        valuesData[item.name] = {
          name: item.name,
          value: item.data,
          active: selectedName === item.name
        };
        valuesOptions.push({
          name: item.name,
          icon: 'edit'
        });
      });
    }
    var rulesModal = new ListModal(rulesList, rulesData);
    var valuesModal = new ListModal(valuesList, valuesData);
    var networkModal = dataCenter.networkModal;
    dataCenter.setValuesModal(valuesModal);
    dataCenter.rulesModal = rulesModal;
    dataCenter.exportSessions = function(sessions, opts, name) {
      var type;
      if (typeof opts === 'string') {
        type = opts;
      } else if (opts) {
        type = opts.type;
        name = opts.name || name;
      }
      if (type === 'saz' || type === 'fiddler') {
        type = 'Fiddler';
      }
      if (typeof name !== 'string') {
        name = '';
      }
      self.exportSessions(type, name, sessions);
    };
    state.rulesTheme = rulesTheme;
    state.valuesTheme = valuesTheme;
    state.rulesFontSize = rulesFontSize;
    state.valuesFontSize = valuesFontSize;
    state.showRulesLineNumbers = showRulesLineNumbers === 'true';
    state.showValuesLineNumbers = showValuesLineNumbers === 'true';
    state.autoRulesLineWrapping = !!autoRulesLineWrapping;
    state.foldGutter = storage.get('foldGutter') !== '';
    state.autoValuesLineWrapping = !!autoValuesLineWrapping;
    state.plugins = modal.plugins;
    state.disabledPlugins = modal.disabledPlugins;
    state.disabledAllRules = modal.disabledAllRules;
    state.disabledAllPlugins = modal.disabledAllPlugins;
    state.interceptHttpsConnects = modal.interceptHttpsConnects;
    state.enableHttp2 = modal.enableHttp2;
    state.rules = rulesModal;
    state.network = networkModal;
    state.rulesOptions = rulesOptions;
    state.pluginsOptions = self.createPluginsOptions(modal.plugins);
    dataCenter.valuesModal = state.values = valuesModal;
    state.valuesOptions = valuesOptions;
    dataCenter.syncData = self.syncData;
    dataCenter.syncRules = self.syncRules;
    dataCenter.syncValues = self.syncValues;

    self.initPluginTabs(state, modal.plugins);
    if (rulesModal.exists(dataCenter.activeRulesName)) {
      self.setRulesActive(dataCenter.activeRulesName, rulesModal);
    }
    if (valuesModal.exists(dataCenter.activeValuesName)) {
      self.setValuesActive(dataCenter.activeValuesName, valuesModal);
    }

    state.networkOptions = [
      {
        name: 'Remove All',
        icon: 'remove',
        id: 'removeAll',
        disabled: true,
        title: 'Ctrl[Command] + X'
      },
      {
        name: 'Remove Selected',
        id: 'removeSelected',
        disabled: true,
        title: 'Ctrl[Command] + D'
      },
      {
        name: 'Remove Unselected',
        id: 'removeUnselected',
        disabled: true,
        title: 'Ctrl[Command] + Shift + D'
      },
      {
        name: 'Import',
        icon: 'import',
        id: 'importSessions',
        title: 'Ctrl[Command] + I'
      },
      {
        name: 'Export',
        icon: 'export',
        id: 'exportWhistleFile',
        disabled: true,
        title: 'Ctrl[Command] + S'
      },
      {
        name: 'Show Tree View',
        icon: 'tree-conifer',
        id: 'toggleView'
      }
    ];
    state.helpOptions = [
      {
        name: 'Website',
        href: util.getDocsBaseUrl(),
        icon: 'link'
      },
      {
        name: 'GitHub',
        href: 'https://github.com/avwo/whistle',
        icon: 'github'
      },
      {
        name: 'Update',
        href: util.getDocsBaseUrl('faq.html#update'),
        icon: 'refresh'
      },
      {
        name: 'Issue',
        href: 'https://github.com/avwo/whistle/issues/new',
        icon: 'record'
      }
    ];
    protocols.setPlugins(state);
    state.exportFileType = storage.get('exportFileType');
    var showLeftMenu = storage.get('showLeftMenu');
    state.showLeftMenu = showLeftMenu == null ? true : showLeftMenu;
    util.triggerPageChange(state.name);
    if (showTreeView || showTreeView === false) {
      networkModal.setTreeView(showTreeView, true);
    }
    events.on('importSessionsFromUrl', function (_, url) {
      self.importSessionsFromUrl(url);
    });
    return self.updateMenuView(state);
  },
  initPluginTabs: function(state, plugins) {
    plugins = plugins || {};
    var tabs = state.tabs;
    var activeTabs;
    var activeName;
    try {
      activeTabs = JSON.parse(storage.get('activePluginTabList'));
      activeName = storage.get('activePluginTabName');
    } catch (e) {}
    if (!Array.isArray(activeTabs)) {
      return;
    }
    var map = {};
    Object.keys(plugins)
      .forEach(function (name) {
        var plugin = plugins[name];
        name = name.slice(0, -1);
        if (activeTabs.indexOf(name) === -1) {
          return;
        }
        if (activeName === name) {
          state.active = name;
        }
        map[name] = {
          name: name,
          url: plugin.pluginHomepage || 'plugin.' + name + '/'
        };
      });
    activeTabs.forEach(function(name) {
      name = name && map[name];
      name && tabs.push(name);
    });
  },
  getListByName: function (name, type) {
    var list = this.state[name].list;
    var data = this.state[name].data;
    return {
      type: type,
      url: location.href,
      list: list.map(function (name) {
        var item = data[name];
        return {
          name: name,
          value: (item && item.value) || ''
        };
      })
    };
  },
  triggerRulesChange: function (type) {
    util.triggerListChange('rules', this.getListByName('rules', type));
  },
  triggerValuesChange: function (type) {
    util.triggerListChange('values', this.getListByName('values', type));
  },
  syncData: function(plugin, cb) {
    var state = this.state;
    this.refs.syncDialog.show(plugin, state.rules, state.values, cb);
  },
  syncRules: function(plugin) {
    var self = this;
    self.syncData(plugin, function() {
      self.refs.syncDialog.syncRules(plugin);
    });
  },
  syncValues: function(plugin) {
    var self = this;
    self.syncData(plugin, function() {
      self.refs.syncDialog.syncValues(plugin);
    });
  },
  showKVDialog: function(data, isValues) {
    if (data) {
      this.refs.syncDialog.showKVDialog(data, this.state.rules, this.state.values, isValues);
    }
  },
  createPluginsOptions: function (plugins) {
    plugins = plugins || {};
    var pluginsOptions = [
      {
        name: 'Home'
      }
    ];

    Object.keys(plugins)
      .sort(function (a, b) {
        var p1 = plugins[a];
        var p2 = plugins[b];
        return (
          util.compare(p1.priority, p2.priority) ||
          util.compare(p2.mtime, p1.mtime) ||
          (a > b ? 1 : -1)
        );
      })
      .forEach(function (name) {
        var plugin = plugins[name];
        pluginsOptions.push({
          name: name.slice(0, -1),
          icon: 'checkbox',
          mtime: plugin.mtime,
          homepage: plugin.homepage,
          latest: plugin.latest,
          hideLongProtocol: plugin.hideLongProtocol,
          hideShortProtocol: plugin.hideShortProtocol,
          path: plugin.path,
          pluginVars: plugin.pluginVars
        });
      });
    return pluginsOptions;
  },
  reloadRules: function (data, quite) {
    var self = this;
    var selectedName = storage.get('activeRules', true) || data.current;
    var rulesList = [];
    var rulesData = {};
    rulesList.push(DEFAULT);
    rulesData.Default = {
      name: DEFAULT,
      fixed: true,
      value: data.defaultRules,
      selected: !data.defaultRulesIsDisabled,
      isDefault: true,
      active: selectedName === DEFAULT
    };
    data.list.forEach(function (item) {
      rulesList.push(item.name);
      item = rulesData[item.name] = {
        name: item.name,
        value: item.data,
        selected: item.selected,
        active: selectedName === item.name
      };
    });
    var changed = quite && updateData(rulesList, rulesData, self.state.rules);
    self.state.rules.reset(rulesList, rulesData);
    self.setState({});
    return changed;
  },
  reloadValues: function (data, quite) {
    var self = this;
    var selectedName = storage.get('activeValues', true) || data.current;
    var valuesList = [];
    var valuesData = {};
    data.list.forEach(function (item) {
      valuesList.push(item.name);
      valuesData[item.name] = {
        name: item.name,
        value: item.data,
        active: selectedName === item.name
      };
    });
    var changed = quite && updateData(valuesList, valuesData, self.state.values);
    self.state.values.reset(valuesList, valuesData);
    self.setState({});
    return changed;
  },
  reloadDataQuite: function() {
    this.reloadData(true);
  },
  reloadData: function (quite) {
    var self = this;
    var dialog = $('.w-reload-data-tips').closest('.w-confirm-reload-dialog');
    var name = dialog.find('.w-reload-data-tips').attr('data-name');
    var isRules = name === 'rules';
    quite = quite === true;
    var handleResponse = function (data, xhr) {
      if (!data) {
        !quite && util.showSystemError(xhr, true);
        return setTimeout(function() {
          events.trigger(isRules ? 'rulesChanged' : 'valuesChanged', true);
        }, 2000);
      }
      if (isRules) {
        if (self.reloadRules(data, quite)) {
          events.trigger('rulesChanged', true);
        }
        self.triggerRulesChange('reload');
      } else {
        if (self.reloadValues(data, quite)) {
          events.trigger('valuesChanged', true);
        }
        self.triggerValuesChange('reload');
      }
    };
    if (isRules) {
      dataCenter.rules.list(handleResponse);
      events.trigger('reloadRulesRecycleBin');
    } else {
      dataCenter.values.list(handleResponse);
      events.trigger('reloadValuesRecycleBin');
    }
  },
  showReloadRules: function (force) {
    if (this.rulesChanged && this.state.name === 'rules') {
      this.rulesChanged = false;
      var hasChanged = this.state.rules.hasChanged();
      this.showReloadDialog(
        'Rules changed. Reload now?',
        hasChanged,
        force
      );
    }
  },
  showReloadValues: function (force) {
    if (this.valuesChanged && this.state.name === 'values') {
      this.valuesChanged = false;
      var hasChanged = this.state.values.hasChanged();
      this.showReloadDialog(
        'Values changed. Reload now?',
        hasChanged,
        force
      );
    }
  },
  componentDidUpdate: function () {
    this.showReloadRules();
    this.showReloadValues();
  },
  showReloadDialog: function (msg, existsUnsaved, force) {
    var dialog = this.refs.confirmReload;
    clearTimeout(this.reloadTimer);
    var tips = $('.w-reload-data-tips');
    tips.attr('data-name', this.state.name);
    if (!force && !dialog.isVisible()) {
      this.reloadTimer = setTimeout(this.reloadDataQuite, 1000);
      return;
    }
    dialog.show();
    if (existsUnsaved) {
      msg +=
        '<p class="w-confim-reload-note">Warning: Unsaved changes will be lost.</p>';
    }
    tips.html(msg);
  },
  showTab: function() {
    var pageName = getPageName(this.state);
    if (!pageName || pageName.indexOf('rules') != -1) {
      this.showRules();
    } else if (pageName.indexOf('values') != -1) {
      this.showValues();
    } else if (pageName.indexOf('plugins') != -1) {
      this.showPlugins();
    } else {
      this.showNetwork();
    }
    storage.set('pageName', pageName || '');
  },
  componentDidMount: function () {
    var self = this;
    var clipboard = new Clipboard('.w-copy-text');
    clipboard.on('error', function (e) {
      win.alert('Copy failed');
    });
    clipboard = new Clipboard('.w-copy-text-with-tips');
    clipboard.on('error', function (e) {
      message.error('Copy failed');
    });
    clipboard.on('success', function (e) {
      message.success('Copied clipboard');
    });
    var preventDefault = function (e) {
      e.preventDefault();
    };
    events.on('showRulesDialog', function(_, data) {
      if (data && !self.isHideRules()) {
        self.refs.rulesDialog.show(data.rules, data.values);
      }
    });
    events.on('changeRecordState', function (_, type) {
      self.setState({ record: type }, self.updateList);
    });
    events.on('showHttpsSettingsDialog', self.showHttpsSettingsDialog);

    if (isClient) {
      var findEditor = function(keyword, prev) {
        events.editorMatchedCount = 0;
        events.trigger(prev ? 'findEditorPrev' : 'findEditorNext', keyword);
        return events.editorMatchedCount;
      };
      window.__findWhistleCodeMirrorEditor_ = findEditor;
    }

    var composerDidMount;
    var composerData;

    events.one('networkDidMount', function() {
      composerData && events.trigger('showComposerTab');
    });

    events.one('composerDidMount', function() {
      composerDidMount = true;
      if (composerData) {
        events.trigger('_setComposerData', composerData);
        composerData = null;
      }
    });

    events.on('showPluginOptionTab', function(_, plugin) {
      plugin && self.showPluginTab(util.getSimplePluginName(plugin));
    });

    events.on('disablePlugin', function(_, plugin, disabled) {
      self.setPluginState(util.getSimplePluginName(plugin), disabled);
    });

    events.on('setComposerData', function(_, data) {
      if (!data || self.state.rulesMode) {
        return;
      }
      win.confirm('Do you confirm the changes to the composer\'s data?', function(sure) {
        if (sure) {
          if (composerDidMount) {
            events.trigger('_setComposerData', data);
          } else {
            composerData = data;
          }
        }
      });
    });

    events.on('showPluginOption', function(_, plugin) {
      if (!plugin) {
        return;
      }
      var name = util.getSimplePluginName(plugin);
      var url =  plugin.pluginHomepage || 'plugin.' + name + '/';
      if ((plugin.pluginHomepage || plugin.openExternal) && !plugin.openInPlugins && !plugin.openInModal) {
        return window.open(url);
      }
      var modal = plugin.openInModal || '';
      if (modal && !plugin.pluginHomepage) {
        url += '?openInModal=5b6af7b9884e1165';
      }
      self.refs.iframeDialog.show({
        favicon: util.getPluginIcon(plugin),
        name: name,
        url: url,
        homepage: plugin.homepage,
        disabled: util.pluginIsDisabled(self.state, name),
        width: modal.width,
        height: modal.height
      });
    });
    events.on('hidePluginOption', function() {
      self.refs.iframeDialog.hide();
    });

    events.on('download', function(_, data) {
      self.download(data);
    });
    events.on('showMockDialog', function(_, data) {
      if (data) {
        self.refs.mockDialog.show(data.item, data.type);
      }
    });
    events.on('enableRecord', function () {
      self.enableRecord();
    });
    events.on('showJsonViewDialog', function(_, data, keyPath) {
      self.refs.jsonDialog.show(data, keyPath);
    });
    events.on('rulesChanged', function (_, force) {
      self.rulesChanged = true;
      self.showReloadRules(force === true);
    });
    events.on('switchTreeView', function () {
      self.toggleTreeView();
    });
    events.on('updateGlobal', function () {
      self.setState({});
    });
    events.on('valuesChanged', function (_, force) {
      self.valuesChanged = true;
      self.showReloadValues(force === true);
    });
    events.on('showNetwork', function () {
      self.showNetwork();
    });
    events.on('showRules', function (_, name) {
      self.showRules();
      if (name && self.state.rules.exists(name)) {
        events.trigger('expandRulesGroup', name);
        self.setRulesActive(name);
      }
    });
    events.on('showValues', function () {
      self.showValues();
    });
    events.on('showPlugins', function (_, name) {
      if (name && typeof name === 'string') {
        self.setState({ active: 'Home' });
        setTimeout(function() {
          events.trigger('highlightPlugin', name);
        }, 600);
      }
      self.showPlugins();
    });
    events.on('disableAllPlugins', self.disableAllPlugins);
    events.on('disableAllRules', self.disableAllRules);
    events.on('activeRules', function () {
      var rulesModal = dataCenter.rulesModal;
      if (rulesModal.exists(dataCenter.activeRulesName)) {
        self.setRulesActive(dataCenter.activeRulesName, rulesModal);
        self.setState({});
      }
    });

    events.on('activeValues', function () {
      var valuesModal = dataCenter.valuesModal;
      if (valuesModal.exists(dataCenter.activeValuesName)) {
        self.setValuesActive(dataCenter.activeValuesName, valuesModal);
        self.setState({});
      }
    });
    var editorWin;
    events.on('openEditor', function(_, text) {
      if (storage.get('viewAllInNewWindow') === '1') {
        return util.openInNewWin(text || '');
      }
      try {
        if (editorWin && typeof editorWin.setValue === 'function') {
          window.getTextFromWhistle_ = null;
          self.refs.editorWin.show();
          return editorWin.setValue(text);
        }
        window._initWhistleTextEditor_ = function(win) {
          editorWin = win;
          editorWin.setValue(text);
        };
        self.refs.editorWin.show('editor.html');
      } catch (e) {}
    });
    events.on('openInNewWin', function() {
      try {
        util.openInNewWin(editorWin.getEditorValue() || '');
        self.refs.editorWin.hide();
      } catch (e) {}
    });

    var updateTimer;
    events.on('updateUIThrottle', function() {
      if (updateTimer) {
        return;
      }
      updateTimer = setTimeout(function() {
        updateTimer = null;
        self.setState({});
      }, 200);
    });

    events.on('addNewRulesFile', function(_, data) {
      var filename = data.filename;
      var modal = self.state.rules;
      var item = modal.add(filename, data.data);
      modal.setChanged(filename, false);
      self.setRulesActive(filename);
      self.setState({ activeRules: item });
      if (!data.update) {
        self.triggerRulesChange('create');
      }
    });
    events.on('addNewValuesFile', function(_, data) {
      var filename = data.filename;
      var modal = self.state.values;
      var item = modal.add(filename, data.data);
      modal.setChanged(filename, false);
      if (data.update) {
        self.setState({});
      } else {
        self.setValuesActive(filename);
        self.setState({ activeValues: item });
        self.triggerValuesChange('create');
      }
    });

    events.on('recoverRules', function (_, data) {
      var modal = self.state.rules;
      var filename = data.filename;
      var handleRecover = function (sure) {
        if (!sure) {
          return;
        }
        dataCenter.rules.add(
          {
            name: filename,
            value: data.data,
            recycleFilename: data.name
          },
          function (result, xhr) {
            if (result && result.ec === 0) {
              var item = modal.add(filename, data.data);
              self.setRulesActive(filename);
              self.setState({ activeRules: item });
              self.triggerRulesChange('create');
              events.trigger('rulesRecycleList', result);
              events.trigger('focusRulesList');
            } else {
              util.showSystemError(xhr);
            }
          }
        );
      };
      if (!modal.exists(filename)) {
        return handleRecover(true);
      }
      win.confirm(
        'The name \'' + filename + '\' is already in use. Overwrite?',
        handleRecover
      );
    });

    events.on('recoverValues', function (_, data) {
      var modal = self.state.values;
      var filename = data.filename;
      var handleRecover = function (sure) {
        if (!sure) {
          return;
        }
        dataCenter.values.add(
          {
            name: filename,
            value: data.data,
            recycleFilename: data.name
          },
          function (result, xhr) {
            if (result && result.ec === 0) {
              var item = modal.add(filename, data.data);
              self.setValuesActive(filename);
              self.setState({ activeValues: item });
              self.triggerValuesChange('create');
              events.trigger('valuesRecycleList', result);
            } else {
              util.showSystemError(xhr);
            }
          }
        );
      };
      if (!modal.exists(filename)) {
        return handleRecover(true);
      }
      win.confirm(
        'The name \'' + filename + '\' is already in use. Overwrite?',
        handleRecover
      );
    });
    events.on('networkImportFile', function (_, file) {
      self.uploadSessionsForm(file);
    });
    events.on('networkImportData', function (_, data) {
      self.importAnySessions(data);
    });
    events.on('rulesImportFile', function (_, file) {
      handleImportData(file, self.handleImportRules);
    });
    events.on('rulesImportData', function (_, data) {
      self.handleImportRules(data);
    });
    events.on('valuesImportFile', function (_, file) {
      handleImportData(file, self.handleImportValues);
    });
    events.on('valuesImportData', function (_, data) {
      self.handleImportValues(data);
    });
    events.on('networkSettingsImportFile composerImportFile rulesSettingsImportFile valuesSettingsImportFile', function (_, file) {
      handleImportData(file, util.noop);
    });
    events.on('networkSettingsImportData composerImportData rulesSettingsImportFile valuesSettingsImportFile', function (_, data) {
      util.handleImportData(data);
    });
    events.on('setRulesSettings', function (_, data) {
      if (!data) {
        return;
      }
      win.confirm('Do you confirm the changes to the rules settings?', function(sure) {
        if (sure) {
          self.setState({
            rulesTheme: data.theme,
            rulesFontSize: data.fontSize,
            showRulesLineNumbers: data.lineNumbers,
            autoRulesLineWrapping: data.autoLineWrapping
          });
          storage.set('rulesTheme', getString(data.theme).substring(0, 30));
          storage.set('rulesFontSize', getString(data.fontSize).substring(0, 30));
          storage.set('showRulesLineNumbers', !!data.lineNumbers);
          storage.set('autoRulesLineWrapping', data.autoLineWrapping ? '1' : '');
          self.setMultipleCohice(data.allowMultipleChoice);
          self.setBackRulesFirst(data.backRulesFirst);
        }
      });
    });
    events.on('setValuesSettings', function (_, data) {
      if (!data) {
        return;
      }
      win.confirm('Do you confirm the changes to the values settings?', function(sure) {
        if (sure) {
          self.setState({
            valuesTheme: data.theme,
            valuesFontSize: data.fontSize,
            showValuesLineNumbers: data.lineNumbers,
            autoValuesLineWrapping: data.autoLineWrapping,
            foldGutter: data.foldGutter
          });
          storage.set('valuesTheme', getString(data.theme).substring(0, 30));
          storage.set('valuesFontSize', getString(data.fontSize).substring(0, 10));
          storage.set('showValuesLineNumbers', !!data.lineNumbers);
          storage.set('autoValuesLineWrapping', data.autoLineWrapping ? '1' : '');
          storage.set('foldGutter', data.foldGutter ? '1' : '');
        }
      });
    });

    $(document)
      .on('dragleave', preventDefault)
      .on('dragenter', preventDefault)
      .on('dragover', preventDefault)
      .on('drop', function (e) {
        e.preventDefault();
        var files = e.originalEvent.dataTransfer.files;
        var file = files && files[0];
        if (!file) {
          return;
        }
        var target = e.target;
        if (target.nodeName === 'TEXTAREA') {
          e.preventDefault();
          target.readOnly = true;
          setTimeout(function() {
            target.readOnly = false;
          }, 0);
        }
        target = $(target);
        var iframe = target.closest('.w-fix-drag').find('iframe')[0];
        if (iframe) {
          try {
            var win = iframe.contentWindow;
            if (win && typeof win.onWhistleFileDrop === 'function') {
              return win.onWhistleFileDrop(file);
            }
          } catch (e) {
            console.error(e); // eslint-disable-line
          }
        }
        if ($('.w-show-upload-temp-file.in').length) {
          return events.trigger('uploadTempFile', file);
        }
        if ($('.w-import-dialog.in').length) {
          return events.trigger('importFile', file);
        }
        var name = self.state.name;
        var filename = file.name;
        if (name === 'network') {
          if (target.closest('.w-frames-composer').length) {
            return;
          }
          if (/\.log$/i.test(filename)) {
            if (file.size > MAX_LOG_SIZE) {
              return win.alert('Maximum file size: 2MB');
            }
            util.readFileAsText(file, function (logs) {
              logs = util.parseLogs(logs);
              if (!logs) {
                return;
              }
              if (dataCenter.uploadLogs !== null) {
                dataCenter.uploadLogs = logs;
              }
              events.trigger('showLog');
              events.trigger('uploadLogs', { logs: logs });
            });
            return;
          }
          return self.uploadSessionsForm(file);
        }
        handleImportData(file, function(json) {
          if (json) {
            if (name === 'rules') {
              self.handleImportRules(json);
            } else if (name === 'values') {
              self.handleImportValues(json);
            }
          }
        });
      })
      .on('keyup', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.keyCode === 82) {
          !isClient && e.preventDefault();
        } else if (e.keyCode === 191) {
          var name = self.state.name;
          var nodeName = document.activeElement && document.activeElement.nodeName;
          if (nodeName !== 'INPUT' && nodeName !== 'TEXTAREA' && !$('.modal.in').length) {
            if (name === 'network') {
              events.trigger('focusNetworkFilterInput');
            } else if (name === 'rules') {
              events.trigger('focusRulesFilterInput');
            } else if (name === 'values') {
              events.trigger('focusValuesFilterInput');
            }
          }
        }
      })
      .on('contextmenu', '.w-textarea-bar', function(e) {
        e.preventDefault();
      });
    var removeItem = function (e) {
      var target = e.target;
      if (
        target.nodeName == 'A' &&
        $(target).parent().hasClass('w-list-data')
      ) {
        self.state.name == 'rules' ? self.removeRules() : self.removeValues();
      }
      e.preventDefault();
    };
    $(window)
      .on('hashchange', self.showTab)
      .on('keyup', function (e) {
        if (e.keyCode == 27) {
          self.setMenuOptionsState();
          var dialog = $('.modal');
          if (typeof dialog.modal == 'function') {
            dialog.modal('hide');
          }
        }
      })
      .on('keydown', function (e) {
        var name = self.state.name;
        var code = e.keyCode;
        code == 46 && removeItem(e);
        if (!e.ctrlKey && !e.metaKey) {
          if (code === 112) {
            e.preventDefault();
            window.open(util.getDocsBaseUrl('gui/' + name + '.html'));
          } else if (code === 116) {
            e.preventDefault();
          }
          return;
        }
        if (code === 79 || code === 48) {
          e.preventDefault();
          if (name === 'network') {
            events.trigger('toggleNetworkState');
          } else if (name === 'rules') {
            self.confirmDisableAllRules();
          } else if (name === 'plugins') {
            self.confirmDisableAllPlugins();
          }
        } else if (code === 76) {
          e.preventDefault();
          if (name === 'network') {
            events.trigger('toggleNetworkDock');
          } else if (name === 'rules') {
            events.trigger('toggleRulesLineNumbers');
          } else if (name === 'values') {
            events.trigger('toggleValuesLineNumbers');
          }
        } else if (code === 82) {
          !isClient && e.preventDefault();
        } else if (code === 77) {
          self.toggleLeftMenu();
          e.preventDefault();
        } else if (code === 66) {
          self.toggleTreeView();
          e.preventDefault();
          events.trigger('toggleTreeViewByAccessKey');
        }
        var isNetwork = name === 'network';
        if (isNetwork && code == 88) {
          if (
            !util.isFocusEditor() &&
            !$(e.target).closest('.w-frames-list').length
          ) {
            self.clear();
          }
        }
        code == 68 && removeItem(e);
        var modal = self.state.network;
        if (isNetwork && (code === 83 || code === 69)) {
          e.preventDefault();
          if ($('.modal.in').length) {
            if (
              $(ReactDOM.findDOMNode(self.refs.chooseFileType)).is(':visible')
            ) {
              self.exportBySave();
            }
            return;
          }
          var nodeName = e.target.nodeName;
          if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
            return;
          }
          var hasSelected = modal.hasSelected();
          if (hasSelected) {
            $(ReactDOM.findDOMNode(self.refs.chooseFileType)).modal('show');
            setTimeout(function () {
              ReactDOM.findDOMNode(self.refs.sessionsName).focus();
            }, 500);
          }
          return;
        }
        if (code === 69) {
          e.preventDefault();
          return  self.exportData();
        }
        if (code === 190) {
          self.showSettings();
          return e.preventDefault();
        }
        var isService = code === 74;
        if (isService || code === 73) {
          if (!$('.modal.in').length) {
            if (isService) {
              self.showService();
            } else if (isNetwork || name === 'rules' || name === 'values') {
              self.importData();
            } else if (name === 'plugins') {
              events.trigger('installPlugins');
            }
          }
          e.preventDefault();
        }
      });

    function getKey(url) {
      if (!(url = url && url.trim())) {
        return;
      }

      var index = url.indexOf('://') + 3;
      url = index != -1 ? url.substring(index) : url;
      if (url.indexOf('{') !== 0) {
        return;
      }

      index = url.lastIndexOf('}');
      return index > 1 ? url.substring(1, index) : null;
    }

    var isEditor = function () {
      var name = self.state.name;
      return name === 'rules' || name === 'values';
    };

    $(document.body)
      .on('mouseenter', LINK_SELECTOR, function (e) {
        if (!isEditor() || !(e.ctrlKey || e.metaKey)) {
          return;
        }
        var elem = $(this);
        var text;
        if (
          elem.hasClass('cm-js-http-url') ||
          elem.hasClass('cm-string') ||
          elem.hasClass('cm-js-at') ||
          TEMP_LINK_RE.test(text = elem.text()) ||
          isTextFile(text) ||
          getKey(text)
        ) {
          elem.addClass('w-is-link');
        }
      })
      .on('mouseleave', LINK_SELECTOR, function (e) {
        $(this).removeClass('w-is-link');
      })
      .on('mousedown', LINK_SELECTOR, function (e) {
        if (!isEditor() || !(e.ctrlKey || e.metaKey)) {
          return;
        }
        var elem = $(this);
        var text = elem.text();
        if (elem.hasClass('cm-js-at')) {
          if (AT_LINK_RE.test(text)) {
            window.open((RegExp.$1 || 'http:') + RegExp.$2);
          }
          return;
        }
        if (elem.hasClass('cm-string')) {
          if (LINK_RE.test(text)) {
            window.open((RegExp.$1 || 'http:') + RegExp.$2);
          }
          return;
        }
        if (elem.hasClass('cm-js-http-url')) {
          if (!/^https?:\/\//i.test(text)) {
            text = 'http:' + (text[0] === '/' ? '' : '//') + text;
          }
          window.open(text);
          return;
        }
        if (TEMP_LINK_RE.test(text) || (isTextFile(text) && FILE_PATH_RE.test(text))) {
          var tempFile = RegExp.$1;
          return events.trigger('showEditorDialog', [{
            ruleName: self.getActiveRuleName(),
            tempFile: tempFile
          }, elem]);
        } else {
          var name = getKey(text);
          if (name) {
            return events.trigger('showEditorDialog', {
              name: name
            });
          }
        }
      });

    if (self.state.name == 'network') {
      self.startLoadData(true);
    }
    dataCenter.on('settings', function (data) {
      var state = self.state;
      var server = data.server;
      var hasChanged = state.tokenId !== server.tokenId;
      if (hasChanged) {
        state.tokenId = server.tokenId;
      }
      var caUrlList = [];
      var caHash = util.getCAHash(server, caUrlList);
      if (caHash !== state.caHash) {
        state.caHash = caHash;
        state.caUrlList = caUrlList;
        hasChanged = true;
      }
      if (
        state.interceptHttpsConnects !== data.interceptHttpsConnects ||
        state.enableHttp2 !== data.enableHttp2 ||
        state.disabledAllRules !== data.disabledAllRules ||
        state.allowMultipleChoice !== data.allowMultipleChoice ||
        state.disabledAllPlugins !== data.disabledAllPlugins ||
        state.backRulesFirst !== data.backRulesFirst ||
        state.ndp != server.ndp ||
        state.ndr != server.ndr ||
        state.drb != server.drb ||
        state.drm != server.drm ||
        state.port != server.port
      ) {
        state.interceptHttpsConnects = data.interceptHttpsConnects;
        state.enableHttp2 = data.enableHttp2;
        state.disabledAllRules = data.disabledAllRules;
        state.allowMultipleChoice = data.allowMultipleChoice;
        state.backRulesFirst = data.backRulesFirst;
        state.disabledAllPlugins = data.disabledAllPlugins;
        state.ndp = server.ndp;
        state.ndr = server.ndr;
        state.drb = server.drb;
        state.drm = server.drm;
        state.port = server.port;
        protocols.setPlugins(state);
        var list = LEFT_BAR_MENUS;
        list[3].checked = !state.disabledAllRules;
        list[4].checked = !state.disabledAllPlugins;
        self.refs.contextMenu.update();
        return self.setState({});
      }
      if (hasChanged) {
        self.setState({});
      }
    });
    dataCenter.on('rules', function (data) {
      var modal = self.state.rules;
      var newSelectedNames = data.list;
      if (
        !data.defaultRulesIsDisabled &&
        newSelectedNames.indexOf('Default') === -1
      ) {
        newSelectedNames.unshift('Default');
      }
      var selectedNames = modal.getSelectedNames();
      if (compareSelectedNames(selectedNames, newSelectedNames)) {
        return;
      }
      self.reselectRules(data, true);
      self.setState({});
    });
    dataCenter.on('serverInfo', function (data) {
      self.serverInfo = data;
    });

    events.on('executeComposer', function () {
      self.autoRefresh && self.autoRefresh();
    });

    var getFocusItemList = function (curItem) {
      if (Array.isArray(curItem)) {
        return curItem;
      }
      if (!curItem || curItem.selected) {
        return;
      }
      return [curItem];
    };

    events.on('updateUI', function () {
      self.setState({});
    });

    events.on('replaySessions', function (e, curItem, shiftKey) {
      var modal = self.state.network;
      var list = getFocusItemList(curItem) || modal.getSelectedList();
      var len = list && list.length;
      if (shiftKey && len === 1) {
        self.replayList = list;
        self.refs.setReplayCount.show();
        setTimeout(function () {
          var input = ReactDOM.findDOMNode(self.refs.replayCount);
          input.select();
          input.focus();
        }, 300);
        return;
      }
      self.replay(e, list);
    });
    events.on('filterSessions', self.showSettings);
    events.on('exportSessions', function (e, curItem) {
      self.exportData(e, getFocusItemList(curItem));
    });
    events.on('abortRequest', function (e, curItem) {
      self.abort(getFocusItemList(curItem));
    });
    events.on('removeIt', function (e, item) {
      var modal = self.state.network;
      if (item && modal) {
        modal.remove(item);
        self.setState({});
      }
    });
    events.on('removeOthers', function (e, item) {
      var modal = self.state.network;
      if (item && modal) {
        if (item.selected) {
          modal.removeUnselectedItems();
        } else {
          modal.removeOthers(item);
        }
        self.setState({});
      }
    });
    events.on('clearAll', self.clear);
    events.on('removeSelected', function () {
      var modal = self.state.network;
      if (modal) {
        modal.removeSelectedItems();
        self.setState({});
      }
    });
    events.on('removeUnselected', function () {
      var modal = self.state.network;
      if (modal) {
        modal.removeUnselectedItems();
        self.setState({});
      }
    });
    events.on('removeUnmarked', function () {
      var modal = self.state.network;
      if (modal) {
        modal.removeUnmarkedItems();
        self.setState({});
      }
    });
    events.on('saveRules', function (e, item) {
      if (item.changed || !item.selected) {
        var list = self.state.rules.getChangedGroupList(item);
        list.forEach(self.selectRules);
      } else {
        self.unselectRules(item);
      }
    });
    events.on('saveValues', function (e, item) {
      var list = self.state.values.getChangedGroupList(item);
      list.forEach(self.saveValues);
    });
    events.on('renameRules', function (e, item) {
      self.showEditRules(item);
    });
    events.on('renameValues', function (e, item) {
      self.showEditValues(item);
    });
    events.on('deleteRules', function (e, item) {
      setTimeout(function () {
        self.removeRules(item);
      }, 0);
    });
    events.on('deleteValues', function (e, item) {
      setTimeout(function () {
        self.removeValues(item);
      }, 0);
    });
    events.on('createRules', self.showCreateRules);
    events.on('createValues', self.showCreateValues);
    events.on('showImportDialog', function (_, name) {
      self.refs.importDialog.show(name || self.state.name);
    });
    events.on('showExportDialog', function (_, name, data) {
      self.refs.exportDialog.show(name || self.state.name, data);
    });
    events.on('exportData', self.exportData);
    events.on('handleImportRules', function(_, data) {
      self.handleImportRules(data);
    });
    events.on('handleImportValues', function(_, data) {
      self.handleImportValues(data);
    });
    events.on('uploadRules', function (_, data) {
      var form = getJsonForm(data);
      form.append('replaceAll', '1');
      dataCenter.upload.importRules(form, function (data, xhr) {
        if (!data) {
          util.showSystemError(xhr);
        } else if (data.ec === 0) {
          self.reloadRules(data);
          message.success('Rules imported successfully');
        } else {
          win.alert(data.em);
        }
      });
    });
    events.on('uploadValues', function (_, data) {
      var form = getJsonForm(data, 'values');
      form.append('replaceAll', '1');
      dataCenter.upload.importValues(form, function (data, xhr) {
        if (!data) {
          util.showSystemError(xhr);
        }
        if (data.ec === 0) {
          self.reloadValues(data);
          message.success('Values imported successfully');
        } else {
          win.alert(data.em);
        }
      });
    });
    var timeout;
    var hidden = document.hidden;
    var isAtBottom; // 记录 visibilitychange 之前的状态
    $(document).on('visibilitychange', function () {
      clearTimeout(timeout);
      var isNetwork = self.state.name === 'network';
      if (document.hidden || !isNetwork) {
        if (isNetwork && hidden !== document.hidden) {
          hidden = true;
          isAtBottom = self.scrollerAtBottom && self.scrollerAtBottom();
        }
        return;
      }
      hidden = false;
      timeout = setTimeout(function () {
        var atBottom = isAtBottom || self.scrollerAtBottom && self.scrollerAtBottom();
        isAtBottom = false;
        self.setState({}, function () {
          atBottom && self.autoRefresh();
        });
      }, 100);
    });

    setTimeout(function () {
      dataCenter.checkUpdate(function (data) {
        if (data && data.showUpdate) {
          self.setState(
            {
              version: data.version,
              latestVersion: data.latestVersion
            },
            function () {
              $(ReactDOM.findDOMNode(self.refs.showUpdateTipsDialog)).modal(
                'show'
              );
            }
          );
        }
      });
    }, 10000);

    dataCenter.getLogIdList = this.getLogIdListFromRules;
    dataCenter.importAnySessions = self.importAnySessions;
    dataCenter.on('plugins', function (data) {
      var pluginsOptions = self.createPluginsOptions(data.plugins);
      var oldPluginsOptions = self.state.pluginsOptions;
      var oldDisabledPlugins = self.state.disabledPlugins;
      var disabledAllPlugins = self.state.disabledAllPlugins;
      var disabledPlugins = data.disabledPlugins;
      if (
        disabledAllPlugins == data.disabledAllPlugins &&
        pluginsOptions.length == oldPluginsOptions.length
      ) {
        var hasUpdate;
        for (var i = 0, len = pluginsOptions.length; i < len; i++) {
          var plugin = pluginsOptions[i];
          var oldPlugin = oldPluginsOptions[i];
          if (
            plugin.name != oldPlugin.name ||
            plugin.latest !== oldPlugin.latest ||
            plugin.mtime != oldPlugin.mtime || // 判断时间即可
            oldDisabledPlugins[plugin.name] != disabledPlugins[plugin.name] ||
            plugin.hideLongProtocol != oldPlugin.hideLongProtocol ||
            plugin.hideShortProtocol != oldPlugin.hideShortProtocol ||
            plugin.path != oldPlugin.path
          ) {
            hasUpdate = true;
            break;
          }
        }
        if (!hasUpdate) {
          return;
        }
      }
      var oldPlugins = self.state.plugins;
      if (oldPlugins && data.plugins) {
        Object.keys(data.plugins).forEach(function(name) {
          var oldP = oldPlugins[name];
          if (oldP) {
            var p = data.plugins[name];
            p.selectedRulesHistory = oldP.selectedRulesHistory;
            p.selectedValuesHistory = oldP.selectedValuesHistory;
          }
        });
      }
      var pluginsState = {
        plugins: data.plugins,
        disabledPlugins: data.disabledPlugins,
        pluginsOptions: pluginsOptions,
        disabledAllPlugins: data.disabledAllPlugins
      };
      protocols.setPlugins(pluginsState);
      self.setState(pluginsState);
    });
    try {
      var onReady = window.parent.onWhistleReady;
      if (typeof onReady === 'function') {
        var selectItem = function(item) {
          var modal = item && self.state.network;
          var index = modal && modal.getList().indexOf(item);
          if (index >= 0) {
            events.trigger('selectedIndex', index);
          }
        };
        var selectIndex = function (index) {
          events.trigger('selectedIndex', index);
        };
        onReady({
          url: location.href,
          pageId: dataCenter.getPageId(),
          compose: dataCenter.compose,
          createComposeInterrupt: dataCenter.createComposeInterrupt,
          importSessions: self.importAnySessions,
          importHarSessions: self.importHarSessions,
          clearSessions: self.clear,
          selectIndex: selectIndex,
          selectItem: selectItem,
          setActive: function(item) {
            if (item >= 0) {
              selectIndex(item);
            } else {
              selectItem(item);
            }
          }
        });
      }
    } catch (e) {}
    self.handleDataUrl(dataUrl || util.getDataUrl());
    dataCenter.handleDataUrl = self.handleDataUrl;
    dataUrl = null;

    var INTERVAL = 6000;
    var curNetworkSettings;
    var curRulesSettings;
    var curValuesSettings;
    var curTokenId;
    var saveSettings = function () {
      if (!dataCenter.tokenId) {
        curNetworkSettings = curRulesSettings = curValuesSettings = null;
        return setTimeout(saveSettings, INTERVAL);
      }
      if (curTokenId !== dataCenter.tokenId) {
        curNetworkSettings = curRulesSettings = curValuesSettings = null;
        curTokenId = dataCenter.tokenId;
      }
      var networkSettings = JSON.stringify(self.refs.networkSettings.getSettings());
      var rulesSettings = JSON.stringify(self.getRulesSettings());
      var valuesSettings = JSON.stringify(self.getValuesSettings());
      var data;
      if (curNetworkSettings !== networkSettings) {
        data = { networkSettings: networkSettings };
      }
      if (curRulesSettings !== rulesSettings) {
        data = data || {};
        data.rulesSettings = rulesSettings;
      }
      if (curValuesSettings !== valuesSettings) {
        data = data || {};
        data.valuesSettings = valuesSettings;
      }
      if (!data) {
        return setTimeout(saveSettings, INTERVAL);
      }
      data.type = 'settings';
      dataCenter.saveToService(data, function (result) {
        setTimeout(saveSettings, INTERVAL);
        if (result && result.ec === 0) {
          curValuesSettings = valuesSettings;
          curRulesSettings = rulesSettings;
          curNetworkSettings = networkSettings;
        }
      });
    };
    setTimeout(saveSettings, INTERVAL);
  },
  shouldComponentUpdate: function (_, nextSate) {
    var name = this.state.name;
    if (name === 'network' && nextSate.name !== name) {
      this._isAtBottom = this.scrollerAtBottom && this.scrollerAtBottom();
    }
    return true;
  },
  handleDataUrl: function(url) {
    url = getString(url);
    if (!url) {
      return;
    }
    var self = this;
    dataCenter.getRemoteData(url, function(err, data) {
      if (!err) {
        self.importAnySessions(data);
      }
    });
  },
  importAnySessions: function (data) {
    if (data && !util.handleImportData(data)) {
      var isArr = Array.isArray(data);
      if (!isArr && !Array.isArray(data.log && data.log.entries)) {
        isArr = true;
        data = [data];
      }
      if (Array.isArray(data)) {
        dataCenter.addNetworkList(data);
      } else {
        this.importHarSessions(data);
      }
    }
  },
  donotShowAgain: function () {
    dataCenter.donotShowAgain();
  },
  hideUpdateTipsDialog: function () {
    $(ReactDOM.findDOMNode(this.refs.showUpdateTipsDialog)).modal('hide');
  },
  getAllRulesText: function () {
    var text = ' ' + this.getAllRulesValue();
    return text.replace(/#[^\r\n]*[\r\n]/g, '\n');
  },
  getLogIdListFromRules: function () {
    var text = this.getAllRulesText();
    if (
      (text = text.match(
        /\slog:\/\/(?:\{[^\s]{1,36}\}|[^/\\{}()<>\s]{1,36})\s/g
      ))
    ) {
      var flags = {};
      text = text
        .map(function (logId) {
          logId = util.removeProtocol(logId.trim());
          if (logId[0] === '{') {
            logId = logId.slice(1, -1);
          }
          return logId;
        })
        .filter(function (logId) {
          if (!logId) {
            return false;
          }
          if (!flags[logId]) {
            flags[logId] = 1;
            return true;
          }
          return false;
        });
    }
    return text;
  },
  getWeinreFromRules: function () {
    var values = this.state.values;
    var text = this.getAllRulesText();
    if ((text = text.match(/(?:^|\s)weinre:\/\/[^\s#]+(?:$|\s)/gm))) {
      var flags = {};
      text = text
        .map(function (weinre) {
          weinre = util.removeProtocol(weinre.trim());
          var value = getValue(weinre);
          if (value !== false) {
            return value;
          }
          var key = getKey(weinre);
          if (key !== false) {
            key = values.get(key);
            return key && key.value;
          }

          return weinre;
        })
        .filter(function (weinre) {
          if (!weinre) {
            return false;
          }
          if (!flags[weinre]) {
            flags[weinre] = 1;
            return true;
          }
          return false;
        });
    }

    return text;
  },
  getValuesFromRules: function () {
    var text = ' ' + this.getAllRulesValue();
    if ((text = text.match(/\s(?:[\w-]+:\/\/)?\{[^\s#]+\}/g))) {
      text = text
        .map(function (key) {
          return getKey(util.removeProtocol(key.trim()));
        })
        .filter(function (key) {
          return !!key;
        });
    }
    return text;
  },
  getAllRulesValue: function () {
    var result = [];
    var activeList = [];
    var selectedList = [];
    var modal = this.state.rules;
    modal.list.forEach(function (name) {
      var item = modal.get(name);
      var value = item.value || '';
      if (item.active) {
        activeList.push(value);
      } else if (item.selected) {
        selectedList.push(value);
      } else {
        result.push(value);
      }
    });
    modal = this.state.values;
    modal.list.forEach(function (name) {
      if (/\.rules$/.test(name)) {
        result.push(modal.get(name).value);
      }
    });

    return activeList.concat(selectedList).concat(result).join('\r\n');
  },
  preventBlur: function (e) {
    e.target.nodeName != 'INPUT' && e.preventDefault();
  },
  startLoadData: function (init) {
    var self = this;
    if (self._updateNetwork) {
      if (init) {
        self._updateNetwork();
      } else {
        setTimeout(self._updateNetwork, 30);
      }
      return;
    }
    var scrollTimeout;
    var baseDom = $('.w-req-data-list .ReactVirtualized__Grid:first').scroll(
      function () {
        var modal = self.state.network;
        scrollTimeout && clearTimeout(scrollTimeout);
        scrollTimeout = null;
        if (atBottom()) {
          scrollTimeout = setTimeout(function () {
            update(modal, true);
          }, 1000);
        }
      }
    );

    var timeout;
    var con = baseDom[0];
    this.container = baseDom;
    dataCenter.on('data', update);

    function update(modal, _atBottom) {
      modal = modal || self.state.network;
      clearTimeout(timeout);
      timeout = null;
      if (self.state.name != 'network') {
        return;
      }
      _atBottom = _atBottom || atBottom();
      if (modal.update(_atBottom) && _atBottom) {
        timeout = setTimeout(update, 3000);
      }
      if (document.hidden) {
        return;
      }
      self.setState({}, function () {
        _atBottom && scrollToBottom();
      });
    }

    function scrollToBottom(force) {
      if (force || !self.state.network.isTreeView) {
        con.scrollTop = 10000000;
      }
    }

    $(document).on('dblclick', '.w-network-menu-list', function (e) {
      if ($(e.target).hasClass('w-network-menu-list')) {
        if (con.scrollTop < 1) {
          scrollToBottom(true);
        } else {
          con.scrollTop = 0;
        }
      }
    });

    self._updateNetwork = update;
    self.autoRefresh = scrollToBottom;
    self.scrollerAtBottom = atBottom;

    function atBottom(force) {
      var body = baseDom.find('.ReactVirtualized__Grid__innerScrollContainer')[0];
      if (!body) {
        if (force) {
          events.trigger('toggleBackToBottomBtn', false);
        }
        return true;
      }
      var height = con.offsetHeight + 5;
      var ctnHeight = body.offsetHeight;
      var isBottom = con.scrollTop + height > ctnHeight;
      events.trigger('toggleBackToBottomBtn', !isBottom && ctnHeight >= height);
      return isBottom;
    }

    events.on('checkAtBottom', atBottom);
  },
  showPlugins: function (e) {
    if (this.state.name != 'plugins') {
      this.setMenuOptionsState();
      this.hidePluginsOptions();
    } else if (e && !this.state.showLeftMenu) {
      this.showPluginsOptions();
    }
    this.setState({
      hasPlugins: true,
      name: 'plugins'
    });
    util.changePageName('plugins');
  },
  handleAction: function (type) {
    if (type === 'top') {
      this.container[0].scrollTop = 0;
      return;
    }
    if (type === 'bottom') {
      return this.autoRefresh(true);
    }
    if (type === 'pause') {
      events.trigger('changeRecordState', type);
      return dataCenter.pauseNetworkRecord();
    }
    var refresh = type === 'refresh';
    if (refresh) {
      events.trigger('changeRecordState');
    } else {
      events.trigger('changeRecordState', 'stop');
    }
    dataCenter.stopNetworkRecord(!refresh);
    if (refresh) {
      return this.autoRefresh();
    }
  },
  showNetwork: function (e) {
    var self = this;
    if (self.state.name == 'network') {
      e && !self.state.showLeftMenu && self.showNetworkOptions();
      return;
    }
    self.setMenuOptionsState();
    self.setState(
      {
        hasNetwork: true,
        name: 'network'
      },
      function () {
        self.startLoadData();
        if (self._isAtBottom) {
          self._isAtBottom = false;
          self.autoRefresh && self.autoRefresh();
        }
      }
    );
    util.changePageName('network');
  },
  handleNetwork: function (item, e) {
    var modal = this.state.network;
    if (item.id == 'removeAll') {
      this.clear();
    } else if (item.id == 'removeSelected') {
      modal.removeSelectedItems();
    } else if (item.id == 'removeUnselected') {
      modal.removeUnselectedItems();
    } else if (item.id == 'exportWhistleFile') {
      this.exportData();
    } else if (item.id === 'toggleView') {
      this.toggleTreeView();
    } else if (item.id === 'importSessions') {
      this.importData();
    }
    this.hideNetworkOptions();
  },
  importData: function () {
    this.refs.importDialog.show(this.state.name);
  },
  getRulesSettings: function() {
    var state = this.state;
    return {
      type: 'setRulesSettings',
      theme: state.rulesTheme || 'cobalt',
      fontSize: state.rulesFontSize || '14px',
      lineNumbers: !!state.showRulesLineNumbers,
      autoLineWrapping: !!state.autoRulesLineWrapping,
      allowMultipleChoice: !!state.allowMultipleChoice,
      backRulesFirst: !!state.backRulesFirst
    };
  },
  getValuesSettings: function() {
    var state = this.state;
    return {
      type: 'setValuesSettings',
      theme: state.valuesTheme || 'cobalt',
      fontSize: state.rulesFontSize || '14px',
      lineNumbers: !!state.showValuesLineNumbers,
      autoLineWrapping: !!state.autoValuesLineWrapping,
      foldGutter: !!state.foldGutter
    };
  },
  importRulesSettings: function() {
    this.refs.importDialog.show('rulesSettings');
  },
  exportRulesSettings: function() {
    this.refs.exportDialog.show('rulesSettings', this.getRulesSettings());
  },
  importValuesSettings: function() {
    this.refs.importDialog.show('valuesSettings');
  },
  exportValuesSettings: function() {
    this.refs.exportDialog.show('valuesSettings', this.getValuesSettings());
  },
  exportData: function (e, curItem) {
    switch (this.state.name) {
    case 'network':
      var modal = this.state.network;
      var hasSelected = Array.isArray(curItem) || modal.hasSelected();
      this.currentFoucsItem = curItem;
      if (hasSelected) {
        $(ReactDOM.findDOMNode(this.refs.chooseFileType)).modal('show');
        var self = this;
        setTimeout(function () {
          ReactDOM.findDOMNode(self.refs.sessionsName).focus();
        }, 500);
      } else {
        message.info('Please select one or more sessions first');
      }
      break;
    case 'rules':
      this.showAndActiveRules({ id: 'exportRules' });
      break;
    case 'values':
      this.showAndActiveValues({ id: 'exportValues' });
      break;
    }
  },
  showService: function () {
    util.showService(this.state.name);
  },
  importSessionsFromUrl: function (url) {
    var self = this;
    url && dataCenter.getRemoteData(url, function (err, data) {
      if (!err) {
        self.importAnySessions(data);
      }
    });
  },
  handleImportRules: function(data) {
    if (data && !util.handleImportData(data)) {
      this.showKVDialog(data);
    }
  },
  handleImportValues: function(data) {
    if (data && !util.handleImportData(data)) {
      this.showKVDialog(data, true);
    }
  },
  showAndActiveRules: function (item, e) {
    if (this.state.name === 'rules') {
      switch (item.id) {
      case 'exportRules':
        this.refs.selectRulesDialog.show();
        break;
      case 'importRules':
        this.importData();
        break;
      }
    } else {
      this.setRulesActive(item.name);
      this.showRules();
    }
    this.hideRulesOptions();
  },
  showRules: function (e) {
    if (this.state.name != 'rules') {
      this.setMenuOptionsState();
      this.hideRulesOptions();
    } else if (e && !this.state.showLeftMenu) {
      this.showRulesOptions(e);
    }
    this.setState({
      hasRules: true,
      name: 'rules'
    });
    util.changePageName('rules');
  },
  showAndActiveValues: function (item, e) {
    var self = this;
    if (self.state.name === 'values' && item.id) {
      switch (item.id) {
      case 'exportValues':
        self.refs.selectValuesDialog.show();
        break;
      case 'importValues':
        this.importData();
        break;
      }
    } else {
      var modal = self.state.values;
      var name = item.name;

      if (!modal.exists(name)) {
        dataCenter.values.add({ name: name }, function (data, xhr) {
          if (data && data.ec === 0) {
            var item = modal.add(name);
            self.setValuesActive(name);
            self.setState({
              activeValues: item
            });
            events.trigger('focusValuesList');
          } else {
            util.showSystemError(xhr);
          }
        });
      } else {
        self.setValuesActive(name);
      }

      this.showValues();
    }
    self.hideValuesOptions();
  },
  addValue: function () {},
  showValues: function (e) {
    if (this.state.name != 'values') {
      this.setMenuOptionsState();
      this.hideValuesOptions();
    } else if (e && !this.state.showLeftMenu) {
      this.showValuesOptions(e);
    }
    this.setState({
      hasValues: true,
      name: 'values'
    });
    util.changePageName('values');
  },
  showNetworkOptions: function () {
    if (this.state.name == 'network') {
      this.setState({
        showNetworkOptions: true
      });
    }
  },
  hideNetworkOptions: function () {
    this.setState({
      showRemoveOptions: false,
      showAbortOptions: false,
      showNetworkOptions: false
    });
  },
  showRemoveOptions: function () {
    this.setState({
      showRemoveOptions: true
    });
  },
  showAbortOptions: function () {
    var modal = this.state.network;
    var list = modal.getSelectedList();
    ABORT_OPTIONS[0].disabled = !list || !list.filter(util.canAbort).length;
    this.setState({
      showAbortOptions: true
    });
  },
  showCreateOptions: function () {
    this.setState({
      showCreateOptions: true
    });
  },
  hideCreateOptions: function () {
    this.setState({
      showCreateOptions: false
    });
  },
  hideRemoveOptions: function () {
    this.setState({
      showRemoveOptions: false
    });
  },
  hideAbortOptions: function () {
    this.setState({
      showAbortOptions: false
    });
  },
  showHelpOptions: function () {
    this.setState({
      showHelpOptions: true
    });
  },
  hideHelpOptions: function () {
    this.setState({
      showHelpOptions: false
    });
  },
  showHasNewVersion: function (hasNewVersion) {
    this.setState({
      hasNewVersion: hasNewVersion
    });
  },
  showRulesOptions: function (e) {
    var self = this;
    var rules = self.state.rules;
    var data = rules.data;
    var rulesOptions;
    var rulesList = rules.list;
    if (self.state.name === 'rules') {
      var len = rulesList.length;
      RULES_ACTIONS[0].disabled = len < 2;
      RULES_ACTIONS[1].disabled = len < 1;
      rulesOptions = RULES_ACTIONS;
    } else {
      rulesOptions = [];
      rulesList.forEach(function (name) {
        rulesOptions.push(data[name]);
      });
    }
    self.setState({
      rulesOptions: rulesOptions,
      showRulesOptions: true
    });
  },
  hideRulesOptions: function () {
    this.setState({
      showRulesOptions: false
    });
  },
  showValuesOptions: function (e) {
    var self = this;
    var valuesOptions;
    var valuesList = this.state.values.list;
    if (self.state.name === 'values') {
      var len = valuesList.length;
      VALUES_ACTIONS[0].disabled = len < 2;
      VALUES_ACTIONS[1].disabled = len < 1;
      valuesOptions = VALUES_ACTIONS;
    } else {
      valuesOptions = [];
      var list = self.getValuesFromRules() || [];
      list = util.unique(valuesList.concat(list));
      var newValues = [];
      list.forEach(function (name) {
        var exists = valuesList.indexOf(name) != -1;
        var item = {
          name: name,
          icon: exists ? 'edit' : 'plus'
        };
        exists ? valuesOptions.push(item) : newValues.push(item);
      });
      valuesOptions = newValues.concat(valuesOptions);
    }
    self.setState({
      valuesOptions: valuesOptions,
      showValuesOptions: true
    });
  },
  hideValuesOptions: function () {
    this.setState({
      showValuesOptions: false
    });
  },
  showAndActivePlugins: function (option) {
    this.hidePluginsOptions();
    this.showPlugins();
    this.showPluginTab(option.name);
  },
  showPluginTab: function (name) {
    var active = 'Home';
    var tabs = this.state.tabs || [];
    if (name && name != active) {
      for (var i = 0, len = tabs.length; i < len; i++) {
        if (tabs[i].name == name) {
          active = name;
          name = null;
          break;
        }
      }
    }
    var plugin = name && this.state.plugins[name + ':'];
    if (plugin) {
      if (tabs.length >= MAX_PLUGINS_TABS) {
        win.alert('Maximum ' + MAX_PLUGINS_TABS + ' tabs allowed');
        return this.showPlugins();
      }
      active = name;
      if (plugin.pluginHomepage && !plugin.openInPlugins) {
        return window.open(plugin.pluginHomepage);
      }
      tabs.push({
        name: name,
        url: plugin.pluginHomepage || 'plugin.' + name + '/'
      });
    }

    this.setState({
      active: active,
      tabs: tabs
    });
    this.updatePluginTabInfo(tabs, active);
  },
  updatePluginTabInfo: function(tabs, active) {
    tabs = tabs.map(function(tab) {
      return tab.name;
    });
    storage.set('activePluginTabList', JSON.stringify(tabs));
    active && storage.set('activePluginTabName', active);
  },
  activePluginTab: function (e) {
    this.showPluginTab($(e.target).attr('data-name'));
  },
  closePluginTab: function (e) {
    var name = $(e.target).attr('data-name');
    var tabs = this.state.tabs || [];
    for (var i = 0, len = tabs.length; i < len; i++) {
      if (tabs[i].name == name) {
        tabs.splice(i, 1);
        var active = this.state.active;
        if (active == name) {
          var plugin = tabs[i] || tabs[i - 1];
          this.state.active = plugin ? plugin.name : null;
        }
        this.setState({
          tabs: tabs
        });
        this.updatePluginTabInfo(tabs);
        return;
      }
    }
  },
  showPluginsOptions: function (e) {
    this.setState({
      showPluginsOptions: true
    });
  },
  hidePluginsOptions: function () {
    this.setState({
      showPluginsOptions: false
    });
  },
  showWeinreOptionsQuick: function (e) {
    var list = this.getWeinreFromRules();
    if (!list || !list.length) {
      this.showAnonymousWeinre();
      return;
    }
    $(e.target).closest('div').addClass('w-menu-wrapper-show');
    util.shakeElem($(ReactDOM.findDOMNode(this.refs.weinreMenuItem)));
  },
  showWeinreOptions: function (e) {
    var self = this;
    var list = (self.state.weinreOptions = self.getWeinreFromRules() || []);
    self.state.weinreOptions = util.unique(list).map(function (name) {
      return {
        name: name,
        icon: 'console'
      };
    });
    self.setState({
      showWeinreOptions: true
    });
  },
  hideWeinreOptions: function () {
    this.setState({
      showWeinreOptions: false
    });
  },
  setMenuOptionsState: function (name, callback) {
    var state = {
      showCreateRules: false,
      showCreateValues: false,
      showEditRules: false,
      showEditValues: false,
      showCreateOptions: false
    };
    if (name) {
      state[name] = true;
    }
    this.setState(state, callback);
  },
  hideRulesInput: function () {
    this.setState({ showCreateRules: false });
  },
  hideValuesInput: function () {
    this.setState({ showCreateValues: false });
  },
  hideRenameRuleInput: function () {
    this.setState({ showEditRules: false });
  },
  hideRenameValueInput: function () {
    this.setState({ showEditValues: false });
  },
  showCreateRules: function (_, group, focusItem) {
    var createRulesInput = ReactDOM.findDOMNode(this.refs.createRulesInput);
    this._curFocusRulesGroup = group;
    this._curFocusRulesItem = focusItem;
    this.setState(
      {
        showCreateRules: true
      },
      function () {
        createRulesInput.focus();
      }
    );
  },
  showCreateValues: function (_, group, focusItem) {
    var createValuesInput = ReactDOM.findDOMNode(this.refs.createValuesInput);
    this._curFocusValuesGroup = group;
    this._curFocusValuesItem = focusItem;
    this.setState(
      {
        showCreateValues: true
      },
      function () {
        createValuesInput.focus();
      }
    );
  },
  showHttpsSettingsDialog: function () {
    this.refs.httpsSettings.show();
  },
  interceptHttpsConnects: function (e) {
    var self = this;
    var checked = e.target.checked;
    dataCenter.interceptHttpsConnects(
      { interceptHttpsConnects: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.state.interceptHttpsConnects = checked;
          dataCenter.isCapture = checked ? 1 : 0;
          events.trigger('reqTabsChange');
          events.trigger('resTabsChange');
        } else {
          util.showSystemError(xhr);
        }
        self.setState({});
      }
    );
  },
  enableHttp2: function (e) {
    var self = this;
    if (!dataCenter.supportH2) {
      win.confirm(
        'HTTP/2 requires Node.js LTS version v16+. Please upgrade',
        function (sure) {
          sure && window.open('https://nodejs.org/');
          self.setState({});
        }
      );
      return;
    }
    var checked = e.target.checked;
    dataCenter.enableHttp2(
      { enableHttp2: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.state.enableHttp2 = checked;
        } else {
          util.showSystemError(xhr);
        }
        self.setState({});
      }
    );
  },
  createRules: function (e) {
    if (e.keyCode != 13 && e.type != 'click') {
      return;
    }
    var self = this;
    var target = ReactDOM.findDOMNode(self.refs.createRulesInput);
    var name = target.value.trim();
    if (!name) {
      message.error('The name is required');
      return;
    }
    var modal = self.state.rules;
    var type = e && e.target.getAttribute('data-type');
    var isGroup;
    if (type === 'group') {
      isGroup = true;
      name = '\r' + name;
    }
    if (modal.exists(name)) {
      message.error('The name \'' + name + '\' is already in use');
      return;
    }
    var addToTop = type === 'top' ? 1 : '';
    var groupItem = self._curFocusRulesGroup;
    var focusItem = self._curFocusRulesItem;
    var params = { name: name, addToTop: addToTop };
    if (isGroup) {
      var focusName = focusItem && focusItem.name;
      if (focusName) {
        if (focusName === 'Default') {
          focusName = self.state.rules.list[1];
        }
        params.focusName = focusName;
      }
    } else if (groupItem) {
      params.groupName = groupItem.name;
    }
    dataCenter.rules.add(params, function (data, xhr) {
      if (data && data.ec === 0) {
        var item = modal[addToTop ? 'unshift' : 'add'](name);
        target.value = '';
        target.blur();
        var toName = params.focusName;
        if (toName) {
          modal.moveTo(name, toName);
        } else {
          modal.moveToGroup(name, params.groupName, addToTop);
        }
        if (isGroup) {
          if (item) {
            item._isNewGroup = true;
          }
        } else {
          self.setRulesActive(name);
        }
        params.groupName && events.trigger('expandRulesGroup', params.groupName);
        self.setState(isGroup ? {} : {
          activeRules: item
        });
        self.triggerRulesChange('create');
      } else {
        util.showSystemError(xhr);
      }
    }
    );
  },
  createValues: function (e) {
    if (e.keyCode != 13 && e.type != 'click') {
      return;
    }
    var self = this;
    var target = ReactDOM.findDOMNode(self.refs.createValuesInput);
    var name = target.value.trim();
    if (!name) {
      message.error('The name is required');
      return;
    }

    if (/\s/.test(name)) {
      message.error('Spaces are not allowed in the name');
      return;
    }

    if (/#/.test(name)) {
      message.error('Special character \'#\' is not allowed in the name');
      return;
    }

    var modal = self.state.values;
    var type = e && e.target.getAttribute('data-type');
    var isGroup;
    if (type === 'group') {
      isGroup = true;
      name = '\r' + name;
    }
    if (modal.exists(name)) {
      message.error('The name \'' + name + '\' is already in use');
      return;
    }
    var groupItem = self._curFocusValuesGroup;
    var focusItem = self._curFocusValuesItem;
    var params = { name: name };
    if (isGroup) {
      if (focusItem) {
        params.focusName = focusItem.name;
      }
    } else if (groupItem) {
      params.groupName = groupItem.name;
    }
    dataCenter.values.add(params, function (data, xhr) {
      if (data && data.ec === 0) {
        var item = modal.add(name);
        target.value = '';
        target.blur();
        var toName = params.focusName;
        if (toName) {
          modal.moveTo(name, toName);
        } else {
          modal.moveToGroup(name, params.groupName);
        }
        if (isGroup) {
          if (item) {
            item._isNewGroup = true;
          }
        } else {
          self.setValuesActive(name);
        }
        params.groupName && events.trigger('expandValuesGroup', params.groupName);
        self.setState(isGroup ? {} : {
          activeValues: item
        });
        self.triggerValuesChange('create');
      } else {
        util.showSystemError(xhr);
      }
    });
  },
  showEditRules: function (item) {
    this.currentFocusRules = item;
    var modal = this.state.rules;
    var activeItem = item || modal.getActive();
    if (!activeItem || activeItem.isDefault) {
      return;
    }
    var editRulesInput = ReactDOM.findDOMNode(this.refs.editRulesInput);
    editRulesInput.value = activeItem.name;
    this.setState(
      {
        showEditRules: true,
        selectedRule: activeItem
      },
      function () {
        editRulesInput.select();
        editRulesInput.focus();
      }
    );
  },
  showEditValuesByDBClick: function (item) {
    !item.changed && this.showEditValues();
  },
  showEditValues: function (item) {
    this.currentFocusValues = item;
    var modal = this.state.values;
    var activeItem = item || modal.getActive();
    if (!activeItem || activeItem.isDefault) {
      return;
    }

    var editValuesInput = ReactDOM.findDOMNode(this.refs.editValuesInput);
    editValuesInput.value = activeItem.name;
    this.setState(
      {
        showEditValues: true,
        selectedValue: activeItem
      },
      function () {
        editValuesInput.select();
        editValuesInput.focus();
      }
    );
  },
  editRules: function (e) {
    if (e.keyCode != 13 && e.type != 'click') {
      return;
    }
    var self = this;
    var modal = self.state.rules;
    var activeItem = this.currentFocusRules || modal.getActive();
    if (!activeItem) {
      return;
    }
    var target = ReactDOM.findDOMNode(self.refs.editRulesInput);
    var isGroup = util.isGroup(activeItem.name);
    var name = (isGroup ? '\r' : '') + target.value.trim();
    if (!name) {
      message.error('The name is required');
      return;
    }

    if (modal.exists(name)) {
      message.error('The name \'' + name + '\' is already in use');
      return;
    }
    var curName = activeItem.name;
    dataCenter.rules.rename(
      { name: curName, newName: name },
      function (data, xhr) {
        if (data && data.ec === 0) {
          modal.rename(curName, name);
          target.value = '';
          target.blur();
          !isGroup && self.setRulesActive(name);
          events.trigger('rulesNameChanged', [curName, name]);
          self.setState({ activeRules: modal.getActive() });
          self.triggerRulesChange('rename');
        } else {
          util.showSystemError(xhr);
        }
      }
    );
  },
  editValues: function (e) {
    if (e.keyCode != 13 && e.type != 'click') {
      return;
    }
    var self = this;
    var modal = self.state.values;
    var activeItem = this.currentFocusValues || modal.getActive();
    if (!activeItem) {
      return;
    }
    var target = ReactDOM.findDOMNode(self.refs.editValuesInput);
    var isGroup = util.isGroup(activeItem.name);
    var name = (isGroup ? '\r' : '') + target.value.trim();
    if (!name) {
      message.error('The name is required');
      return;
    }

    if (modal.exists(name)) {
      message.error('The name \'' + name + '\' is already in use');
      return;
    }
    var curName = activeItem.name;
    dataCenter.values.rename(
      { name: curName, newName: name },
      function (data, xhr) {
        if (data && data.ec === 0) {
          modal.rename(curName, name);
          target.value = '';
          target.blur();
          !isGroup && self.setValuesActive(name);
          events.trigger('valuesNameChanged', [curName, name]);
          self.setState({ activeValues: modal.getActive() });
          self.triggerValuesChange('rename');
          checkJson(activeItem);
        } else {
          util.showSystemError(xhr);
        }
      }
    );
  },
  getActiveRuleName: function() {
    var modal = this.state.rules;
    var activeItem = modal.getActive();
    return activeItem ? activeItem.name : '';
  },
  showAnonymousWeinre: function () {
    this.openWeinre();
  },
  showWeinre: function (options) {
    this.openWeinre(options.name);
  },
  openWeinre: function (name) {
    window.open('weinre/client/#' + (name || 'anonymous'));
    this.setState({
      showWeinreOptions: false
    });
  },
  onClickRulesOption: function (item) {
    item.selected ? this.unselectRules(item) : this.selectRules(item);
  },
  selectRules: function (item) {
    if (util.isGroup(item.name)) {
      return;
    }
    var self = this;
    dataCenter.rules[item.isDefault ? 'enableDefault' : 'select'](
      item,
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.reselectRules(data);
          self.state.rules.setChanged(item.name, false);
          self.setState({});
          self.triggerRulesChange('save');
          if (data.changed) {
            events.trigger('rulesChanged');
          }
          if (self.state.disabledAllRules) {
            win.confirm(
              'Rules are currently disabled. Enable them now?',
              function (sure) {
                if (sure) {
                  dataCenter.rules.disableAllRules(
                    { disabledAllRules: 0 },
                    function (data, xhr) {
                      if (data && data.ec === 0) {
                        self.state.disabledAllRules = false;
                        self.setState({});
                      } else {
                        util.showSystemError(xhr);
                      }
                    }
                  );
                }
              }
            );
          }
        } else {
          util.showSystemError(xhr);
        }
      }
    );
    return false;
  },
  selectRulesByOptions: function (e) {
    var item = this.state.rules.data[$(e.target).attr('data-name')];
    this[e.target.checked ? 'selectRules' : 'unselectRules'](item);
  },
  unselectRules: function (item) {
    var self = this;
    dataCenter.rules[item.isDefault ? 'disableDefault' : 'unselect'](
      item,
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.reselectRules(data);
          self.setState({});
        } else {
          util.showSystemError(xhr);
        }
      }
    );
    return false;
  },
  reselectRules: function (data, autoUpdate) {
    var self = this;
    self.state.rules.clearAllSelected();
    self.setSelected(
      self.state.rules,
      'Default',
      !data.defaultRulesIsDisabled,
      autoUpdate
    );
    data.list.forEach(function (name) {
      self.setSelected(self.state.rules, name, true, autoUpdate);
    });
  },
  saveValues: function (item) {
    if (!item.changed || util.isGroup(item.name)) {
      return;
    }
    var self = this;
    dataCenter.values.add(item, function (data, xhr) {
      if (data && data.ec === 0) {
        self.setSelected(self.state.values, item.name);
        self.triggerValuesChange('save');
        checkJson(item);
      } else {
        util.showSystemError(xhr);
      }
    });
    return false;
  },
  setSelected: function (modal, name, selected, autoUpdate) {
    if (modal.setSelected(name, selected)) {
      if (!autoUpdate) {
        modal.setChanged(name, false);
      }
      this.setState({
        curSelectedName: name
      });
    }
  },
  replayCountChange: function (e) {
    var count = e.target.value.replace(/^\s*0*|[^\d]+/, '');
    var replayCount = count.slice(0, 3);
    if (replayCount > MAX_REPLAY_COUNT) {
      replayCount = MAX_REPLAY_COUNT;
    }
    this.setState({ replayCount: replayCount });
  },
  clickReplay: function (e) {
    if (e.shiftKey) {
      events.trigger('replaySessions', [null, e.shiftKey]);
    } else {
      this.replay(e);
    }
  },
  replay: function (e, list, count) {
    var modal = this.state.network;
    list = Array.isArray(list) ? list : modal.getSelectedList();
    if (!list || !list.length) {
      return;
    }
    this.enableRecord();
    var replayReq = function (item, repeatCount) {
      var req = item.req;
      dataCenter.compose({
        repeatCount: repeatCount,
        useH2: item.useH2 ? 1 : '',
        url: item.url,
        headers: util.getOriginalReqHeaders(item),
        method: req.method,
        base64: req.base64
      });
    };
    var map;
    if (count > 1) {
      replayReq(list[0], Math.min(count, MAX_REPLAY_COUNT));
    } else {
      map = {};
      list.slice(0, MAX_REPLAY_COUNT).forEach(function (item) {
        map[item.id] = 1;
        replayReq(item);
      });
    }
    if (modal.isTreeView) {
      var dataId = dataCenter.lastSelectedDataId;
      if (!dataId) {
        return;
      }
      if (!map) {
        return events.trigger('replayTreeView', [dataId, count]);
      }
      var node = dataId && modal.getTreeNode(dataId);
      node = node && node.parent;
      if (!node) {
        return;
      }
      count = 0;
      node.children.forEach(function (item) {
        item = item.data;
        if (item && map[item.id]) {
          ++count;
        }
      });
      events.trigger('replayTreeView', [dataId, count]);
    } else if (this.autoRefresh) {
      this.autoRefresh();
    }
  },
  enableRecord: function () {
    this.refs.recordBtn.enable();
    events.trigger('changeRecordState');
  },
  composer: function () {
    events.trigger('composer');
  },
  clear: function () {
    var modal = this.state.network;
    this.setState({
      network: modal.clear(),
      showRemoveOptions: false
    });
  },
  removeRulesBatch: function(list) {
    var self = this;
    dataCenter.rules.remove({ list: list }, function (data, xhr) {
      if (data && data.ec === 0) {
        var nextItem;
        var modal = self.state.rules;
        list.forEach(function(name) {
          var item = modal.data[name] || '';
          if (item.active) {
            nextItem = modal.getSibling(name);
            nextItem && self.setRulesActive(nextItem.name);
          }
          modal.remove(name);
        });
        nextItem && events.trigger('expandRulesGroup', nextItem.name);
        self.setState(nextItem ? { activeRules: nextItem } : {});
        self.triggerRulesChange('remove');
        events.trigger('focusRulesList');
      } else {
        util.showSystemError(xhr);
      }
    });
    this.refs.deleteRulesDialog.hide();
  },
  removeValuesBatch: function(list) {
    var self = this;
    dataCenter.values.remove({ list: list }, function (data, xhr) {
      if (data && data.ec === 0) {
        var nextItem;
        var modal = self.state.values;
        list.forEach(function(name) {
          var item = modal.data[name] || '';
          if (item.active) {
            nextItem = modal.getSibling(name);
            nextItem && self.setValuesActive(nextItem.name);
          }
          modal.remove(name);
        });
        nextItem && events.trigger('expandValuesGroup', nextItem.name);
        self.setState(nextItem ? { activeValues: nextItem } : {});
        self.triggerValuesChange('remove');
        events.trigger('focusValuesList');
      } else {
        util.showSystemError(xhr);
      }
    });
    this.refs.deleteValuesDialog.hide();
  },
  removeRules: function (item) {
    var modal = this.state.rules;
    var activeItem = item || modal.getActive();
    if (activeItem && !activeItem.isDefault) {
      this.refs.deleteRulesDialog.show(activeItem.name);
    }
  },
  removeValues: function (item) {
    var modal = this.state.values;
    var activeItem = item || modal.getActive();
    if (activeItem && !activeItem.isDefault) {
      this.refs.deleteValuesDialog.show(activeItem.name);
    }
  },
  setRulesActive: function (name, modal) {
    modal = modal || this.state.rules;
    storage.set('activeRules', name);
    modal.setActive(name);
  },
  setValuesActive: function (name, modal) {
    modal = modal || this.state.values;
    storage.set('activeValues', name);
    modal.setActive(name);
  },
  showRulesSettings: function () {
    $(ReactDOM.findDOMNode(this.refs.rulesSettingsDialog)).modal('show');
  },
  showValuesSettings: function () {
    $(ReactDOM.findDOMNode(this.refs.valuesSettingsDialog)).modal('show');
  },
  toggleLeftMenu: function () {
    var showLeftMenu = !this.state.showLeftMenu;
    this.setState({
      showLeftMenu: showLeftMenu
    });
    storage.set('showLeftMenu', showLeftMenu ? 1 : '');
    events.trigger('editorResize');
  },
  handleCreate: function () {
    this.state.name == 'rules'
      ? this.showCreateRules()
      : this.showCreateValues();
  },
  saveRulesOrValues: function () {
    var self = this;
    var state = self.state;
    var list;
    var isRules = state.name == 'rules';
    if (isRules) {
      list = state.rules.getChangedList();
      var active = state.rules.getActive();
      if (active && !active.selected && list.indexOf(active) === -1) {
        list.push(active);
      }
      if (list.length) {
        list.forEach(function (item) {
          self.selectRules(item);
        });
        self.setState({});
      }
    } else {
      list = state.values.getChangedList();
      if (list.length) {
        list.forEach(function (item) {
          self.saveValues(item);
        });
        self.setState({});
      }
    }
  },
  onClickMenu: function (e) {
    var target = $(e.target).closest('a');
    var self = this;
    var state = self.state;
    var isRules = state.name == 'rules';
    if (target.hasClass('w-edit-menu')) {
      isRules ? self.showEditRules() : self.showEditValues();
    } else if (target.hasClass('w-delete-menu')) {
      isRules ? self.removeRules() : self.removeValues();
    } else if (target.hasClass('w-save-menu')) {
      self.saveRulesOrValues();
    }
  },
  showSettings: function () {
    var pageName = this.state.name;
    if (pageName === 'rules') {
      this.showRulesSettings();
      return;
    }
    if (pageName === 'values') {
      this.showValuesSettings();
      return;
    }
    if (pageName === 'network') {
      this.refs.networkSettings.showDialog();
    }
  },
  activeRules: function (item) {
    storage.set('activeRules', item.name);
    this.setState({ activeRules: item });
  },
  activeValues: function (item) {
    storage.set('activeValues', item.name);
    this.setState({ activeValues: item });
  },
  onRulesThemeChange: function (e) {
    var theme = e.target.value;
    storage.set('rulesTheme', theme);
    this.setState({
      rulesTheme: theme
    });
  },
  onValuesThemeChange: function (e) {
    var theme = e.target.value;
    storage.set('valuesTheme', theme);
    this.setState({
      valuesTheme: theme
    });
  },
  onRulesFontSizeChange: function (e) {
    var fontSize = e.target.value;
    storage.set('rulesFontSize', fontSize);
    this.setState({
      rulesFontSize: fontSize
    });
  },
  onValuesFontSizeChange: function (e) {
    var fontSize = e.target.value;
    storage.set('valuesFontSize', fontSize);
    this.setState({
      valuesFontSize: fontSize
    });
  },
  onRulesLineNumberChange: function (e) {
    var checked = e.target.checked;
    storage.set('showRulesLineNumbers', checked);
    this.setState({
      showRulesLineNumbers: checked
    });
  },
  onValuesLineNumberChange: function (e) {
    var checked = e.target.checked;
    storage.set('showValuesLineNumbers', checked);
    this.setState({
      showValuesLineNumbers: checked
    });
  },
  showFoldGutter: function (e) {
    var checked = e.target.checked;
    storage.set('foldGutter', checked ? '1' : '');
    this.setState({ foldGutter: checked });
  },
  onRulesLineWrappingChange: function (e) {
    var checked = e.target.checked;
    storage.set('autoRulesLineWrapping', checked ? 1 : '');
    this.setState({
      autoRulesLineWrapping: checked
    });
  },
  onValuesLineWrappingChange: function (e) {
    var checked = e.target.checked;
    storage.set('autoValuesLineWrapping', checked ? 1 : '');
    this.setState({
      autoValuesLineWrapping: checked
    });
  },
  confirmDisableAllRules: function (e) {
    var self = this;
    var state = self.state;
    var dialog;
    if (state.disabledAllRules || (!e && (dialog = $('.w-win-dialog[data-confirm-flag=rules]')).is(':visible'))) {
      self.disableAllRules();
      dialog && dialog.modal('hide');
    } else {
      win.confirm('Do you confirm disabling all rules?', function (sure) {
        sure && self.disableAllRules();
      }, false, 'rules');
    }
    e && e.preventDefault();
  },
  confirmDisableAllPlugins: function (e) {
    var self = this;
    var state = self.state;
    var dialog;
    if (state.disabledAllPlugins || (!e && (dialog = $('.w-win-dialog[data-confirm-flag=plugins]')).is(':visible'))) {
      self.disableAllPlugins();
      dialog && dialog.modal('hide');
    } else {
      win.confirm('Do you confirm disabling all plugins?', function (sure) {
        sure && self.disableAllPlugins();
      }, false, 'plugins');
    }
    e && e.preventDefault();
  },
  disableAllRules: function (e, callback) {
    var self = this;
    var state = self.state;
    var checked = !state.disabledAllRules;
    dataCenter.rules.disableAllRules(
      { disabledAllRules: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          state.disabledAllRules = checked;
          self.setState({});
          if (typeof callback === 'function') {
            callback(checked);
          }
        } else {
          util.showSystemError(xhr);
        }
      }
    );
    e && e.preventDefault();
  },
  disableAllPlugins: function (e, callback) {
    var self = this;
    var state = self.state;
    var checked = !state.disabledAllPlugins;
    dataCenter.plugins.disableAllPlugins(
      { disabledAllPlugins: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          state.disabledAllPlugins = checked;
          protocols.setPlugins(state);
          self.setState({});
          if (typeof callback === 'function') {
            callback(checked);
          }
        } else {
          util.showSystemError(xhr);
        }
      }
    );
    e && e.preventDefault();
  },
  setPluginState: function(name, disabled) {
    var self = this;
    if (self.state.ndp) {
      return message.warn('Plugin disabling is restricted');
    }
    dataCenter.plugins.disablePlugin(
      {
        name: name,
        disabled: disabled ? 1 : 0
      },
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.state.disabledPlugins = data.data;
          dataCenter.setDisabledPlugins(data.data);
          protocols.setPlugins(self.state);
          self.setState({});
        } else {
          util.showSystemError(xhr);
        }
      }
    );
  },
  disablePlugin: function (e) {
    var target = e.target;
    this.setPluginState($(target).attr('data-name'), !target.checked);
  },
  abort: function (list) {
    if (!Array.isArray(list)) {
      var modal = this.state.network;
      list = modal.getSelectedList();
    }
    if (list) {
      list = list.map(function (item) {
        if (util.canAbort(item)) {
          return item.id;
        }
      });
      if (list.length) {
        dataCenter.abort({ list: list.join() });
      }
    }
    this.hideAbortOptions();
  },
  allowMultipleChoice: function (e) {
    this.setMultipleCohice(e.target.checked);
  },
  setMultipleCohice: function (checked) {
    var self = this;
    dataCenter.rules.allowMultipleChoice(
      { allowMultipleChoice: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.setState({
            allowMultipleChoice: checked
          });
        } else {
          util.showSystemError(xhr);
        }
      }
    );
  },
  enableBackRulesFirst: function (e) {
    this.setBackRulesFirst(e.target.checked);
  },
  setBackRulesFirst: function (checked) {
    var self = this;
    dataCenter.rules.enableBackRulesFirst(
      { backRulesFirst: checked ? 1 : 0 },
      function (data, xhr) {
        if (data && data.ec === 0) {
          self.setState({
            backRulesFirst: checked
          });
          dataCenter.backRulesFirst = checked;
        } else {
          util.showSystemError(xhr);
        }
      }
    );
  },
  installPlugins: function () {
    events.trigger('installPlugins');
  },
  chooseFileType: function (e) {
    var value = e.target.value;
    storage.set('exportFileType', value);
    this.setState({
      exportFileType: value
    });
  },
  importHarSessions: function (result) {
    if (!result || typeof result !== 'object') {
      return;
    }
    var entries = result.log.entries;
    var sessions = [];
    entries.forEach(function (entry) {
      if (!entry) {
        return;
      }
      var times = entry.whistleTimes || '';
      var startTime = new Date(
        times.startTime || entry.startedDateTime
      ).getTime();
      if (isNaN(startTime)) {
        return;
      }

      var rawReq = entry.request || {};
      var rawRes = entry.response || {};
      var reqHeaders = util.parseHeadersFromHar(rawReq.headers);
      var resHeaders = util.parseHeadersFromHar(rawRes.headers);
      var clientIp = entry.clientIPAddress || '127.0.0.1';
      var serverIp = entry.serverIPAddress || '';
      var useH2 = H2_RE.test(rawReq.httpVersion || rawRes.httpVersion);
      var version = useH2 ? '2.0' : '1.1';
      var postData = rawReq.postData || '';
      var req = {
        method: rawReq.method,
        ip: clientIp,
        port: rawReq.port,
        httpVersion: version,
        unzipSize: postData.size,
        size: rawReq.bodySize > 0 ? rawReq.bodySize : 0,
        headers: reqHeaders.headers,
        rawHeaderNames: reqHeaders.rawHeaderNames,
        body: ''
      };
      var reqText = postData.base64 || postData.text;
      if (reqText) {
        if (postData.base64) {
          req.base64 = reqText;
        } else {
          req.body = reqText;
        }
      }
      var content = rawRes.content;
      var res = {
        httpVersion: version,
        statusCode: rawRes.statusCode || rawRes.status,
        statusMessage: rawRes.statusText,
        unzipSize: content.size,
        size: rawRes.bodySize > 0 ? rawRes.bodySize : 0,
        headers: resHeaders.headers,
        rawHeaderNames: resHeaders.rawHeaderNames,
        ip: serverIp,
        port: rawRes.port,
        body: ''
      };
      var resCtn = rawRes.content;
      var text = resCtn && resCtn.text;
      if (text) {
        if (resCtn.base64) {
          res.base64 = resCtn.base64;
        } else if (
          util.getContentType(resCtn.mimeType) === 'IMG' ||
          (text.length % 4 === 0 && /^[a-z\d+/]+={0,2}$/i.test(text))
        ) {
          res.base64 = text;
        } else {
          res.body = text;
        }
      }
      var session = {
        useH2: useH2,
        startTime: startTime,
        ttfb: entry.ttfb,
        frames: entry.frames,
        url: rawReq.url,
        realUrl: entry.whistleRealUrl,
        req: req,
        res: res,
        customData: entry.whistleCustomData,
        fwdHost: entry.whistleFwdHost,
        sniPlugin: entry.whistleSniPlugin,
        rules: entry.whistleRules || {},
        captureError: entry.whistleCaptureError,
        isHttps: entry.whistleIsHttps,
        reqError: entry.whistleReqError,
        resError: entry.whistleResError,
        version: entry.whistleVersion,
        nodeVersion: entry.whistleNodeVersion
      };
      if (times && times.startTime) {
        session.dnsTime = times.dnsTime;
        session.requestTime = times.requestTime;
        session.responseTime = times.responseTime;
        session.endTime = times.endTime;
      } else {
        var timings = entry.timings || {};
        var endTime = Math.round(startTime + util.getTimeFromHar(entry.time));
        startTime = Math.floor(startTime + util.getTimeFromHar(timings.dns));
        session.dnsTime = startTime;
        startTime = Math.floor(
          startTime +
            util.getTimeFromHar(timings.connect) +
            util.getTimeFromHar(timings.ssl) +
            util.getTimeFromHar(timings.send) +
            util.getTimeFromHar(timings.blocked) +
            util.getTimeFromHar(timings.wait)
        );
        session.requestTime = startTime;
        startTime = Math.floor(
          startTime + util.getTimeFromHar(timings.receive)
        );
        session.responseTime = startTime;
        session.endTime = Math.max(startTime, endTime);
      }
      sessions.push(session);
    });
    dataCenter.addNetworkList(sessions);
  },
  uploadSessionsForm: function (data) {
    if (!(data instanceof FormData)) {
      var form = new FormData();
      form.append('importSessions', data);
      data = form;
    }
    var file = data.get('importSessions');
    if (!file || !/\.(txt|json|saz|har)$/i.test(file.name)) {
      return win.alert('Supported file formats: .txt, .json, .saz, .har');
    }

    if (file.size > MAX_FILE_SIZE) {
      return win.alert('Maximum file size: 64MB');
    }
    var isText = /\.(?:txt|json)$/i.test(file.name);
    if (isText || /\.har$/i.test(file.name)) {
      var self = this;
      util.readFileAsText(file, function (result) {
        try {
          result = JSON.parse(result);
          if (isText) {
            dataCenter.importAnySessions(result);
          } else {
            self.importHarSessions(result);
          }
        } catch (e) {
          win.alert('Invalid JSON format');
        }
      });
      return;
    }
    dataCenter.upload.importSessions(data, dataCenter.addNetworkList);
  },
  getExportSessions: function() {
    var modal = this.state.network;
    var sessions = this.currentFoucsItem;
    this.currentFoucsItem = null;
    if (!sessions || !$(ReactDOM.findDOMNode(this.refs.chooseFileType)).is(':visible')) {
      sessions = modal.getSelectedList();
    }
    return sessions;
  },
  exportSessions: function (type, name, sessions) {
    sessions = sessions || this.getExportSessions();
    if (!sessions || !sessions.length) {
      return;
    }
    var form = ReactDOM.findDOMNode(this.refs.exportSessionsForm);
    ReactDOM.findDOMNode(this.refs.exportFilename).value = name || '';
    ReactDOM.findDOMNode(this.refs.exportFileType).value = type;
    if (type === 'har') {
      sessions = {
        log: {
          version: '1.2',
          creator: {
            name: 'Whistle',
            version: this.state.version,
            comment: ''
          },
          browser: {
            name: 'Whistle',
            version: this.state.version
          },
          pages: [],
          entries: sessions.map(util.toHar),
          comment: ''
        }
      };
    }
    ReactDOM.findDOMNode(this.refs.sessions).value = JSON.stringify(
      sessions,
      null,
      '  '
    );
    form.submit();
  },
  hideChooseFileTypeDialog: function(failed) {
    if (!failed) {
      $(ReactDOM.findDOMNode(this.refs.chooseFileType)).modal('hide');
    }
  },
  exportBySave: function (e) {
    if (e && e.type !== 'click' && e.keyCode !== 13) {
      return;
    }
    var input = ReactDOM.findDOMNode(this.refs.sessionsName);
    var name = input.value.trim();
    input.value = '';
    this.exportSessions(this.state.exportFileType, name);
    this.hideChooseFileTypeDialog();
  },
  replayRepeat: function (e) {
    if (e && e.type !== 'click' && e.keyCode !== 13) {
      return;
    }
    this.refs.setReplayCount.hide();
    this.replay('', this.replayList, this.state.replayCount);
    events.trigger('focusNetworkList');
  },
  showAboutDialog: function (e) {
    if ($(e.target).closest('.w-menu-enable').length) {
      this.refs.aboutDialog.showAboutInfo();
    }
  },
  onTopContextMenu: function(e) {
    if (this.getTabName() !== 'network') {
      return;
    }
    e.preventDefault();
    var data = util.getMenuPosition(e, 110, 100);
    data.list = TOP_BAR_MENUS;
    this.refs.topContextMenu.show(data);
  },
  onContextMenu: function (e) {
    var count = 0;
    var list = LEFT_BAR_MENUS;
    if (list[2].hide) {
      ++count;
    }
    if (list[3].hide) {
      ++count;
    }
    if (list[4].hide) {
      ++count;
    }
    if (count < 3) {
      var data = util.getMenuPosition(e, 110, 100 - count * 30);
      var state = this.state;
      data.list = list;
      list[2].checked = !!state.network.isTreeView;
      list[3].checked = !state.disabledAllRules;
      list[4].checked = !state.disabledAllPlugins;
      var target = $(e.target);
      list[0].hide = true;
      list[1].hide = true;
      if (target.closest('.w-network-menu').length) {
        list[0].hide = false;
      } else if (target.closest('.w-save-menu').length) {
        list[1].hide = false;
        if (target.closest('.w-rules-menu').length) {
          list[1].disabled = !state.rules.hasChanged();
        } else {
          list[1].disabled = !state.values.hasChanged();
        }
      }
      this.refs.contextMenu.show(data);
    }
    e.preventDefault();
  },
  onClickTopMenu: function(action) {
    switch(action) {
    case 'top':
      if (this.container) {
        this.container[0].scrollTop = 0;
      }
      break;
    case 'selected':
      events.trigger('ensureSelectedItemVisible');
      break;
    case 'bottom':
      if (this.container) {
        this.container[0].scrollTop = 10000000;
      }
      break;
    }
  },
  onClickContextMenu: function (action) {
    var self = this;
    var state = self.state;
    var list = LEFT_BAR_MENUS;
    switch (action) {
    case 'Tree View':
      list[2].checked = !state.network.isTreeView;
      setTimeout(self.toggleTreeView, 0);
      break;
    case 'Rules':
      self.disableAllRules(null, function (disabled) {
        list[3].checked = !disabled;
        self.setState({});
      });
      break;
    case 'Plugins':
      self.disableAllPlugins(null, function (disabled) {
        list[4].checked = !disabled;
        self.setState({});
      });
      break;
    case 'Clear':
      self.clear();
      return;
    case 'Save':
      self.saveRulesOrValues();
      return;
    }
    this.refs.contextMenu.show({});
  },
  forceShowLeftMenu: function () {
    var self = this;
    clearTimeout(self.hideTimer);
    clearTimeout(self.showTimer);
    self.showTimer = setTimeout(function () {
      self.setState({ forceShowLeftMenu: true });
    }, 200);
  },
  forceHideLeftMenu: function () {
    var self = this;
    clearTimeout(self.hideTimer);
    clearTimeout(self.showTimer);
    self.hideTimer = setTimeout(function () {
      self.setState({ forceShowLeftMenu: false });
    }, 500);
  },
  updateMenuView: function(state) {
    var opt = state.networkOptions[state.networkOptions.length - 1];
    if (state.network.isTreeView) {
      opt.icon = 'globe';
      opt.name = 'Show List View';
    } else {
      opt.icon = 'tree-conifer';
      opt.name = 'Show Tree View';
    }
    return state;
  },
  toggleTreeView: function () {
    var self = this;
    var modal = self.state.network;
    modal.setTreeView(!modal.isTreeView);
    self.updateMenuView(self.state);
    self.setState({}, function () {
      if (!modal.isTreeView) {
        self.autoRefresh && self.autoRefresh();
      }
    });
  },
  toggleTreeViewByIcon: function () {
    if (this.getTabName() == 'network') {
      this.toggleTreeView();
    }
  },
  download: function(data) {
    if (!data || !(util.isString(data.content) ||
      util.isString(data.value) || util.isString(data.base64))) {
      return;
    }
    var base64 = util.getString(data.base64);
    ReactDOM.findDOMNode(this.refs.filename).value = util.getString(data.name);
    ReactDOM.findDOMNode(this.refs.dataType).value = base64 ? 'rawBase64' : '';
    ReactDOM.findDOMNode(this.refs.content).value = base64 || util.getString(data.value|| data.content);
    ReactDOM.findDOMNode(this.refs.downloadForm).submit();
  },
  getTabName: function () {
    var state = this.state;
    var rulesMode = state.rulesMode;
    var pluginsMode = state.pluginsMode;
    var name = state.name;
    if (state.networkMode) {
      name = 'network';
    } else if (state.rulesOnlyMode) {
      name = name === 'values' ? 'values' : 'rules';
    } else if (rulesMode && pluginsMode) {
      name = 'plugins';
    } else if (rulesMode) {
      name = name === 'network' ? 'rules' : name;
    } else if (pluginsMode) {
      name = name !== 'plugins' ? 'network' : name;
    }
    return name || 'network';
  },
  isHideRules: function() {
    return this.state.networkMode || this.state.pluginsMode;
  },
  render: function () {
    var state = this.state;
    var networkMode = state.networkMode;
    var rulesMode = state.rulesMode;
    var rulesOnlyMode = state.rulesOnlyMode;
    var pluginsMode = state.pluginsMode;
    var tokenId = state.tokenId;
    var multiEnv = dataCenter.isMultiEnv();
    var name = this.getTabName();
    var isAccount = name == 'account';
    var isNetwork = name == 'network';
    var isRules = name == 'rules';
    var isValues = name == 'values';
    var isPlugins = name == 'plugins';
    var isEditor = isRules || isValues;
    var editMenuStyle = isEditor ? null : HIDE_STYLE;
    var importMenuStyle = isPlugins || isAccount ? HIDE_STYLE : null;
    var accountMenuStyle = isAccount ? null : HIDE_STYLE;
    var disabledEditBtn = true;
    var disabledDeleteBtn = true;
    var rulesTheme = state.rulesTheme || 'cobalt';
    var valuesTheme = state.valuesTheme || 'cobalt';
    var rulesFontSize = state.rulesFontSize || '14px';
    var valuesFontSize = state.valuesFontSize || '14px';
    var showRulesLineNumbers = state.showRulesLineNumbers || false;
    var showValuesLineNumbers = state.showValuesLineNumbers || false;
    var autoRulesLineWrapping = state.autoRulesLineWrapping;
    var autoValuesLineWrapping = state.autoValuesLineWrapping;
    var rulesOptions = state.rulesOptions;
    var pluginsOptions = state.pluginsOptions;
    var uncheckedRules = {};
    var showNetworkOptions = state.showNetworkOptions;
    var showRulesOptions = state.showRulesOptions;
    var showValuesOptions = state.showValuesOptions;
    var showPluginsOptions = state.showPluginsOptions;
    var showWeinreOptions = state.showWeinreOptions;
    var showHelpOptions = state.showHelpOptions;
    var modal = state.network;
    var isTreeView = modal.isTreeView;
    var networkType = (isTreeView ? 'tree-conifer' : 'globe') + (state.record ? ' w-disabled' : '');
    if (rulesOptions[0].name === DEFAULT) {
      rulesOptions.forEach(function (item, i) {
        item.icon = !i || !multiEnv ? 'checkbox' : 'edit';
        if (!item.selected) {
          uncheckedRules[item.name] = 1;
        }
      });
    }

    var i, data;
    if (isRules) {
      data = state.rules.data;
      for (i in data) {
        if (data[i].active) {
          disabledEditBtn = disabledDeleteBtn = data[i].isDefault;
          break;
        }
      }
    } else if (isValues) {
      data = state.values.data;
      for (i in data) {
        if (data[i].active) {
          disabledEditBtn = disabledDeleteBtn = false;
          break;
        }
      }
    }
    modal.rulesModal = state.rules;
    state.rules.editorTheme = {
      theme: rulesTheme,
      fontSize: rulesFontSize,
      lineNumbers: showRulesLineNumbers
    };
    var networkOptions = state.networkOptions;
    var hasUnselected = modal.hasUnselected();
    if (modal.hasSelected()) {
      networkOptions.forEach(function (option) {
        option.disabled = false;
        if (option.id === 'removeUnselected') {
          option.disabled = !hasUnselected;
        }
      });
      REMOVE_OPTIONS.forEach(function (option) {
        option.disabled = false;
        if (option.id === 'removeUnselected') {
          option.disabled = !hasUnselected;
        }
      });
    } else {
      networkOptions.forEach(function (option) {
        if (OPTIONS_WITH_SELECTED.indexOf(option.id) !== -1) {
          option.disabled = true;
        } else if (option.id === 'removeUnselected') {
          option.disabled = !hasUnselected;
        }
      });
      networkOptions[0].disabled = !hasUnselected;
      REMOVE_OPTIONS.forEach(function (option) {
        if (OPTIONS_WITH_SELECTED.indexOf(option.id) !== -1) {
          option.disabled = true;
        } else if (option.id === 'removeUnselected') {
          option.disabled = !hasUnselected;
        }
      });
    }
    var mustHideLeftMenu = hideLeftMenu && !state.forceShowLeftMenu;
    var pluginsOnlyMode = pluginsMode && rulesMode;
    var showLeftMenu = (networkMode  || state.showLeftMenu) && !pluginsOnlyMode;
    var disabledAllPlugins = state.disabledAllPlugins;
    var disabledAllRules = state.disabledAllRules;
    var forceShowLeftMenu, forceHideLeftMenu;
    var pluginsStyle = rulesOnlyMode || pluginsOnlyMode || networkMode ? HIDE_STYLE : null;
    if (showLeftMenu && hideLeftMenu) {
      forceShowLeftMenu = this.forceShowLeftMenu;
      forceHideLeftMenu = this.forceHideLeftMenu;
    }
    LEFT_BAR_MENUS[2].hide = rulesMode;
    LEFT_BAR_MENUS[3].hide = pluginsMode;
    LEFT_BAR_MENUS[4].hide = rulesOnlyMode;

    var caType = state.caType || 'crt';
    var caHash = state.caHash;
    var caUrl = 'cgi-bin/rootca';
    var caShortUrl = 'http://rootca.pro/';

    if (caType !== 'cer') {
      caUrl += '?type=' + caType;
      caShortUrl += caType;
    }
    var hideEditor = this.isHideRules();
    var hideEditorStyle = hideEditor ? HIDE_STYLE : null;
    var hideStyle = hideMenus ? ' hide' : '';
    dataCenter.hideMockMenu = hideEditor;

    return (
      <div
        className={
          'main orient-vertical-box' + (showLeftMenu ? ' w-show-left-menu' : '')
          + (tokenId ? ' w-has-token' : '')
          + (isEditor && !rulesOnlyMode ? ' w-show-editor' : '') + (isRules ? ' w-show-rules' : '')
          + (rulesOnlyMode || rulesMode ? ' w-show-rules-mode' : '')
        }
      >
        <div className={'w-menu w-' + name + '-menu-list' + hideStyle} onContextMenu={this.onTopContextMenu}>
          <a
            onClick={this.toggleLeftMenu}
            draggable="false"
            className="w-show-left-menu-btn"
            onMouseEnter={forceShowLeftMenu}
            onMouseLeave={forceHideLeftMenu}
            style={networkMode || pluginsOnlyMode ? HIDE_STYLE : null}
            title={
              'Dock to ' +
              (showLeftMenu ? 'top' : 'left') +
              ' (Ctrl[Command] + M)'
            }
          >
            <span
              className={
                'glyphicon glyphicon-chevron-' +
                (showLeftMenu ? (mustHideLeftMenu ? 'down' : 'up') : 'left')
              }
            ></span>
          </a>
          <div
            style={{ display: rulesMode ? 'none' : undefined }}
            onMouseEnter={this.showNetworkOptions}
            onMouseLeave={this.hideNetworkOptions}
            className={
              'w-nav-menu w-menu-wrapper' +
              (showNetworkOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              onClick={this.showNetwork}
              onDoubleClick={this.toggleTreeView}
              className={
                'w-network-menu' + (isNetwork ? ' w-menu-selected' : '')
              }
              title={
                'Double-click to open' +
                (isTreeView ? ' List View' : ' Tree View')
              }
              draggable="false"
            >
              <span className={'glyphicon glyphicon-' + networkType}></span>
              Network
            </a>
            <MenuItem
              ref="networkMenuItem"
              options={state.networkOptions}
              className="w-network-menu-item"
              onClickOption={this.handleNetwork}
            />
          </div>
          <div
            style={hideEditorStyle}
            onMouseEnter={this.showRulesOptions}
            onMouseLeave={this.hideRulesOptions}
            className={
              'w-nav-menu w-menu-wrapper' +
              (showRulesOptions ? ' w-menu-wrapper-show' : '') +
              (isRules ? ' w-menu-auto' : '')
            }
          >
            <a
              onClick={this.showRules}
              className={
                'w-rules-menu' + (isRules ? ' w-menu-selected' : '')
              }
              draggable="false"
            >
              <span
                className={
                  'glyphicon glyphicon-list' +
                  (disabledAllRules ? ' w-disabled' : '')
                }
              ></span>
              Rules
            </a>
            <MenuItem
              ref="rulesMenuItem"
              name={isRules ? null : 'Open'}
              options={rulesOptions}
              checkedOptions={uncheckedRules}
              disabled={disabledAllRules}
              className="w-rules-menu-item"
              onClick={this.showRules}
              onClickOption={this.showAndActiveRules}
              onChange={this.selectRulesByOptions}
            />
          </div>
          <div
            style={hideEditorStyle}
            onMouseEnter={this.showValuesOptions}
            onMouseLeave={this.hideValuesOptions}
            className={
              'w-nav-menu w-menu-wrapper' +
              (showValuesOptions ? ' w-menu-wrapper-show' : '') +
              (isValues ? ' w-menu-auto' : '')
            }
          >
            <a
              onClick={this.showValues}
              className={
                'w-values-menu' + (isValues ? ' w-menu-selected' : '')
              }
              draggable="false"
            >
              <span className="glyphicon glyphicon-folder-close"></span>Values
            </a>
            <MenuItem
              ref="valuesMenuItem"
              name={isValues ? null : 'Open'}
              options={state.valuesOptions}
              className="w-values-menu-item"
              onClick={this.showValues}
              onClickOption={this.showAndActiveValues}
            />
          </div>
          <div
            style={pluginsStyle}
            ref="pluginsMenu"
            onMouseEnter={this.showPluginsOptions}
            onMouseLeave={this.hidePluginsOptions}
            className={
              'w-nav-menu w-menu-wrapper' +
              (showPluginsOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              onClick={this.showPlugins}
              className={
                'w-plugins-menu' + (isPlugins ? ' w-menu-selected' : '')
              }
              draggable="false"
            >
              <span
                className={
                  'glyphicon glyphicon-th-large' +
                  (disabledAllPlugins ? ' w-disabled' : '')
                }
              ></span>
              Plugins
            </a>
            <MenuItem
              ref="pluginsMenuItem"
              name={isPlugins ? null : 'Open'}
              options={pluginsOptions}
              checkedOptions={state.disabledPlugins}
              disabled={disabledAllPlugins}
              className="w-plugins-menu-item"
              onClick={this.showPlugins}
              onChange={this.disablePlugin}
              onClickOption={this.showAndActivePlugins}
            />
          </div>
          {!state.ndr && (
            <a
              onClick={this.confirmDisableAllRules}
              className="w-enable-rules-menu"
              title={
                disabledAllRules ? 'Enable all rules' : 'Disable all rules'
              }
              style={{ display: isRules ? '' : 'none' }}
              draggable="false"
            >
              <span
               className="glyphicon glyphicon-stop"
               style={{
                 color: disabledAllRules ? '#ccc' : 'rgb(255, 102, 102)'
               }}
              />
              ON
            </a>
          )}
          {!state.ndp && (
            <a
              onClick={this.confirmDisableAllPlugins}
              className="w-enable-plugin-menu"
              title={
                disabledAllPlugins
                  ? 'Enable all plugins'
                  : 'Disable all plugins'
              }
              style={{ display: isPlugins ? '' : 'none' }}
              draggable="false"
            >
              <span
                className="glyphicon glyphicon-stop"
                style={{
                  color: disabledAllPlugins ? '#ccc' : 'rgb(255, 102, 102)'
                }}
              />
              ON
            </a>
          )}
          <UpdateAllBtn hide={!isPlugins} />
          <a
            onClick={this.installPlugins}
            className={'w-plugins-menu' + (isPlugins ? '' : ' hide')}
            draggable="false"
          >
            <span className="glyphicon glyphicon-download-alt" />
            Install
          </a>
          <RecordBtn
            ref="recordBtn"
            hide={!isNetwork}
            onClick={this.handleAction}
          />
          <a
            onClick={this.importData}
            style={importMenuStyle}
            className="w-import-menu"
            draggable="false"
          >
            <span className="glyphicon glyphicon-import"></span>Import
          </a>
          <a
            onClick={this.exportData}
            className="w-export-menu"
            style={importMenuStyle}
            draggable="false"
          >
            <span className="glyphicon glyphicon-export"></span>Export
          </a>
          <div
            onMouseEnter={this.showRemoveOptions}
            onMouseLeave={this.hideRemoveOptions}
            style={{ display: isNetwork ? '' : 'none' }}
            className={
              'w-menu-wrapper w-remove-menu-list w-menu-auto' +
              (state.showRemoveOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              onClick={this.clear}
              className="w-remove-menu"
              title="Ctrl[Command] + X"
              draggable="false"
            >
              <span className="glyphicon glyphicon-remove"></span>Clear
            </a>
            <MenuItem
              options={REMOVE_OPTIONS}
              className="w-remove-menu-item"
              onClickOption={this.handleNetwork}
            />
          </div>
          <a
            onClick={this.onClickMenu}
            className="w-save-menu"
            style={editMenuStyle}
            draggable="false"
            title="Ctrl[Command] + S"
          >
            <span className="glyphicon glyphicon-save-file"></span>Save
          </a>
          <a
            className="w-create-menu"
            style={editMenuStyle}
            draggable="false"
            onClick={this.handleCreate}
          >
            <span className="glyphicon glyphicon-plus"></span>Create
          </a>
          <a
            onClick={this.onClickMenu}
            className={'w-edit-menu' + (disabledEditBtn ? ' w-disabled' : '')}
            style={editMenuStyle}
            draggable="false"
          >
            <span className="glyphicon glyphicon-transfer"></span>Rename
          </a>
          <div
            onMouseEnter={this.showAbortOptions}
            onMouseLeave={this.hideAbortOptions}
            style={{ display: isNetwork ? '' : 'none' }}
            className={
              'w-menu-wrapper w-abort-menu-list w-menu-auto' +
              (state.showAbortOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              onClick={this.clickReplay}
              className="w-replay-menu"
              draggable="false"
            >
              <span className="glyphicon glyphicon-repeat"></span>Replay
            </a>
            <MenuItem
              options={ABORT_OPTIONS}
              className="w-remove-menu-item"
              onClickOption={this.abort}
            />
          </div>
          <a
            onClick={this.composer}
            className="w-composer-menu"
            style={{ display: isNetwork ? '' : 'none' }}
            draggable="false"
          >
            <span className="glyphicon glyphicon-send"></span>Edit
          </a>
          <a
            onClick={this.onClickMenu}
            className={
              'w-delete-menu' + (disabledDeleteBtn ? ' w-disabled' : '')
            }
            style={editMenuStyle}
            draggable="false"
          >
            <span className="glyphicon glyphicon-trash"></span>Delete
          </a>
          <a
            onClick={this.addWidget}
            className="w-add-widget"
            style={accountMenuStyle}
            draggable="false"
          >
            <span className="glyphicon glyphicon-plus"></span>Widget
          </a>
          <FilterBtn
            onClick={this.showSettings}
            disabledRules={isRules && disabledAllRules}
            backRulesFirst={isRules && state.backRulesFirst}
            isNetwork={isNetwork}
            hide={isPlugins}
          />
         {tokenId ? <ServiceBtn name={name} /> : null}
          <div
            onMouseEnter={this.showWeinreOptions}
            onMouseLeave={this.hideWeinreOptions}
            className={
              'w-menu-wrapper' +
              (showWeinreOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              onClick={this.showWeinreOptionsQuick}
              onDoubleClick={this.showAnonymousWeinre}
              className="w-weinre-menu"
              draggable="false"
            >
              <span className="glyphicon glyphicon-console" />
              <span className="w-weinre-name">Weinre</span>
            </a>
            <MenuItem
              ref="weinreMenuItem"
              name="anonymous"
              options={state.weinreOptions}
              className="w-weinre-menu-item"
              onClick={this.showAnonymousWeinre}
              onClickOption={this.showWeinre}
            />
          </div>
          <a
            onClick={this.showHttpsSettingsDialog}
            className="w-https-menu"
            draggable="false"
            style={{ color: dataCenter.hasInvalidCerts ? 'red' : undefined }}
          >
            <span
              className={
                'glyphicon glyphicon-' +
                (state.interceptHttpsConnects ? 'ok-circle' : 'lock')
              }
            />
            <span className="w-https-name">HTTPS</span>
          </a>
          <div
            onMouseEnter={this.showHelpOptions}
            onMouseLeave={this.hideHelpOptions}
            className={
              'w-menu-wrapper' + (showHelpOptions ? ' w-menu-wrapper-show' : '')
            }
          >
            <a
              className={
                'w-help-menu' + (state.hasNewVersion ? ' w-menu-enable' : '')
              }
              onClick={this.showAboutDialog}
              title={
                state.hasNewVersion
                  ? 'A new version is available, click to see details'
                  : undefined
              }
              href={
                state.hasNewVersion
                  ? undefined
                  : 'https://github.com/avwo/whistle#whistle'
              }
              target={state.hasNewVersion ? undefined : '_blank'}
            >
              {state.hasNewVersion ? <i className="w-new-version-icon" /> : null}
              <span className="glyphicon glyphicon-question-sign" />
              <span className="w-help-name">Help</span>
            </a>
            <MenuItem
              ref="helpMenuItem"
              options={state.helpOptions}
              name={
                <About
                  ref="aboutDialog"
                  onClick={this.hideHelpOptions}
                  onCheckUpdate={this.showHasNewVersion}
                />
              }
              className="w-help-menu-item"
            />
          </div>
          <Online name={name} />
          <div
            onMouseDown={this.preventBlur}
            style={{ display: state.showCreateRules ? 'block' : 'none' }}
            className="shadow w-input-menu-item w-create-rules-input"
          >
            <input
              ref="createRulesInput"
              onKeyDown={this.createRules}
              onBlur={this.hideRulesInput}
              type="text"
              maxLength="64"
              placeholder="Enter name"
            />
            <button
              type="button"
              onClick={this.createRules}
              className="btn btn-primary"
            >
              +Rule
            </button>
            <button
              type="button"
              onClick={this.createRules}
              data-type="top"
              className="btn btn-default"
            >
              +Top
            </button>
            <button
              type="button"
              onClick={this.createRules}
              data-type="group"
              className="btn btn-default"
            >
              +Group
            </button>
          </div>
          <div
            onMouseDown={this.preventBlur}
            style={{ display: state.showCreateValues ? 'block' : 'none' }}
            className="shadow w-input-menu-item w-create-values-input"
          >
            <input
              ref="createValuesInput"
              onKeyDown={this.createValues}
              onBlur={this.hideValuesInput}
              type="text"
              maxLength="64"
              placeholder="Enter name"
            />
            <button
              type="button"
              onClick={this.createValues}
              className="btn btn-primary"
            >
              +Key
            </button>
            <button
              type="button"
              onClick={this.createValues}
              data-type="group"
              className="btn btn-default"
            >
              +Group
            </button>
          </div>
          <div
            onMouseDown={this.preventBlur}
            style={{ display: state.showEditRules ? 'block' : 'none' }}
            className="shadow w-input-menu-item w-edit-rules-input"
          >
            <input
              ref="editRulesInput"
              onKeyDown={this.editRules}
              onBlur={this.hideRenameRuleInput}
              type="text"
              maxLength="64"
            />
            <button
              type="button"
              onClick={this.editRules}
              className="btn btn-primary"
            >
              OK
            </button>
          </div>
          <div
            onMouseDown={this.preventBlur}
            style={{ display: state.showEditValues ? 'block' : 'none' }}
            className="shadow w-input-menu-item w-edit-values-input"
          >
            <input
              ref="editValuesInput"
              onKeyDown={this.editValues}
              onBlur={this.hideRenameValueInput}
              type="text"
              maxLength="64"
            />
            <button
              type="button"
              onClick={this.editValues}
              className="btn btn-primary"
            >
              OK
            </button>
          </div>
        </div>
        <div className="w-container box fill">
          <ContextMenu onClick={this.onClickContextMenu} ref="contextMenu" />
          <ContextMenu onClick={this.onClickTopMenu} ref="topContextMenu" />
          <div
            onContextMenu={this.onContextMenu}
            onDoubleClick={this.onContextMenu}
            className={
              'w-left-menu' + (forceShowLeftMenu ? ' w-hover-left-menu' : '') + hideStyle
            }
            style={networkMode || mustHideLeftMenu ? HIDE_STYLE : null}
            onMouseEnter={forceShowLeftMenu}
            onMouseLeave={forceHideLeftMenu}
          >
            <a
              onClick={this.showNetwork}
              className={
                'w-network-menu' + (isNetwork ? ' w-menu-selected' : '')
              }
              style={{ display: rulesMode ? 'none' : undefined }}
              draggable="false"
            >
              <span className={'glyphicon glyphicon-' + networkType}></span>
              <i className="w-left-menu-name">Network</i>
            </a>
            <a
              onClick={this.showRules}
              className={
                'w-save-menu w-rules-menu' +
                (isRules ? ' w-menu-selected' : '')
              }
              style={hideEditorStyle}
              draggable="false"
            >
              <span
                className={
                  'glyphicon glyphicon-list' +
                  (disabledAllRules ? ' w-disabled' : '')
                }
              ></span>
              <i className="w-left-menu-name">Rules</i>
              <i
                className="w-menu-changed"
                style={{
                  display: state.rules.hasChanged() ? undefined : 'none'
                }}
              >
                *
              </i>
            </a>
            <a
              onClick={this.showValues}
              className={
                'w-save-menu w-values-menu' +
                (isValues ? ' w-menu-selected' : '')
              }
              style={hideEditorStyle}
              draggable="false"
            >
              <span className="glyphicon glyphicon-folder-close"></span>
              <i className="w-left-menu-name">Values</i>
              <i
                className="w-menu-changed"
                style={{
                  display: state.values.hasChanged() ? undefined : 'none'
                }}
              >
                *
              </i>
            </a>
            <a
              onClick={this.showPlugins}
              className={
                'w-plugins-menu' + (isPlugins ? ' w-menu-selected' : '')
              }
              style={pluginsStyle}
              draggable="false"
            >
              <span
                className={
                  'glyphicon glyphicon-th-large' +
                  (disabledAllPlugins ? ' w-disabled' : '')
                }
              ></span>
              <i className="w-left-menu-name">Plugins</i>
            </a>
          </div>
          {state.hasRules ? (
            <List
              ref="rules"
              disabled={disabledAllRules}
              theme={rulesTheme}
              lineWrapping={autoRulesLineWrapping}
              fontSize={rulesFontSize}
              lineNumbers={showRulesLineNumbers}
              onSelect={this.selectRules}
              onUnselect={this.unselectRules}
              onActive={this.activeRules}
              modal={state.rules}
              hide={!isRules}
              name="rules"
            />
          ) : undefined}
          {state.hasValues ? (
            <List
              theme={valuesTheme}
              onDoubleClick={this.showEditValuesByDBClick}
              fontSize={valuesFontSize}
              lineWrapping={autoValuesLineWrapping}
              lineNumbers={showValuesLineNumbers}
              onSelect={this.saveValues}
              onActive={this.activeValues}
              modal={state.values}
              hide={!isValues}
              className="w-values-list"
              foldGutter={state.foldGutter}
            />
          ) : undefined}
          {state.hasNetwork ? (
            <Network
              ref="network"
              hide={!isNetwork}
              modal={modal}
              rulesModal={state.rules}
            />
          ) : undefined}
          {state.hasPlugins ? (
            <Plugins
              {...state}
              onOpen={this.activePluginTab}
              onClose={this.closePluginTab}
              onActive={this.activePluginTab}
              onChange={this.disablePlugin}
              ref="plugins"
              hide={!isPlugins}
            />
          ) : undefined}
        </div>
        <div
          ref="rulesSettingsDialog"
          className="modal fade w-rules-settings-dialog"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-body">
                <button
                  type="button"
                  className="close"
                  data-dismiss="modal"
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
                <EditorSettings
                  name="rules"
                  theme={rulesTheme}
                  fontSize={rulesFontSize}
                  lineNumbers={showRulesLineNumbers}
                  lineWrapping={autoRulesLineWrapping}
                  onLineWrappingChange={this.onRulesLineWrappingChange}
                  onThemeChange={this.onRulesThemeChange}
                  onFontSizeChange={this.onRulesFontSizeChange}
                  onLineNumberChange={this.onRulesLineNumberChange}
                />
                {!state.drm && (
                  <p className="w-editor-settings-box">
                    <label className="w-align-items" style={{ color: multiEnv ? '#aaa' : undefined }}>
                      <input
                        type="checkbox"
                        disabled={multiEnv}
                        checked={!multiEnv && state.allowMultipleChoice}
                        onChange={this.allowMultipleChoice}
                      />{' '}
                      Use multiple rules
                    </label>
                  </p>
                )}
                {!state.drb && (
                  <p className="w-editor-settings-box">
                    <label className="w-align-items">
                      <input
                        type="checkbox"
                        checked={state.backRulesFirst}
                        onChange={this.enableBackRulesFirst}
                      />{' '}
                     The later rules first
                    </label>
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  data-dismiss="modal"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.importRulesSettings}
                >
                  Import
                </button>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={this.exportRulesSettings}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          ref="valuesSettingsDialog"
          className="modal fade w-values-settings-dialog"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-body">
                <button
                  type="button"
                  className="close"
                  data-dismiss="modal"
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
                <EditorSettings
                  theme={valuesTheme}
                  fontSize={valuesFontSize}
                  lineNumbers={showValuesLineNumbers}
                  lineWrapping={autoValuesLineWrapping}
                  onLineWrappingChange={this.onValuesLineWrappingChange}
                  onThemeChange={this.onValuesThemeChange}
                  onFontSizeChange={this.onValuesFontSizeChange}
                  onLineNumberChange={this.onValuesLineNumberChange}
                />
                <p className="w-editor-settings-box">
                  <label className="w-align-items">
                    <input
                      type="checkbox"
                      checked={state.foldGutter}
                      onChange={this.showFoldGutter}
                    />{' '}
                    Show fold gutter
                  </label>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  data-dismiss="modal"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.importValuesSettings}
                >
                  Import
                </button>
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={this.exportValuesSettings}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
        {rulesMode ? null : <NetworkSettings ref="networkSettings" />}
        <HttpsSettings
          ref="httpsSettings"
          caHash={caHash}
          port={state.port}
          caUrlList={state.caUrlList}
          multiEnv={multiEnv}
          interceptHttpsConnects={state.interceptHttpsConnects}
          enableHttp2={state.enableHttp2}
          onEnableHttps={this.interceptHttpsConnects}
          onEnableHttp2={this.enableHttp2}
        />
        <div ref="chooseFileType" className="modal fade w-choose-filte-type">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-body">
                <label className="w-choose-filte-type-label">
                  Save as:
                  <input
                    ref="sessionsName"
                    onKeyDown={this.exportBySave}
                    placeholder="Enter filename (optional)"
                    className="form-control"
                    maxLength="64"
                  />
                  <select
                    ref="fileType"
                    className="form-control"
                    value={state.exportFileType}
                    onChange={this.chooseFileType}
                  >
                    <option value="whistle">*.txt</option>
                    <option value="Fiddler">*.saz</option>
                    <option value="har">*.har</option>
                  </select>
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  data-dismiss="modal"
                >
                  Cancel
                </button>
                <SaveToServiceBtn type="network" onComplete={this.hideChooseFileTypeDialog} data={this.getExportSessions} />
                <button
                  type="button"
                  onKeyDown={this.exportBySave}
                  tabIndex="0"
                  onMouseDown={this.preventBlur}
                  className="btn btn-primary"
                  onClick={this.exportBySave}
                >
                  Export
                </button>
                </div>
            </div>
          </div>
        </div>
        <LargeDialog ref="editorWin" className="w-editor-win" />
        <Dialog ref="setReplayCount" wstyle="w-replay-count-dialog">
          <div className="modal-body">
            <label>
              Times:
              <input
                ref="replayCount"
                placeholder={'<= ' + MAX_REPLAY_COUNT}
                onKeyDown={this.replayRepeat}
                onChange={this.replayCountChange}
                value={state.replayCount}
                className="form-control"
                maxLength="3"
              />
            </label>
            <button
              type="button"
              onKeyDown={this.replayRepeat}
              tabIndex="0"
              onMouseDown={this.preventBlur}
              className="btn btn-primary"
              disabled={!state.replayCount}
              onClick={this.replayRepeat}
            >
              Replay
            </button>
          </div>
        </Dialog>
        <div
          ref="showUpdateTipsDialog"
          className="modal fade w-show-update-tips-dialog"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-body">
                <button
                  type="button"
                  className="close"
                  data-dismiss="modal"
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
                <p className="w-show-update-tips">
                Whistle has critical updates available.
                Update to the latest version immediately.
                </p>
                <p>Current version: {state.version}</p>
                <p>Latest version: {state.latestVersion}</p>
                <p>
                  View change:{' '}
                  <a
                    title="Change log"
                    href="https://github.com/avwo/whistle/blob/master/CHANGELOG.md"
                    target="_blank"
                  >
                    CHANGELOG.md
                  </a>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={this.donotShowAgain}
                  data-dismiss="modal"
                >
                  Don't Show Again
                </button>
                <a
                  type="button"
                  className="btn btn-primary"
                  onClick={this.hideUpdateTipsDialog}
                  href={util.getDocsBaseUrl('faq.html#update')}
                  target="_blank"
                >
                  View Update Guide
                </a>
              </div>
            </div>
          </div>
        </div>
        <Dialog ref="confirmReload" wstyle="w-confirm-reload-dialog">
          <div className="modal-body w-confirm-reload">
            <button type="button" className="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span>
            </button>
            <div className="w-reload-data-tips"></div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-default"
              data-dismiss="modal"
            >
              No
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.reloadData}
              data-dismiss="modal"
            >
              Yes
            </button>
          </div>
        </Dialog>
        <ListDialog
          ref="deleteRulesDialog"
          title="Delete Rules"
          tips="Do you confirm the deletion of all follow rules or group?"
          onConfirm={this.removeRulesBatch}
          name="rules"
          isRules="1"
          list={state.rules.list}
        />
        <ListDialog
          ref="deleteValuesDialog"
          title="Delete Values"
          tips="Do you confirm the deletion of all follow values or group?"
          onConfirm={this.removeValuesBatch}
          name="values"
          list={state.values.list}
        />
        <ListDialog
          ref="selectRulesDialog"
          name="rules"
          modal={state.rules}
          list={state.rules.list}
        />
        <ListDialog
          ref="selectValuesDialog"
          title="Export Values"
          name="values"
          list={state.values.list}
        />
        <iframe name="downloadTargetFrame" style={{ display: 'none' }} />
        <form
          ref="exportSessionsForm"
          action="cgi-bin/sessions/export"
          style={{ display: 'none' }}
          method="post"
          target="downloadTargetFrame"
        >
          <input ref="exportFilename" name="exportFilename" type="hidden" />
          <input ref="exportFileType" name="exportFileType" type="hidden" />
          <input ref="sessions" name="sessions" type="hidden" />
        </form>
        <SyncDialog ref="syncDialog" />
        <JSONDialog ref="jsonDialog" />
        <div id="copyTextBtn" style={{display: 'none'}} />
        <MockDialog ref="mockDialog" />
        <RulesDialog ref="rulesDialog" />
        <form
          ref="downloadForm"
          action="cgi-bin/download"
          style={{ display: 'none' }}
          method="post"
          target="downloadTargetFrame"
        >
          <input ref="dataType" name="type" type="hidden" />
          <input ref="filename" name="filename" type="hidden" />
          <input ref="content" name="content" type="hidden" />
        </form>
        <IframeDialog ref="iframeDialog" />
        <ImportDialog ref="importDialog" />
        <ExportDialog ref="exportDialog" />
        {/* 初始化 EditorDialog 给 Rules 里面的快捷键使用 */}
        <EditorDialog textEditor standalone />
      </div>
    );
  }
});
dataCenter.getInitialData(function (data) {
  ReactDOM.render(<Index modal={data} />, document.getElementById('container'));
});
