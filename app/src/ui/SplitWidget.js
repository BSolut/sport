CTRL.SplitWidget = function(isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight, constraintsInDip)
{
    CTRL.Widget.call(this, true);
    this.element.classList.add("split-widget");
    this.registerRequiredCSS("ui/splitWidget.css");

    this.contentElement.classList.add("shadow-split-widget");
    this._mainElement = this.contentElement.createChild("div", "shadow-split-widget-contents shadow-split-widget-main vbox");
    this._mainElement.createChild("content").select = ".insertion-point-main";
    this._sidebarElement = this.contentElement.createChild("div", "shadow-split-widget-contents shadow-split-widget-sidebar vbox");
    this._sidebarElement.createChild("content").select = ".insertion-point-sidebar";
    this._resizerElement = this.contentElement.createChild("div", "shadow-split-widget-resizer");

    this._resizerWidget = new CTRL.SimpleResizerWidget();
    this._resizerWidget.setEnabled(true);
    this._resizerWidget.addEventListener(CTRL.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
    this._resizerWidget.addEventListener(CTRL.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate, this);
    this._resizerWidget.addEventListener(CTRL.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);

    this._defaultSidebarWidth = defaultSidebarWidth || 200;
    this._defaultSidebarHeight = defaultSidebarHeight || this._defaultSidebarWidth;
    this._constraintsInDip = !!constraintsInDip;
    //TODO this._setting = settingName ? CTRL.settings.createSetting(settingName, {}) : null;

    this.setSecondIsSidebar(secondIsSidebar);

    this._innerSetVertical(isVertical);
    this._showMode = CTRL.SplitWidget.ShowMode.Both;

    // Should be called after isVertical has the right value.
    this.installResizer(this._resizerElement);
}

/** @typedef {{showMode: string, size: number}} */
CTRL.SplitWidget.SettingForOrientation;

CTRL.SplitWidget.ShowMode = {
    Both: "Both",
    OnlyMain: "OnlyMain",
    OnlySidebar: "OnlySidebar"
}

CTRL.SplitWidget.Events = {
    SidebarSizeChanged: "SidebarSizeChanged",
    ShowModeChanged: "ShowModeChanged"
}

CTRL.SplitWidget.MinPadding = 20;

CTRL.SplitWidget.prototype = {
    /**
     * @return {boolean}
     */
    isVertical: function()
    {
        return this._isVertical;
    },

    /**
     * @param {boolean} isVertical
     */
    setVertical: function(isVertical)
    {
        if (this._isVertical === isVertical)
            return;

        this._innerSetVertical(isVertical);

        if (this.isShowing())
            this._updateLayout();
    },

    /**
     * @param {boolean} isVertical
     */
    _innerSetVertical: function(isVertical)
    {
        this.contentElement.classList.toggle("vbox", !isVertical);
        this.contentElement.classList.toggle("hbox", isVertical);
        this._isVertical = isVertical;

        delete this._resizerElementSize;
        this._sidebarSizeDIP = -1;
        this._restoreSidebarSizeFromSettings();
        if (this._shouldSaveShowMode)
            this._restoreAndApplyShowModeFromSettings();
        this._updateShowHideSidebarButton();
        // FIXME: reverse SplitWidget.isVertical meaning.
        this._resizerWidget.setVertical(!isVertical);
        this.invalidateConstraints();
    },

    /**
     * @param {boolean=} animate
     */
    _updateLayout: function(animate)
    {
        delete this._totalSizeCSS; // Lazy update.
        delete this._totalSizeOtherDimensionCSS;

        // Remove properties that might affect total size calculation.
        this._mainElement.style.removeProperty("width");
        this._mainElement.style.removeProperty("height");
        this._sidebarElement.style.removeProperty("width");
        this._sidebarElement.style.removeProperty("height");

        this._innerSetSidebarSizeDIP(this._preferredSidebarSizeDIP(), !!animate);
    },

    /**
     * @param {!CTRL.Widget} widget
     */
    setMainWidget: function(widget)
    {
        if (this._mainWidget)
            this._mainWidget.detach();
        this._mainWidget = widget;
        if (widget) {
            widget.element.classList.add("insertion-point-main");
            widget.element.classList.remove("insertion-point-sidebar");
            if (this._showMode === CTRL.SplitWidget.ShowMode.OnlyMain || this._showMode === CTRL.SplitWidget.ShowMode.Both)
                widget.show(this.element);
        }
    },

    /**
     * @param {!CTRL.Widget} widget
     */
    setSidebarWidget: function(widget)
    {
        if (this._sidebarWidget)
            this._sidebarWidget.detach();
        this._sidebarWidget = widget;
        if (widget) {
            widget.element.classList.add("insertion-point-sidebar");
            widget.element.classList.remove("insertion-point-main");
            if (this._showMode === CTRL.SplitWidget.ShowMode.OnlySidebar || this._showMode === CTRL.SplitWidget.ShowMode.Both)
                widget.show(this.element);
        }
    },

    /**
     * @return {?CTRL.Widget}
     */
    mainWidget: function()
    {
        return this._mainWidget;
    },

    /**
     * @return {?CTRL.Widget}
     */
    sidebarWidget: function()
    {
        return this._sidebarWidget;
    },

    /**
     * @override
     * @param {!CTRL.Widget} widget
     */
    childWasDetached: function(widget)
    {
        if (this._detaching)
            return;
        if (this._mainWidget === widget)
            delete this._mainWidget;
        if (this._sidebarWidget === widget)
            delete this._sidebarWidget;
    },

    /**
     * @return {boolean}
     */
    isSidebarSecond: function()
    {
        return this._secondIsSidebar;
    },

    enableShowModeSaving: function()
    {
        this._shouldSaveShowMode = true;
        this._restoreAndApplyShowModeFromSettings();
    },

    /**
     * @return {string}
     */
    showMode: function()
    {
        return this._showMode;
    },

    /**
     * @param {boolean} secondIsSidebar
     */
    setSecondIsSidebar: function(secondIsSidebar)
    {
        this.contentElement.classList.toggle("shadow-split-widget-first-is-sidebar", !secondIsSidebar);
        this._secondIsSidebar = secondIsSidebar;
    },

    /**
     * @return {?string}
     */
    sidebarSide: function()
    {
        if (this._showMode !== CTRL.SplitWidget.ShowMode.Both)
            return null;
        return this._isVertical ?
            (this._secondIsSidebar ? "right" : "left") :
            (this._secondIsSidebar ? "bottom" : "top");
    },

    /**
     * @return {!Element}
     */
    resizerElement: function()
    {
        return this._resizerElement;
    },

    /**
     * @param {boolean=} animate
     */
    hideMain: function(animate)
    {
        this._showOnly(this._sidebarWidget, this._mainWidget, this._sidebarElement, this._mainElement, animate);
        this._updateShowMode(CTRL.SplitWidget.ShowMode.OnlySidebar);
    },

    /**
     * @param {boolean=} animate
     */
    hideSidebar: function(animate)
    {
        this._showOnly(this._mainWidget, this._sidebarWidget, this._mainElement, this._sidebarElement, animate);
        this._updateShowMode(CTRL.SplitWidget.ShowMode.OnlyMain);
    },

    /**
     * @param {!CTRL.Widget} sideToShow
     * @param {!CTRL.Widget} sideToHide
     * @param {!Element} shadowToShow
     * @param {!Element} shadowToHide
     * @param {boolean=} animate
     */
    _showOnly: function(sideToShow, sideToHide, shadowToShow, shadowToHide, animate)
    {
        this._cancelAnimation();

        /**
         * @this {CTRL.SplitWidget}
         */
        function callback()
        {
            if (sideToShow) {
                // Make sure main is first in the children list.
                if (sideToShow === this._mainWidget)
                    this._mainWidget.show(this.element, this._sidebarWidget ? this._sidebarWidget.element : null);
                else
                    this._sidebarWidget.show(this.element);
            }
            if (sideToHide) {
                this._detaching = true;
                sideToHide.detach();
                delete this._detaching;
            }

            this._resizerElement.classList.add("hidden");
            shadowToShow.classList.remove("hidden");
            shadowToShow.classList.add("maximized");
            shadowToHide.classList.add("hidden");
            shadowToHide.classList.remove("maximized");
            this._removeAllLayoutProperties();
            this.doResize();
        }

        if (animate)
            this._animate(true, callback.bind(this));
        else
            callback.call(this);

        this._sidebarSizeDIP = -1;
        this.setResizable(false);
    },

    _removeAllLayoutProperties: function()
    {
        this._sidebarElement.style.removeProperty("flexBasis");

        this._mainElement.style.removeProperty("width");
        this._mainElement.style.removeProperty("height");
        this._sidebarElement.style.removeProperty("width");
        this._sidebarElement.style.removeProperty("height");

        this._resizerElement.style.removeProperty("left");
        this._resizerElement.style.removeProperty("right");
        this._resizerElement.style.removeProperty("top");
        this._resizerElement.style.removeProperty("bottom");

        this._resizerElement.style.removeProperty("margin-left");
        this._resizerElement.style.removeProperty("margin-right");
        this._resizerElement.style.removeProperty("margin-top");
        this._resizerElement.style.removeProperty("margin-bottom");
    },

    /**
     * @param {boolean=} animate
     */
    showBoth: function(animate)
    {
        if (this._showMode === CTRL.SplitWidget.ShowMode.Both)
            animate = false;

        this._cancelAnimation();
        this._mainElement.classList.remove("maximized", "hidden");
        this._sidebarElement.classList.remove("maximized", "hidden");
        this._resizerElement.classList.remove("hidden");

        // Make sure main is the first in the children list.
        if (this._sidebarWidget)
            this._sidebarWidget.show(this.element);
        if (this._mainWidget)
            this._mainWidget.show(this.element, this._sidebarWidget ? this._sidebarWidget.element : null);
        // Order widgets in DOM properly.
        this.setSecondIsSidebar(this._secondIsSidebar);

        this._sidebarSizeDIP = -1;
        this.setResizable(true);
        this._updateShowMode(CTRL.SplitWidget.ShowMode.Both);
        this._updateLayout(animate);
    },

    /**
     * @param {boolean} resizable
     */
    setResizable: function(resizable)
    {
        this._resizerWidget.setEnabled(resizable);
    },

    /**
     * @return {boolean}
     */
    isResizable: function()
    {
        return this._resizerWidget.isEnabled();
    },

    /**
     * @param {number} size
     */
    setSidebarSize: function(size)
    {
        var sizeDIP = CTRL.zoomManager.cssToDIP(size);
        this._savedSidebarSizeDIP = sizeDIP;
        this._saveSetting();
        this._innerSetSidebarSizeDIP(sizeDIP, false, true);
    },

    /**
     * @return {number}
     */
    sidebarSize: function()
    {
        var sizeDIP = Math.max(0, this._sidebarSizeDIP);
        return CTRL.zoomManager.dipToCSS(sizeDIP);
    },

    /**
     * Returns total size in DIP.
     * @return {number}
     */
    _totalSizeDIP: function()
    {
        if (!this._totalSizeCSS) {
            this._totalSizeCSS = this._isVertical ? this.contentElement.offsetWidth : this.contentElement.offsetHeight;
            this._totalSizeOtherDimensionCSS = this._isVertical ? this.contentElement.offsetHeight : this.contentElement.offsetWidth;
        }
        return CTRL.zoomManager.cssToDIP(this._totalSizeCSS);
    },

    /**
     * @param {string} showMode
     */
    _updateShowMode: function(showMode)
    {
        this._showMode = showMode;
        this._saveShowModeToSettings();
        this._updateShowHideSidebarButton();
        this.dispatchEventToListeners(CTRL.SplitWidget.Events.ShowModeChanged, showMode);
        this.invalidateConstraints();
    },

    /**
     * @param {number} sizeDIP
     * @param {boolean} animate
     * @param {boolean=} userAction
     */
    _innerSetSidebarSizeDIP: function(sizeDIP, animate, userAction)
    {
        if (this._showMode !== CTRL.SplitWidget.ShowMode.Both || !this.isShowing())
            return;

        sizeDIP = this._applyConstraints(sizeDIP, userAction);
        if (this._sidebarSizeDIP === sizeDIP)
            return;

        if (!this._resizerElementSize)
            this._resizerElementSize = this._isVertical ? this._resizerElement.offsetWidth : this._resizerElement.offsetHeight;

        // Invalidate layout below.

        this._removeAllLayoutProperties();

        // this._totalSizeDIP is available below since we successfully applied constraints.
        var sidebarSizeValue = CTRL.zoomManager.dipToCSS(sizeDIP) + "px";
        var mainSizeValue = (this._totalSizeCSS - CTRL.zoomManager.dipToCSS(sizeDIP)) + "px";
        this._sidebarElement.style.flexBasis = sidebarSizeValue;

        // Make both sides relayout boundaries.
        if (this._isVertical) {
            this._sidebarElement.style.width = sidebarSizeValue;
            this._mainElement.style.width = mainSizeValue;
            this._sidebarElement.style.height = this._totalSizeOtherDimensionCSS + "px";
            this._mainElement.style.height = this._totalSizeOtherDimensionCSS + "px";
        } else {
            this._sidebarElement.style.height = sidebarSizeValue;
            this._mainElement.style.height = mainSizeValue;
            this._sidebarElement.style.width = this._totalSizeOtherDimensionCSS + "px";
            this._mainElement.style.width = this._totalSizeOtherDimensionCSS + "px";
        }

        // Position resizer.
        if (this._isVertical) {
            if (this._secondIsSidebar) {
                this._resizerElement.style.right = sidebarSizeValue;
                this._resizerElement.style.marginRight = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.left = sidebarSizeValue;
                this._resizerElement.style.marginLeft = -this._resizerElementSize / 2 + "px";
            }
        } else {
            if (this._secondIsSidebar) {
                this._resizerElement.style.bottom = sidebarSizeValue;
                this._resizerElement.style.marginBottom = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.top = sidebarSizeValue;
                this._resizerElement.style.marginTop = -this._resizerElementSize / 2 + "px";
            }
        }

        this._sidebarSizeDIP = sizeDIP;

        // Force layout.

        if (animate) {
            this._animate(false);
        } else {
            // No need to recalculate this._sidebarSizeDIP and this._totalSizeDIP again.
            this.doResize();
            this.dispatchEventToListeners(CTRL.SplitWidget.Events.SidebarSizeChanged, this.sidebarSize());
        }
    },

    /**
     * @param {boolean} reverse
     * @param {function()=} callback
     */
    _animate: function(reverse, callback)
    {
        var animationTime = 50;
        this._animationCallback = callback;

        var animatedMarginPropertyName;
        if (this._isVertical)
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-right" : "margin-left";
        else
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-bottom" : "margin-top";

        var marginFrom = reverse ? "0" : "-" + CTRL.zoomManager.dipToCSS(this._sidebarSizeDIP) + "px";
        var marginTo = reverse ? "-" + CTRL.zoomManager.dipToCSS(this._sidebarSizeDIP) + "px" : "0";

        // This order of things is important.
        // 1. Resize main element early and force layout.
        this.contentElement.style.setProperty(animatedMarginPropertyName, marginFrom);
        if (!reverse) {
            suppressUnused(this._mainElement.offsetWidth);
            suppressUnused(this._sidebarElement.offsetWidth);
        }

        // 2. Issue onresize to the sidebar element, its size won't change.
        if (!reverse)
            this._sidebarWidget.doResize();

        // 3. Configure and run animation
        this.contentElement.style.setProperty("transition", animatedMarginPropertyName + " " + animationTime + "ms linear");

        var boundAnimationFrame;
        var startTime;
        /**
         * @this {CTRL.SplitWidget}
         */
        function animationFrame()
        {
            delete this._animationFrameHandle;

            if (!startTime) {
                // Kick animation on first frame.
                this.contentElement.style.setProperty(animatedMarginPropertyName, marginTo);
                startTime = window.performance.now();
            } else if (window.performance.now() < startTime + animationTime) {
                // Process regular animation frame.
                if (this._mainWidget)
                    this._mainWidget.doResize();
            } else {
                // Complete animation.
                this._cancelAnimation();
                if (this._mainWidget)
                    this._mainWidget.doResize();
                this.dispatchEventToListeners(CTRL.SplitWidget.Events.SidebarSizeChanged, this.sidebarSize());
                return;
            }
            this._animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
        }
        boundAnimationFrame = animationFrame.bind(this);
        this._animationFrameHandle = this.contentElement.window().requestAnimationFrame(boundAnimationFrame);
    },

    _cancelAnimation: function()
    {
        this.contentElement.style.removeProperty("margin-top");
        this.contentElement.style.removeProperty("margin-right");
        this.contentElement.style.removeProperty("margin-bottom");
        this.contentElement.style.removeProperty("margin-left");
        this.contentElement.style.removeProperty("transition");

        if (this._animationFrameHandle) {
            this.contentElement.window().cancelAnimationFrame(this._animationFrameHandle);
            delete this._animationFrameHandle;
        }
        if (this._animationCallback) {
            this._animationCallback();
            delete this._animationCallback;
        }
    },

    /**
     * @param {number} sidebarSize
     * @param {boolean=} userAction
     * @return {number}
     */
    _applyConstraints: function(sidebarSize, userAction)
    {
        var totalSize = this._totalSizeDIP();
        var zoomFactor = this._constraintsInDip ? 1 : CTRL.zoomManager.zoomFactor();

        var constraints = this._sidebarWidget ? this._sidebarWidget.constraints() : new Constraints();
        var minSidebarSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
        if (!minSidebarSize)
            minSidebarSize = CTRL.SplitWidget.MinPadding;
        minSidebarSize *= zoomFactor;

        var preferredSidebarSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
        if (!preferredSidebarSize)
            preferredSidebarSize = CTRL.SplitWidget.MinPadding;
        preferredSidebarSize *= zoomFactor;
        // Allow sidebar to be less than preferred by explicit user action.
        if (sidebarSize < preferredSidebarSize)
            preferredSidebarSize = Math.max(sidebarSize, minSidebarSize);
        preferredSidebarSize += zoomFactor; // 1 css pixel for splitter border.

        constraints = this._mainWidget ? this._mainWidget.constraints() : new Constraints();
        var minMainSize = this.isVertical() ? constraints.minimum.width : constraints.minimum.height;
        if (!minMainSize)
            minMainSize = CTRL.SplitWidget.MinPadding;
        minMainSize *= zoomFactor;

        var preferredMainSize = this.isVertical() ? constraints.preferred.width : constraints.preferred.height;
        if (!preferredMainSize)
            preferredMainSize = CTRL.SplitWidget.MinPadding;
        preferredMainSize *= zoomFactor;
        var savedMainSize = this.isVertical() ? this._savedVerticalMainSize : this._savedHorizontalMainSize;
        if (typeof savedMainSize !== "undefined")
            preferredMainSize = Math.min(preferredMainSize, savedMainSize * zoomFactor);
        if (userAction)
            preferredMainSize = minMainSize;

        // Enough space for preferred.
        var totalPreferred = preferredMainSize + preferredSidebarSize;
        if (totalPreferred <= totalSize)
            return Number.constrain(sidebarSize, preferredSidebarSize, totalSize - preferredMainSize);

        // Enough space for minimum.
        if (minMainSize + minSidebarSize <= totalSize) {
            var delta = totalPreferred - totalSize;
            var sidebarDelta = delta * preferredSidebarSize / totalPreferred;
            sidebarSize = preferredSidebarSize - sidebarDelta;
            return Number.constrain(sidebarSize, minSidebarSize, totalSize - minMainSize);
        }

        // Not enough space even for minimum sizes.
        return Math.max(0, totalSize - minMainSize);
    },

    wasShown: function()
    {
        this._forceUpdateLayout();
        CTRL.zoomManager.addEventListener(CTRL.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    },

    willHide: function()
    {
        CTRL.zoomManager.removeEventListener(CTRL.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    },

    onResize: function()
    {
        this._updateLayout();
    },

    onLayout: function()
    {
        this._updateLayout();
    },

    /**
     * @override
     * @return {!Constraints}
     */
    calculateConstraints: function()
    {
        if (this._showMode === CTRL.SplitWidget.ShowMode.OnlyMain)
            return this._mainWidget ? this._mainWidget.constraints() : new Constraints();
        if (this._showMode === CTRL.SplitWidget.ShowMode.OnlySidebar)
            return this._sidebarWidget ? this._sidebarWidget.constraints() : new Constraints();

        var mainConstraints = this._mainWidget ? this._mainWidget.constraints() : new Constraints();
        var sidebarConstraints = this._sidebarWidget ? this._sidebarWidget.constraints() : new Constraints();
        var min = CTRL.SplitWidget.MinPadding;
        if (this._isVertical) {
            mainConstraints = mainConstraints.widthToMax(min).addWidth(1); // 1 for splitter
            sidebarConstraints = sidebarConstraints.widthToMax(min);
            return mainConstraints.addWidth(sidebarConstraints).heightToMax(sidebarConstraints);
        } else {
            mainConstraints = mainConstraints.heightToMax(min).addHeight(1); // 1 for splitter
            sidebarConstraints = sidebarConstraints.heightToMax(min);
            return mainConstraints.widthToMax(sidebarConstraints).addHeight(sidebarConstraints);
        }
    },

    /**
     * @param {!CTRL.Event} event
     */
    _onResizeStart: function(event)
    {
        this._resizeStartSizeDIP = this._sidebarSizeDIP;
    },

    /**
     * @param {!CTRL.Event} event
     */
    _onResizeUpdate: function(event)
    {
        var offset = event.data.currentPosition - event.data.startPosition;
        var offsetDIP = CTRL.zoomManager.cssToDIP(offset);
        var newSizeDIP = this._secondIsSidebar ? this._resizeStartSizeDIP - offsetDIP : this._resizeStartSizeDIP + offsetDIP;
        var constrainedSizeDIP = this._applyConstraints(newSizeDIP, true);
        this._savedSidebarSizeDIP = constrainedSizeDIP;
        this._saveSetting();
        this._innerSetSidebarSizeDIP(constrainedSizeDIP, false, true);
        if (this.isVertical())
            this._savedVerticalMainSize = this._totalSizeDIP() - this._sidebarSizeDIP;
        else
            this._savedHorizontalMainSize = this._totalSizeDIP() - this._sidebarSizeDIP;
    },

    /**
     * @param {!CTRL.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStartSizeDIP;
    },

    hideDefaultResizer: function()
    {
        this.uninstallResizer(this._resizerElement);
    },

    /**
     * @param {!Element} resizerElement
     */
    installResizer: function(resizerElement)
    {
        this._resizerWidget.addElement(resizerElement);
    },

    /**
     * @param {!Element} resizerElement
     */
    uninstallResizer: function(resizerElement)
    {
        this._resizerWidget.removeElement(resizerElement);
    },

    /**
     * @return {boolean}
     */
    hasCustomResizer: function()
    {
        var elements = this._resizerWidget.elements();
        return elements.length > 1 || (elements.length == 1 && elements[0] !== this._resizerElement);
    },

    /**
     * @param {!Element} resizer
     * @param {boolean} on
     */
    toggleResizer: function(resizer, on)
    {
        if (on)
            this.installResizer(resizer);
        else
            this.uninstallResizer(resizer);
    },

    /**
     * @return {?CTRL.SplitWidget.SettingForOrientation}
     */
    _settingForOrientation: function()
    {
        var state = this._setting ? this._setting.get() : {};
        return this._isVertical ? state.vertical : state.horizontal;
    },

    /**
     * @return {number}
     */
    _preferredSidebarSizeDIP: function()
    {
        var size = this._savedSidebarSizeDIP;
        if (!size) {
            size = this._isVertical ? this._defaultSidebarWidth : this._defaultSidebarHeight;
            // If we have default value in percents, calculate it on first use.
            if (0 < size && size < 1)
                size *= this._totalSizeDIP();
        }
        return size;
    },

    _restoreSidebarSizeFromSettings: function()
    {
        var settingForOrientation = this._settingForOrientation();
        this._savedSidebarSizeDIP = settingForOrientation ? settingForOrientation.size : 0;
    },

    _restoreAndApplyShowModeFromSettings: function()
    {
        var orientationState = this._settingForOrientation();
        this._savedShowMode = orientationState && orientationState.showMode ? orientationState.showMode : this._showMode;
        this._showMode = this._savedShowMode;

        switch (this._savedShowMode) {
        case CTRL.SplitWidget.ShowMode.Both:
            this.showBoth();
            break;
        case CTRL.SplitWidget.ShowMode.OnlyMain:
            this.hideSidebar();
            break;
        case CTRL.SplitWidget.ShowMode.OnlySidebar:
            this.hideMain();
            break;
        }
    },

    _saveShowModeToSettings: function()
    {
        this._savedShowMode = this._showMode;
        this._saveSetting();
    },

    _saveSetting: function()
    {
        if (!this._setting)
            return;
        var state = this._setting.get();
        var orientationState = (this._isVertical ? state.vertical : state.horizontal) || {};

        orientationState.size = this._savedSidebarSizeDIP;
        if (this._shouldSaveShowMode)
            orientationState.showMode = this._savedShowMode;

        if (this._isVertical)
            state.vertical = orientationState;
        else
            state.horizontal = orientationState;
        this._setting.set(state);
    },

    _forceUpdateLayout: function()
    {
        // Force layout even if sidebar size does not change.
        this._sidebarSizeDIP = -1;
        this._updateLayout();
    },

    /**
     * @param {!CTRL.Event} event
     */
    _onZoomChanged: function(event)
    {
        this._forceUpdateLayout();
    },

    /**
     * @param {string} title
     * @param {string=} className
     * @return {!Element}
     */
    displayShowHideSidebarButton: function(title, className)
    {
        console.assert(this.isVertical(), "Buttons for split widget with horizontal split are not supported yet.");

        this._showHideSidebarButtonTitle = CTRL.UIString(title);
        this._showHideSidebarButton = this._mainElement.createChild("button", "sidebar-show-hide-button " + (className || ""));
        this._showHideSidebarButton.addEventListener("click", buttonClicked.bind(this), false);
        this._updateShowHideSidebarButton();

        /**
         * @param {!Event} event
         * @this {CTRL.SplitWidget}
         */
        function buttonClicked(event)
        {
            if (this._showMode !== CTRL.SplitWidget.ShowMode.Both)
                this.showBoth(true);
            else
                this.hideSidebar(true);
        }

        return this._showHideSidebarButton;
    },

    _updateShowHideSidebarButton: function()
    {
        if (!this._showHideSidebarButton)
            return;
        var sidebarHidden = this._showMode === CTRL.SplitWidget.ShowMode.OnlyMain;
        this._showHideSidebarButton.classList.toggle("toggled-show", sidebarHidden);
        this._showHideSidebarButton.classList.toggle("toggled-hide", !sidebarHidden);
        this._showHideSidebarButton.classList.toggle("top-sidebar-show-hide-button", !this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.classList.toggle("right-sidebar-show-hide-button", this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.classList.toggle("bottom-sidebar-show-hide-button", !this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.classList.toggle("left-sidebar-show-hide-button", this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.title = sidebarHidden ? CTRL.UIString("Show %s", this._showHideSidebarButtonTitle) : CTRL.UIString("Hide %s", this._showHideSidebarButtonTitle);
    },

    __proto__: CTRL.Widget.prototype
}
