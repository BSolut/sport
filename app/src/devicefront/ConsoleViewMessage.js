CTRL.HexConvert = function() {
}
CTRL.HexConvert.prototype = {


    pad: function(val, cnt, char) {
        char = char || ' ';
        for(var i=0,l=cnt - val.length;i<l;i++)
            val += char;
        return val;
    },

    itph: function(int, padding) {
        var val = int.toString(16);
        for(var i=0,l=padding-val.length;i<l;i++)
            val += '0'
        return val;
    },

    itoa: function(i) {
        if(i === 60 || i === 62)
            return '.'
        if(i < 33)
            return '.'
        if(i < 127)
            return String.fromCharCode(i);
        return '.'
    },

    asHtml: function(data) {
        var ret = [],
            c,
            addr = 0, len = data.length,
            vals = [], chars = [];
        while(addr < len) {
            c = data.charCodeAt(addr++);
            vals.push( this.itph(c,2) );
            chars.push( this.itoa(c) );

            if(addr % 8 === 0) {
                ret.push( vals.join(' ')+' | '+chars.join('') );
                vals.length = chars.length = 0;
            }
        }
        if(vals.length) {
            if(ret.length) {
                ret.push( this.pad(vals.join(' '),23) +' | '+chars.join('') );
            } else
                ret.push( vals.join(' ')+' | '+chars.join('') );
        }
        return ret.join('<br>');
    }
}


CTRL.ConsoleViewMessage = function(message, format) {
    this._message = message;
    this._format = format || CTRL.ConsoleViewMessage.Format.Text;
}
CTRL.ConsoleViewMessage.Format = {
    Text: 1,
    Hex: 2
}
CTRL.ConsoleViewMessage.prototype = {

    //--- ViewportElement Impl ---
    cacheFastHeight: function() {
        this._cachedHeight = this.contentElement().offsetHeight;
    },

    fastHeight: function()
    {
        if (this._cachedHeight)
            return this._cachedHeight;
        const defaultConsoleRowHeight = 18;  // Sync with consoleView.css
        return defaultConsoleRowHeight;
    },

    element: function() {
        return this.toMessageElement();
    },

    willHide: function() { },

    wasShown: function() { },


    //-- Internal Impl
    toMessageElement: function()
    {
        if (this._wrapperElement)
            return this._wrapperElement;
        this._wrapperElement = createElement("div");
        this.updateMessageElement();
        return this._wrapperElement;
    },

    updateMessageElement: function()
    {
        if (!this._wrapperElement)
            return;

        this._wrapperElement.className = "console-message-wrapper";
        this._wrapperElement.removeChildren();
        this._wrapperElement.message = this;

        /*
        switch (this._message.level) {
            case CNC.Console.MessageLevel.Log:
                this._wrapperElement.classList.add("console-log-level");
                //this._wrapperElement.classList.add("console-debug-level");
                break;
            case CNC.Console.MessageLevel.Warning:
                this._wrapperElement.classList.add("console-warning-level");
                break;
            case CNC.Console.MessageLevel.Error:
                this._wrapperElement.classList.add("console-error-level");
                break;
        }*/

        var ctnElm = this.contentElement();
        if(this._message.confirmed)
            ctnElm.classList.add('confirmed');
        this._wrapperElement.appendChild(ctnElm);
    },

    contentElement: function()
    {
        if (this._element)
            return this._element;
        var consoleMessage = this.consoleMessage();

        var element = createElementWithClass("div", "console-message");
        this._element = element;
        element.appendChild(this.formattedMessage());
        return this._element;
    },

    formattedMessage: function()
    {
        if (!this._formattedMessage)
            this._formatMessage();
        return this._formattedMessage;
    },

    consoleMessage: function()
    {
        return this._message;
    },

    _formatMessage: function()
    {
        this._formattedMessage = createElement("span");
        //this._formattedMessage.appendChild(CNC.Widget.createStyleElement("components/objectValue.css"));
        this._formattedMessage.className = "console-message-text source-code";


        var consoleMessage = this.consoleMessage(),
            formattedResult;

        switch(this._format) {
            case CTRL.ConsoleViewMessage.Format.Text:
                formattedResult = this._messageElement = createElement("span");
                formattedResult.createTextChild(consoleMessage);
                break;
            case CTRL.ConsoleViewMessage.Format.Hex:
                formattedResult = this._messageElement = createElement("span");
                this._formatAsHex(formattedResult, consoleMessage);
                break;
        }

        this._formattedMessage.appendChild(this._messageElement);

        return;
    },

    _formatAsHex: function(resultElm, msg)
    {
        var converter = new CTRL.HexConvert();
        resultElm.innerHTML = converter.asHtml(msg);
    },

    _formattedMessageUpdate: function() {
        if(!this._formattedMessage)
            return;
        this._formattedMessage.firstChild.innerText = this._message;
    },

    addMsgPart: function(msgPart) {
        this._message += msgPart;
        this._formattedMessageUpdate();
    }
}


CTRL.ConsoleMsgReceive = function(message, format)
{
    CTRL.ConsoleViewMessage.call(this, message, format);
}

CTRL.ConsoleMsgReceive.prototype = {
    __proto__: CTRL.ConsoleViewMessage.prototype,

    contentElement: function()
    {
        var element = CTRL.ConsoleViewMessage.prototype.contentElement.call(this);
        element.classList.add("console-user-command-result");
        return element;
    }
}


CTRL.ConsoleMsgSend = function(message, format)
{
    CTRL.ConsoleViewMessage.call(this, message, format);
}

CTRL.ConsoleMsgSend.prototype = {
    __proto__: CTRL.ConsoleViewMessage.prototype,

    contentElement: function()
    {
        var element = CTRL.ConsoleViewMessage.prototype.contentElement.call(this);
        element.classList.add("console-user-command");
        return element;
    },

}


CTRL.ConsoleMsgLog = function(message, format)
{
    CTRL.ConsoleViewMessage.call(this, message, format);
}

CTRL.ConsoleMsgLog.prototype = {
    __proto__: CTRL.ConsoleViewMessage.prototype,

    consoleMessage: function()
    {
        return this._message.text;
    },

    updateMessageElement: function()
    {
        if (!this._wrapperElement)
            return;

        this._wrapperElement.className = "console-message-wrapper";
        this._wrapperElement.removeChildren();
        this._wrapperElement.message = this;

        switch (this._message.level) {
            case "debug":
                this._wrapperElement.classList.add("console-debug-level");
                break;
            case "info":
                this._wrapperElement.classList.add("console-info-level");
                break;
            case "warning":
                this._wrapperElement.classList.add("console-warning-level");
                break;
            case "error":
                this._wrapperElement.classList.add("console-error-level");
                break;
        }

        var ctnElm = this.contentElement();
        this._wrapperElement.appendChild(ctnElm);
    },

    contentElement: function()
    {
        var element = CTRL.ConsoleViewMessage.prototype.contentElement.call(this);
        //element.classList.add("console-info-level");
        return element;
    },

}
