var React = require('react');
var util = require('./util');

var PLACEHOLDER = 'Enter JSON, e.g.\n' + JSON.stringify({a:{b:1}}, null, 2);

var JSONEditor = React.createClass({
  onFormat: function() {
    var props = this.props;
    var obj = util.parseRawJson(props.value);
    obj && props.onChange({
      value: JSON.stringify(obj, null, 2),
      target: this.refs.target
    });
  },
  onClear: function() {
    this.props.onChange('');
  },
  render: function() {
    var props = this.props;
    return (
      <div className="w-json-editor">
        <div className="w-mock-action">
          <a onClick={this.onFormat}>Format</a>
          <a onClick={this.onClear}>Clear</a>
        </div>
        <textarea ref="target" className="form-control" value={props.value} maxLength="256000" disabled={props.disabled}
          onChange={props.onValueChange} placeholder={PLACEHOLDER} />
      </div>
    );
  }
});

module.exports = JSONEditor;
