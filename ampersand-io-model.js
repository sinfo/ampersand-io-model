/*$AMPERSAND_VERSION*/
var _ = require('underscore');
var AmpersandState = require('ampersand-state');
var AmpersandIO = require('ampersand-io');

var events = {
  onFetch: 'fetch-response',
  create: 'model-create',
  update: 'model-update',
  fetch: 'model-fetch',
  remove: 'model-remove'
};

function AmpersandIOModel(attrs, options){
  Base.call(this, attrs, options);
  IOMixin.call(this, options);
}

var IOMixin = AmpersandIO.extend({

  events: events,

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
    options.callback = function cb(err, resp){
      var serverAttrs = model.parse(resp, options);
      if (err){
        return callback(err, model, resp, options);
      }
      if (options.wait){
        serverAttrs = _.extend(attrs || {}, serverAttrs);
      }
      if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
        return callback(true, model, resp, options);
      }
      callback(null, model, resp, options);
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
    options.callback = function (err, resp){
      if (err){
        this.trigger('error', this, resp, options);
      }
    };
    options.respCallback = function cb(data){
      if (data.err){
        return callback(data.err, model, data.resp, options);
      }
      if (!model.set(model.parse(data.resp, options), options)) {
        return callback(true, model, data.resp, options);
      }
      callback(null, model, data.resp, options);
      model.removeListeners([model.events.onFetch]);
    };

    this.addListeners({listener: this.events.onFetch, fn: options.respCallback, active: true});
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
    options.callback = function cb(err, resp){
      if (err){
        return callback(err, model, resp, options);
      }
      if (options.wait || model.isNew()){
        destroy();
      }
      callback(null, model, resp, options);
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
  }

});

// Aux func used to trigger errors if they exist and use the optional
// callback function if given
var callback = function(err, model, resp, options){
  if (options.cb){
    options.cb(err, model, resp);
  }
  if (err){
    model.trigger('error', model, err, options);
  }
};

var Base = AmpersandState.extend();
AmpersandIOModel.prototype = Object.create(Base.prototype);
AmpersandIOModel.extend = Base.extend;

module.exports = AmpersandIOModel;