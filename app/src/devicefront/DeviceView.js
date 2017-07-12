CTRL.DeviceView = function(devInfo) {
	CTRL.VBox.call(this);
	this.devInfo = devInfo;
    this.defaultSpeeds = [115200,57600,38400,19200,14400,9600,4800,2400,1200,300,110];

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


    /*var idx = 0, data = ['\n', 'ha', 'l', 'lo\nH','UR','Z'],
        toSend;
    //while(toSend = data[idx++])
    //    cv.addReceiveMessage(toSend);
    (function sendNext() {
        var toSend = data[idx++];
        if(!toSend)return;
        cv.addReceiveMessage(toSend);
        setTimeout(sendNext, 1000);
    })()*/
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

    _createSelect: function(name, values, owner)
    {
        owner.removeChildren();
        var ret = owner.createChild('select')
        ret.innerHTML = values.map(function(a,b) {return (b||'') + '<option>'+a+'</option>';});
        return ret;
    },

    _getConnectInfoPanel: function()
    {
        if(this._conInfoPanel)
            return this._conInfoPanel;

        var reportView = new CTRL.ReportView('Device '+this.devInfo.path)

        var s = reportView.appendSection('Main');
        s.appendField('bitrate', '');

        s = reportView.appendSection('Extended', undefined, true);
        s.appendField('DataBits');
        s.appendField('ParityBit');
        s.appendField('StopBits');
        var cfgFlowControl = s.appendField('FlowControl').createChild('input');
        cfgFlowControl.type = 'checkbox';

        s = reportView.appendSection();

        var that = this;
        s.element.appendChild(
            createTextButton("", this._onDeviceConnectExecute.bind(this), 'device-connect-btn')
        );

        return this._conInfoPanel = reportView;
    },

    _updateConnectionInfo: function()
    {
        var devInfo = this.devInfo,
            conInfo = devInfo.connectionInfo,
            reportView = this._getConnectInfoPanel();

        if(!conInfo || !conInfo.connectionId) {

            var cfgFields = {};

            cfgFields.bitrate = this._createSelect('bitrate', this.defaultSpeeds, reportView.getSection('Main').fieldValue('bitrate'));
            var extSection = reportView.getSection('Extended');
            cfgFields.dataBits = this._createSelect('dataBits', ['eight', 'seven'], extSection.fieldValue('DataBits'));
            cfgFields.parityBit = this._createSelect('parityBit', ['no', 'odd', 'even'], extSection.fieldValue('ParityBit'));
            cfgFields.stopBits = this._createSelect('stopBits', ['one', 'two'], extSection.fieldValue('StopBits'));
            cfgFields.flowControl = extSection.fieldValue('FlowControl').firstChild;
            cfgFields.flowControl.checked = false;

            var textBtn = reportView.getSection().element.lastChild;
            textBtn.textContent = 'Connect';

            reportView.cfgFields = cfgFields;
        } else {
            reportView.getSection('Main').fieldValue('bitrate', conInfo.bitrate);
            var extSection = reportView.getSection('Extended');
            extSection.fieldValue('DataBits', conInfo.dataBits);
            extSection.fieldValue('ParityBit', conInfo.parityBit);
            extSection.fieldValue('StopBits', conInfo.stopBits);
            extSection.fieldValue('FlowControl').lastChild.checked = conInfo.ctsFlowControl;

            var textBtn = reportView.getSection().element.lastChild;
            textBtn.textContent = 'Disconnect';
        }
    },

    _onDeviceConnectExecute: function()
    {
        if(!this.isConnected()){
            var cfg = this._getConnectInfoPanel().cfgFields;

            CTRL.Serial.connect(this.devInfo.path, {
                bitrate: parseInt(cfg.bitrate.value),
                dataBits: cfg.dataBits.value,
                parityBit: cfg.parityBit.value,
                stopBits: cfg.stopBits.value,
                ctsFlowControl: cfg.flowControl.checked
            });

        } else {
            CTRL.Serial.disconnect(this.devInfo.connectionInfo.connectionId);
        }
    },

    _onDeviceConnected: function()
    {
        this._updateConnectionInfo();
        this._consoleView.onDeviceConnected(this.devInfo);
        this._tabbedPane.selectTab('str');
    },

    _onDeviceDisconnected: function(reason)
    {
        delete this.devInfo.connectionInfo;
        this._updateConnectionInfo();
        this._consoleView.onDeviceDisconnected();
    }

}

