CTRL.SettingsUIPort = function() {
}
CTRL.SettingsUIPort.prototype = {

	createSettingControl: function(uiTitle, setting, extension)
	{
        return CTRL.SettingsUI.createSettingInputField(uiTitle, setting, true, 5, 20, function(val){
        	val = parseInt(val, 10);
        	if(isNaN(val) || val < 1024 || val > 0xffff-1)
            	return 'Not a valid port';
        }, false, true, '');
	}

}