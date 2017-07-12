
CTRL.Widget = function(isWebComponent)
{
    this.contentElement = createElementWithClass("div", "widget");
    if (isWebComponent) {
        this.element = createElementWithClass("div", "vbox flex-auto");
        this._shadowRoot = CTRL.createShadowRootWithCoreStyles(this.element);
        this._shadowRoot.appendChild(this.contentElement);
    } else {
        this.element = this.contentElement;
    }
    this._isWebComponent = isWebComponent;
    this.element.__widget = this;
    this._visible = true;
    this._isRoot = false;
    this._isShowing = false;
    this._children = [];
    this._hideOnDetach = false;
    this._notificationDepth = 0;
}

/**
 * @param {string} cssFile
 * @return {!Element}
 */
CTRL.Widget.createStyleElement = function(cssFile)
{
    var content = Runtime.cachedResources[cssFile] || "";
    if (!content)
        console.error(cssFile + " not preloaded. Check module.json");
    var styleElement = createElement("style");
    styleElement.type = "text/css";
    styleElement.textContent = content;
    styleElement.src = cssFile;

    return styleElement;
}

CTRL.Widget.prototype = {
    markAsRoot: function()
    {
        CTRL.Widget.__assert(!this.element.parentElement, "Attempt to mark as root attached node");
        this._isRoot = true;
    },

    /**
     * @return {?WebInspector.Widget}
     */
    parentWidget: function()
    {
        return this._parentWidget;
    },

    /**
     * @return {!Array.<!WebInspector.Widget>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @param {!WebInspector.Widget} widget
     * @protected
     */
    childWasDetached: function(widget)
    {
    },

    /**
     * @return {boolean}
     */
    isShowing: function()
    {
        return this._isShowing;
    },

    /**
     * @return {boolean}
     */
    shouldHideOnDetach: function()
    {
        if (this._hideOnDetach)
            return true;
        for (var child of this._children) {
            if (child.shouldHideOnDetach())
                return true;
        }
        return false;
    },

    setHideOnDetach: function()
    {
        this._hideOnDetach = true;
    },

    /**
     * @return {boolean}
     */
    _inNotification: function()
    {
        return !!this._notificationDepth || (this._parentWidget && this._parentWidget._inNotification());
    },

    _parentIsShowing: function()
    {
        if (this._isRoot)
            return true;
        return this._parentWidget && this._parentWidget.isShowing();
    },

    /**
     * @param {function(this:WebInspector.Widget)} method
     */
    _callOnVisibleChildren: function(method)
    {
        var copy = this._children.slice();
        for (var i = 0; i < copy.length; ++i) {
            if (copy[i]._parentWidget === this && copy[i]._visible)
                method.call(copy[i]);
        }
    },

    _processWillShow: function()
    {
        this._callOnVisibleChildren(this._processWillShow);
        this._isShowing = true;
    },

    _processWasShown: function()
    {
        if (this._inNotification())
            return;
        this.restoreScrollPositions();
        this._notify(this.wasShown);
        this._callOnVisibleChildren(this._processWasShown);
    },

    _processWillHide: function()
    {
        if (this._inNotification())
            return;
        this.storeScrollPositions();

        this._callOnVisibleChildren(this._processWillHide);
        this._notify(this.willHide);
        this._isShowing = false;
    },

    _processWasHidden: function()
    {
        this._callOnVisibleChildren(this._processWasHidden);
    },

    _processOnResize: function()
    {
        if (this._inNotification())
            return;
        if (!this.isShowing())
            return;
        this._notify(this.onResize);
        this._callOnVisibleChildren(this._processOnResize);
    },

    /**
     * @param {function(this:WebInspector.Widget)} notification
     */
    _notify: function(notification)
    {
        ++this._notificationDepth;
        try {
            notification.call(this);
        } finally {
            --this._notificationDepth;
        }
    },

    wasShown: function()
    {
    },

    willHide: function()
    {
    },

    onResize: function()
    {
    },

    onLayout: function()
    {
    },

    /**
     * @param {?Element} parentElement
     * @param {?Element=} insertBefore
     */
    show: function(parentElement, insertBefore)
    {
        CTRL.Widget.__assert(parentElement, "Attempt to attach widget with no parent element");

        // Update widget hierarchy.
        if (this.element.parentElement !== parentElement) {
            if (this.element.parentElement)
                this.detach();

            var currentParent = parentElement;
            while (currentParent && !currentParent.__widget)
                currentParent = currentParent.parentElementOrShadowHost();

            if (currentParent) {
                this._parentWidget = currentParent.__widget;
                this._parentWidget._children.push(this);
                this._isRoot = false;
            } else
                CTRL.Widget.__assert(this._isRoot, "Attempt to attach widget to orphan node");
        } else if (this._visible) {
            return;
        }

        this._visible = true;

        if (this._parentIsShowing())
            this._processWillShow();

        this.element.classList.remove("hidden");

        // Reparent
        if (this.element.parentElement !== parentElement) {
            CTRL.Widget._incrementWidgetCounter(parentElement, this.element);
            if (insertBefore)
                CTRL.Widget._originalInsertBefore.call(parentElement, this.element, insertBefore);
            else
                CTRL.Widget._originalAppendChild.call(parentElement, this.element);
        }

        if (this._parentIsShowing())
            this._processWasShown();

        if (this._parentWidget && this._hasNonZeroConstraints())
            this._parentWidget.invalidateConstraints();
        else
            this._processOnResize();
    },

    /**
     * @param {boolean=} overrideHideOnDetach
     */
    detach: function(overrideHideOnDetach)
    {
        var parentElement = this.element.parentElement;
        if (!parentElement)
            return;

        if (this._parentIsShowing())
            this._processWillHide();

        if (!overrideHideOnDetach && this.shouldHideOnDetach()) {
            this.element.classList.add("hidden");
            this._visible = false;
            if (this._parentIsShowing())
                this._processWasHidden();
            if (this._parentWidget && this._hasNonZeroConstraints())
                this._parentWidget.invalidateConstraints();
            return;
        }

        // Force legal removal
        CTRL.Widget._decrementWidgetCounter(parentElement, this.element);
        CTRL.Widget._originalRemoveChild.call(parentElement, this.element);

        this._visible = false;
        if (this._parentIsShowing())
            this._processWasHidden();

        // Update widget hierarchy.
        if (this._parentWidget) {
            var childIndex = this._parentWidget._children.indexOf(this);
            CTRL.Widget.__assert(childIndex >= 0, "Attempt to remove non-child widget");
            this._parentWidget._children.splice(childIndex, 1);
            this._parentWidget.childWasDetached(this);
            var parent = this._parentWidget;
            this._parentWidget = null;
            if (this._hasNonZeroConstraints())
                parent.invalidateConstraints();
        } else
            CTRL.Widget.__assert(this._isRoot, "Removing non-root widget from DOM");
    },

    detachChildWidgets: function()
    {
        var children = this._children.slice();
        for (var i = 0; i < children.length; ++i)
            children[i].detach();
    },

    /**
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [this.element];
    },

    storeScrollPositions: function()
    {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            container._scrollTop = container.scrollTop;
            container._scrollLeft = container.scrollLeft;
        }
    },

    restoreScrollPositions: function()
    {
        var elements = this.elementsToRestoreScrollPositionsFor();
        for (var i = 0; i < elements.length; ++i) {
            var container = elements[i];
            if (container._scrollTop)
                container.scrollTop = container._scrollTop;
            if (container._scrollLeft)
                container.scrollLeft = container._scrollLeft;
        }
    },

    doResize: function()
    {
        if (!this.isShowing())
            return;
        // No matter what notification we are in, dispatching onResize is not needed.
        if (!this._inNotification())
            this._callOnVisibleChildren(this._processOnResize);
    },

    doLayout: function()
    {
        if (!this.isShowing())
            return;
        this._notify(this.onLayout);
        this.doResize();
    },

    /**
     * @param {string} cssFile
     */
    registerRequiredCSS: function(cssFile)
    {
        CTRL.appendStyle(this._isWebComponent ? this._shadowRoot : this.element, cssFile);
        //(this._isWebComponent ? this._shadowRoot : this.element).appendChild(CTRL.Widget.createStyleElement(cssFile));
    },

    printWidgetHierarchy: function()
    {
        var lines = [];
        this._collectWidgetHierarchy("", lines);
        console.log(lines.join("\n"));
    },

    _collectWidgetHierarchy: function(prefix, lines)
    {
        lines.push(prefix + "[" + this.element.className + "]" + (this._children.length ? " {" : ""));

        for (var i = 0; i < this._children.length; ++i)
            this._children[i]._collectWidgetHierarchy(prefix + "    ", lines);

        if (this._children.length)
            lines.push(prefix + "}");
    },

    /**
     * @return {!Element}
     */
    defaultFocusedElement: function()
    {
        return this._defaultFocusedElement || this.element;
    },

    /**
     * @param {!Element} element
     */
    setDefaultFocusedElement: function(element)
    {
        this._defaultFocusedElement = element;
    },

    focus: function()
    {
        var element = this.defaultFocusedElement();
        if (!element || element.isAncestor(this.element.ownerDocument.activeElement))
            return;

        CTRL.setCurrentFocusElement(element);
    },

    /**
     * @return {boolean}
     */
    hasFocus: function()
    {
        var activeElement = this.element.ownerDocument.activeElement;
        return activeElement && activeElement.isSelfOrDescendant(this.element);
    },

    /**
     * @return {!Size}
     */
    measurePreferredSize: function()
    {
        var document = this.element.ownerDocument;
        CTRL.Widget._originalAppendChild.call(document.body, this.element);
        this.element.positionAt(0, 0);
        var result = new Size(this.element.offsetWidth, this.element.offsetHeight);
        this.element.positionAt(undefined, undefined);
        CTRL.Widget._originalRemoveChild.call(document.body, this.element);
        return result;
    },

    /**
     * @return {!Constraints}
     */
    calculateConstraints: function()
    {
        return new Constraints();
    },

    /**
     * @return {!Constraints}
     */
    constraints: function()
    {
        if (typeof this._constraints !== "undefined")
            return this._constraints;
        if (typeof this._cachedConstraints === "undefined")
            this._cachedConstraints = this.calculateConstraints();
        return this._cachedConstraints;
    },

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} preferredWidth
     * @param {number} preferredHeight
     */
    setMinimumAndPreferredSizes: function(width, height, preferredWidth, preferredHeight)
    {
        this._constraints = new Constraints(new Size(width, height), new Size(preferredWidth, preferredHeight));
        this.invalidateConstraints();
    },

    /**
     * @param {number} width
     * @param {number} height
     */
    setMinimumSize: function(width, height)
    {
        this._constraints = new Constraints(new Size(width, height));
        this.invalidateConstraints();
    },

    /**
     * @return {boolean}
     */
    _hasNonZeroConstraints: function()
    {
        var constraints = this.constraints();
        return !!(constraints.minimum.width || constraints.minimum.height || constraints.preferred.width || constraints.preferred.height);
    },

    invalidateConstraints: function()
    {
        var cached = this._cachedConstraints;
        delete this._cachedConstraints;
        var actual = this.constraints();
        if (!actual.isEqual(cached) && this._parentWidget)
            this._parentWidget.invalidateConstraints();
        else
            this.doLayout();
    },

    __proto__: CTRL.Object.prototype
}

