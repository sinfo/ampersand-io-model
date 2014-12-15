/*$AMPERSAND_VERSION*/
var State = require('ampersand-state');
var _ = require('underscore');
var io = require('socket.io-client');


var IOModel = State.extend({
  
  socket: io(80),

  events: {
    create: 'model-create',
    update: 'model-update',
    fetch: 'model-fetch'
  },

  save: function (key, val, options) {
    var attrs, event, cb;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    if (key === null || typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !options.wait) {
      if (!this.set(attrs, options)){
        return false;
      } 
    } else {
      if (!this._validate(attrs, options)){
        return false;
      }
    }

    event = this.isNew() ? 'create' : 'update';

    var model = this;
    cb = function cb(err, result){
      if (options.callback){
        options.callback(err, model, result);
      }
      if (err){
        model.trigger('error', model, result, options);
      }
      if (options.wait){
        model.set(attrs, options);
        return result;
      }
    };

    this.socket.emit(this.events[event], attrs, cb);

    if (options.wait){
      return model;
    }
  },

  // Fetch the model from the server. If the server's representation of the
  // model differs from its current attributes, they will be overridden,
  // triggering a `"change"` event.
/*  fetch: function (options) {
    options = options ? _.clone(options) : {};
    if (options.parse === void 0) options.parse = true;
    var model = this;
    var success = options.success;
    options.success = function (resp) {
      if (!model.set(model.parse(resp, options), options)) return false;
      if (success) success(model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  },

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy: function (options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function () {
          model.trigger('destroy', model, model.collection, options);
      };

      options.success = function (resp) {
          if (options.wait || model.isNew()) destroy();
          if (success) success(model, resp, options);
          if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
          options.success();
          return false;
      }
      wrapError(this, options);

      var sync = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return sync;
  },*/

});

module.exports = IOModel;