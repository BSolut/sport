CTRL.UIList = function()
{
    CTRL.VBox.call(this, true);
    this.registerRequiredCSS("ui/uiList.css");
    /** @type {!Array.<!CTRL.UIList.Item>} */
    this._items = [];
    this.selectedItem = null;

    this.contentElement.addEventListener("mousedown", this._mouseDownInList.bind(this));

}

CTRL.UIList.Events = {
    SelectedItem: "SelectedItem",
    DeselectedItem: "DeselectedItem"
}

CTRL.UIList._Key = Symbol("ownerList");

CTRL.UIList.prototype = {

    __proto__: CTRL.VBox.prototype,

    _mouseDownInList: function(event)
    {
        var itemDom = event.target.enclosingNodeOrSelfWithClass("list-item");
        if(!itemDom)
            return;
        var item = this._items.find(function(i){ return i.element === itemDom });
        if(!item)
            return;
        if(!item.isSelected())
            item.toggleSelected();
    },

    /**
     * @param {!CTRL.UIList.Item} item
     * @param {?CTRL.UIList.Item=} beforeItem
     */
    addItem: function(item, beforeItem)
    {
        item[CTRL.UIList._Key] = this;
        var beforeElement = beforeItem ? beforeItem.element : null;
        this.contentElement.insertBefore(item.element, beforeElement);

        var index = beforeItem ? this._items.indexOf(beforeItem) : this._items.length;
        console.assert(index >= 0, "Anchor item not found in UIList");
        this._items.splice(index, 0, item);
    },

    /**
     * @param {!CTRL.UIList.Item} item
     */
    removeItem: function(item)
    {
        var index = this._items.indexOf(item);
        console.assert(index >= 0);
        this._items.splice(index, 1);
        item.element.remove();
    },

    clear: function()
    {
        this.contentElement.removeChildren();
        this._items = [];
    }
}

/**
 * @constructor
 * @param {string} title
 * @param {string} subtitle
 * @param {boolean=} isLabel
 */
CTRL.UIList.Item = function(title)
{
    this.element = createElementWithClass("div", "list-item");
    this.titleElement = this.element.createChild("div", "title");
    this.setTitle(title);
    this.setSelected(false);
}

CTRL.UIList.Item.prototype = {
    nextSibling: function()
    {
        var list = this[CTRL.UIList._Key];
        var index = list._items.indexOf(this);
        console.assert(index >= 0);
        return list._items[index + 1] || null;
    },

    title: function()
    {
        return this._title;
    },

    setTitle: function(x)
    {
        if (this._title === x)
            return;
        this._title = x;
        this.titleElement.textContent = x;
    },

    isSelected: function()
    {
        return this._selected;
    },

    setSelected: function(x)
    {
        if (x)
            this.select();
        else
            this.deselect();
    },

    select: function(supressSelectedEvent)
    {
        var ownerList = this[CTRL.UIList._Key];
        if(!ownerList || this._selected)
            return;

        if(ownerList.selectedItem)
            ownerList.selectedItem.deselect();

        this._selected = true;
        ownerList.selectedItem = this;
        this.element.classList.add("selected");

        if(!supressSelectedEvent)
            ownerList.dispatchEventToListeners(CTRL.UIList.Events.SelectedItem);
    },

    deselect: function(supressDeselectedEvent)
    {
        var ownerList = this[CTRL.UIList._Key];
        if(!ownerList || !this._selected)
            return;
        this._selected = false;
        ownerList.selectedItem = null;

        this.element.classList.remove("selected");

        if (!supressDeselectedEvent)
            ownerList.dispatchEventToListeners(CTRL.UIList.Events.DeselectedItem);
    },

    toggleSelected: function()
    {
        this.setSelected(!this.isSelected());
    },

    isHidden: function()
    {
        return this._hidden;
    },

    setHidden: function(x)
    {
        if (this._hidden === x)
            return;
        this._hidden = x;
        this.element.classList.toggle("hidden", x);
    }

}
