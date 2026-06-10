var React = require('react');
var $ = require('jquery');
var Icon = require('./icon');
var win = require('./win');
var util = require('./util');

var MAX_COUNT = 20;
var keyIndex = 0;
var removeSpaces = util.removeSpaces;

function getElemValue(elem) {
  return elem.getAttribute('data-keep-space') ? elem.value : removeSpaces(elem.value);
}

function getValue(value, keepSpace) {
  return keepSpace ? value : removeSpaces(value);
}

module.exports = {
  createAction: function(action) {
    return { type: action, label: action, value: '', index: keyIndex++ };
  },
  getData: function(e) {
    var key =  e.target.getAttribute('data-key') || 'key';
    var target = $(e.target).closest('.w-form-value');
    var index = +target.data('index');
    var list = this.state[target.data('name')];
    var result = {index: 0 , list: list, key: key};
    for (var i = 0, len = list.length; i < len; i++) {
      if (list[i].index === index) {
        result.index = i;
        return result;
      }
    }
    return result;
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
      win.confirm('Do you confirm the deletion of this item?', remove);
    } else {
      remove(true);
    }
  },
  onDisableCheckChange: function(e) {
    var name = e.target.getAttribute('data-name');
    this.state[name] = !e.target.checked;
    this.setState({}, this.handleChange);
  },
  onEnableCheckChange: function(e) {
    var name = e.target.getAttribute('data-name');
    this.state[name] = e.target.checked;
    this.setState({}, this.handleChange);
  },
  onKeyChange: function(e) {
    var data = this.getData(e);
    var value = typeof e.value === 'string' ? e.value : getElemValue(e.target);
    data.list[data.index][data.key] = value;
    this.setState({}, this.handleChange);
  },
  onValueChange: function(e) {
    var data = this.getData(e);
    data.list[data.index].value = getElemValue(e.target);
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
  },
  renderKey: function(key, placeholder, disabled, keepSpace) {
    return <input type="text" value={getValue(key, keepSpace)} className="form-control" maxLength="512"
      placeholder={placeholder} disabled={disabled} onChange={this.onKeyChange} />;
  },
  renderKV: function(data, keyPlaceholder, valuePlaceholder, disabled, keepKeySpace, keepValueSpace) {
    return [
      <input type="text" value={getValue(data.key, keepKeySpace)} className="form-control w-190 mr-10" maxLength="512"
        placeholder={keyPlaceholder} disabled={disabled} onChange={this.onKeyChange} data-keep-space={keepKeySpace || undefined} />,
      <input type="text" value={getValue(data.value, keepValueSpace)} className="form-control" maxLength="2560"
        placeholder={valuePlaceholder} disabled={disabled} onChange={this.onValueChange} data-keep-space={keepValueSpace || undefined} />
    ];
  }
};
