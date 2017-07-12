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

	run: function() {
		//todo config runtime list ??
		this.cmdHandler = [
			//new CTRL.JsonHandler()
		];
		return this.startServer();
	},

	onSettingChanged: function(cData) {
		if(!(cData.name !== 'srvPort' || cData.name === 'srvDisabled'))
			return;
		//todo check we have something to do
		console.log('check server is right state')
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