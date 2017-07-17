CTRL.Serial = (function() {
	/* chrome.serial Interface
	Methods:
	getDevices − chrome.serial.getDevices(function callback)
	connect − chrome.serial.connect(string path, ConnectionOptions options, function callback)
	update − chrome.serial.update(integer connectionId, ConnectionOptions options, function callback)
	disconnect − chrome.serial.disconnect(integer connectionId, function callback)
	setPaused − chrome.serial.setPaused(integer connectionId, boolean paused, function callback)
	getInfo − chrome.serial.getInfo(integer connectionId, function callback)
	getConnections − chrome.serial.getConnections(function callback)
	send − chrome.serial.send(integer connectionId, ArrayBuffer data, function callback)
	flush − chrome.serial.flush(integer connectionId, function callback)
	getControlSignals − chrome.serial.getControlSignals(integer connectionId, function callback)
	setControlSignals − chrome.serial.setControlSignals(integer connectionId, object signals, function callback)
	setBreak − chrome.serial.setBreak(integer connectionId, function callback)
	clearBreak − chrome.serial.clearBreak(integer connectionId, function callback)
	Events
	onReceive
	onReceiveError
	*/

	var emitter = new CTRL.Object(),
		currentConnections = {};



	function disconnectByConnectionId(connectionId, reason) {
		Object.keys(currentConnections).forEach(function(path){
			var currCon = currentConnections[path];
			if(currCon.connectionId === connectionId) {
				emitter.dispatchEventToListeners('disconnected', {
					path: path,
					connectionInfo: currCon,
					reason: reason
				})
				delete currentConnections[path];
			}
		})
	}


	//Map Events
	chrome.serial.onReceive.addListener(function(receiveInfo){
		emitter.dispatchEventToListeners('receive', receiveInfo);
	})
	chrome.serial.onReceiveError.addListener(function(receiveError){
		if(receiveError && receiveError.error === 'device_lost') {
			disconnectByConnectionId(receiveError.connectionId);
		}
		emitter.dispatchEventToListeners('receiveError', receiveError);
	})

	var iface = {
		Events: {
			'BeforeConnect': 'beforeConnect',
			'AfterConnect': 'afterConnect',
			'Connected': 'connected',
			'Send': 'send',
			'ReceiveError': 'receiveError',
			'Receive': 'receive',
			'Disconnected': 'disconnected'
		},

		//Event Interface
		addEventListener: emitter.addEventListener.bind(emitter),
    	removeEventListener: emitter.removeEventListener.bind(emitter),
		removeAllListeners: emitter.removeAllListeners.bind(emitter),
		hasEventListeners: emitter.hasEventListeners.bind(emitter),

		//Methods
		//connect − chrome.serial.connect(string path, ConnectionOptions options, function callback)
		connect: function(path, options, callback){
			if(!callback && typeof options === 'function') {
				callback = options;
				options = {}
			};
			options = options || {};
			callback = callback || function(){};
			options.name = path; //Force path as name. getConnections does not have any path information


			var currCon = currentConnections[path];
			if(currCon) {
				return setTimeout(function(){
					callback(currCon);
				},1)
			}

			emitter.dispatchEventToListeners('beforeConnect', {
				path: path,
				options: options
			})

			chrome.serial.connect(path, options, function(connectionInfo){
				var evData = {
						path: path,
						options: options,
						connectionInfo: connectionInfo
					};

				emitter.dispatchEventToListeners('afterConnect', evData);
				if(connectionInfo) {
					emitter.dispatchEventToListeners('connected', evData);
					currentConnections[path] = connectionInfo;
				}
				callback(connectionInfo);
			})
		},
		//disconnect − chrome.serial.disconnect(integer connectionId, function callback)
		disconnect: function(connectionId, callback){
			callback = callback || function(){};
			chrome.serial.disconnect(connectionId, function(result){
				if(result)
					disconnectByConnectionId(connectionId, 'disconnect');
				callback(result);
			});
		},
		//getDevices − chrome.serial.getDevices(function callback)
		getDevices: function(callback){
			callback = callback || {};
			chrome.serial.getDevices(function(result){
				var itm, i = 0;
				while(itm = result[i++]) {
					itm.connectionInfo = currentConnections[itm.path];
				}
				callback(result);
			})
		},
		update: chrome.serial.update,
		setPaused: chrome.serial.setPaused,
		getInfo: chrome.serial.getInfo,
		getConnections: chrome.serial.getConnections,
		//send − chrome.serial.send(integer connectionId, ArrayBuffer data, function callback)
		send: function(connectionId, data, callback) {
			callback = callback || function() {};

			var udata;
			if(typeof data === 'string') {
			  	var encodedString = unescape(encodeURIComponent(data));
			  	udata = new Uint8Array(encodedString.length);
			  	for(var i=0,l=encodedString.length;i<l;++i)
			    	udata[i] = encodedString.charCodeAt(i);
			} else {
				var udata = new Uint8Array(data.length);
				for(var i=0,l=data.length;i<l;i++)
					udata[i] = data[i];
			}
			emitter.dispatchEventToListeners('send', {connectionId: connectionId, data: data});
			chrome.serial.send(connectionId, udata.buffer, function(sendInfo){
				/*{
					bytesSent: The number of bytes sent.
					error: "disconnected", "pending", "timeout", or "system_error"
				}*/
				callback(sendInfo);
			});
		},
		flush: chrome.serial.flush,
		getControlSignals: chrome.serial.getControlSignals,
		setControlSignals: chrome.serial.setControlSignals,
		setBreak: chrome.serial.setBreak,
		clearBreak: chrome.serial.clearBreak,

		//Events
		//onReceive: chrome.serial.onReceive,
		//onReceiveError: chrome.serial.onReceiveError
	}

	/*Object.defineProperty(interface, "onTest", {
	    get: function() {
        	return emitter;
    	},
    	set: function(x) {
        	return emitter.addEventListener('test', x);
    	}
	});*/


	return iface;
})();

