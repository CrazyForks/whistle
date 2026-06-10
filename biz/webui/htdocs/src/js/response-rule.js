var React = require('react');
var Select = require('./custom-select');
var util = require('./util');
var HelpIcon = require('./help-icon');
var ruleMixin = require('./rule-mixin');
var StatusSelect = require('./status-select');
var UrlInput = require('./url-input');

var STATUS_CODE_ACTIONS = [
  { value: 'statusCode://', label: 'Direct Status Code' },
  { value: 'replaceStatus://', label: 'Replace Status Code'},
  '301 Permanent Redirect',
  '302 Temporary Redirect',
  '303 See Other',
  '307 Temporary Redirect',
  '308 Permanent Redirect'
];
var HEADER_ACTIONS = ['Set Custom Header', 'Set Response CORS', 'Set Response Cookie', 'Delete Response Header'];
var BODY_ACTIONS = util.BODY_ACTIONS;

var ResponseRule = React.createClass({
  mixins: [ruleMixin],
  getInitialState: function() {
    return {
      disabledStatusCode: true,
      disabledHeader: true,
      disabledBody: true,
      statusCodeAction: STATUS_CODE_ACTIONS[0].value,
      statusCode: '200',
      headerActions: [this.createAction(HEADER_ACTIONS[0])],
      bodyActions: [this.createAction(BODY_ACTIONS[0])],
      redirectUrl: ''
    };
  },
  handleChange: function() {
    var rules = [];
    var state = this.state;
    if (!state.disabledStatusCode) {
      var action = state.statusCodeAction;
      if (action[0] === '3') {
        var redirectUrl = state.redirectUrl;
        if (redirectUrl) {
          action = action.substring(0, 3);
          rules.push('redirect://' + redirectUrl);
          if (action !== '302') {
            rules.push('replaceStatus://' + action);
          }
        }
      } else {
        rules.push(action + state.statusCode);
      }
    }
    rules = rules.join(' ');
    if (this._curRules !== rules) {
      this._curRules = rules;
      this.props.onChange(rules);
    }
  },
  shouldComponentUpdate: util.shouldComponentUpdate,
  onStatusCodeActionChange: function(option) {
    this.setState({ statusCodeAction: option.value }, this.handleChange);
  },
  onStatusCodeChange: function(option) {
    this.setState({ statusCode: option.value }, this.handleChange);
  },
  onActionChange: function(option, item) {
    item.type = option.value;
    this.setState({}, this.handleChange);
  },
  onUrlChange: function(url) {
    this.setState({ redirectUrl: url }, this.handleChange);
  },
  render: function() {
    var self = this;
    var hide = self.props.hide;
    var state = self.state;
    var disabledStatusCode = state.disabledStatusCode;
    var disabledHeader = state.disabledHeader;
    var disabledBody = state.disabledBody;
    var statusCodeAction = state.statusCodeAction;
    var headerActions = state.headerActions;
    var bodyActions = state.bodyActions;
    var headerCount = headerActions.length;
    var bodyCount = bodyActions.length;
    var isRedirect = statusCodeAction[0] === '3';
    var statusDocsUrl = isRedirect ? 'redirect' : (statusCodeAction === STATUS_CODE_ACTIONS[0].value ? 'statusCode' : 'replaceStatus');

    return (
      <div className={'w-rules-form' + (hide ? ' w-hide' : '')}>
        <div className="w-form-item">
          <div className="w-form-value">
            <input type="checkbox" className="mr-10" checked={!disabledStatusCode} data-name="disabledStatusCode" onChange={self.onDisableCheckChange} />
            <Select value={statusCodeAction} disabled={disabledStatusCode} className="w-175" options={STATUS_CODE_ACTIONS}
              onChange={self.onStatusCodeActionChange} />
            <StatusSelect value={state.statusCode} className={isRedirect ? 'w-hide' : null} disabled={disabledStatusCode} onChange={self.onStatusCodeChange} />
            <UrlInput isRedirect className={'mr-10' + (isRedirect ? '' : ' w-hide')} disabled={disabledStatusCode} onChange={this.onUrlChange} />
            <HelpIcon docsUrl={'rules/' + statusDocsUrl + '.html'} />
          </div>
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" checked={!disabledHeader} data-name="disabledHeader" onChange={self.onDisableCheckChange} />
            Modify Response Headers
            <HelpIcon className="ml-10" docsUrl="rules/resHeaders.html" />
          </label>
            {
              headerActions.map(function(action) {
                return (
                  <div data-name="headerActions" className="w-form-value" data-index={action.index} key={action.index}>
                    <Select className=" w-175" disabled={disabledHeader} value={action.type} data={action} options={HEADER_ACTIONS}
                      onChange={self.onActionChange} key={action.index} />
                    <input type="text" value={action.value} className="form-control" maxLength="5120"
                      placeholder={action.placeholder} disabled={disabledHeader} onChange={self.onValueChange} />
                    {self.renderButtons(action, disabledHeader, headerCount)}
                  </div>
                );
              })
            }
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" checked={!disabledBody} data-name="disabledBody" onChange={self.onDisableCheckChange} />
            Modify Response Body
            <HelpIcon className="ml-10" docsUrl="rules/resBody.html" />
          </label>
            {
              bodyActions.map(function(action) {
                return (
                  <div data-name="bodyActions" className="w-form-value" data-index={action.index} key={action.index}>
                    <Select className="w-175" disabled={disabledBody} value={action.type} data={action} options={BODY_ACTIONS}
                      onChange={self.onActionChange} key={action.index} />
                    <input type="text" value={action.value} className="form-control" maxLength="5120"
                      placeholder={action.placeholder} disabled={disabledBody} onChange={self.onValueChange} />
                    {self.renderButtons(action, disabledBody, bodyCount)}
                  </div>
                );
              })
            }
        </div>
      </div>
    );
  }
});

module.exports = ResponseRule;
