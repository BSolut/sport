CTRL.DeviceView = function(devInfo) {
	CTRL.VBox.call(this);
	this.devInfo = devInfo;

    this._tabbedPane = new CTRL.TabbedPane();
    this._tabbedPane.appendTab('connect', CTRL.UIString('Connection'), this._getConnectInfoPanel());
    this._updateConnectionInfo();

    this._consoleView = new CTRL.DeviceConsoleView();
    this._tabbedPane.appendTab('str', CTRL.UIString('Monitor'), this._consoleView);

    this._tabbedPane.show(this.element);


    if(devInfo.connectionInfo && devInfo.connectionInfo.connectionId) {
        this._tabbedPane.selectTab('str');
    } else {
        this._tabbedPane.selectTab('connect');
    }

    this.bindEvents();

    var cv = this._consoleView;
}

CTRL.DeviceView.Events = {

}

CTRL.DeviceView.prototype = {
    __proto__: CTRL.VBox.prototype,

    isConnected: function()
    {
        return this.devInfo.connectionInfo && this.devInfo.connectionInfo.connectionId;
    },

    bindEvents: function()
    {
        var that = this,
            devInfo = this.devInfo;

        CTRL.Serial.addEventListener('connected', function(ev){
            if(ev.data.path !== devInfo.path)
                return;
            devInfo.connectionInfo = ev.data.connectionInfo;
            that._onDeviceConnected();
        })
        CTRL.Serial.addEventListener('afterConnect', function(ev){
            if(ev.data.path !== devInfo.path)
                return;
            if(!ev.data.connectionInfo)
                that._onDeviceConnectError();
        })

        CTRL.Serial.addEventListener('disconnected', function(ev){
            if(ev.data.path !== devInfo.path)
                return;
            that._onDeviceDisconnected(ev.data && ev.data.reason);
        })
        CTRL.Serial.addEventListener('receive', function(ev) {
            var receiveInfo = ev.data;
            if(!devInfo.connectionInfo || devInfo.connectionInfo.connectionId !== receiveInfo.connectionId)
                return;
            that._consoleView.addReceiveMessage(receiveInfo.data);
        })
        CTRL.Serial.addEventListener('send', function(ev) {
            var sendInfo = ev.data;
            if(!devInfo.connectionInfo || devInfo.connectionInfo.connectionId !== sendInfo.connectionId)
                return;
            that._consoleView.addSendMessage(sendInfo.data);
        })

        this._consoleView.addEventListener(CTRL.DeviceConsoleView.Events.Send, function(ev) {
            if(!devInfo.connectionInfo || !devInfo.connectionInfo.connectionId)
                return;
            CTRL.Serial.send(devInfo.connectionInfo.connectionId, ev.data);
        })


        this._consoleView.addEventListener(CTRL.DeviceConsoleView.Events.Connect, function(ev) {
            that._onDeviceConnectExecute();
        })
        this._consoleView.addEventListener(CTRL.DeviceConsoleView.Events.Disconnect, function(ev) {
            that._onDeviceConnectExecute();
        })

    },

    _getConnectInfoPanel: function()
    {
        if(this._conInfoPanel)
            return this._conInfoPanel;
        var panel = this._conInfoPanel = new CTRL.DeviceConnectPanel(this.devInfo);
        panel.addEventListener(CTRL.DeviceConnectPanel.Events.Action, this._onDeviceConnectExecute.bind(this));
        return panel;
    },

    _updateConnectionInfo: function()
    {
        this._getConnectInfoPanel().update( this.devInfo );
    },

    _onDeviceConnectExecute: function()
    {
        if(!this.isConnected()){
            var cfg = this._getConnectInfoPanel().getConfig();
            this._tabbedPane.selectTab('str');
            this._consoleView.addMessage({
                text: 'Try to connect to '+this.devInfo.path,
                level: 'info'
            }, CTRL.DeviceConsoleView.MessageType.Log);

            CTRL.Serial.connect(this.devInfo.path, cfg);
        } else {
            CTRL.Serial.disconnect(this.devInfo.connectionInfo.connectionId);
        }
    },

    _onDeviceConnected: function()
    {
        this._updateConnectionInfo();
        this._consoleView.onDeviceConnected(this.devInfo);        
    },

    _onDeviceConnectError: function()
    {
        this._consoleView.onDeviceConnectError();
    },

    _onDeviceDisconnected: function(reason)
    {
        delete this.devInfo.connectionInfo;
        this._updateConnectionInfo();
        this._consoleView.onDeviceDisconnected();
    }

}

