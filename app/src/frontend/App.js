CTRL.Frotnend = function() {
	runOnWindowLoad(this._loaded.bind(this));
}

CTRL.Frotnend.prototype = {

	createAppUI: function()
	{
		CTRL.zoomManager = new CTRL.ZoomManager(window);
		CTRL.mainView = new CTRL.MainView();
	},

	_loaded: function()
	{
		var that = this;
		chrome.runtime.getBackgroundPage(function(bg){
        	//Sync with background
        	CTRL.Serial = bg.CTRL.Serial;
        	CTRL.settings = bg.CTRL.settings;

			that.createAppUI();
        	that.presentUI(document);
    	});		
	},

    presentUI: function(document)
    {
        var rootView = new CTRL.RootView();
        CTRL.mainView.show(rootView.element);
        rootView.attachToDocument(document);
    }
}


CTRL.FrotnendApplication = function(){}
CTRL.FrotnendApplication.prototype = {
	run: function() {
		CTRL.frontEnd = new CTRL.Frotnend();
	}
}
