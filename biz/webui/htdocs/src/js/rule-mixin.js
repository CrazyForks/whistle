var React = require('react');
var $ = require('jquery');
var Icon = require('./icon');
var win = require('./win');
var util = require('./util');

var MAX_COUNT = 20;
var keyIndex = 0;

module.exports = {
  createAction: function(action) {
    return { type: action, label: action, value: '', index: keyIndex++ };
  },
  getData: function(e) {
    var target = $(e.target).closest('.w-form-value');
    var index = +target.data('index');
    var list = this.state[target.data('name')];
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i].index === index) {
        return { index: i, list: list};
      }
    }
    return  { index: 0, list: list };
  },
  onAdd: function(e) {
    var data = this.getData(e);
    var index = data.index;
    var type = data.list[index].type;
    data.list.splice(index + 1, 0, this.createAction(type));
    this.setState({});
  },
  onRemove: function(e) {
    var self = this;
    var data = self.getData(e);
    var index = data.index;
    var actions = data.list;
    var action = actions[index];
    var remove = function(sure) {
      if (sure) {
        if (actions.length <= 1) {
          actions[0].value = '';
        } else {
          actions.splice(index, 1);
        }
        self.setState({}, self.handleChange);
      }
    };
    if (action.value) {
      win.confirm('Are you sure to delete this item?', remove);
    } else {
      remove(true);
    }
  },
  onSelectChange: function(e) {
    var data = this.getData(e);
    var value = typeof e.value === 'string' ? e.value : e.target.value;
    data.list[data.index].key = value;
    this.setState({}, this.handleChange);
  },
  onValueChange: function(e) {
    var target = e.target;
    var data = this.getData(e);
    var value = target.value;
    data.list[data.index].value = target.getAttribute('data-keep-space') ? value : util.removeSpaces(value);
    this.setState({}, this.handleChange);
  },
  renderButtons: function(action, disabled, len) {
    var isMax = len >= MAX_COUNT;
    var isMin = len <= 1;
    return [
      <button className="btn btn-primary ml-10 h-32" onClick={this.onAdd} disabled={disabled || isMax}>
        <Icon name="plus" />
      </button>,
      <button className="btn btn-default w-delete ml-10 h-32" onClick={this.onRemove} disabled={disabled || (isMin && !action.value)}>
        <Icon name="minus" />
      </button>
    ];
  }
};
