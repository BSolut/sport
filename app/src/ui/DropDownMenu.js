// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {CTRL.Object}
 * @param {!Element} element
 */
CTRL.DropDownMenu = function(element)
{
    /** @type {!Array.<!CTRL.DropDownMenu.Item>} */
    this._items = [];

    element.addEventListener("mousedown", this._onMouseDown.bind(this));
}

/** @typedef {{id: string, title: string}} */
CTRL.DropDownMenu.Item;

/** @enum {string} */
CTRL.DropDownMenu.Events = {
    ItemSelected: "ItemSelected"
}

CTRL.DropDownMenu.prototype = {
    /**
     * @param {!Event} event
     */
    _onMouseDown: function(event)
    {
        if (event.which !== 1)
            return;
        var menu = new CTRL.ContextMenu(event);
        for (var item of this._items)
            menu.appendCheckboxItem(item.title, this._itemHandler.bind(this, item.id), item.id === this._selectedItemId);
        menu.show();
    },

    /**
     * @param {string} id
     */
    _itemHandler: function(id)
    {
        this.dispatchEventToListeners(CTRL.DropDownMenu.Events.ItemSelected, id);
    },

    /**
     * @param {string} id
     * @param {string} title
     */
    addItem: function(id, title)
    {
        this._items.push({id: id, title: title});
    },

    /**
     * @param {string} id
     */
    selectItem: function(id)
    {
        this._selectedItemId = id;
    },

    clear: function()
    {
        this._items = [];
        delete this._selectedItemId;
    },

    __proto__: CTRL.Object.prototype
}
