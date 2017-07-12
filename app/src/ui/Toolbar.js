/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {!Element=} parentElement
 */
CTRL.Toolbar = function(parentElement)
{
    /** @type {!Array.<!CTRL.ToolbarItem>} */
    this._items = [];
    this.element = parentElement ? parentElement.createChild("div", "toolbar") : createElementWithClass("div", "toolbar");
    this._shadowRoot = CTRL.createShadowRootWithCoreStyles(this.element);
    this._shadowRoot.appendChild(CTRL.Widget.createStyleElement("ui/toolbar.css"));
    this._contentElement = this._shadowRoot.createChild("div", "toolbar-shadow");
    this._contentElement.createChild("content");
}

CTRL.Toolbar.prototype = {
    makeVertical: function()
    {
        this._contentElement.classList.add("vertical");
    },

    makeBlueOnHover: function()
    {
        this._contentElement.classList.add("blue-on-hover");
    },

    /**
     * @param {boolean} enabled
     */
    setEnabled: function(enabled)
    {
        for (var item of this._items)
            item.setEnabled(enabled);
    },

    /**
     * @param {!CTRL.ToolbarItem} item
     */
    appendToolbarItem: function(item)
    {
        this._items.push(item);
        item._toolbar = this;
        this._contentElement.insertBefore(item.element, this._contentElement.lastChild);
        this._hideSeparatorDupes();
    },

    appendSeparator: function()
    {
        this.appendToolbarItem(new CTRL.ToolbarSeparator());
    },

    removeToolbarItems: function()
    {
        for (var item of this._items)
            delete item._toolbar;
        this._items = [];
        this._contentElement.removeChildren();
        this._contentElement.createChild("content");
    },

    /**
     * @param {string} color
     */
    setColor: function(color)
    {
        var style = createElement("style");
        style.textContent = "button.toolbar-item .glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    },

    /**
     * @param {string} color
     */
    setToggledColor: function(color)
    {
        var style = createElement("style");
        style.textContent = "button.toolbar-item.toggled-on .glyph { background-color: " + color + " !important }";
        this._shadowRoot.appendChild(style);
    },

    _hideSeparatorDupes: function()
    {
        if (!this._items.length)
            return;
        // Don't hide first and last separators if they were added explicitly.
        var previousIsSeparator = this._items[0] instanceof CTRL.ToolbarSeparator;
        var lastSeparator;
        for (var i = 1; i < this._items.length; ++i) {
            if (this._items[i] instanceof CTRL.ToolbarSeparator) {
                this._items[i].setVisible(!previousIsSeparator);
                previousIsSeparator = true;
                lastSeparator = this._items[i];
                continue;
            }
            if (this._items[i].visible()) {
                previousIsSeparator = false;
                lastSeparator = null;
            }
        }
        if (lastSeparator && lastSeparator !== this._items.peekLast())
            lastSeparator.setVisible(false);
    }
}

/**
 * @constructor
 * @extends {CTRL.Object}
 * @param {!Element} element
 */
CTRL.ToolbarItem = function(element)
{
    this.element = element;
    this.element.classList.add("toolbar-item");
    this._enabled = true;
    this._visible = true;
    this.element.addEventListener("mouseenter", this._mouseEnter.bind(this), false);
    this.element.addEventListener("mouseleave", this._mouseLeave.bind(this), false);
}

CTRL.ToolbarItem.prototype = {
    _mouseEnter: function()
    {
        this.element.classList.add("hover");
    },

    _mouseLeave: function()
    {
        this.element.classList.remove("hover");
    },

    /**
     * @param {boolean} value
     */
    setEnabled: function(value)
    {
        if (this._enabled === value)
            return;
        this._enabled = value;
        this._applyEnabledState();
    },

    _applyEnabledState: function()
    {
        this.element.disabled = !this._enabled;
    },

    /**
     * @return {boolean} x
     */
    visible: function()
    {
        return this._visible;
    },

    /**
     * @param {boolean} x
     */
    setVisible: function(x)
    {
        if (this._visible === x)
            return;
        this.element.classList.toggle("hidden", !x);
        this._visible = x;
        if (this._toolbar && !(this instanceof CTRL.ToolbarSeparator))
            this._toolbar._hideSeparatorDupes();
    },

    __proto__: CTRL.Object.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {!Array.<string>} counters
 */
CTRL.ToolbarCounter = function(counters)
{
    CTRL.ToolbarItem.call(this, createElementWithClass("div", "toolbar-counter hidden"));
    this.element.addEventListener("click", this._clicked.bind(this), false);
    /** @type {!Array.<!{element: !Element, counter: string, value: number, title: string}>} */
    this._counters = [];
    for (var i = 0; i < counters.length; ++i) {
        var element = this.element.createChild("span", "toolbar-counter-item");
        var icon = element.createChild("label", "", "dt-icon-label");
        icon.type = counters[i];
        var span = icon.createChild("span");
        this._counters.push({counter: counters[i], element: element, value: 0, title: "", span: span});
    }
    this._update();
}

CTRL.ToolbarCounter.prototype = {
    /**
     * @param {string} counter
     * @param {number} value
     * @param {string} title
     */
    setCounter: function(counter, value, title)
    {
        for (var i = 0; i < this._counters.length; ++i) {
            if (this._counters[i].counter === counter) {
                this._counters[i].value = value;
                this._counters[i].title = title;
                this._update();
                return;
            }
        }
    },

    _update: function()
    {
        var total = 0;
        var title = "";
        for (var i = 0; i < this._counters.length; ++i) {
            var counter = this._counters[i];
            var value = counter.value;
            if (!counter.value) {
                counter.element.classList.add("hidden");
                continue;
            }
            counter.element.classList.remove("hidden");
            counter.element.classList.toggle("toolbar-counter-item-first", !total);
            counter.span.textContent = value;
            total += value;
            if (counter.title) {
                if (title)
                    title += ", ";
                title += counter.title;
            }
        }
        this.element.classList.toggle("hidden", !total);
        CTRL.Tooltip && CTRL.Tooltip.install(this.element, title, this._actionId);
    },

    /**
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        if (this._actionId)
            CTRL.actionRegistry.execute(this._actionId);
        else
            this.dispatchEventToListeners("click", event);
    },

    /**
     * @param {string} actionId
     */
    setAction: function(actionId)
    {
        this._actionId = actionId;
        this._update();
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {string} text
 * @param {string=} className
 */
CTRL.ToolbarText = function(text, className)
{
    CTRL.ToolbarItem.call(this, createElementWithClass("span", "toolbar-text"));
    if (className)
        this.element.classList.add(className);
    this.element.textContent = text;
}

CTRL.ToolbarText.prototype = {
    /**
     * @param {string} text
     */
    setText: function(text)
    {
        this.element.textContent = text;
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {string=} placeholder
 * @param {number=} growFactor
 */
CTRL.ToolbarInput = function(placeholder, growFactor)
{
    CTRL.ToolbarItem.call(this, createElementWithClass("input", "toolbar-item"));
    this.element.addEventListener("input", this._onChangeCallback.bind(this), false);
    if (growFactor)
        this.element.style.flexGrow = growFactor;
    if (placeholder)
        this.element.setAttribute("placeholder", placeholder);
    this._value = "";
}

CTRL.ToolbarInput.Event = {
    TextChanged: "TextChanged"
};

CTRL.ToolbarInput.prototype = {
    /**
     * @param {string} value
     */
    setValue: function(value)
    {
        this._value = value;
        this.element.value = value;
    },

    /**
     * @return {string}
     */
    value: function()
    {
        return this.element.value;
    },

    _onChangeCallback: function()
    {
        this.dispatchEventToListeners(CTRL.ToolbarInput.Event.TextChanged, this.element.value);
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {string} title
 * @param {string} className
 * @param {number=} states
 */
CTRL.ToolbarButtonBase = function(title, className, states)
{
    CTRL.ToolbarItem.call(this, createElementWithClass("button", className + " toolbar-item"));
    this.element.addEventListener("click", this._clicked.bind(this), false);
    this.element.addEventListener("mousedown", this._mouseDown.bind(this), false);
    this.element.addEventListener("mouseup", this._mouseUp.bind(this), false);
    this._longClickController = new CTRL.LongClickController(this.element);
    this._longClickController.addEventListener(CTRL.LongClickController.Events.LongClick, this._onLongClick.bind(this));

    this._states = states;
    if (!states)
        this._states = 2;

    if (states == 2)
        this._state = "off";
    else
        this._state = "0";

    this.setTitle(title);
    this.className = className;
}

CTRL.ToolbarButtonBase.prototype = {
    /**
     * @param {!CTRL.Event} event
     */
    _onLongClick: function(event)
    {
        var nativeEvent = event.data;
        this.dispatchEventToListeners("longClickDown", nativeEvent);
    },

    /**
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        this._longClickController.reset();
        if (this._actionId)
            CTRL.actionRegistry.execute(this._actionId);
        else
            this.dispatchEventToListeners("click", event);
    },

    /**
     * @param {!Event} event
     */
    _mouseDown: function(event)
    {
        this.dispatchEventToListeners("mousedown", event);
    },

    /**
     * @param {!Event} event
     */
    _mouseUp: function(event)
    {
        this.dispatchEventToListeners("mouseup", event);
    },

    /**
     * @param {string} actionId
     */
    setAction: function(actionId)
    {
        this._actionId = actionId;
        CTRL.Tooltip && CTRL.Tooltip.install(this.element, this._title, this._actionId);
    },

    /**
     * @override
     */
    _applyEnabledState: function()
    {
        this.element.disabled = !this._enabled;
        this._longClickController.reset();
    },

    /**
     * @return {boolean}
     */
    enabled: function()
    {
        return this._enabled;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @param {string} title
     */
    setTitle: function(title)
    {
        if (this._title === title)
            return;
        this._title = title;
        CTRL.Tooltip && CTRL.Tooltip.install(this.element, title, this._actionId);
    },

    /**
     * @return {string}
     */
    state: function()
    {
        return this._state;
    },

    /**
     * @param {string} x
     */
    setState: function(x)
    {
        if (this._state === x)
            return;

        this.element.classList.remove("toggled-" + this._state);
        this.element.classList.add("toggled-" + x);
        this._state = x;
    },

    /**
     * @return {boolean}
     */
    toggled: function()
    {
        if (this._states !== 2)
            throw("Only used toggled when there are 2 states, otherwise, use state");
        return this.state() === "on";
    },

    /**
     * @param {boolean} x
     */
    setToggled: function(x)
    {
        if (this._states !== 2)
            throw("Only used toggled when there are 2 states, otherwise, use state");
        this.setState(x ? "on" : "off");
    },

    makeLongClickEnabled: function()
    {
        this._longClickController.enable();
        this._longClickGlyph = this.element.createChild("div", "fill long-click-glyph toolbar-button-theme");
    },

    unmakeLongClickEnabled: function()
    {
        this._longClickController.disable();
        if (this._longClickGlyph)
            this.element.removeChild(this._longClickGlyph);
    },

    /**
     * @param {?function():!Array.<!CTRL.ToolbarButton>} buttonsProvider
     */
    setLongClickOptionsEnabled: function(buttonsProvider)
    {
        if (buttonsProvider) {
            if (!this._longClickOptionsData) {
                this.makeLongClickEnabled();

                var longClickDownListener = this._showOptions.bind(this);
                this.addEventListener("longClickDown", longClickDownListener, this);

                this._longClickOptionsData = {
                    longClickDownListener: longClickDownListener
                };
            }
            this._longClickOptionsData.buttonsProvider = buttonsProvider;
        } else {
            if (!this._longClickOptionsData)
                return;

            this.removeEventListener("longClickDown", this._longClickOptionsData.longClickDownListener, this);
            delete this._longClickOptionsData;

            this.unmakeLongClickEnabled();
        }
    },

    _showOptions: function()
    {
        var buttons = this._longClickOptionsData.buttonsProvider();
        var mainButtonClone = new CTRL.ToolbarButton(this.title(), this.className, this._states);
        mainButtonClone.addEventListener("click", clicked.bind(this));

        /**
         * @param {!CTRL.Event} event
         * @this {CTRL.ToolbarButtonBase}
         */
        function clicked(event)
        {
            this._clicked(/** @type {!Event} */ (event.data));
        }

        mainButtonClone.setState(this.state());
        buttons.push(mainButtonClone);

        var document = this.element.ownerDocument;
        document.documentElement.addEventListener("mouseup", mouseUp, false);

        var optionsGlassPane = new CTRL.GlassPane(document);
        var optionsBar = new CTRL.Toolbar(optionsGlassPane.element);

        optionsBar.element.classList.add("fill");
        optionsBar._contentElement.classList.add("floating");
        const buttonHeight = 26;

        var hostButtonPosition = this.element.totalOffset();

        var topNotBottom = hostButtonPosition.top + buttonHeight * buttons.length < document.documentElement.offsetHeight;

        if (topNotBottom)
            buttons = buttons.reverse();

        optionsBar.element.style.height = (buttonHeight * buttons.length) + "px";
        if (topNotBottom)
            optionsBar.element.style.top = (hostButtonPosition.top + 1) + "px";
        else
            optionsBar.element.style.top = (hostButtonPosition.top - (buttonHeight * (buttons.length - 1))) + "px";
        optionsBar.element.style.left = (hostButtonPosition.left + 1) + "px";

        for (var i = 0; i < buttons.length; ++i) {
            buttons[i].element.addEventListener("mousemove", mouseOver, false);
            buttons[i].element.addEventListener("mouseout", mouseOut, false);
            optionsBar.appendToolbarItem(buttons[i]);
        }
        var hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
        buttons[hostButtonIndex].element.classList.add("emulate-active");

        function mouseOver(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.add("emulate-active");
        }

        function mouseOut(e)
        {
            if (e.which !== 1)
                return;
            var buttonElement = e.target.enclosingNodeOrSelfWithClass("toolbar-item");
            buttonElement.classList.remove("emulate-active");
        }

        function mouseUp(e)
        {
            if (e.which !== 1)
                return;
            optionsGlassPane.dispose();
            document.documentElement.removeEventListener("mouseup", mouseUp, false);

            for (var i = 0; i < buttons.length; ++i) {
                if (buttons[i].element.classList.contains("emulate-active")) {
                    buttons[i].element.classList.remove("emulate-active");
                    buttons[i]._clicked(e);
                    break;
                }
            }
        }
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarButtonBase}
 * @param {string} title
 * @param {string} className
 * @param {number=} states
 */
CTRL.ToolbarButton = function(title, className, states)
{
    CTRL.ToolbarButtonBase.call(this, title, className, states);

    this._glyphElement = this.element.createChild("div", "glyph toolbar-button-theme");
}

CTRL.ToolbarButton.prototype = {
    /**
     * @param {string} iconURL
     */
    setBackgroundImage: function(iconURL)
    {
        this.element.style.backgroundImage = "url(" + iconURL + ")";
        this._glyphElement.classList.add("hidden");
    },

    __proto__: CTRL.ToolbarButtonBase.prototype
}

/**
 * @param {string} actionId
 * @return {!CTRL.ToolbarButton}
 */
CTRL.ToolbarButton.createActionButton = function(actionId)
{
    var registry = CTRL.actionRegistry;
    var button = new CTRL.ToolbarButton(registry.actionTitle(actionId), registry.actionIcon(actionId));
    button.setAction(actionId);
    return button;
}

/**
 * @constructor
 * @extends {CTRL.ToolbarButton}
 * @param {string} title
 * @param {string} className
 * @param {function(!CTRL.ContextMenu)} contextMenuHandler
 */
CTRL.ToolbarMenuButton = function(title, className, contextMenuHandler)
{
    CTRL.ToolbarButton.call(this, title, className);
    this._contextMenuHandler = contextMenuHandler;
}

CTRL.ToolbarMenuButton.prototype = {
    /**
     * @override
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        var contextMenu = new CTRL.ContextMenu(event,
            true,
            this.element.totalOffsetLeft(),
            this.element.totalOffsetTop() + this.element.offsetHeight);
        this._contextMenuHandler(contextMenu);
        contextMenu.show();
    },

    __proto__: CTRL.ToolbarButton.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarButton}
 * @param {!CTRL.Setting} setting
 * @param {string} className
 * @param {string} title
 * @param {string=} toggledTitle
 */
CTRL.ToolbarSettingToggle = function(setting, className, title, toggledTitle)
{
    CTRL.ToolbarButton.call(this, "", className, 2);
    this._defaultTitle = title;
    this._toggledTitle = toggledTitle || title;
    this._setting = setting;
    this._settingChanged();
    this._setting.addChangeListener(this._settingChanged, this);
}

CTRL.ToolbarSettingToggle.prototype = {
    _settingChanged: function()
    {
        var toggled = this._setting.get();
        this.setToggled(toggled);
        this.setTitle(toggled ? this._toggledTitle : this._defaultTitle);
    },

    /**
     * @override
     * @param {!Event} event
     */
    _clicked: function(event)
    {
        this._setting.set(!this.toggled());
        CTRL.ToolbarButton.prototype._clicked.call(this, event);
    },

    __proto__: CTRL.ToolbarButton.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 */
CTRL.ToolbarSeparator = function()
{
    CTRL.ToolbarItem.call(this, createElementWithClass("div", "toolbar-divider"));
}

CTRL.ToolbarSeparator.prototype = {
    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarButtonBase}
 * @param {string} title
 * @param {string} className
 * @param {string} text
 * @param {number=} states
 */
CTRL.ToolbarTextButton = function(title, className, text, states)
{
    CTRL.ToolbarButtonBase.call(this, title, className, states);

    this._textElement = this.element.createChild("div", "toolbar-button-text");
    this._textElement.textContent = text;
}

CTRL.ToolbarTextButton.prototype = {
    __proto__: CTRL.ToolbarButtonBase.prototype
}

/**
 * @interface
 */
CTRL.ToolbarItem.Provider = function()
{
}

CTRL.ToolbarItem.Provider.prototype = {
    /**
     * @return {?CTRL.ToolbarItem}
     */
    item: function() {}
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {?function(!Event)} changeHandler
 * @param {string=} className
 */
CTRL.ToolbarComboBox = function(changeHandler, className)
{
    CTRL.ToolbarItem.call(this, createElementWithClass("span", "toolbar-select-container"));

    this._selectElement = this.element.createChild("select", "toolbar-item");
    this.element.createChild("div", "toolbar-select-arrow");
    if (changeHandler)
        this._selectElement.addEventListener("change", changeHandler, false);
    if (className)
        this._selectElement.classList.add(className);
}

CTRL.ToolbarComboBox.prototype = {
    /**
     * @return {!HTMLSelectElement}
     */
    selectElement: function()
    {
        return /** @type {!HTMLSelectElement} */ (this._selectElement);
    },

    /**
     * @return {number}
     */
    size: function()
    {
        return this._selectElement.childElementCount;
    },

    /**
     * @return {!Array.<!Element>}
     */
    options: function()
    {
        return Array.prototype.slice.call(this._selectElement.children, 0);
    },

    /**
     * @param {!Element} option
     */
    addOption: function(option)
    {
        this._selectElement.appendChild(option);
    },

    /**
     * @param {string} label
     * @param {string=} title
     * @param {string=} value
     * @return {!Element}
     */
    createOption: function(label, title, value)
    {
        var option = this._selectElement.createChild("option");
        option.text = label;
        if (title)
            option.title = title;
        if (typeof value !== "undefined")
            option.value = value;
        return option;
    },

    /**
     * @override
     */
    _applyEnabledState: function()
    {
        this._selectElement.disabled = !this._enabled;
    },

    /**
     * @param {!Element} option
     */
    removeOption: function(option)
    {
        this._selectElement.removeChild(option);
    },

    removeOptions: function()
    {
        this._selectElement.removeChildren();
    },

    /**
     * @return {?Element}
     */
    selectedOption: function()
    {
        if (this._selectElement.selectedIndex >= 0)
            return this._selectElement[this._selectElement.selectedIndex];
        return null;
    },

    /**
     * @param {!Element} option
     */
    select: function(option)
    {
        this._selectElement.selectedIndex = Array.prototype.indexOf.call(/** @type {?} */ (this._selectElement), option);
    },

    selectValue: function(val)
    {
        var option = this.options().find(function(option){
            return option.value == val;
        })
        if(option)
            this.select(option);
    },

    /**
     * @param {number} index
     */
    setSelectedIndex: function(index)
    {
        this._selectElement.selectedIndex = index;
    },

    /**
     * @return {number}
     */
    selectedIndex: function()
    {
        return this._selectElement.selectedIndex;
    },

    /**
     * @param {number} width
     */
    setMaxWidth: function(width)
    {
        this._selectElement.style.maxWidth = width + "px";
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.ToolbarItem}
 * @param {string} text
 * @param {string=} title
 * @param {!CTRL.Setting=} setting
 */
CTRL.ToolbarCheckbox = function(text, title, setting)
{
    CTRL.ToolbarItem.call(this, createCheckboxLabel(text));
    this.element.classList.add("checkbox");
    this.inputElement = this.element.checkboxElement;
    if (title)
        this.element.title = title;
    if (setting)
        CTRL.SettingsUI.bindCheckbox(this.inputElement, setting);
}

CTRL.ToolbarCheckbox.prototype = {
    /**
     * @return {boolean}
     */
    checked: function()
    {
        return this.inputElement.checked;
    },

    __proto__: CTRL.ToolbarItem.prototype
}

/**
 * @constructor
 * @extends {CTRL.Toolbar}
 * @param {string} location
 * @param {!Element=} parentElement
 */
CTRL.ExtensibleToolbar = function(location, parentElement)
{
    CTRL.Toolbar.call(this, parentElement);
    this._loadItems(location);
}

CTRL.ExtensibleToolbar.prototype = {
    /**
     * @param {string} location
     */
    _loadItems: function(location)
    {
        var extensions = self.runtime.extensions(CTRL.ToolbarItem.Provider);
        var promises = [];
        for (var i = 0; i < extensions.length; ++i) {
            if (extensions[i].descriptor()["location"] === location)
                promises.push(resolveItem(extensions[i]));
        }
        Promise.all(promises).then(appendItemsInOrder.bind(this));

        /**
         * @param {!Runtime.Extension} extension
         * @return {!Promise.<?CTRL.ToolbarItem>}
         */
        function resolveItem(extension)
        {
            var descriptor = extension.descriptor();
            if (descriptor["separator"])
                return Promise.resolve(/** @type {?CTRL.ToolbarItem} */(new CTRL.ToolbarSeparator()));
            if (!descriptor["className"])
                return Promise.resolve(new CTRL.ToolbarButton(CTRL.UIString(descriptor["title"]), descriptor["elementClass"])).then(attachHandler);
            return extension.instancePromise().then(fetchItemFromProvider).then(attachHandler);

            /**
             * @param {!Object} provider
             */
            function fetchItemFromProvider(provider)
            {
                return /** @type {!CTRL.ToolbarItem.Provider} */ (provider).item();
            }

            /**
             * @param {?CTRL.ToolbarItem} item
             * @return {?CTRL.ToolbarItem} item
             */
            function attachHandler(item)
            {
                var actionId = extension.descriptor()["actionId"];
                if (actionId && item && (item instanceof CTRL.ToolbarButtonBase || item instanceof CTRL.ToolbarCounter))
                    item.setAction(actionId);
                else if (actionId)
                    console.error("Can only set action " + actionId + " for a button or counter.");
                return item;
            }
        }

        /**
         * @param {!Array.<?CTRL.ToolbarItem>} items
         * @this {CTRL.ExtensibleToolbar}
         */
        function appendItemsInOrder(items)
        {
            for (var i = 0; i < items.length; ++i) {
                var item = items[i];
                if (item)
                    this.appendToolbarItem(item);
            }
        }
    },

    __proto__: CTRL.Toolbar.prototype
}