var React = require('react');
var UrlInput = require('./url-input');
var HelpIcon = require('./help-icon');
var util = require('./util');
var Select = require('./custom-select');
var MethodSelect = require('./method-select');
var StatusSelect = require('./status-select');

var RES_CORS_OPTIONS = ['*', 'credentials'];
var RES_TYPE_OPTIONS = [
  'text/html;charset=utf-8',
  'text/css;charset=utf-8',
  'text/plain;charset=utf-8',
  'application/javascript;charset=utf-8',
  'application/json;charset=utf-8',
  'application/xml;charset=utf-8',
  'image/png',
  'image/jpeg',
  'image/gif'
].map(function(type) {
  return { value: type, label: type };
});

var NetworkRule = React.createClass({
  getInitialState: function() {
    return {
      disabled: false,
      disabledMethod: true,
      disabledType: true,
      disabledStatusCode: true,
      disabledResCors: true,
      statusCode: '200',
      method: util.METHODS[0],
      url: '',
      type: RES_TYPE_OPTIONS[0].value,
      resCors: RES_CORS_OPTIONS[0]
    };
  },
  setResType: function(session) {
    var type = session && session.res;
    type = type && type.headers;
    if (!type) {
      return;
    }
    type = type['content-type'];
    type = util.isString(type) && util.removeSpaces(type);
    if (type) {
      this.refs.responseType.createOption(type);
    }
  },
  shouldComponentUpdate: util.shouldComponentUpdate,
  componentDidUpdate: function(prevProps) {
    var session = this.props.session;
    if (session !== prevProps.session) {
      this.setResType(session);
    }
  },
  onTypeChange: function(option) {
    this.setState({ type: option.value }, this.handleChange);
  },
  onDisableChange: function(e) {
    this.setState({ disabled: !e.target.checked }, this.handleChange);
  },
  onDisableMethodChange: function(e) {
    this.setState({ disabledMethod: !e.target.checked }, this.handleChange);
  },
  onDisableTypeChange: function(e) {
    this.setState({ disabledType: !e.target.checked }, this.handleChange);
  },
  onDisableStatusCodeChange: function(e) {
    this.setState({ disabledStatusCode: !e.target.checked }, this.handleChange);
  },
  onDisableResCorsChange: function(e) {
    this.setState({ disabledResCors: !e.target.checked }, this.handleChange);
  },
  onResCorsChange: function(option) {
    this.setState({ resCors: option.value }, this.handleChange);
  },
  onStatusCodeChange: function(option) {
    this.setState({ statusCode: option.value }, this.handleChange);
  },
  onMethodChange: function(option) {
    this.setState({ method: option.value }, this.handleChange);
  },
  onChange: function(url) {
    this.setState({ url: url }, this.handleChange);
  },
  handleChange: function() {
    var state = this.state;
    var url = state.disabled ? '' : state.url;
    var resType = state.disabledType ? '' : state.type;
    var method = state.disabledMethod ? '' : state.method;
    var statusCode = state.disabledStatusCode ? '' : state.statusCode;
    var resCors = state.disabledResCors ? '' : state.resCors;
    var rules = [];
    if (url) {
      rules.push(url);
    }
    if (method) {
      rules.push('method://' + method);
    }
    if (statusCode) {
      rules.push((url ? 'replaceStatus://' : 'statusCode://') + statusCode);
    }
    if (resType) {
      rules.push('resType://' + resType);
    }
    if (resCors) {
      rules.push('resCors://' + resCors);
    }
    rules = rules.join(' ');
    if (this._curRules !== rules) {
      this._curRules = rules;
      this.props.onChange(rules);
    }
  },
  getDocsUrl: function() {
    return 'rules/' + this.refs.url.getProtocol() + '.html';
  },
  render: function() {
    var props = this.props;
    var state = this.state;
    var hide = props.hide;
    var disabled = state.disabled;
    var disabledType = state.disabledType;
    var disabledMethod = state.disabledMethod;
    var disabledStatusCode = state.disabledStatusCode;
    var disabledResCors = state.disabledResCors;
    var url = disabled ? '' : state.url;

    return (
      <div className={'w-rules-form' + (hide ? ' w-hide' : '')}>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" checked={!disabled} onChange={this.onDisableChange} />
            Mapping File/URL/(Value)
            <HelpIcon className="ml-10" docsUrl={this.getDocsUrl} />
          </label>
          <div className="w-form-value">
            <UrlInput ref="url" enableLocalFile enableTplFile onChange={this.onChange} disabled={disabled} session={props.session} />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledMethod} onChange={this.onDisableMethodChange} />
              Modify Request Method
            </label>
            <MethodSelect disabled={disabledMethod} value={state.method}  onChange={this.onMethodChange} />
            <HelpIcon docsUrl="rules/method.html" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledStatusCode} onChange={this.onDisableStatusCodeChange} />
              Set Status Code
            </label>
            <StatusSelect ref="statusCode" disabled={disabledStatusCode} value={state.statusCode} className="ml-10 w-300" onChange={this.onStatusCodeChange} />
            <HelpIcon docsUrl={'rules/' + (url ? 'replaceStatus' : 'statusCode') + '.html'} />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledType} onChange={this.onDisableTypeChange} />
              Set Response Type
            </label>
            <Select ref="responseType" disabled={disabledType} value={state.type} className="ml-10 w-300" onChange={this.onTypeChange} toLowerCase
              name="responseType" options={RES_TYPE_OPTIONS} placeholder="Enter new response type, e.g. image/png or text/yaml;charset=utf-8"
            />
            <HelpIcon docsUrl="rules/resType.html" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledResCors} onChange={this.onDisableResCorsChange} />
              Set Response CORS
            </label>
            <Select disabled={disabledResCors} value={state.resCors} className="ml-10 w-300" onChange={this.onResCorsChange} options={RES_CORS_OPTIONS} />
            <HelpIcon docsUrl="rules/resCors.html" />
          </div>
        </div>
      </div>
    );
  }
});

module.exports = NetworkRule;
