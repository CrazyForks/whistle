var React = require('react');
var Select = require('./custom-select');
var util = require('./util');
var HelpIcon = require('./help-icon');
var ruleMixin = require('./rule-mixin');
var StatusSelect = require('./status-select');

var STATUS_CODE_ACTIONS = [
  { value: 'statusCode://', label: 'Direct Status Code' },
  { value: 'replaceStatus://', label: 'Replace Status Code'}
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
      bodyActions: [this.createAction(BODY_ACTIONS[0])]
    };
  },
  handleChange: function() {
    var rules = [];
    var state = this.state;
    if (!state.disabledStatusCode) {
      rules.push(state.statusCodeAction + state.statusCode);
    }
    rules = rules.join(' ');
    if (this._curRules !== rules) {
      this._curRules = rules;
      this.props.onChange(rules);
    }
  },
  shouldComponentUpdate: util.shouldComponentUpdate,
  onDisableStatusCodeChange: function(e) {
    this.setState({ disabledStatusCode: !e.target.checked }, this.handleChange);
  },
  onDisableHeaderChange: function(e) {
    this.setState({ disabledHeader: !e.target.checked }, this.handleChange);
  },
  onDisableBodyChange: function(e) {
    this.setState({ disabledBody: !e.target.checked }, this.handleChange);
  },
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

    return (
      <div className={'w-rules-form' + (hide ? ' w-hide' : '')}>
        <div className="w-form-item">
          <div className="w-form-value">
            <input type="checkbox" className="mr-10" checked={!disabledStatusCode} onChange={self.onDisableStatusCodeChange} />
            <Select value={statusCodeAction} disabled={disabledStatusCode} className="w-175" options={STATUS_CODE_ACTIONS}
              onChange={self.onStatusCodeActionChange} />
            <StatusSelect value={state.statusCode} disabled={disabledStatusCode} onChange={self.onStatusCodeChange} />
            <HelpIcon docsUrl={'rules/' + (statusCodeAction === STATUS_CODE_ACTIONS[0].value ? 'statusCode' : 'replaceStatus') + '.html'} />
          </div>
        </div>
        <div className="w-form-item">
          <label>
            <input type="checkbox" className="mr-10" checked={!disabledHeader} onChange={self.onDisableHeaderChange} />
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
            <input type="checkbox" className="mr-10" checked={!disabledBody} onChange={self.onDisableBodyChange} />
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
