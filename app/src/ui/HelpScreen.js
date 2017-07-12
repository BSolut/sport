CTRL.HelpScreen = function(title)
{
    CTRL.VBox.call(this);
    this.markAsRoot();
    this.registerRequiredCSS("ui/helpScreen.css");

    this.element.classList.add("help-window-outer");
    this.element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this.element.tabIndex = 0;

    if (title) {
        var mainWindow = this.element.createChild("div", "help-window-main");
        var captionWindow = mainWindow.createChild("div", "help-window-caption");
        captionWindow.appendChild(this.createCloseButton());
        this.helpContentElement = mainWindow.createChild("div", "help-content");
        captionWindow.createChild("h1", "help-window-title").textContent = title;
    }
}

/**
 * @type {?WebInspector.HelpScreen}
 */
CTRL.HelpScreen._visibleScreen = null;

CTRL.HelpScreen.prototype = {
    __proto__: CTRL.VBox.prototype,
    /**
     * @return {!Element}
     */
    createCloseButton: function()
    {
        var closeButton = createElementWithClass("div", "help-close-button", "dt-close-button");
        closeButton.gray = true;
        closeButton.addEventListener("click", this.hide.bind(this), false);
        return closeButton;
    },

    showModal: function()
    {
        var visibleHelpScreen = CTRL.HelpScreen._visibleScreen;
        if (visibleHelpScreen === this)
            return;

        if (visibleHelpScreen)
            visibleHelpScreen.hide();
        CTRL.HelpScreen._visibleScreen = this;
        CTRL.GlassPane.DefaultFocusedViewStack.push(this);
        this.show(CTRL.Dialog.modalHostView().element);
        this.focus();
    },

    hide: function()
    {
        if (!this.isShowing())
            return;

        CTRL.HelpScreen._visibleScreen = null;
        CTRL.GlassPane.DefaultFocusedViewStack.pop();

        CTRL.restoreFocusFromElement(this.element);
        this.detach();
    },

    /**
     * @param {number} keyCode
     * @return {boolean}
     */
    isClosingKey: function(keyCode)
    {
        return [
            CTRL.KeyboardShortcut.Keys.Enter.code,
            CTRL.KeyboardShortcut.Keys.Esc.code,
            CTRL.KeyboardShortcut.Keys.Space.code,
        ].indexOf(keyCode) >= 0;
    },

    _onKeyDown: function(event)
    {
        if (this.isShowing() && this.isClosingKey(event.keyCode)) {
            this.hide();
            event.consume();
        }
    }
}