CTRL.Widget._originalAppendChild = Element.prototype.appendChild;
CTRL.Widget._originalInsertBefore = Element.prototype.insertBefore;
CTRL.Widget._originalRemoveChild = Element.prototype.removeChild;
CTRL.Widget._originalRemoveChildren = Element.prototype.removeChildren;

CTRL.Widget._incrementWidgetCounter = function(parentElement, childElement)
{
    var count = (childElement.__widgetCounter || 0) + (childElement.__widget ? 1 : 0);
    if (!count)
        return;

    while (parentElement) {
        parentElement.__widgetCounter = (parentElement.__widgetCounter || 0) + count;
        parentElement = parentElement.parentElementOrShadowHost();
    }
}

CTRL.Widget._decrementWidgetCounter = function(parentElement, childElement)
{
    var count = (childElement.__widgetCounter || 0) + (childElement.__widget ? 1 : 0);
    if (!count)
        return;

    while (parentElement) {
        parentElement.__widgetCounter -= count;
        parentElement = parentElement.parentElementOrShadowHost();
    }
}

CTRL.Widget.__assert = function(condition, message)
{
    if (!condition) {
        console.trace();
        throw new Error(message);
    }
}





CTRL.VBox = function(isWebComponent)
{
    CTRL.Widget.call(this, isWebComponent);
    this.contentElement.classList.add("vbox");
};

