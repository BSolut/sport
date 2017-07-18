(function(master){
	'use strict';
	var global = master.Serial = {};

	const
		EmptyFunction = function(){},
		CMD = {
			HELLO: 0, //Params [<ClientVersion>]
			LIST_DEVICES: 1,
			CONNECT: 2,
			WRITE: 3,
			DISCONNECT: 4,
			ONRECEIVE: 5,
			ONRECEIVE_ERROR: 6,
			ONDISCONNECT: 7
		};


	//===============================
	var EventEmitter = function(){}
	var dp = EventEmitter.prototype;

	dp.addEventListener = function(eventType, listener, thisObject) {
    	if(!listener) console.assert(false);
    	if(!this._listeners)
        	this._listeners = new Map();
    	if(!this._listeners.has(eventType))
        	this._listeners.set(eventType, []);
    	this._listeners.get(eventType).push({ thisObject: thisObject, listener: listener });
	}
	dp.removeEventListener = function(eventType, listener, thisObject){
    	console.assert(listener);

    	if (!this._listeners || !this._listeners.has(eventType))
        	return;
    	var listeners = this._listeners.get(eventType);
    	for (var i = 0; i < listeners.length; ++i) {
        	if (listeners[i].listener === listener && listeners[i].thisObject === thisObject)
            	listeners.splice(i--, 1);
    	}

    	if (!listeners.length)
        	this._listeners.delete(eventType);
	}
	dp.removeAllListeners = function() {
    	delete this._listeners;
	}
	dp.hasEventListeners = function(eventType) {
    	if (!this._listeners || !this._listeners.has(eventType))
        	return false;
    	return true;
	}
	dp.dispatchEvent = function(eventType, eventData) {
    	if (!this._listeners || !this._listeners.has(eventType))
        	return false;

    	var event = new EventEmitter.Event(this, eventType, eventData);
    	var listeners = this._listeners.get(eventType).slice(0);
    	for (var i = 0; i < listeners.length; ++i) {
        	listeners[i].listener.call(listeners[i].thisObject, event);
        	if (event._stoppedPropagation)
            	break;
    	}

    	return event.defaultPrevented;
	}

	EventEmitter.Event = function(target, type, data) {
    	this.target = target;
    	this.type = type;
    	this.data = data;
    	this.defaultPrevented = false;
    	this._stoppedPropagation = false;
	}
	dp = EventEmitter.Event.prototype;
	dp.stopPropagation = function() {
    	this._stoppedPropagation = true;
	}
	dp.preventDefault = function() {
    	this.defaultPrevented = true;
	}
	dp.consume = function(preventDefault) {
    	this.stopPropagation();
    	if (preventDefault)
        	this.preventDefault();
	}


	//===============================

	var SerialIface = global.Interface = function() {
		this.version = 1;
		this.serverVersion = null;
		this.isConnected = false;

		this.seqId = 1;
		this.queuedCmd = {};
		this.openConnections = {};
	}
	var dp = SerialIface.prototype;
	dp.__proto__ = EventEmitter.prototype;

	dp.sendCommand = function(/*cmd, param1, param2...,callback */) {
		var args = new Array();
		for(var i=0,l=arguments.length;i<l;i++)
			args.push(arguments[i]);

		var seqId = this.seqId++;
		this.queuedCmd[seqId] = args.pop();
		args.unshift(seqId);
		this.ws.send( JSON.stringify(args) );
	}

	dp.onReceive = function(data) {
		var seqId = data.shift(),
			cmd = data.shift();

		if(seqId === 0) { //Event
			var evData = data[0]||{};

			var sCon = this.openConnections[evData.connectionId];
			if(!sCon) return;

			if(cmd === CMD.ONRECEIVE) {
				sCon.dispatchEvent('receive', evData.data);
			} else
			if(cmd === CMD.ONDISCONNECT) {
				sCon.dispatchEvent('disconnect', evData.data);
			}
		} else {
			var callback = this.queuedCmd[seqId];
			if(callback) {
				delete this.queuedCmd[seqId];
				callback.apply(window, data);
			}
		}
	}

	dp.connectToServer = function(url, callback) {
        if(typeof url === 'function') {
            callback = url;
            url = undefined;
        }
		callback = callback || EmptyFunction;
        url = url || 'ws://127.0.0.1:8889/json';

		var that = this;
		this.ws = new WebSocket(url);
		this.ws.addEventListener('open', function() {
			that.sendCommand(CMD.HELLO, {ver: that.version}, function(e, data) {
				if(e)
					return callback(e);
				that.isConnected = true;
				that.serverVersion = data.ver;
				callback(undefined, data);
			})
		})
		this.ws.addEventListener('close', function() {
			that.dispatchEvent('close');
		})
		this.ws.addEventListener('error', function(ev) {
			that.dispatchEvent('error', ev);
		})
		this.ws.addEventListener('message', function(ev) {
			that.onReceive(JSON.parse(ev.data));
		})
	}


	dp.getDevices = function(callback) {
		this.sendCommand(CMD.LIST_DEVICES, callback)
	}

	dp.connect = function(path, params, callback) {
		callback = callback || EmptyFunction;
		var that = this;
		this.sendCommand(CMD.CONNECT, path, params, function(e, ret){
			if(e)
				return callback(e);
			var sCon = new SerialConnection(that, ret);
			that.openConnections[ ret.connectionId ] = sCon;
			callback(undefined, sCon);
		})
	}


	//=======================================

	var SerialConnection = function(siface, devInfo) {
		this.siface = siface;
		this.devInfo = devInfo;
	}
	var dp = SerialConnection.prototype;
	dp.__proto__ = EventEmitter.prototype;

	dp.write = function(data, callback) {
        if(typeof data !== 'string')
            data = String.fromCharCode.apply(String, data);
		this.siface.sendCommand(CMD.WRITE, this.devInfo.connectionId, data, callback);
	}

	dp.disconnect = function(callback) {
		this.siface.sendCommand(CMD.DISCONNECT, this.devInfo.connectionId, callback)
		this.connectionId = -1;
	}

})(window)

