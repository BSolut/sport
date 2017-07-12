
CTRL.Object = function() {
}

CTRL.Object.prototype = {

    addEventListener: function(eventType, listener, thisObject)
    {
        if (!listener)
            console.assert(false);

        if (!this._listeners)
            this._listeners = new Map();
        if (!this._listeners.has(eventType))
            this._listeners.set(eventType, []);
        this._listeners.get(eventType).push({ thisObject: thisObject, listener: listener });
    },

    removeEventListener: function(eventType, listener, thisObject)
    {
        console.assert(listener);

        if (!this._listeners || !this._listeners.has(eventType))
            return;
        var listeners = this._listeners.get(eventType);
        for (var i = 0; i < listeners.length; ++i) {
            if (listeners[i].listener === listener && listeners[i].thisObject === thisObject)
                listeners.splice(i--, 1);
        }

        if (!listeners.length)
            this._listeners.delete(eventType);
    },


    removeAllListeners: function()
    {
        delete this._listeners;
    },


    hasEventListeners: function(eventType)
    {
        if (!this._listeners || !this._listeners.has(eventType))
            return false;
        return true;
    },

    dispatchEventToListeners: function(eventType, eventData)
    {
        if (!this._listeners || !this._listeners.has(eventType))
            return false;

        var event = new CTRL.Event(this, eventType, eventData);
        var listeners = this._listeners.get(eventType).slice(0);
        for (var i = 0; i < listeners.length; ++i) {
            listeners[i].listener.call(listeners[i].thisObject, event);
            if (event._stoppedPropagation)
                break;
        }

        return event.defaultPrevented;
    }
}

CTRL.Event = function(target, type, data)
{
    this.target = target;
    this.type = type;
    this.data = data;
    this.defaultPrevented = false;
    this._stoppedPropagation = false;
}

CTRL.Event.prototype = {
    stopPropagation: function()
    {
        this._stoppedPropagation = true;
    },

    preventDefault: function()
    {
        this.defaultPrevented = true;
    },

    consume: function(preventDefault)
    {
        this.stopPropagation();
        if (preventDefault)
            this.preventDefault();
    }
}

CTRL.EventTarget = function()
{
}

CTRL.EventTarget.prototype = {

    addEventListener: function(eventType, listener, thisObject) { },
    removeEventListener: function(eventType, listener, thisObject) { },
    removeAllListeners: function() { },
    hasEventListeners: function(eventType) { },
    dispatchEventToListeners: function(eventType, eventData) { },
}
