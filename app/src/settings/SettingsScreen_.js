






CTRL.SettingsUI = {}

CTRL.SettingsUI.createSettingCheckbox = function(name, setting, omitParagraphElement, tooltip)
{
    var label = createCheckboxLabel(name);
    if (tooltip)
        label.title = tooltip;

    var input = label.checkboxElement;
    input.name = name;
    CTRL.SettingsUI.bindCheckbox(input, setting);

    if (omitParagraphElement)
        return label;

    var p = createElement("p");
    p.appendChild(label);
    return p;
}

CTRL.SettingsUI.bindCheckbox = function(input, setting)
{
    function settingChanged()
    {
        if (input.checked !== setting.get())
            input.checked = setting.get();
    }
    setting.addChangeListener(settingChanged);
    settingChanged();

    function inputChanged()
    {
        if (setting.get() !== input.checked)
            setting.set(input.checked);
    }
    input.addEventListener("change", inputChanged, false);
}

CTRL.SettingsUI.createSettingInputField = function(label, setting, numeric, maxLength, width, validatorCallback, instant, clearForZero, placeholder)
{
    var p = createElement("p");
    var labelElement = p.createChild("label");
    labelElement.textContent = label;
    var inputElement = p.createChild("input");
    inputElement.type = "text";
    if (numeric)
        inputElement.className = "numeric";
    if (maxLength)
        inputElement.maxLength = maxLength;
    if (width)
        inputElement.style.width = width;
    inputElement.placeholder = placeholder || "";

    if (validatorCallback || instant) {
        inputElement.addEventListener("change", onInput, false);
        inputElement.addEventListener("input", onInput, false);
    }
    inputElement.addEventListener("keydown", onKeyDown, false);

    var errorMessageLabel;
    if (validatorCallback)
        errorMessageLabel = p.createChild("div", "field-error-message");

    function onInput()
    {
        if (validatorCallback)
            validate();
        if (instant)
            apply();
    }

    function onKeyDown(event)
    {
        if (isEnterKey(event))
            apply();
        incrementForArrows(event);
    }

    function incrementForArrows(event)
    {
        if (!numeric)
            return;

        var increment = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
        if (!increment)
            return;
        if (event.shiftKey)
            increment *= 10;

        var value = inputElement.value;
        if (validatorCallback && validatorCallback(value))
            return;
        value = Number(value);
        if (clearForZero && !value)
            return;
        value += increment;
        if (clearForZero && !value)
            return;
        value = String(value);
        if (validatorCallback && validatorCallback(value))
            return;

        inputElement.value = value;
        apply();
        event.preventDefault();
    }

    function validate()
    {
        var error = validatorCallback(inputElement.value);
        if (!error)
            error = "";
        inputElement.classList.toggle("error-input", !!error);
        errorMessageLabel.textContent = error;
    }

    if (!instant)
        inputElement.addEventListener("blur", apply, false);

    function apply()
    {
        if (validatorCallback && validatorCallback(inputElement.value))
            return;
        setting.removeChangeListener(onSettingChange);
        setting.set(numeric ? Number(inputElement.value) : inputElement.value);
        setting.addChangeListener(onSettingChange);
    }

    setting.addChangeListener(onSettingChange);

    function onSettingChange()
    {
        var value = setting.get();
        if (clearForZero && !value)
            value = "";
        inputElement.value = value;
    }
    onSettingChange();

    if (validatorCallback)
      validate();

    return p;
}

CTRL.SettingsUI.createCustomSetting = function(name, element)
{
    var p = createElement("p");
    var fieldsetElement = p.createChild("fieldset");
    fieldsetElement.createChild("label").textContent = name;
    fieldsetElement.appendChild(element);
    return p;
}

CTRL.SettingsUI.createSettingFieldset = function(setting)
{
    var fieldset = createElement("fieldset");
    fieldset.disabled = !setting.get();
    setting.addChangeListener(settingChanged);
    return fieldset;

    function settingChanged()
    {
        fieldset.disabled = !setting.get();
    }
}

CTRL.SettingsUI.regexValidator = function(text)
{
    var regex;
    try {
        regex = new RegExp(text);
    } catch (e) {
    }
    return regex ? null : WebInspector.UIString("Invalid pattern");
}

CTRL.SettingsUI.createInput = function(parentElement, id, defaultText, eventListener, numeric, size)
{
    var element = parentElement.createChild("input");
    element.id = id;
    element.type = "text";
    element.maxLength = 12;
    element.style.width = size || "80px";
    element.value = defaultText;
    element.align = "right";
    if (numeric)
        element.className = "numeric";
    element.addEventListener("input", eventListener, false);
    element.addEventListener("keydown", keyDownListener, false);
    function keyDownListener(event)
    {
        if (isEnterKey(event))
            eventListener(event);
    }
    return element;
}



