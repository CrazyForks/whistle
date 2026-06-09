var React = require('react');
var Select = require('./custom-select');

var HeaderSelect = React.createClass({
  getInitialState: function() {
    return { options: [] };
  },
  updateOptions: function() {
    var props = this.props;
    var session = props.session;
    var options = [
      'host',
      'user-agent',
      'referer',
      'content-type',
      'origin',
      'access-control-request-method',
      'access-control-request-headers',
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-expose-headers',
      'access-control-allow-credentials',
      'access-control-max-age',
      'content-disposition',
      'x-forwarded-for',
      'x-real-ip',
      'location',
      'server'
    ];
    var addOption = function(name) {
      if (options.indexOf(name) === -1) {
        options.push(name);
      }
    };
    var hasChanged;
    if (session) {
      var headers = session.req.headers;
      if (this._reqHeaders !== headers) {
        this._reqHeaders = headers;
        hasChanged = true;
        Object.keys(headers).forEach(addOption);
      }
      headers = session.res.headers;
      if (this._resHeaders !== headers) {
        this._resHeaders = headers;
        hasChanged = true;
        headers && Object.keys(headers).forEach(addOption);
      }
    }
    if (hasChanged || !this.state.options.length) {
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
