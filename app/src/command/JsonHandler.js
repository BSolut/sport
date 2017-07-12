CTRL.JsonHandler = function() {
	this.openSockets = [];
	this.init()
}

CTRL.JsonHandler.prototype = {
	__proto__: CTRL.Object,

	init: function() {
		var that = this;
		CTRL.Serial.addEventListener('receive', function(ev) {
			var receiveInfo = ev.data,
				socket, i = 0,
				dataStr;
			while(socket = that.openSockets[i++]){
				if(socket.openFd.indexOf(receiveInfo.connectionId) !== -1) {
					if(dataStr === undefined) {
						//Any better idee to make sure JSON.stringify makes realy an array not an object with 0,1,2..
						var dArr = [],
							byteArray = new Uint8Array(receiveInfo.data);
						for(var i=0,l=byteArray.length;i<l;i++)
							dArr[i] = byteArray[i];

						dataStr = JSON.stringify([0,CMD.ONRECEIVE,{
							connectionId: receiveInfo.connectionId,
							data: dArr
						}])
					}
					socket.send(dataStr);
				}
			}
		})
	  	CTRL.Serial.addEventListener('receiveError', function(ev){
	  		var errorInfo = ev.data;
	  		console.log(errorInfo);
	  	});		
	},

	//Interface
	handleSocket: function(req) {
		if(req.headers.url !== '/json')
			return false;
		var that = this,
			socket = req.accept();
		socket.addEventListener('close', function() {
			//todo
			//close all open connections ??

			//remove from list
			var idx = that.openSockets.indexOf(socket);
			if(idx === -1)
				return;
			that.openSockets.splice(idx, 1);
		})

		socket.addEventListener('message', function(ev) {
			that.execute(ev.data, socket);
		})

		this.openSockets.push( socket );
		return true;
	},


	//Command execution
	execute: function(data, socket) {
		console.log("->execute", data, socket);
	}
}



/*
var CMD = {
	HELLO: 0, //Params [<ClientVersion>]
	LIST_DEVICES: 1,
	CONNECT: 2,
	WRITE: 3,
	DISCONNECT: 4,
	ONRECEIVE: 5,
	ONRECEIVE_ERROR: 6
}

const
	CMDName = {
		0: 'Hello',
		1: 'ListDevices',
		2: 'Connect',
		3: 'Write',
		4: 'Disconnect'
	}


/* Interprets an ArrayBuffer as UTF-8 encoded string data. * /
var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var encodedString = String.fromCharCode.apply(null, bufView);
  //return decodeURIComponent(escape(encodedString));
  return encodedString;
};

/* Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. * /
var str2ab = function(str) {
  	var encodedString = unescape(encodeURIComponent(str)),
  		bytes = new Uint8Array(encodedString.length);
  	for(var i=0,l=encodedString.length;i<l;++i)
    	bytes[i] = encodedString.charCodeAt(i);
  	return bytes;
};



function JsonHandler(app) {
	this.openSockets = [];
	this.app = app;
	this.init();
}
var dp = JsonHandler.prototype;

dp.init = function() {
	//TODO make list fd = [socket, socket...]
	var that = this;
	ExtSerial.addEventListener('receive', function(ev) {
		var receiveInfo = ev.data,
			socket, i = 0,
			dataStr;
		while(socket = that.openSockets[i++]){
			if(socket.openFd.indexOf(receiveInfo.connectionId) !== -1) {
				if(dataStr === undefined) {
					//Any better idee to make sure JSON.stringify makes realy an array not an object with 0,1,2..
					var dArr = [],
						byteArray = new Uint8Array(receiveInfo.data);
					for(var i=0,l=byteArray.length;i<l;i++)
						dArr[i] = byteArray[i];

					dataStr = JSON.stringify([0,CMD.ONRECEIVE,{
						connectionId: receiveInfo.connectionId,
						data: dArr
					}])
				}
				socket.send(dataStr);
			}
		}
	})
  	ExtSerial.addEventListener('receiveError', function(ev){
  		var errorInfo = ev.data;
  		console.log(errorInfo);
  	});
}

dp.socketAccepted = function(socket) {
	var that = this;

	socket.openFd = [];
	this.openSockets.push(socket);

	socket.addEventListener('close', function() {
		var idx = that.openSockets.indexOf(socket);
		if(idx !== -1) {
			//TODO !! Close also all serial connections ??
			delete socket.openFd;
			that.openSockets.splice(idx, 1);
		}
	})

	socket.addEventListener('message', function(ev) {
		that.execute(ev.data, socket);
	})
}

dp.execute = function(req, socket) {
	try {
		if(typeof req === 'string')
			req = JSON.parse(req);
		if(!req || !Array.isArray(req))
			return false;
	} catch(e) {
		return false;
	}

	var that = this,
		qId = req.shift(),
		cmd = req.shift(),
		fn = this['execute'+ CMDName[cmd] ];

	Guaranty()
	.then(function() {
		if(!fn)
			throw new Error('Command not found "'+cmd+'"');
		req.push(socket);
		return fn.apply(that, req);
	})
	.then(function(ret) {
		socket.send( JSON.stringify([qId, cmd, null, ret]) );
	}, function(e) {
		socket.send( JSON.stringify([qId, cmd, {message: e.message}]) );
	})

	return true;
}

dp.executeHello = function(inparams) {
	return Guaranty()
	.then(function() {
		return {
			ver: 1
		}
	})
}

dp.executeListDevices = function() {
	return Guaranty()
	.then(function(val, resolve, reject) {
		ExtSerial.getDevices(resolve)
		/*
		displayName: "USB2.0-Serial"
		path: "/dev/ttyUSB0"
		productId: 29987
		vendorId:6790
		* /
	})
}

dp.executeConnect = function(path, params, socket) {
	console.log('#connect', path, params);

	return Guaranty()
	.then(function(val, resolve, reject) {
		ExtSerial.connect(path, params, function(connectionInfo) {
			if(!connectionInfo)
				return reject(new Error('Connection failed'));
			/*
			bitrate:9600
			bufferSize:4096
			connectionId:2
			ctsFlowControl:false
			dataBits:"eight"
			name:""
			parityBit:"no"
			paused:false
			persistent:false
			receiveTimeout:0
			sendTimeout:0
			stopBits: "one"
			* /
			socket.openFd.push( connectionInfo.connectionId );
			resolve(connectionInfo);
		})
	})
}

dp.executeDisconnect = function(connectionId, socket) {
	return Guaranty()
	.then(function(val, resolve, reject){
		ExtSerial.disconnect(connectionId, resolve);
	})
}

dp.executeWrite = function(connectionId, data, socket) {
	console.log('#write', data);

	return Guaranty()
	.then(function(val, resolve, reject){
		ExtSerial.send(connectionId, data, function(sendInfo){
			resolve(sendInfo);
			console.log('->send returns', arguments);
		})
	})
}
*/