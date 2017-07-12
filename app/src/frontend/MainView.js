CTRL.MainView = function() {
	CTRL.VBox.call(this);
    CTRL.Dialog.setModalHostView(this);
    
    this.viewCache = {};
    this.currentDeviceViews = null;

    this._splitWidget = new CTRL.SplitWidget(true, false, "sportPanelSplitViewState", 200);
    this._splitWidget.enableShowModeSaving();
    this._splitWidget.show(this.element);


    var mainPanel = this.mainPanel = new CTRL.Panel('mainPanel');

    var sidePanel = new CTRL.DeviceListPane();
    sidePanel.addEventListener(CTRL.DeviceListPane.Events.SelectedDevice, this._onDeviceSelected, this);
    sidePanel.addEventListener(CTRL.DeviceListPane.Events.DeselectedDevice, this._onDeviceDeselected, this);


    this._splitWidget.setMainWidget(mainPanel);
    this._splitWidget.setSidebarWidget(sidePanel);
}

CTRL.MainView.prototype = {
	__proto__: CTRL.VBox.prototype,


    getViewByDeviceInfo: function(devInfo)
    {
        return this.viewCache[devInfo.path] || (this.viewCache[devInfo.path] = new CTRL.DeviceView(devInfo));
    },

    _onDeviceSelected: function(ev)
    {
        if(this.currentDeviceView)
            this.currentDeviceView.detach();
        this.currentDeviceView = this.getViewByDeviceInfo(ev.data);
        if(!this.currentDeviceView)
            return;

        this._splitWidget.setMainWidget(this.currentDeviceView);
        //this.currentDeviceView.show(this.mainPanel.element);
    },

    _onDeviceDeselected: function(ev)
    {
        this.mainPanel.element.innerHTML = '';
    }
}

