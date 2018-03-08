var express = require('express');
var path = require('path');
var amqp = require('amqplib/callback_api');

var router = express.Router();

global.msg = undefined;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

amqp.connect('amqp://localhost', function(err, conn) {
	conn.createChannel(function(err, ch){
		ch.assertExchange('hw3', 'direct', {durable: false});

		console.log("new direct exchange hw3");
	});

	setTimeout(function() { conn.close()}, 500);
});

router.post('/listen', function(req, res) {
	console.log("/listen");

	amqp.connect('amqp://localhost', function(err, conn) {
		conn.createChannel(function(err, ch){
			ch.assertQueue('', {exclusive: true}, function(err, q) {
				console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);

				var keys = req.body.keys;
				for(var i = 0; i < keys.length; i++){
					ch.bindQueue(q.queue, 'hw3', keys[i]);
				}
				console.log("binded to queues");

				ch.consume(q.queue, function(msg) {
					var ret = msg.content.toString();
					console.log("received: " + ret);
					
					
					console.log("message returned: " + ret);
					res.send({msg: ret});
					setTimeout(function() { conn.close()}, 500);
					// ch.ack(msg);
					// console.log("acknowledged");

				});
			});
		});
		// setTimeout(function() { conn.close()}, 500);
	});
	// console.log("msg: " + msg);
	// res.send({msg: msg});
});

router.post('/speak', function(req, res) {
	console.log(req.body.msg + " " + req.body.key);

	amqp.connect('amqp://localhost', function(err, conn) {
		conn.createChannel(function(err, ch){
			console.log("trying to publish msg");
			ch.publish('hw3', req.body.key, new Buffer(req.body.msg));
			console.log("published");
		});

		setTimeout(function() { conn.close()}, 500);
	});

	res.send({status: 'OK'});
});


module.exports = router;