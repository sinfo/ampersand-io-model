ampersand-io-model [UNDER DEVELOPMENT]
==================

Based on [ampersand-model](https://github.com/AmpersandJS/ampersand-model) to be used with [socket.io](http://socket.io).
ampersand-io-model is an extension built on [ampersand-state](http://ampersandjs.com/docs/#ampersand-state) to provide methods and properties that you'll often want when modeling data you get from an API, using a realtime based socket app.

For further explanation see the [learn ampersand-state](http://ampersandjs.com/learn/state) guide.

## Installing

```
npm install ampersand-io-model
```

## Observing

Ampersand gets its event system from Backbone using the [backbone-events-standalone](https://www.npmjs.org/package/backbone-events-standalone) module on npm.

For more, [read all about how events work in ampersand](http://ampersandjs.com/learn/events).

## Browser compatibility



## API Reference

The module exports just one item, the ampersand-io-model constructor. It has a method called `extend` that works as follows:

### extend `AmpersandIOModel.extend({ })`

To create a **Model** class of your own, you extend **AmpersandIOModel** and provide instance properties and options for your class. Typically here you will pass any properties (`props`, `session`, and `derived`) of your model class, and any instance methods to be attached to instances of your class.

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
});
```


### constructor/initialize `new ExtendedAmpersandModel([attrs], [options])`

This works exactly like [state](http://ampersandjs.com/docs/#ampersand-state-constructorinitialize) with a minor addition: If you pass `collection` as part of options it'll be stored for reference.

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


### save `model.save([attributes], [options])`

Save a model to your database (or alternative persistence layer) using the `emit` function from your model, your `socket` property and `events` property. Returns your model object if validation is successful and false otherwise. The attributes hash (as in set) should contain the attributes you'd like to change — keys that aren't mentioned won't be altered — but, a *complete representation* of the resource will be sent to the server. As with `set`, you may pass individual keys and values instead of a hash. If the model has a validate method, and validation fails, the model will not be saved. If the model `isNew`, the save will be a "create event", if the model already exists on the server, the save will be an "update event".

Pass `{wait: true}` if you'd like to wait for the server before setting the new attributes on the model.

```javascript
var book = new Backbone.Model({
  title: "The Rough Riders",
  author: "Theodore Roosevelt"
});

book.save();

book.save({author: "Teddy"});
```

**save** accepts a `callback` in the options hash, which will be passed the arguments `(err, model, response)`. If a server-side validation fails, return an `err` message has the frist argument.

### fetch `model.fetch([options])`

Resets the model's state from the server by emitting a `fetch` event and receiving the resulting `response` event. Returns your model. Useful if the model has yet to be populated with data, or you want to ensure you have the latest server state. A `"change"` event will be triggered if the retrieved state from the server differs from the current attributes. Accepts a `callback` in the options hash, which will be passed the arguments `(err, model, response)`.

```javascript
var me = new Person({id: 123});
me.fetch();
```

### destroy `model.destroy([options])`

Destroys the model on the server by emitting an `remove` event. Returns the model, or `false` if the model [isNew](#ampersand-model-isnew). Accepts a `callback` in the options hash, which will be passed the arguments `(err, model, response)`.

Triggers:

* a `"destroy"` event on the model, which will bubble up through any collections which contain it.

Pass `{wait: true}` if you'd like to wait for the server to respond before removing the model from the collection.

```javascript
var task = new Task({id: 123});
task.destroy({
    success: function () {
        alert('Task destroyed!');
    },
    error: function () {
        alert('There was an error destroying the task');
    },
});
```

### emit `model.emit(event, model, [options])`

Used to emit the necessary events to the server. It can be overriden to use any custom behaviour you wish.

### socket `model.socket`

Used to keep the socket connection info. Defaults to `io('http://localhost:3000')` but it can be overriden on extend.

### socket `model.events`

Used to keep the respective events called in each of the use cases. The `response` event is used each time the socket receives some update event to be performed on the model. It can be overriden on extend. Defaults to:

```javascript
events: {
    create: 'model-create',
    update: 'model-update',
    fetch: 'model-fetch',
    remove: 'model-remove',
    response: 'model-response'
},
```

## Demo
```javascript

//socket server init
var io = require('socket.io')();
var IOModel = require('./ampersand-io-model');

io.on('connection', function(socket){
	
	console.log('Test client connected!');

	socket.on('model-create', function(data, cb){
		console.log(data);
		cb();
	});

	socket.on('model-update', function(data, cb){
		console.log(data);
		cb();
	});

	socket.on('model-fetch', function(data, cb){
		console.log(data);
		cb();
	});

	socket.on('model-remove', function(data, cb){
		console.log(data);
		cb();
	});
});
io.listen(3000);

//Model definition
var mymodel =  new (IOModel.extend({props: {
  id: ['string'],
  thread: ['string'],
  source: ['string'],
  member: ['string']
}}))();

mymodel.save({id: 'mymodel'});
mymodel.fetch();
mymodel.destroy();
```

## License

MIT
