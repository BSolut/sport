CTRL.DeviceListPane = function() {
    CTRL.SidebarPane.call(this, CTRL.UIString("Device list"));
    this.devItemMap = {};
    this.initListen();

    var that = this;


    var toolbar = new CTRL.Toolbar(this.element);
    toolbar.element.classList.add('bottomborder');
    toolbar.element.classList.add('dark');

    this.refreshBtn = new CTRL.ToolbarButton(CTRL.UIString('Refresh'), 'refresh-toolbar-item');
    this.refreshBtn.addEventListener('click', this.refresh.bind(this));
    toolbar.appendToolbarItem(this.refreshBtn);

    var sep = new CTRL.ToolbarSeparator();
    sep.element.classList.add('marginleftauto');
    toolbar.appendToolbarItem(sep);

    this.menuBtn = new CTRL.ToolbarButton( CTRL.UIString('Menu'), 'menu-toolbar-item');
    this.menuBtn.addEventListener('click', this.openMenu.bind(this));
    toolbar.appendToolbarItem(this.menuBtn)

    this.deviceList = new CTRL.UIList();
    this.deviceList.show(this.element);

    this.deviceList.addEventListener(CTRL.UIList.Events.SelectedItem, this._onDeviceSelected, this);
    this.deviceList.addEventListener(CTRL.UIList.Events.DeselectedItem, this._onDeviceDeselected, this);

    this.refresh();
}

CTRL.DeviceListPane.Events = {
    SelectedDevice: 'SelectedDevice',
    DeselectedDevice: 'DeselectedDevice'
}

CTRL.DeviceListPane.prototype = {
    __proto__: CTRL.SidebarPane.prototype,

    initListen: function()
    {
        var that = this;
        CTRL.Serial.addEventListener('beforeConnect', function(ev){
            var devItm = that.devItemMap[ev.data.path];
            if(!devItm)
                return;
            devItm.setConnectionState(1);
        })
        CTRL.Serial.addEventListener('afterConnect', function(ev){
            var devItm = that.devItemMap[ev.data.path];
            if(!devItm)
                return;
            devItm.devInfo.connectionInfo = ev.data.connectionInfo;
            devItm.setConnectionState( ev.data.connectionInfo ? 2 : 0 );
        })
        CTRL.Serial.addEventListener('disconnected', function(ev){
            var devItm = that.devItemMap[ev.data.path];
            if(!devItm)
                return;
            devItm.setConnectionState( 0 );
        })        
    },

    _onDeviceSelected: function(ev)
    {
        this.dispatchEventToListeners(CTRL.DeviceListPane.Events.SelectedDevice, this.deviceList.selectedItem.devInfo);
    },

    _onDeviceDeselected: function(ev)
    {
        this.dispatchEventToListeners(CTRL.DeviceListPane.Events.DeselectedDevice);
    },

    update: function(rawDevList)
    {
        this.deviceList.detach();
        this.deviceList.clear();

        var devItemMap = {};
        if(!rawDevList || !rawDevList.length) {
            var infoElement = this.deviceList.contentElement.createChild("div", "list-info");
            infoElement.textContent = "No devices found";
        } else {
            var devItm, rawItm, i = 0;
            while(rawItm = rawDevList[i++]) {
                devItm = devItemMap[ rawItm.path ] = new CTRL.DeviceListPane.DeviceItem(rawItm);
                this.deviceList.addItem( devItm );
            }
        }
        this.devItemMap = devItemMap;
        this.deviceList.show(this.element);
    },

    refresh: function()
    {
        return CTRL.Serial.getDevices(this.update.bind(this));

        this.update([{
            displayName: "USB2.0-Serial",
            path: "/dev/ttyUSB0-Magic",
            productId: 29987,
            vendorId:6790,
            connectionInfo: {
                connectionId: 2
            }
        }])
    },

    openMenu: function() 
    {
        CTRL._settingsController.showSettingsScreen();
    }

}

CTRL.DeviceListPane.DeviceItem = function(devInfo) {
    /* devInfo
        displayName: "USB2.0-Serial"
        path: "/dev/ttyUSB0"
        productId: 29987
        vendorId:6790
    */
    CTRL.UIList.Item.call(this, devInfo.displayName, "");
    this.devInfo = devInfo;

    this.element.classList.add('device-item');
    this.connectBtn = this.element.createChild("label", "resource-status-image", "dt-icon-label")
    this.pathElement = this.element.createChild("div", "path-info");
    this.pathElement.textContent = devInfo.path;

    if(devInfo.connectionInfo && devInfo.connectionInfo.connectionId)
        this.setConnectionState(2);
    else
        this.setConnectionState(0);
}
CTRL.DeviceListPane.DeviceItem.prototype = {
    __proto__: CTRL.UIList.Item.prototype,

    setConnectionState: function(state)
    {
        var type = (['red-ball', 'orange-ball', 'green-ball'])[state];
        if(type)
            this.connectBtn.type = type;
    }
}