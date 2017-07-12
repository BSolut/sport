CTRL.SidebarPane = function(title)
{
    CTRL.Widget.call(this);
    this.setMinimumSize(25, 0);
    this.element.className = "sidebar-pane"; // Override

    this._title = title;
    this._expandCallback = null;
    this._paneVisible = true;
}

CTRL.SidebarPane.prototype = {
    /**
     * @return {!CTRL.Toolbar}
     */
    toolbar: function()
    {
        if (!this._toolbar) {
            this._toolbar = new CTRL.Toolbar();
            this._toolbar.element.addEventListener("click", consumeEvent);
            this.element.insertBefore(this._toolbar.element, this.element.firstChild);
        }
        return this._toolbar;
    },

    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    expand: function()
    {
        this.onContentReady();
    },

    onContentReady: function()
    {
        if (this._expandCallback)
            this._expandCallback();
        else
            this._expandPending = true;
    },

    /**
     * @param {function(boolean)} setVisibleCallback
     * @param {function()} expandCallback
     */
    _attached: function(setVisibleCallback, expandCallback)
    {
        this._setVisibleCallback = setVisibleCallback;
        this._setVisibleCallback(this._paneVisible);

        this._expandCallback = expandCallback;
        if (this._expandPending) {
            delete this._expandPending;
            this._expandCallback();
        }
    },

    /**
     * @param {boolean} visible
     */
    setVisible: function(visible)
    {
        this._paneVisible = visible;
        if (this._setVisibleCallback)
            this._setVisibleCallback(visible)
    },

    __proto__: CTRL.Widget.prototype
}

/**
 * @constructor
 * @param {!Element} container
 * @param {!CTRL.SidebarPane} pane
 */
CTRL.SidebarPaneTitle = function(container, pane)
{
    this._pane = pane;

    this.element = container.createChild("div", "sidebar-pane-title");
    this.element.textContent = pane.title();
    this.element.tabIndex = 0;
    this.element.addEventListener("click", this._toggleExpanded.bind(this), false);
    this.element.addEventListener("keydown", this._onTitleKeyDown.bind(this), false);
}

CTRL.SidebarPaneTitle.prototype = {
    _expand: function()
    {
        this.element.classList.add("expanded");
        this._pane.show(this.element.parentElement, /** @type {?Element} */ (this.element.nextSibling));
    },

    _collapse: function()
    {
        this.element.classList.remove("expanded");
        if (this._pane.element.parentNode == this.element.parentNode)
            this._pane.detach();
    },

    _toggleExpanded: function()
    {
        if (this.element.classList.contains("expanded"))
            this._collapse();
        else
            this._pane.expand();
    },

    /**
     * @param {!Event} event
     */
    _onTitleKeyDown: function(event)
    {
        if (isEnterKey(event) || event.keyCode === CTRL.KeyboardShortcut.Keys.Space.code)
            this._toggleExpanded();
    }
}

/**
 * @constructor
 * @extends {CTRL.Widget}
 */
CTRL.SidebarPaneStack = function()
{
    CTRL.Widget.call(this);
    this.setMinimumSize(25, 0);
    this.element.className = "sidebar-pane-stack"; // Override
    /** @type {!Map.<!CTRL.SidebarPane, !CTRL.SidebarPaneTitle>} */
    this._titleByPane = new Map();
}

CTRL.SidebarPaneStack.prototype = {
    /**
     * @param {!CTRL.SidebarPane} pane
     */
    addPane: function(pane)
    {
        var paneTitle = new CTRL.SidebarPaneTitle(this.element, pane);
        this._titleByPane.set(pane, paneTitle);
        if (pane._toolbar)
            paneTitle.element.appendChild(pane._toolbar.element);
        pane._attached(this._setPaneVisible.bind(this, pane), paneTitle._expand.bind(paneTitle));
    },

    /**
     * @param {!CTRL.SidebarPane} pane
     * @param {boolean} visible
     */
    _setPaneVisible: function(pane, visible)
    {
        var title = this._titleByPane.get(pane);
        if (!title)
            return;

        title.element.classList.toggle("hidden", !visible);
        pane.element.classList.toggle("sidebar-pane-hidden", !visible);
    },

    __proto__: CTRL.Widget.prototype
}

/**
 * @constructor
 * @extends {CTRL.TabbedPane}
 */
CTRL.SidebarTabbedPane = function()
{
    CTRL.TabbedPane.call(this);
    this.element.classList.add("sidebar-tabbed-pane");
}

CTRL.SidebarTabbedPane.prototype = {
    /**
     * @param {!CTRL.SidebarPane} pane
     */
    addPane: function(pane)
    {
        var title = pane.title();
        this.appendTab(title, title, pane);
        if (pane._toolbar)
            pane.element.insertBefore(pane._toolbar.element, pane.element.firstChild);
        pane._attached(this._setPaneVisible.bind(this, pane), this.selectTab.bind(this, title));
    },

    /**
     * @param {!CTRL.SidebarPane} pane
     * @param {boolean} visible
     */
    _setPaneVisible: function(pane, visible)
    {
        var title = pane._title;
        if (visible) {
            if (!this.hasTab(title))
                this.appendTab(title, title, pane);
        } else {
            if (this.hasTab(title))
                this.closeTab(title);
        }
    },

    __proto__: CTRL.TabbedPane.prototype
}
