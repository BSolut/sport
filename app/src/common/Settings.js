CTRL.ChromeSettingsStorage = function() {
    this.db = {};
    this.chromeStorage = chrome.storage.local;
}
CTRL.ChromeSettingsStorage.prototype = {
    
    load: function(settings, callback)
    {
        var that = this;
        this.chromeStorage.get(settings, function(ret){
            //Copy to local
            Object.keys(ret).forEach(function(name) {
                that.db[name] = ret[name];
            })
            //that.dispatchEventToListeners(CTRL.ChromeSettingsStorage.Events.Loaded);
            callback();
        })
    },

    get: function(name) 
    {
        return this.db[name];
    },

    set: function(name, value)
    {
        this.db[name] = value;
        var sObj = {};
        sObj[name] = value;
        this.chromeStorage.set(sObj);
    },

    flush: function()
    {
        this.chromeStorage.set(this.db);
    }

};


CTRL.Settings = function(store) {
    this._settingsStorage = store;
	this._registry = new Map();
	this._moduleSettings = new Map();
    this._eventSupport = new CTRL.Object();
	runtime.extensions("setting").forEach(this._registerModuleSetting.bind(this));
}
CTRL.Settings.prototype = {

    load: function()
    {
        var that = this;
        return new Promise(function(fulfill, reject) {
            that._settingsStorage.load(that._registry.keysArray(), fulfill)
        });
    },

    _registerModuleSetting: function(extension)
    {
    	var descriptor = extension.descriptor();
        var settingName = descriptor["settingName"];
        var settingType = descriptor["settingType"];
        var defaultValue = descriptor["defaultValue"];
        var setting = this.createSetting(settingName, defaultValue);
        this._moduleSettings.set(settingName, setting);
    },

    moduleSetting: function(settingName)
    {
        var setting = this._moduleSettings.get(settingName);
        if (!setting)
            throw new Error("No setting registered: " + settingName);
        return setting;
    },

    createSetting: function(key, defaultValue)
    {
        if (!this._registry.get(key))
            this._registry.set(key, new CTRL.Setting(this, key, defaultValue, this._eventSupport, this._settingsStorage));
        return (this._registry.get(key));
    },

    get: function(key, defaultValue)
    {
        var setting = this.createSetting(key, defaultValue);
        if(!setting)
            return defaultValue;
        return setting.get();
    },

    addChangeListener: function(listener, thisObject)
    {
        this._eventSupport.addEventListener('changed', listener, thisObject);
    },

    removeChangeListener: function(listener, thisObject)
    {
        this._eventSupport.removeEventListener('changed', listener, thisObject);
    }
}


CTRL.Setting = function(settings, name, defaultValue, eventSupport, storage)
{
    this._settings = settings;
    this._name = name;
    this._defaultValue = defaultValue;
    this._eventSupport = eventSupport;
    this._storage = storage;
}

CTRL.Setting.prototype = {

    addChangeListener: function(listener, thisObject)
    {
        this._eventSupport.addEventListener(this._name, listener, thisObject);
    },

    removeChangeListener: function(listener, thisObject)
    {
        this._eventSupport.removeEventListener(this._name, listener, thisObject);
    },

    get: function()
    {
        if (typeof this._value !== "undefined")
            return this._value;

        this._value = this._defaultValue;
        try {
            this._value = JSON.parse(this._storage.get(this._name));
        } catch(e) {
            this.remove();
        }
        return this._value;
    },

    /**
     * @param {V} value
     */
    set: function(value)
    {
        var oldValue = this._value;
        if(value === oldValue)
            return;
        this._value = value;
        try {
            var settingString = JSON.stringify(value);
            try {
                this._storage.set(this._name, settingString);
            } catch(e) {
                this._printSettingsSavingError(e.message, this._name, settingString);
            }
        } catch(e) {
            WebInspector.console.error("Cannot stringify setting with name: " + this._name + ", error: " + e.message);
        }
        this._eventSupport.dispatchEventToListeners('changed', {
            name: this._name,
            value: value,
            oldValue: oldValue
        });
        this._eventSupport.dispatchEventToListeners(this._name, value);
    },

    remove: function()
    {
    }    
}




CTRL.moduleSetting = function(settingName)
{
    return CTRL.settings.moduleSetting(settingName);
}
