CTRL.SettingsScreen = function(onHide)
{
    CTRL.HelpScreen.call(this);
    this.element.id = "settings-screen";

    this._onHide = onHide;

    this._contentElement = this.element.createChild("div", "help-window-main");
    var settingsLabelElement = createElementWithClass("div", "help-window-label");
    settingsLabelElement.createTextChild(CTRL.UIString("Settings"));
    this._contentElement.appendChild(this.createCloseButton());


    this._tabbedPane = new CTRL.TabbedPane();
    this._tabbedPane.insertBeforeTabStrip(settingsLabelElement);
    this._tabbedPane.setShrinkableTabs(false);
    this._tabbedPane.setVerticalTabLayout(true);
    this._tabbedPane.appendTab("general", CTRL.UIString("General"), new CTRL.GenericSettingsTab());
    
    //this._tabbedPane.appendTab("workspace", WebInspector.UIString("Workspace"), new WebInspector.WorkspaceSettingsTab());
    
    //this._tabbedPaneController = new WebInspector.ExtensibleTabbedPaneController(this._tabbedPane, "settings-view");
    //this._tabbedPane.appendTab("shortcuts", WebInspector.UIString("Shortcuts"), WebInspector.shortcutsScreen.createShortcutsTabView());

    this.element.addEventListener("keydown", this._keyDown.bind(this), false);
    this._developerModeCounter = 0;
}

CTRL.SettingsScreen.prototype = {

	__proto__: CTRL.HelpScreen.prototype,

    wasShown: function()
    {
        this._tabbedPane.selectTab("general");
        this._tabbedPane.show(this._contentElement);
        CTRL.HelpScreen.prototype.wasShown.call(this);
    },

    willHide: function()
    {
        this._onHide();
        CTRL.HelpScreen.prototype.willHide.call(this);
    },

    selectTab: function(name)
    {
        this._tabbedPane.selectTab(name);
    },

    isClosingKey: function(keyCode)
    {
        return [
            //CTRL.KeyboardShortcut.Keys.Enter.code,
            CTRL.KeyboardShortcut.Keys.Esc.code,
        ].indexOf(keyCode) >= 0;
    },

    _keyDown: function(event)
    {
        var shiftKeyCode = 16;
        if (event.keyCode === shiftKeyCode && ++this._developerModeCounter > 5)
            this.element.classList.add("settings-developer-mode");
    }

}





CTRL.SettingsTab = function(name, id)
{
    CTRL.VBox.call(this);
    this.element.classList.add("settings-tab-container");
    if (id)
        this.element.id = id;
    var header = this.element.createChild("header");
    header.createChild("h3").createTextChild(name);
    this.containerElement = this.element.createChild("div", "help-container-wrapper").createChild("div", "settings-tab help-content help-container");
}

CTRL.SettingsTab.prototype = {
    
    __proto__: CTRL.VBox.prototype,

    _appendSection: function(name)
    {
        var block = this.containerElement.createChild("div", "help-block");
        if (name)
            block.createChild("div", "help-section-title").textContent = name;
        return block;
    },

    _createSelectSetting: function(name, options, setting)
    {
        var p = createElement("p");
        p.createChild("label").textContent = name;

        var select = p.createChild("select", "chrome-select");
        var settingValue = setting.get();

        for (var i = 0; i < options.length; ++i) {
            var option = options[i];
            select.add(new Option(option[0], option[1]));
            if (settingValue === option[1])
                select.selectedIndex = i;
        }

        function changeListener(e)
        {
            // Don't use e.target.value to avoid conversion of the value to string.
            setting.set(options[select.selectedIndex][1]);
        }

        select.addEventListener("change", changeListener, false);
        return p;
    }

}





CTRL.GenericSettingsTab = function()
{
    CTRL.SettingsTab.call(this, CTRL.UIString("General"), "general-tab-content");

    /** @const */
    var explicitSectionOrder = ["", "Network", "Console"];
    /** @type {!Map<string, !Element>} */
    this._nameToSection = new Map();
    /** @type {!Map<string, !Element>} */
    this._nameToSettingElement = new Map();
    for (var sectionName of explicitSectionOrder)
        this._sectionElement(sectionName);
    self.runtime.extensions("setting").forEach(this._addSetting.bind(this));
    self.runtime.extensions(CTRL.SettingUI).forEach(this._addSettingUI.bind(this));
}

CTRL.GenericSettingsTab.isSettingVisible = function(extension)
{
    var descriptor = extension.descriptor();
    if (!("title" in descriptor))
        return false;
    if (!(("category" in descriptor) || ("parentSettingName" in descriptor)))
        return false;
    return true;
}

