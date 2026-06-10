var React = require('react');
var Select = require('./custom-select');
var HelpIcon = require('./help-icon');
var util = require('./util');
var ruleMixin = require('./rule-mixin');
var HeaderSelect = require('./header-select');
var Dialog = require('./dialog');
var CloseBtn = require('./close-btn');
var MethodSelect = require('./method-select');

var HTTP_VERSION_OPTIONS = ['HTTP/1.1', 'HTTP/2.0'];
var URL_ACTIONS = ['Set Param', 'Delete Param', 'Modify Path'];
var HEADER_ACTIONS = ['Set Custom Header', 'Set Request CORS', 'Set Request Cookie', 'Delete Request Header'];
var BODY_ACTIONS = util.BODY_ACTIONS;

var RequestRule = React.createClass({
  mixins: [ruleMixin],
  getInitialState: function() {
    return {
      disabledMethod: true,
      disabledVersion: true,
      disabledUrl: true,
      disabledHeader: true,
      disabledBody: true,
      method: util.METHODS[0],
      version: HTTP_VERSION_OPTIONS[0],
      urlActions: [this.createAction(URL_ACTIONS[0])],
      headerActions: [this.createAction(HEADER_ACTIONS[0])],
      bodyActions: [this.createAction(BODY_ACTIONS[0])]
    };
  },
  handleChange: function() {
    var state = this.state;
    var rules = [];
    if (!state.disabledMethod) {
      rules.push('method://' + state.method);
    }
    if (!state.disabledVersion) {
      if (state.version === HTTP_VERSION_OPTIONS[0]) {
        rules.push('disable://http2');
      } else {
        rules.push('enable://http2');
      }
    }
    rules = rules.join(' ');
    if (this._curRules !== rules) {
      this._curRules = rules;
      this.props.onChange(rules);
    }
  },
  shouldComponentUpdate: util.shouldComponentUpdate,
  onMethodChange: function(option) {
    this.setState({ method: option.value }, this.handleChange);
  },
  onVersionChange: function(option) {
    this.setState({ version: option.value }, this.handleChange);
  },
  onActionChange: function(option, item) {
    item.type = option.value;
    this.setState({}, this.handleChange);
  },
  showCorsSettings: function(e) {
    this._curHeaderAction = this.getData(e);
    this.refs.corsSettings.show();
  },
  renderUrlAction: function(action, disabled) {
    if (action.type === URL_ACTIONS[0]) {
      return [
        <input type="text" value={action.key} className="form-control w-190 mr-10" maxLength="256"
          placeholder="Enter param name" disabled={disabled} onChange={this.onSelectChange} />,
        <input type="text" value={action.value} className="form-control" maxLength="1024"
          placeholder="Enter param value" disabled={disabled} onChange={this.onValueChange} />
      ];
    }
    if (action.type === URL_ACTIONS[1]) {
      return <input type="text" value={action.key} className="form-control" maxLength="256"
        placeholder="Enter param name to delete" disabled={disabled} onChange={this.onSelectChange} />;
    }
    return [
      <input type="text" value={action.key} className="form-control mr-10" maxLength="256"
        placeholder="Enter param name" disabled={disabled} onChange={this.onSelectChange} />,
      <input type="text" value={action.value} className="form-control" maxLength="1024"
        placeholder="Enter param value" disabled={disabled} onChange={this.onValueChange} />
    ];
  },
  renderHeaderAction: function(action, disabled) {
    var session = this.props.session;
    var isDel = action.type === HEADER_ACTIONS[3];
    if (action.type === HEADER_ACTIONS[0] || isDel) {
      return [
        <HeaderSelect name="customHeaders" disabled={disabled} value={action.key} placeholder={'Select request header name' + (isDel ? ' to delete' : '')}
          className={isDel ? 'flex-1 mr-0' : 'w-190'} onChange={this.onSelectChange} session={session} keepCase />,
        <input type="text" value={action.value} className={isDel ? 'w-hide' : 'form-control'} maxLength="5120"
          placeholder="Enter request header value" disabled={disabled} data-keep-space="1" onChange={this.onValueChange} />
      ];
    }
    if (action.type === HEADER_ACTIONS[1]) {
      return <input type="text" value={action.value} className="form-control" readOnly onClick={this.showCorsSettings}
        placeholder="Enter request CORS settings" disabled={disabled} onChange={this.onValueChange} />;
    }
    if (action.type === HEADER_ACTIONS[2]) {
      return [
        <input type="text" value={action.key} className="form-control w-190 mr-10" maxLength="256"
          placeholder="Enter cookie name" disabled={disabled} onChange={this.onSelectChange} />,
        <input type="text" value={action.value} className="form-control" maxLength="1024"
          placeholder="Enter cookie value" disabled={disabled} onChange={this.onValueChange} />
      ];
    }
  },
  render: function() {
    var self = this;
    var hide = self.props.hide;
    var state = self.state;
    var version = state.version;
    var disabledMethod = state.disabledMethod;
    var disabledVersion = state.disabledVersion;
    var disabledUrl = state.disabledUrl;
    var disabledHeader = state.disabledHeader;
    var disabledBody = state.disabledBody;
    var urlActions = state.urlActions;
    var headerActions = state.headerActions;
    var bodyActions = state.bodyActions;
    var urlActionCount = urlActions.length;
    var headerActionCount = headerActions.length;
    var bodyActionCount = bodyActions.length;

    return (
      <div className={'w-rules-form' + (hide ? ' w-hide' : '')}>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" data-name="disabledMethod" className="mr-10" checked={!disabledMethod} onChange={self.onDisableCheckChange} />
              Modify Request Method
            </label>
            <MethodSelect disabled={disabledMethod} value={state.method}  onChange={self.onMethodChange} />
            <HelpIcon docsUrl="rules/method.html" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" data-name="disabledVersion" checked={!disabledVersion} onChange={self.onDisableCheckChange} />
              Modify HTTP Version
            </label>
            <Select disabled={disabledVersion} className="mx-10 w-300" options={HTTP_VERSION_OPTIONS} value={version} onChange={self.onVersionChange} />
            <HelpIcon docsUrl={'rules/' + (version === HTTP_VERSION_OPTIONS[0] ? 'disable' : 'enable') + '.html'} />
          </div>
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" data-name="disabledUrl" checked={!disabledUrl} onChange={self.onDisableCheckChange} />
            Modify Request URL
            <HelpIcon className="ml-10" docsUrl="rules/urlParams.html" />
          </label>
          {
            urlActions.map(function(action) {
              return (
                <div data-name="urlActions" className="w-form-value" data-index={action.index} key={action.index}>
                  <Select className=" w-175" disabled={disabledUrl} value={action.type} data={action} options={URL_ACTIONS}
                    onChange={self.onActionChange} key={action.index} />
                  {self.renderUrlAction(action, disabledUrl)}
                  {self.renderButtons(action, disabledUrl, urlActionCount)}
                </div>
              );
            })
          }
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" data-name="disabledHeader" checked={!disabledHeader} onChange={self.onDisableCheckChange} />
            Modify Request Headers
            <HelpIcon className="ml-10" docsUrl="rules/reqHeaders.html" />
          </label>
            {
              headerActions.map(function(action) {
                return (
                  <div data-name="headerActions" className="w-form-value" data-index={action.index} key={action.index}>
                    <Select className="w-175" disabled={disabledHeader} value={action.type} data={action} options={HEADER_ACTIONS}
                      onChange={self.onActionChange} key={action.index} />
                    {self.renderHeaderAction(action, disabledHeader)}
                    {self.renderButtons(action, disabledHeader, headerActionCount)}
                  </div>
                );
              })
            }
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" data-name="disabledBody" checked={!disabledBody} onChange={self.onDisableCheckChange} />
            Modify Request Body
            <HelpIcon className="ml-10" docsUrl="rules/reqBody.html" />
          </label>
          {
            bodyActions.map(function(action) {
              return (
                <div data-name="bodyActions" className="w-form-value" data-index={action.index} key={action.index}>
                  <Select className="w-175" disabled={disabledBody} value={action.type} data={action} options={BODY_ACTIONS}
                    onChange={self.onActionChange} key={action.index} />
                  <input type="text" value={action.value} className="form-control" maxLength="5120"
                    placeholder={action.placeholder} disabled={disabledBody} onChange={self.onValueChange} />
                  {self.renderButtons(action, disabledBody, bodyActionCount)}
                </div>
              );
            })
          }
        </div>
        <Dialog ref="corsSettings" wstyle="w-cors-settings-dialog">
        <div className="modal-header">
            Request CORS Settings
            <CloseBtn />
          </div>
          <div className="modal-body">
            <div className="w-form-item">
              <label>Origin</label>
              <input type="text" className="form-control w-form-value" placeholder="Enter origin, e.g. * or https://example.com" />
            </div>
            <div className="w-form-item">
              <label>Access-Control-Request-Method</label>
              <input type="text" className="form-control w-form-value" placeholder="Enter request method, e.g. GET or POST" />
            </div>
            <div className="w-form-item">
              <label>Access-Control-Request-Headers</label>
              <input type="text" className="form-control w-form-value" placeholder="Enter request headers, e.g. Content-Type, X-Custom-Header" />
            </div>
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
            >
              Confirm
            </button>
          </div>
        </Dialog>
      </div>
    );
  }
});

module.exports = RequestRule;
