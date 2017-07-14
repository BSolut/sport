CTRL.JsonCommandError = function(msg, code) {
    this.message = msg || '';
    this.code = code;
    Error.captureStackTrace(this);
}
CTRL.JsonCommandError.prototype = {
	__proto__: Error
}


CTRL.JsonHandler = function() {
	this.openSockets = [];
	this.FdToSocket = {};
	this.init()
}

CTRL.JsonHandler.Command = {
	Hello: 0,
	ListDevices: 1,
	Connect: 2,
	Write: 3,
	Disconnect: 4,
	//--Events
	OnReceive: 5,
	OnReceiveError: 6,
	OnDisconnect: 7
}

CTRL.JsonHandler.CommandNames = {
	0: 'Hello',
	1: 'ListDevices',
	2: 'Connect',
	3: 'Write',
	4: 'Disconnect'
}

CTRL.JsonHandler.prototype = {
	__proto__: CTRL.Object,

	init: function() {
		var that = this;

		function sendToSockets(conId, data) {
			var socketList = that.FdToSocket[conId];
			if(!socketList)
				return;
			socketList.forEach(function(socket){
				try {
					socket.send(data);
				}catch(e){}
			})
		}

		CTRL.Serial.addEventListener('receive', function(ev) {
			var dArr = [],
				byteArray = new Uint8Array(ev.data.data);
			for(var i=0,l=byteArray.length;i<l;i++)
				dArr[i] = byteArray[i];

			var dataStr = JSON.stringify([0,CTRL.JsonHandler.Command.OnReceive, {
				connectionId: ev.data.connectionId,
				data: dArr
			}])

			sendToSockets(ev.data.connectionId, dataStr);
		})

		CTRL.Serial.addEventListener('disconnected', function(ev) {
			var conId = ev.data.connectionInfo.connectionId;
			sendToSockets(conId, JSON.stringify([0, CTRL.JsonHandler.Command.OnDisconnect, {
				connectionId: conId,
				reason: ev.data.reason
			}]));
			delete that.FdToSocket[ conId ];
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
		socket.openFd = [];
		socket.addEventListener('close', function() {
			//remove from list
			var idx = that.openSockets.indexOf(socket);
			if(idx === -1)
				return;
			that.openSockets.splice(idx, 1);

			socket.openFd.forEach(function(fd){
				var socketList = that.FdToSocket[fd],
					idx = (socketList||[]).indexOf(socket);
				if(idx !== -1) {
					
					socketList.splice(idx, 1);
				}
			})
			return true;
		})

		socket.addEventListener('message', function(ev) {
			that.execute(ev.data, socket);
		})

		this.openSockets.push( socket );
		return true;
	},


	//Command execution
	execute: function(data, socket) {
		try {
			if(typeof data === 'string')
				data = JSON.parse(data);
			if(!data || !Array.isArray(data))
				return false;
		} catch(e) {
			return false;
		}

		var qId = data.shift(),
			cmdId = data.shift(),
			cmdName = CTRL.JsonHandler.CommandNames[cmdId],
			fn = this['execute'+cmdName];

		if(!fn)
			return console.error('Unknown command ', cmdId), false;

		data.unshift(socket)
		fn.apply(this, data)
		.then(function(ret){
			socket.send( JSON.stringify([qId, cmdId, null, ret]) );
		})
		.catch(function(e){
			socket.send( JSON.stringify([qId, cmdId, {
				message: e.message,
				code: e.code
			}]) );
		})

		return true;
	},

	executeHello: function(socket)
	{
		return new Promise(function(fulfill, reject){
			fulfill({
				ver: 1
			})
		})
	},

	executeListDevices: function(socket)
	{
		return new Promise(function(fulfill, reject){
			CTRL.Serial.getDevices(fulfill);
		})
	},

	executeConnect: function(socket, path, params)
	{
		var that = this;
		return new Promise(function(fulfill, reject){
			CTRL.Serial.connect(path, params, function(connectionInfo){
				if(!connectionInfo)
					return reject(new CTRL.JsonCommandError('Connection failed', 100));
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
				*/
				var conId = connectionInfo.connectionId,
					fdSocketList = that.FdToSocket[conId] || (that.FdToSocket[conId] = []);
				fdSocketList.push( socket );
				socket.openFd.push( connectionInfo.connectionId );
				fulfill(connectionInfo);
			})
		})
	},

	executeWrite: function(socket, connectionId, data) {
		return new Promise(function(fulfill, reject) {

			CTRL.Serial.send(connectionId, data, function(sendInfo) {
				fulfill(sendInfo);
			})

		})
	},

	executeDisconnect: function(socket, connectionId) {
		return new Promise(function(fulfill, reject){
			CTRL.Serial.disconnect(connectionId, fulfill);
		})
	}


}
