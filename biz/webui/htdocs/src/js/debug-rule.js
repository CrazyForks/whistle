var React = require('react');
var HelpIcon = require('./help-icon');
var removeSpaces = require('./util').removeSpaces;

function forcus(elem) {
  elem.focus();
  elem.select();
}

function filterNum(str) {
  return str.replace(/\D+/g, '');
}

var DebugRule = React.createClass({
  getInitialState: function() {
    return {
      disabledWeinre: true,
      disabledLog: true,
      disabledReqDelay: true,
      disabledResDelay: true,
      disabledReqSpeed: true,
      disabledResSpeed: true,
      abortReq: false,
      abortRes: false,
      disabledCache: false,
      weinreId: '',
      logId: '',
      reqDelay: '',
      resDelay: '',
      reqSpeed: '',
      resSpeed: ''
    };
  },
  handleChange: function() {
    var state = this.state;
    var rules = [];
    if (!state.disabledWeinre) {
      rules.push('weinre://' + state.weinreId);
    }
    if (!state.disabledLog) {
      rules.push('log://' + state.logId);
    }
    if (!state.disabledReqDelay && state.reqDelay) {
      rules.push('reqDelay://' + state.reqDelay);
    }
    if (!state.disabledResDelay && state.resDelay) {
      rules.push('resDelay://' + state.resDelay);
    }
    if (!state.disabledReqSpeed && state.reqSpeed) {
      rules.push('reqSpeed://' + state.reqSpeed);
    }
    if (!state.disabledResSpeed && state.resSpeed) {
      rules.push('resSpeed://' + state.resSpeed);
    }
    if (state.abortReq) {
      rules.push('enable://abortReq');
    }
    if (state.abortRes) {
      rules.push('enable://abortRes');
    }
    if (state.disabledCache) {
      rules.push('disable://cache');
    }
    rules = rules.join(' ');
    if (this._curRules !== rules) {
      this._curRules = rules;
      this.props.onChange(rules);
    }
  },
  onNumChange: function(e, key) {
    this.state[key] = filterNum(e.target.value);
    this.setState({}, this.handleChange);
  },
  onCheckChange: function(e, key, ref) {
    var self = this;
    var disabled = !e.target.checked;
    self.state[key] = disabled;
    self.setState({}, function() {
      if (!disabled) {
        forcus(self.refs[ref]);
      }
      self.handleChange();
    });
  },
  onDisableWeinreChange: function(e) {
    this.onCheckChange(e, 'disabledWeinre', 'weinreId');
  },
  onDisableLogChange: function(e) {
    this.onCheckChange(e, 'disabledLog', 'logId');
  },
  onDisableReqDelayChange: function(e) {
    this.onCheckChange(e, 'disabledReqDelay', 'reqDelay');
  },
  onDisableResDelayChange: function(e) {
    this.onCheckChange(e, 'disabledResDelay', 'resDelay');
  },
  onDisableReqSpeedChange: function(e) {
    this.onCheckChange(e, 'disabledReqSpeed', 'reqSpeed');
  },
  onDisableResSpeedChange: function(e) {
    this.onCheckChange(e, 'disabledResSpeed', 'resSpeed');
  },
  onAbortReqChange: function(e) {
    this.setState({abortReq: e.target.checked}, this.handleChange);
  },
  onAbortResChange: function(e) {
    this.setState({abortRes: e.target.checked}, this.handleChange);
  },
  onDisableCache: function(e) {
    this.setState({disabledCache: e.target.checked}, this.handleChange);
  },
  onWeinreIdChange: function(e) {
    this.setState({ weinreId: removeSpaces(e.target.value) }, this.handleChange);
  },
  onLogIdChange: function(e) {
    this.setState({ logId: removeSpaces(e.target.value) }, this.handleChange);
  },
  onReqDelayChange: function(e) {
    this.onNumChange(e, 'reqDelay');
  },
  onResDelayChange: function(e) {
    this.onNumChange(e, 'resDelay');
  },
  onReqSpeedChange: function(e) {
    this.onNumChange(e, 'reqSpeed');
  },
  onResSpeedChange: function(e) {
    this.onNumChange(e, 'resSpeed');
  },
  render: function() {
    var hide = this.props.hide;
    var state = this.state;
    var disabledWeinre = state.disabledWeinre;
    var disabledLog = state.disabledLog;
    var disabledReqDelay = state.disabledReqDelay;
    var disabledResDelay = state.disabledResDelay;
    var disabledReqSpeed = state.disabledReqSpeed;
    var disabledResSpeed = state.disabledResSpeed;

    return (
      <div className={'w-rules-form' + (hide ? ' w-hide' : '')}>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-75">
              <input type="checkbox" className="mr-10" checked={!disabledWeinre} onChange={this.onDisableWeinreChange} />
              Weinre
            </label>
            <input ref="weinreId" disabled={disabledWeinre} value={state.weinreId} type="text"
              className="form-control w-weinre-id" maxLength="32" placeholder="Enter weinre id (optional)" onChange={this.onWeinreIdChange} />
            <HelpIcon title="View the DOM structure of web pages" docsUrl="rules/weinre.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-75">
              <input type="checkbox" className="mr-10" checked={!disabledLog} onChange={this.onDisableLogChange} />
              Log
            </label>
            <input ref="logId" disabled={disabledLog} value={state.logId} type="text"
              className="form-control w-log-id" maxLength="32" placeholder="Enter log id (optional)" onChange={this.onLogIdChange} />
            <HelpIcon title="View the console output of web pages" docsUrl="rules/log.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledReqDelay} onChange={this.onDisableReqDelayChange} />
              Delay Request
            </label>
            <input ref="reqDelay" disabled={disabledReqDelay} value={state.reqDelay} type="text"
              className="form-control w-200" maxLength="7" placeholder="Enter request delay (ms)" onChange={this.onReqDelayChange} />
            <span className="ml-5">ms</span>
            <HelpIcon docsUrl="rules/reqDelay.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledResDelay} onChange={this.onDisableResDelayChange} />
              Delay Response
            </label>
            <input ref="resDelay" disabled={disabledResDelay} value={state.resDelay} type="text"
              className="form-control w-200" maxLength="7" placeholder="Enter response delay (ms)" onChange={this.onResDelayChange} />
            <span className="ml-5">ms</span>
            <HelpIcon docsUrl="rules/resDelay.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledReqSpeed} onChange={this.onDisableReqSpeedChange} />
              Limit Request Speed
            </label>
            <input ref="reqSpeed" disabled={disabledReqSpeed} value={state.reqSpeed} type="text"
              className="form-control w-200" maxLength="7" placeholder="Enter request speed (kb/s)" onChange={this.onReqSpeedChange} />
            <span className="ml-5">kb/s</span>
            <HelpIcon docsUrl="rules/reqSpeed.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label className="w-175">
              <input type="checkbox" className="mr-10" checked={!disabledResSpeed} onChange={this.onDisableResSpeedChange} />
              Limit Response Speed
            </label>
            <input ref="resSpeed" disabled={disabledResSpeed} value={state.resSpeed} type="text"
              className="form-control w-200" maxLength="7" placeholder="Enter response speed (kb/s)" onChange={this.onResSpeedChange} />
            <span className="ml-5">kb/s</span>
            <HelpIcon docsUrl="rules/resSpeed.html" className="ml-10" />
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label>
              <input type="checkbox" className="mr-10" checked={state.abortReq} onChange={this.onAbortReqChange} />
              Abort Request
              <HelpIcon docsUrl="rules/enable.html" className="ml-10" />
            </label>
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label>
              <input type="checkbox" className="mr-10" checked={state.abortRes} onChange={this.onAbortResChange} />
              Abort Response
              <HelpIcon docsUrl="rules/enable.html" className="ml-10" />
            </label>
          </div>
        </div>
        <div className="w-form-item">
          <div className="w-form-value">
            <label>
              <input type="checkbox" className="mr-10" checked={state.disabledCache} onChange={this.onDisableCache} />
              Disable Cache
              <HelpIcon docsUrl="rules/disable.html" className="ml-10" />
            </label>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = DebugRule;
