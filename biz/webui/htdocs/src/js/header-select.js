var React = require('react');
var Select = require('./custom-select');

var HeaderSelect = React.createClass({
  getInitialState: function() {
    return { options: [] };
  },
  updateOptions: function() {
    var props = this.props;
    var session = props.session;
    var options = [];
    var hasChanged;
    if (session) {
      var headers = session.req.headers;
      if (this._reqHeaders !== headers) {
        this._reqHeaders = headers;
        hasChanged = true;
        Object.keys(headers).forEach(function(name) {
          options.push(name);
        });
      }
      headers = session.res.headers;
      if (this._resHeaders !== headers) {
        this._resHeaders = headers;
        hasChanged = true;
        headers && Object.keys(headers).forEach(function(name) {
          options.push(name);
        });
      }
    }
    if (hasChanged) {
      this.setState({ options: options });
    }
  },
  render: function() {
    var props = this.props;
    var keepCase = props.keepCase;

    return (
      <Select name={props.name} isHeader disabled={props.disabled} options={this.state.options} toLowerCase={!keepCase}
        onChange={props.onChange} value={props.value} className={props.className} onClick={this.updateOptions}
        selectPlaceholder={props.placeholder} placeholder={'Enter new header name' + (keepCase ? '' : ' (case-insensitive)')}
        data={props.data} />
    );
  }
});

module.exports = HeaderSelect;
