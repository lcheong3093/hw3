var express = require('express');
var path = require('path');
var amqp = require('amqplib/callback_api');

var router = express.Router();

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
	amqp.connect('amqp://localhost', function(err, conn) {
		conn.createChannel(function(err, ch){
			ch.assertQueue('', {exclusive: true}, function(err, q) {
				console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
				ch.bindQueue(q.queue, 'hw3', req.keys);
		  
				ch.consume(q.queue, function(mes) {
					var ret = mes.content.toString();
					// ch.sendToQueue(q.queue, new Buffer(ret.toString()), {msg: ret});
					res.send(req.body.msg);
				});
			});
		});
		setTimeout(function() { conn.close()}, 500);
	});

});

router.post('/speak', function(req, res) {
	console.log(req.body.msg + " " + req.body.key);

	amqp.connect('amqp://localhost', function(err, conn) {
		conn.createChannel(function(err, ch){
			console.log("trying to publish msg");
			ch.publish('hw3', req.body.key, new Buffer(req.body.msg));
		});

		setTimeout(function() { conn.close()}, 500);
	});
});


module.exports = router;