var $ = (window.jQuery = require('jquery'));
var React = require('react');
var ReactDOM = require('react-dom');

var Dialog = React.createClass({
  getInitialState: function () {
    return {};
  },
  componentDidMount: function () {
    var self = this;
    this.container = $(document.createElement('div'));
    var clazz = this.props.fullCustom ? ' w-custom-dialog' : '';
    this.container.addClass(
      'modal fade' + clazz + (this.props.wstyle ? ' ' + this.props.wstyle : '')
    );
    document.body.appendChild(this.container[0]);
    this.componentDidUpdate();
    if (typeof this.props.customRef === 'function') {
      this.props.customRef(this);
    }
    if (typeof this.props.onClose === 'function') {
      this.container.on('hidden.bs.modal', this.props.onClose);
    }
    this.container.on('hide.bs.modal', function() {
      self._isVisible = false;
    });
    this.container.on('show.bs.modal', function() {
      self._isVisible = true;
    });
    if (typeof self.props.onShow === 'function') {
      this.container.on('shown.bs.modal', function() {
        self.props.onShow(self);
      });
    }
  },
  componentDidUpdate: function () {
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      this.getDialogElement(),
      this.container[0]
    );
  },
  getDialogElement: function () {
    var props = this.props;
    var className = props.wclassName;
    var style;
    if (props.width) {
      style = style || {};
      style.width = props.width;
    }
    if (props.fullCustom && props.height) {
      style = style || {};
      style.height = props.height;
    }
    return (
      <div
        style={style}
        className={'modal-dialog' + (className ? ' ' + className : '')}
      >
        <div className="modal-content">{this.props.children}</div>
      </div>
    );
  },
  componentWillUnmount: function () {
    ReactDOM.unmountComponentAtNode(this.container[0]);
    document.body.removeChild(this.container[0]);
  },
  show: function () {
    if (this.container.hasClass('in')) {
      return;
    }
    this._isVisible = true;
    this.container.modal(
      this.props.disableBackdrop
        ? {
          show: true,
          backdrop: false
        }
        : 'show'
    );
  },
  isVisible: function () {
    return this._isVisible;
  },
  hide: function () {
    this.container.modal('hide');
  },
  destroy: function () {
    this.hide();
    this.container && this.componentWillUnmount();
  },
  render: function () {
    return null;
  }
});

module.exports = Dialog;
