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

var mymodel =  new (IOModel.extend({props: {
  id: ['string'],
  thread: ['string'],
  source: ['string'],
  member: ['string']
}}))();
mymodel.save({id: 'mymodel'});
mymodel.fetch();
mymodel.destroy();