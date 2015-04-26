[![Build Status](https://travis-ci.org/sinfo/ampersand-io-model.svg?branch=master)](https://travis-ci.org/sinfo/ampersand-io-model)
[![Dependency Status](https://david-dm.org/sinfo/ampersand-io-model.svg)](https://david-dm.org/sinfo/ampersand-io-model)
[![devDependency Status](https://david-dm.org/sinfo/ampersand-io-model/dev-status.svg)](https://david-dm.org/sinfo/ampersand-io-model#info=devDependencies)

ampersand-io-model
==================

Based on [ampersand-model](https://github.com/AmpersandJS/ampersand-model) to be used with [socket.io](http://socket.io).
ampersand-io-model is an extension built on [ampersand-state](http://ampersandjs.com/docs/#ampersand-state) to provide methods and properties that you'll often want when modeling data you get from an API, using a realtime based websocket app.

For further explanation see the [learn ampersand-state](http://ampersandjs.com/learn/state) guide and the [ampersand-io](https://github.com/sinfo/ampersand-io) documentation.

## Installing

```
npm install ampersand-io-model
```

## API Reference

The module exports just one item, the ampersand-io-model constructor. It has a method called `extend` that works as follows:

### extend `AmpersandIOModel.extend({ })`

To create a **Model** class of your own, you extend **AmpersandIOModel** and provide instance properties and options for your class. Typically here you will pass any properties (`props`, `session`, and `derived`) of your model class, and any instance methods to be attached to instances of your class, including the override of any [ampersand-io](https://github.com/sinfo/ampersand-io) default properties.

**extend** correctly sets up the prototype chain, so that subclasses created with **extend** can be further extended as many times as you like.

As with AmpersandState, definitions like `props`, `session`, `derived` etc will be merged with superclass definitions.

```javascript
var Person = AmpersandIOModel.extend({
  props: {
    firstName: 'string',
    lastName: 'string'
  },
  session: {
    signedIn: ['boolean', true, false],
  },
  derived: {
    fullName: {
      deps: ['firstName', 'lastName'],
      fn: function () {
        return this.firstName + ' ' + this.lastName;
      }
    }
  }
  events = {
    onFetch: 'my-fetch-response',
    create: 'my-model-create',
    update: 'my-model-update',
    fetch: 'my-model-fetch',
    remove: 'my-model-remove'
  }
});
```

**Note:** all the methods you're going to see here use ampersand-io [emit method](https://github.com/sinfo/ampersand-io#emit-ioemitevent-data-options-callback) to persist the state of a model to the server. Usually you won't call this directly, you'd use `save` or `destroy` instead, but it can be overriden for custom behaviour.

### constructor/initialize `new ExtendedAmpersandIOModel([attrs], [options])`

Uses the [ampersand-state](http://ampersandjs.com/docs/#ampersand-state-constructorinitialize) constructor and the [ampsersand-io](https://github.com/sinfo/ampersand-io#constructorinitialize-new-ampersandiosocket-options) constructor to initalize you instance.

The `options` object is accordingly passed to each of the constructors. So if you set any prop like the `socket` prop it will be rightfully set using the `ampersand-io` constructor. 

Also if you pass `collection` as part of options it'll be stored for reference.

As with AmpersandState, if you have defined an **initialize** function for your subclass of State, it will be invoked at creation time.

```javascript
var me = new Person({
    firstName: 'Phil',
    lastName: 'Roberts'
});

me.firstName //=> Phil
```

Available options:

* `[parse]` {Boolean} - whether to call the class's [parse](#ampersand-state-parse) function with the initial attributes. _Defaults to `false`_.
* `[parent]` {AmpersandState} - pass a reference to a model's parent to store on the model.
* `[collection]` {Collection} - pass a reference to the collection the model is in. Defaults to `undefined`.
* `[socket]` {Socket-io client/ string} - pass a reference to the socket-io client instance you're using or a string to be used as a namespace for a new socket.io-client instance.
* `[events]` {[Events object](#events-modelevents)} - pass an `events` object as defined to override the pre-defined events used by the model.

Other options are supported by the [ampsersand-io](https://github.com/sinfo/ampersand-io#constructorinitialize-new-ampersandiosocket-options) constructor, although they don't seem the most suited to this use case, you may use them if you like.

### events `model.events`

Overridable property containing a key-value reference to the events to be used by the socket conection. The model uses the default props:

```javascript
var events = {
  onFetch: 'fetch-response',
  create: 'model-create',
  update: 'model-update',
  fetch: 'model-fetch',
  remove: 'model-remove'
};
```
You may override them on construction or extend the model by passing an `events` property on [extend](#extend-ampersandiomodelextend).

For more info on this property check [ampersand-io events](https://github.com/sinfo/ampersand-io#events-ioevents).

### save `model.save([attributes], [options])`

Save a model to your database (or alternative persistence layer) by delegating to [ampersand-io](https://github.com/sinfo/ampersand-io). Returns `this` model object if validation is successful and false otherwise. The attributes hash (as in [set](http://ampersandjs.com/docs#ampersand-state-set)) should contain the attributes you'd like to change — keys that aren't mentioned won't be altered — but, a *complete representation* of the resource will be sent to the websocket server. As with `set`, you may pass individual keys and values instead of a hash. If the model has a validate method, and validation fails, the model will not be saved. If the model `isNew`, the save will be a "create" `event`.  If the model already exists on the server, the save will be an "update" `event`.

Pass `{wait: true}` if you'd like to wait for the server callback `ACK` before setting the new attributes on the model.

```javascript
var book = new Backbone.Model({
  title: "The Rough Riders",
  author: "Theodore Roosevelt"
});

book.save();
//=> triggers a `create` event via ampersand-io with { "title": "The Rough Riders", "author": "Theodore Roosevelt" }

book.save({author: "Teddy"});
//=> triggers a `update` via ampersand-io with { "title": "The Rough Riders", "author": "Teddy" }
```

**save** accepts a `callback` in the options hash, which will be passed the arguments `(err, model, resp)` If a server-side validation fails, return a JSON object as the first argument on the callback function describing the error.

### fetch `model.fetch([options])`

Resets the model's state from the server by delegating a `fetch` event to ampersand-io. Returns `this` model. Useful if the model has yet to be populated with data, or you want to ensure you have the latest server state.

The `fetch` method is comprised of two parts. A first one where a `fetch` event is emitted (containing a data object with `this` model as a `data` prop and a `options` prop containing the options passed to the model) and a `onFetch` listener is set.

Then we have a second part where the server sends a `onFetch` event to which the model updates his model reference. The `onFetch` response object from the server should contain an `err` prop detailing any error ocurrences in the serverside and/or a `data` prop containing the object to update this model.  

Accepts a `callback` in the options hash, which is passed `(err, model, data)` as arguments.

```javascript
var me = new Person({id: 123});
me.fetch();
```

### destroy `model.destroy([options])`

Destroys the model on the server by delegating a `remove` event to ampersand-io. Returns `this` model, or `false` if the model [isNew](https://github.com/AmpersandJS/ampersand-state#isnew-stateisnew). Accepts a `callback` in the options hash, which is passed `(err, model, resp)` as arguments.

Triggers:

* a `"destroy"` event on the model, which will bubble up through any collections which contain it.

Pass `{wait: true}` if you'd like to wait for the server to response before removing the model from the collection.

```javascript
var task = new Task({id: 123});
task.destroy({
  callback: function (err, model, resp) {
    if(err){
      alert('An error ocurred');
    }
    alert('Task destroyed!');
  }
});
```

## credits

Created by [@JGAntunes](http://github.com/JGAntunes), with the support of [@SINFO](http://github.com/sinfo) and based on a series of Ampersand Modules.

## License

MIT
