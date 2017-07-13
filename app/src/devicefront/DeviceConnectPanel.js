CTRL.DeviceConnectPanel = function(devInfo) {
	CTRL.ReportView.call(this, 'Device '+devInfo.path);
    this.defaultSpeeds = [115200,57600,38400,19200,14400,9600,4800,2400,1200,300,110];
	this._render();
}
CTRL.DeviceConnectPanel.Events = {
	Action: 'Action'
}
CTRL.DeviceConnectPanel.prototype = {
	__proto__: CTRL.ReportView.prototype,


    _createSelect: function(name, values, owner)
    {
        owner.removeChildren();
        var ret = owner.createChild('select')
        ret.innerHTML = values.map(function(a,b) {return (b||'') + '<option>'+a+'</option>';});
        return ret;
    },

    _createEditableSelect: function(name, values, owner) {
        owner.removeChildren();
        var editableSelect = new CTRL.EditableSelect(owner);
        editableSelect.setValues(values);
        editableSelect.input.type = 'number';
        return editableSelect.input;
    },

	update: function(devInfo)
	{
        var conInfo = devInfo.connectionInfo;

        if(!conInfo || !conInfo.connectionId) {

            var cfgFields = {};

            cfgFields.bitrate = this._createEditableSelect('bitrate', this.defaultSpeeds, this.getSection('Main').fieldValue('bitrate'));
            var extSection = this.getSection('Extended');
            cfgFields.dataBits = this._createSelect('dataBits', ['eight', 'seven'], extSection.fieldValue('DataBits'));
            cfgFields.parityBit = this._createSelect('parityBit', ['no', 'odd', 'even'], extSection.fieldValue('ParityBit'));
            cfgFields.stopBits = this._createSelect('stopBits', ['one', 'two'], extSection.fieldValue('StopBits'));
            cfgFields.flowControl = extSection.fieldValue('FlowControl').firstChild;
            cfgFields.flowControl.checked = false;

            var textBtn = this.getSection().element.lastChild;
            textBtn.textContent = 'Connect';


            if(this.lastCfg) {
                cfgFields.bitrate.value = this.lastCfg.bitrate;
                cfgFields.dataBits.value = this.lastCfg.dataBits;
                cfgFields.parityBit.value = this.lastCfg.parityBit;
                cfgFields.stopBits.value = this.lastCfg.stopBits;
                cfgFields.flowControl.checked = this.lastCfg.ctsFlowControl;
            }

            this.cfgFields = cfgFields;
        } else {
            this.getSection('Main').fieldValue('bitrate', conInfo.bitrate);
            var extSection = this.getSection('Extended');
            extSection.fieldValue('DataBits', conInfo.dataBits);
            extSection.fieldValue('ParityBit', conInfo.parityBit);
            extSection.fieldValue('StopBits', conInfo.stopBits);
            extSection.fieldValue('FlowControl').lastChild.checked = conInfo.ctsFlowControl;

            var textBtn = this.getSection().element.lastChild;
            textBtn.textContent = 'Disconnect';
        }
	},

	getConfig: function()
	{
		var cfg = this.cfgFields;
            retCfg = {
                bitrate: parseInt(cfg.bitrate.value),
                dataBits: cfg.dataBits.value,
                parityBit: cfg.parityBit.value,
                stopBits: cfg.stopBits.value,
                ctsFlowControl: cfg.flowControl.checked
            }
        this.lastCfg = JSON.parse(JSON.stringify(retCfg));
        return retCfg;
	},

	_render: function()
	{
        var s = this.appendSection('Main');
        s.appendField('bitrate', '');

        s = this.appendSection('Extended', undefined, true);
        s.appendField('DataBits');
        s.appendField('ParityBit');
        s.appendField('StopBits');
        var cfgFlowControl = s.appendField('FlowControl').createChild('input');
        cfgFlowControl.type = 'checkbox';

        s = this.appendSection();

        var that = this;
        s.element.appendChild(
            createTextButton("", this._onDeviceConnectExecute.bind(this), 'device-connect-btn')
        );
	},

	_onDeviceConnectExecute: function(ev)
	{
		this.dispatchEventToListeners(CTRL.DeviceConnectPanel.Events.Action);
	}
}
