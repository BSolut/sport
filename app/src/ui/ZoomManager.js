// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {CTRL.Object}
 * @param {!Window} window
 * @param {!InspectorFrontendHostAPI} frontendHost
 */
CTRL.ZoomManager = function(window, frontendHost)
{
    this._frontendHost = frontendHost;
    this._zoomFactor = 1;//this._frontendHost.zoomFactor();
    window.addEventListener("resize", this._onWindowResize.bind(this), true);
};

CTRL.ZoomManager.Events = {
    ZoomChanged: "ZoomChanged"
};

CTRL.ZoomManager.prototype = {
    /**
     * @return {number}
     */
    zoomFactor: function()
    {
        return this._zoomFactor;
    },

    /**
     * @param {number} value
     * @return {number}
     */
    cssToDIP: function(value)
    {
        return value * this._zoomFactor;
    },

    /**
     * @param {number} valueDIP
     * @return {number}
     */
    dipToCSS: function(valueDIP)
    {
        return valueDIP / this._zoomFactor;
    },

    _onWindowResize: function()
    {
        var oldZoomFactor = this._zoomFactor;
        this._zoomFactor = 1; //this._frontendHost.zoomFactor();
        if (oldZoomFactor !== this._zoomFactor)
            this.dispatchEventToListeners(CTRL.ZoomManager.Events.ZoomChanged, {from: oldZoomFactor, to: this._zoomFactor});
    },

    __proto__: CTRL.Object.prototype
};

/**
 * @type {!CTRL.ZoomManager}
 */
CTRL.zoomManager;