CTRL.SettingsScreen = function(onHide)
{
    CTRL.HelpScreen.call(this);
    this.element.id = "settings-screen";

    /** @type {function()} */
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

    //this._tabbedPaneController = new CTRL.ExtensibleTabbedPaneController(this._tabbedPane, "settings-view");

    this.element.addEventListener("keydown", this._keyDown.bind(this), false);
    this._developerModeCounter = 0;
}

CTRL.SettingsScreen.prototype = {
    __proto__: CTRL.HelpScreen.prototype,
    /**
     * @override
     */
    wasShown: function()
    {
        this._tabbedPane.selectTab("general");
        this._tabbedPane.show(this._contentElement);
        CTRL.HelpScreen.prototype.wasShown.call(this);
    },

    /**
     * @param {string} name
     */
    selectTab: function(name)
    {
        this._tabbedPane.selectTab(name);
    },

    /**
     * @override
     * @return {boolean}
     */
    isClosingKey: function(keyCode)
    {
        return false; //TODO
        return [
            CTRL.KeyboardShortcut.Keys.Enter.code,
            CTRL.KeyboardShortcut.Keys.Esc.code,
        ].indexOf(keyCode) >= 0;
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._onHide();
        CTRL.HelpScreen.prototype.willHide.call(this);
    },

    /**
     * @param {!Event} event
     */
    _keyDown: function(event)
    {
        var shiftKeyCode = 16;
        if (event.keyCode === shiftKeyCode && ++this._developerModeCounter > 5)
            this.element.classList.add("settings-developer-mode");
    }
}



//====================

CTRL.GenericSettingsTab = function()
{
    CTRL.SettingsTab.call(this, CTRL.UIString("General"), "general-tab-content");

    /** @const */
    var explicitSectionOrder = ["Network"];
    /** @type {!Map<string, !Element>} */
    this._nameToSection = new Map();
    /** @type {!Map<string, !Element>} */
    this._nameToSettingElement = new Map();
    for (var sectionName of explicitSectionOrder)
        this._sectionElement(sectionName);


    this._addSetting({
        sectionName: 'Network',
        settingType: 'boolean',
        settingName: 'OpenServer',
        addChangeListener: function() {
        },
        get: function() {
            return false;
        },
        set: function(value) {
        }
    })
    this._addSetting({
        sectionName: 'Network',
        settingType: 'number',
        settingName: 'Port',
        addChangeListener: function() {},
        removeChangeListener: function() {},
        get: function() { return 8899 },
        set: function(value) { console.log('->set port', value) }
    });
    
    //self.runtime.extensions("setting").forEach(this._addSetting.bind(this));
    //self.runtime.extensions(CTRL.SettingUI).forEach(this._addSettingUI.bind(this));

    //this._appendSection().appendChild(createTextButton(CTRL.UIString("Restore defaults and reload"), restoreAndReload));

    function restoreAndReload()
    {
        CTRL.settings.clearAll();
        CTRL.reload();
    }
}

// ======================

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

// ======================

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

    /**
     * @param {!Runtime.Extension} extension
     */
    _addSetting: function(extension)
    {
        var sectionName = extension.sectionName,
            settingName = extension.settingName;

        var sectionElement = this._sectionElement(sectionName);
        
        var settingControl;

        switch (extension["settingType"]) {
        case "boolean":
            settingControl = CTRL.SettingsUI.createSettingCheckbox('Openserver', extension);
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
        case "number":
            settingControl = CTRL.SettingsUI.createSettingInputField(extension.settingName, extension, true, undefined, "50px", function(value) {
                var nr = parseInt(value,10);
                if(!(isNaN(nr) || nr < 1024 || nr > 65535))
                    return '';
                return 'Invalid '+extension.settingName;
            }, false, true, extension.settingName);
            break;
        default:
            console.error("Invalid setting type: " + descriptor["settingType"]);
            return;
        }
        this._nameToSettingElement.set(settingName, settingControl);
        sectionElement.appendChild(settingControl);
    },

    /**
     * @param {!Runtime.Extension} extension
     */
    _addSettingUI: function(extension)
    {
        var descriptor = extension.descriptor();
        var sectionName = descriptor["category"] || "";
        extension.instancePromise().then(appendCustomSetting.bind(this));

        function appendCustomSetting(object)
        {
            var settingUI = /** @type {!WebInspector.SettingUI} */ (object);
            var element = settingUI.settingElement();
            if (element)
                this._sectionElement(sectionName).appendChild(element);
        }
    },

    /**
     * @param {string} sectionName
     * @return {!Element}
     */
    _sectionElement: function(sectionName)
    {
        var sectionElement = this._nameToSection.get(sectionName);
        if (!sectionElement) {
            var uiSectionName = sectionName && CTRL.UIString(sectionName);
            sectionElement = this._appendSection(uiSectionName);
            this._nameToSection.set(sectionName, sectionElement);
        }
        return sectionElement;
    }

}



//=============

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



CTRL._settingsController= new CTRL.SettingsController();