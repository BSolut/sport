CTRL.Background = function()
{
	this.manifest = chrome.runtime.getManifest();
	this.cmdHandler = [];
	CTRL.settings = new CTRL.Settings(new CTRL.ChromeSettingsStorage());
}

CTRL.Background.start = function() {
	CTRL.bg = new CTRL.Background();
	CTRL.bg.init();
}

CTRL.Background.prototype = {
	__proto__: CTRL.Object,

	init: function() {
		this.chromeAppIface = new CTRL.ChromeAppInterface();
		CTRL.settings.addChangeListener(this.onSettingChanged, this)
		CTRL.settings.load().then(this.run.bind(this))
	},


	registerHandler: function(extensions, handler) {
		this.cmdHandler.push(handler);
	},

	loadHandler: function() {
		var extensions = self.runtime.extensions("@CTRL.CommandHandler"),
			ext, i = 0,
			promies = [];
		while(ext = extensions[i++]) 
			promies.push( ext.instancePromise().then(this.registerHandler.bind(this, ext)) );
		return Promise.all(promies);
	},

	run: function() {
		this.loadHandler().then(this.startServer.bind(this));
	},

	onSettingChanged: function(ev) {
		var cData = ev.data;
		if(cData.name !== 'srvPort' && cData.name !== 'srvDisabled')
			return;		
		if(cData.name === 'srvPort') {
			if(cData.value != this.httpSrv.port) {
				console.log('#Change port')
				this.httpSrv.disconnect();
				this.httpSrv.listen( cData.value );
			}
		} else
		if(cData.name === 'srvDisabled') {
			if(!cData.value && !this.httpSrv)
				this.startServer()
			else
			if(cData.value && this.httpSrv) 
				this.stopServer();
		}
	},

	stopServer: function() {
		console.log('Stop listen');
		this.httpSrv.close();
		delete this.httpSrv;
		delete this.wsSrv;
	},

	startServer: function() {
		var srvDisabled = CTRL.settings.get('srvDisabled', false);
		if(srvDisabled)
			return;
		
		this.httpSrv = new http.Server();
		this.wsSrv = new http.WebSocketServer(this.httpSrv);
		var that = this;
		this.httpSrv.addEventListener('request', function(req) {
			return that.onHttpRequest(req);
		})
		this.wsSrv.addEventListener('request', function(req) {
			return that.onWsRequest(req);
		})
		var port = CTRL.settings.get('srvPort', 8889);
		this.httpSrv.listen( port );
		console.log('listen to',port);
	},


	//Ws Events
	onHttpRequest: function(req) {
		if(req.headers.url != '/')
			return false;
	    req.writeHead(200, {
	        //'Content-Type': 'text'
	    });
    	req.end(JSON.stringify({
    		name: this.manifest.name,
    		version: this.manifest.version
    	}));
	    return true;
	},

	onWsRequest: function(req) {
		var handler, i = 0;
		while(handler = this.cmdHandler[i++])
			if(handler.handleSocket(req))
				return true;
		return false;
	}

}

CTRL.BackgroundApplication = function(){}
CTRL.BackgroundApplication.prototype = {
	run: function() {
		CTRL.Background.start();
	}
}