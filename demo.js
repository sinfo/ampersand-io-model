var io = require('socket.io')();
var State = require('ampersand-state');
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
		console.log('about to emit');
		socket.emit('fetch-response', {test: 'test'}, function(){console.log('done');});
		console.log(data);
		cb();
	});

	socket.on('model-remove', function(data, cb){
		console.log(data);
		cb();
	});
});
io.listen(3000);

var mymodel =  new (State.extend(new IOModel(), {props: {
  id: ['string'],
  thread: ['string'],
  source: ['string'],
  member: ['string']
}}))();
mymodel.save({id: 'mymodel'});
mymodel.fetch();
mymodel.destroy();
console.log(mymodel.listeners);