CTRL.Dialog = function(delegate, modal)
{
    this._delegate = delegate;
    this._modal = modal;

    this._glassPane = new CTRL.GlassPane(/** @type {!Document} */ (CTRL.Dialog._modalHostView.element.ownerDocument));
    CTRL.GlassPane.DefaultFocusedViewStack.push(this);

    // Install glass pane capturing events.
    this._glassPane.element.tabIndex = 0;
    this._glassPane.element.addEventListener("focus", this._onGlassPaneFocus.bind(this), false);
    if (this._modal)
        this._glassPane.element.classList.add("tinted");

    this._element = this._glassPane.element.createChild("div");
    this._element.tabIndex = 0;
    this._element.addEventListener("focus", this._onFocus.bind(this), false);
    this._element.addEventListener("keydown", this._onKeyDown.bind(this), false);
    this._closeKeys = [
        CTRL.KeyboardShortcut.Keys.Enter.code,
        CTRL.KeyboardShortcut.Keys.Esc.code,
    ];

    delegate.show(this._element);

    this._position();
    this._delegate.focus();
}

/**
 * @return {?CTRL.Dialog}
 */
CTRL.Dialog.currentInstance = function()
{
    return CTRL.Dialog._instance;
}

/**
 * @param {!CTRL.DialogDelegate} delegate
 * @param {boolean=} modal
 */
CTRL.Dialog.show = function(delegate, modal)
{
    if (CTRL.Dialog._instance)
        return;
    CTRL.Dialog._instance = new CTRL.Dialog(delegate, modal);
    CTRL.Dialog._instance.focus();
}

CTRL.Dialog.hide = function()
{
    if (!CTRL.Dialog._instance)
        return;
    CTRL.Dialog._instance._hide();
}

CTRL.Dialog.prototype = {
    focus: function()
    {
        this._element.focus();
    },

    _hide: function()
    {
        if (this._isHiding)
            return;
        this._isHiding = true;

        this._delegate.willHide();

        delete CTRL.Dialog._instance;
        CTRL.GlassPane.DefaultFocusedViewStack.pop();
        this._glassPane.dispose();
    },

    /**
     * @param {!Event} event
     */
    _onGlassPaneFocus: function(event)
    {
        if (this._modal)
            return;
        this._hide();
    },

    _onFocus: function(event)
    {
        this._delegate.focus();
    },

    _position: function()
    {
        this._delegate.position(this._element, CTRL.Dialog._modalHostView.element);
    },

    _onKeyDown: function(event)
    {
        if (event.keyCode === CTRL.KeyboardShortcut.Keys.Tab.code) {
            event.preventDefault();
            return;
        }

        if (event.keyCode === CTRL.KeyboardShortcut.Keys.Enter.code)
            this._delegate.onEnter(event);

        this._delegate.onKeyDown(event);

        if (!event.handled && this._closeKeys.indexOf(event.keyCode) >= 0) {
            this._hide();
            event.consume(true);
        }
    }
};

/**
 * @constructor
 * @extends {CTRL.Object}
 */
CTRL.DialogDelegate = function()
{
    this.element = createElement("div");
}

CTRL.DialogDelegate.prototype = {
    /**
     * @param {!Element} element
     */
    show: function(element)
    {
        element.appendChild(this.element);
        this.element.classList.add("dialog-contents");
        element.classList.add("dialog");
    },

    /**
     * @param {!Element} element
     * @param {!Element} container
     */
    position: function(element, container)
    {
        var positionX = (container.offsetWidth - element.offsetWidth) / 2;
        positionX = Number.constrain(positionX, 0, container.offsetWidth - element.offsetWidth);

        var positionY = (container.offsetHeight - element.offsetHeight) / 2;
        positionY = Number.constrain(positionY, 0, container.offsetHeight - element.offsetHeight);

        element.style.position = "absolute";
        element.positionAt(positionX, positionY, container);
    },

    focus: function() { },

    /**
     * @param {!KeyboardEvent} event
     */
    onEnter: function(event) { },

    /**
     * @param {!KeyboardEvent} event
     */
    onKeyDown: function(event) { },

    willHide: function() { },

    __proto__: CTRL.Object.prototype
}

/** @type {?CTRL.Widget} */
CTRL.Dialog._modalHostView = null;

/**
 * @param {!CTRL.Widget} view
 */
CTRL.Dialog.setModalHostView = function(view)
{
    CTRL.Dialog._modalHostView = view;
};

/**
 * FIXME: make utility method in Dialog, so clients use it instead of this getter.
 * Method should be like Dialog.showModalElement(position params, reposition callback).
 * @return {?CTRL.Widget}
 */
CTRL.Dialog.modalHostView = function()
{
    return CTRL.Dialog._modalHostView;
};

CTRL.Dialog.modalHostRepositioned = function()
{
    if (CTRL.Dialog._instance)
        CTRL.Dialog._instance._position();
};