CTRL.VBox.prototype = {
    /**
     * @override
     * @return {!Constraints}
     */
    calculateConstraints: function()
    {
        var constraints = new Constraints();

        function updateForChild()
        {
            var child = this.constraints();
            constraints = constraints.widthToMax(child);
            constraints = constraints.addHeight(child);
        }

        this._callOnVisibleChildren(updateForChild);
        return constraints;
    },

    __proto__: CTRL.Widget.prototype
};

CTRL.HBox = function(isWebComponent)
{
    CTRL.Widget.call(this, isWebComponent);
    this.contentElement.classList.add("hbox");
};

CTRL.HBox.prototype = {
    /**
     * @override
     * @return {!Constraints}
     */
    calculateConstraints: function()
    {
        var constraints = new Constraints();

        function updateForChild()
        {
            var child = this.constraints();
            constraints = constraints.addWidth(child);
            constraints = constraints.heightToMax(child);
        }

        this._callOnVisibleChildren(updateForChild);
        return constraints;
    },

    __proto__: CTRL.Widget.prototype
};

/**
 * @constructor
 * @extends {CTRL.VBox}
 * @param {function()} resizeCallback
 */
CTRL.VBoxWithResizeCallback = function(resizeCallback)
{
    CTRL.VBox.call(this);
    this._resizeCallback = resizeCallback;
}

CTRL.VBoxWithResizeCallback.prototype = {
    onResize: function()
    {
        this._resizeCallback();
    },

    __proto__: CTRL.VBox.prototype
}