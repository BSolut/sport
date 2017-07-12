CTRL.ChromeAppInterface = function()
{
	this.ctrlWnd = {
		opened: false,
		window: null,
		focused: false
	};
	this.init();
}

CTRL.ChromeAppInterface.prototype = {
	__proto__: CTRL.Object,

	init: function() {
		var that = this;
		//Bind events
		chrome.app.runtime.onLaunched.addListener(function() {
			that.openControl();
		})

		/*chrome.runtime.onInstalled.addListener(function(options) {
			console.log(options);
		});*/
	},

	createWindow: function() {
		var ctrlWnd = this.ctrlWnd;
		chrome.app.window.create('src/frontend.html', {
			id: 'control',
			focused: true,
			width: 580,
			height: 400,
			minWidth: 600,
			minHeight: 360
		}, function(appWindow){
			ctrlWnd.window = appWindow;

			var cntWnd = appWindow.contentWindow;

			cntWnd.addEventListener('load', function(){
			});

            cntWnd.addEventListener('blur', function() {
                ctrlWnd.focused = false;
            });
            appWindow.contentWindow.addEventListener('focus', function() {
                ctrlWnd.focused = true;
                //--clearAttention();
            });

            // close the inbox if background.html is refreshed
            chrome.runtime.onSuspend.addListener(function() {
            	if(ctrlWnd.window)
            		chrome.app.window.get(ctrlWnd.window.id).close();
            });

			appWindow.onClosed.addListener(function(){
				ctrlWnd.opened = false;
				delete ctrlWnd.window;
			})
		})	
	},

	openControl: function() {
		var ctrlWnd = this.ctrlWnd;

		if(ctrlWnd.opened === false) {
			ctrlWnd.opened = true;
			this.createWindow()
		} else {
			var appWindow = chrome.app.window.get(ctrlWnd.window && ctrlWnd.window.id);
			if(appWindow){
				appWindow.show();
				appWindow.focus();
			} else {
				ctrlWnd.opened = false;
				delete ctrlWnd.window;
				this.openControl();
			}
		}	
	}
}