CTRL.GenericSettingsTab.prototype = {

    __proto__: CTRL.SettingsTab.prototype,

    _sectionElement: function(sectionName)
    {
        var sectionElement = this._nameToSection.get(sectionName);
        if (!sectionElement) {
            var uiSectionName = sectionName && CTRL.UIString(sectionName);
            sectionElement = this._appendSection(uiSectionName);
            this._nameToSection.set(sectionName, sectionElement);
        }
        return sectionElement;
    },


    _addSetting: function(extension) {
    	if(!CTRL.GenericSettingsTab.isSettingVisible(extension))
    		return;

        var descriptor = extension.descriptor();
        var sectionName = descriptor["category"];
        var settingName = descriptor["settingName"];
        var setting = CTRL.moduleSetting(settingName);
        var uiTitle = CTRL.UIString(extension.title(CTRL.platform()));

        var sectionElement = this._sectionElement(sectionName);
        var parentSettingName = descriptor["parentSettingName"];
        var parentSettingElement = parentSettingName ? this._nameToSettingElement.get(descriptor["parentSettingName"]) : null;
        var parentFieldset = null;
        if (parentSettingElement) {
            parentFieldset = parentSettingElement.__fieldset;
            if (!parentFieldset) {
                parentFieldset = CTRL.SettingsUI.createSettingFieldset(CTRL.moduleSetting(parentSettingName));
                parentSettingElement.appendChild(parentFieldset);
                parentSettingElement.__fieldset = parentFieldset;
            }
        }

        var settingControl;

        switch (descriptor["settingType"]) {
        case "boolean":
            settingControl = CTRL.SettingsUI.createSettingCheckbox(uiTitle, setting);
            break;
        case "enum":
            var descriptorOptions = descriptor["options"];
            var options = new Array(descriptorOptions.length);
            for (var i = 0; i < options.length; ++i) {
                // The third array item flags that the option name is "raw" (non-i18n-izable).
                var optionName = descriptorOptions[i][2] ? descriptorOptions[i][0] : CTRL.UIString(descriptorOptions[i][0]);
                options[i] = [optionName, descriptorOptions[i][1]];
            }
            settingControl = this._createSelectSetting(uiTitle, options, setting);
            break;
        default:
            var ext = self.runtime.extension('@CTRL.SettingsUI'+descriptor["settingType"]);
            if(ext) {
                var that = this;
                ext.instancePromise().then(function(extInst){
                    settingControl = extInst.createSettingControl(uiTitle, setting, extension)
                    that._nameToSettingElement.set(settingName, settingControl);
                    (parentFieldset || sectionElement).appendChild((settingControl));
                })
                return;
            }
            console.error("Invalid setting type: " + descriptor["settingType"]);
            return;
        }
        this._nameToSettingElement.set(settingName, settingControl);
        (parentFieldset || sectionElement).appendChild((settingControl));
    },

    _addSettingUI: function(extension)
    {
        var descriptor = extension.descriptor();
        var sectionName = descriptor["category"] || "";
        extension.instancePromise().then(appendCustomSetting.bind(this));

        function appendCustomSetting(object)
        {
            var settingUI = (object);
            var element = settingUI.settingElement();
            if (element)
                this._sectionElement(sectionName).appendChild(element);
        }
    }
}







CTRL.SettingsController = function()
{
    this._settingsScreen;
    this._resizeBound = this._resize.bind(this);
}

CTRL.SettingsController.prototype = {
    _onHideSettingsScreen: function()
    {
        var window = this._settingsScreen.element.ownerDocument.defaultView;
        window.removeEventListener("resize", this._resizeBound, false);
        delete this._settingsScreenVisible;
    },

    /**
     * @param {string=} name
     */
    showSettingsScreen: function(name)
    {
        if (!this._settingsScreen)
            this._settingsScreen = new CTRL.SettingsScreen(this._onHideSettingsScreen.bind(this));
        this._settingsScreen.showModal();
        if (name)
            this._settingsScreen.selectTab(name);
        this._settingsScreenVisible = true;
        var window = this._settingsScreen.element.ownerDocument.defaultView;
        window.addEventListener("resize", this._resizeBound, false);
    },

    _resize: function()
    {
        if (this._settingsScreen && this._settingsScreen.isShowing())
            this._settingsScreen.doResize();
    }
}




CTRL._settingsController = new CTRL.SettingsController();