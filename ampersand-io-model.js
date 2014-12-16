/*$AMPERSAND_VERSION*/
var State = require('ampersand-state');
var _ = require('underscore');
var io = require('socket.io-client');


var IOModel = State.extend({
  
  socket: io('http://localhost:3000'),

  events: {
    create: 'model-create',
    update: 'model-update',
    fetch: 'model-fetch',
    remove: 'model-remove'
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

    options = _.extend({validate: true}, options);

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !options.wait) {
      if (!this.set(attrs, options)){
        return;
      } 
    } else {
      if (!this._validate(attrs, options)){
        return;
      }
    }

    event = this.isNew() ? 'create' : 'update';

    if (options.parse === void 0){
      options.parse = true;
    }
    var model = this;
    cb = function cb(err, result){
      var serverAttrs = model.parse(result, options);
      if (err){
        return callback(err, result, model, options);
      }
      if (options.wait){
        serverAttrs = _.extend(attrs || {}, serverAttrs);
      }
      if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
        return callback(true, result, model, options);
      }
      callback(null, result, model, options);
    };

    this.socket.emit(this.events[event], attrs, cb);

    return model;
  },

  // Fetch the model from the server. If the server's representation of the
  // model differs from its current attributes, they will be overridden,
  // triggering a `"change"` event.
  fetch: function (options) {
    options = options ? _.clone(options) : {};
    if (options.parse === void 0){
      options.parse = true;
    }
    var cb, model = this;
    cb = function cb(err, result){
      if (err){
        return callback(err, result, model, options);
      }
      if (!model.set(model.parse(result, options), options)) {
        return callback(true, result, model, options);
      }
      callback(null, result, model, options);
    };

    this.socket.emit(this.events.fetch, options.data, cb);

    return model;
  },

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy: function (options) {
    options = options ? _.clone(options) : {};
    var model = this;

    var destroy = function () {
      model.trigger('destroy', model, model.collection, options);
    };

    var cb = function cb(err, result){
      if (err){
        return callback(err, result, model, options);
      }
      if (options.wait || model.isNew()){
        destroy();
      }
      callback(null, result, model, options);
    };

    if (this.isNew()) {
      cb();
      return;
    }

    this.socket.emit(this.events.remove, model, cb);
    if (!options.wait){
      destroy();
    } 
    return model;
}

});

var callback = function(err, result, model, options){
  if (options.callback){
    options.callback(err, model, result);
  }
  if (err){
    model.trigger('error', model, err, options);
  }
};

module.exports = IOModel;