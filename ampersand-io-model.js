/*$AMPERSAND_VERSION*/
var State = require('ampersand-state');
var _ = require('underscore');
var io = require('socket.io-client');


var IOModel = State.extend({
  
  socket: io('http://localhost:3000'),

  // The name of the events to be used in each operation
  events: {
    create: 'model-create',
    update: 'model-update',
    fetch: 'model-fetch',
    remove: 'model-remove',
    response: 'model-response'
  },

  save: function (key, val, options) {
    var attrs, event;

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
        return false;
      } 
    } else {
      if (!this._validate(attrs, options)){
        return false;
      }
    }

    // Set the event type
    event = this.isNew() ? 'create' : 'update';

    if (options.parse === void 0){
      options.parse = true;
    }
    var model = this;
    options.cb = options.callback;
    options.callback = function cb(err, result){
      var serverAttrs = model.parse(result, options);
      if (err){
        return callback(err, model, result, options);
      }
      if (options.wait){
        serverAttrs = _.extend(attrs || {}, serverAttrs);
      }
      if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
        return callback(true, model, result, options);
      }
      callback(null, model, result, options);
    };

    this.emit(this.events[event], this, options);

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
    var model = this;
    options.cb = options.callback;
    options.callback = function cb(err, result){
      if (err){
        return callback(err, model, result, options);
      }
      if (!model.set(model.parse(result, options), options)) {
        return callback(true, model, result, options);
      }
      callback(null, model, result, options);
    };

    this.emit(this.events.fetch, this, options);

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

    options.cb = options.callback;
    options.callback = function cb(err, result){
      if (err){
        return callback(err, model, result, options);
      }
      if (options.wait || model.isNew()){
        destroy();
      }
      callback(null, model, result, options);
    };

    if (this.isNew()) {
      options.callback();
      return;
    }

    this.emit(this.events.remove, this, options);
    if (!options.wait){
      destroy();
    } 
    return model;
  },

  // Overridable function responsible for emitting the events
  emit: function (event, model, options){
    this.socket.emit(event, model, options.callback);
  }

});


// Aux func used to trigger errors if they exist and use the optional
// callback function if given
var callback = function(err, model, result, options){
  if (options.cb){
    options.cb(err, model, result);
  }
  if (err){
    model.trigger('error', model, err, options);
  }
};

module.exports = IOModel;