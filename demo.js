var io = require('socket.io')();
var State = require('ampersand-state');
var IOModel = require('./ampersand-io-model');
var client  = require('socket.io-client');

var bar = io.of('/bar');

var foo = io.of('/foo');

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

bar.on('connection', function(socket){

	console.log('Test bar client connected!');

	socket.on('model-fetch', function(data, cb){
		console.log('about to emit bar');
		socket.emit('fetch-response', {test: 'test'}, function(){console.log('done bar');});
		console.log(data);
		cb();
	});

});

foo.on('connection', function(socket){

	console.log('Test foo client connected!');

	socket.on('model-fetch', function(data, cb){
		console.log('about to emit foo');
		socket.emit('fetch-response', {data: {id: 'fooModel', thread: 'test', source: 'test2', member: 'mymember'}}, function(){console.log('done foo');});
		console.log(data);
		cb();
	});

});

var mymodelFoo =  new (IOModel.extend({
	props: {
	  id: ['string'],
	  thread: ['string'],
	  source: ['string'],
	  member: ['string']
	}
}))({}, {socket: 'http://localhost:3000/foo'});

var mymodelBar =  new (IOModel.extend({
	props: {
	  id: ['string'],
	  thread: ['string'],
	  source: ['string'],
	  member: ['string']
	}
}))({}, {socket: 'http://localhost:3000/bar'});

mymodelBar.save({id: 'barModel'});
mymodelBar.fetch({callback: function(){
	console.log(mymodelBar.thread, mymodelBar.source);
}});
mymodelBar.destroy();

mymodelFoo.save({id: 'fooModel'});
mymodelFoo.fetch({callback: function(){
	console.log(mymodelFoo.thread, mymodelFoo.source);
}});
mymodelFoo.destroy();

/*var barClient = client('http://localhost:3000/bar');
var fooClient = client('http://localhost:3000/foo');

barClient.emit('model-fetch', {test: 1}, function(){console.log('stuff');});

fooClient.emit('model-fetch', {test: 2}, function(){console.log('stuffCenas');});*/
