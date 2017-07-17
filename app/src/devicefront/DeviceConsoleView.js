CTRL.DeviceConsoleView = function() {
    CTRL.VBox.call(this);
    this.registerRequiredCSS("devicefront/consoleView.css");

    this.isDeviceConnected = false;
    this._contentsElement = this.element.createChild('div', "console-view");
    this._contentsElement.classList.add('vbox');
    this._contentsElement.classList.add('flex-auto');

    this._createToolbar();

    this._viewport = new CTRL.ViewportControl(this);
    this._viewport.setStickToBottom(true);
    this._contentsElement.appendChild(this._viewport.element);

    this._messagesElement = this._viewport.element;
    this._messagesElement.id = "console-messages";
    this._messagesElement.classList.add("monospace");

    this._viewportThrottler = new CTRL.Throttler(50);

    this._registerShortcuts();

    this._promptElement = this._messagesElement.createChild("div", "source-code");
    this._promptElement.id = "console-prompt";
    this._promptElement.spellcheck = false;

    this._prompt = new CTRL.TextPromptWithHistory(this._completionsForTextPromptInCurrentContext.bind(this));
    this._prompt.setSuggestBoxEnabled(true);
    this._prompt.setAutocompletionTimeout(0);
    this._prompt.renderAsBlock();

    var proxyElement = this._prompt.attach(this._promptElement);
    proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this), false);

    this._consoleHistorySetting = CTRL.settings.createSetting('consoleHistory', []);
    var historyData = this._consoleHistorySetting.get()
    this._prompt.setHistoryData( historyData );

    this.receiveMsgBuffer = "";
    this._viewMessageSymbol = Symbol("viewMessage");
    this._messages = [];
}
CTRL.DeviceConsoleView.persistedHistorySize = 300;
CTRL.DeviceConsoleView.MessageType = {
    Receive: 1,
    Send: 2,
    Log: 3
}
CTRL.DeviceConsoleView.Events = {
    Send: 'Send',
    Connect: 'Connect',
    Disconnect: 'Disconnect'
}

CTRL.DeviceConsoleView.prototype = {

    __proto__: CTRL.VBox.prototype,


    defaultFocusedElement: function()
    {
        return this._promptElement;
    },

    focus: function()
    {
        if (this._promptElement === CTRL.currentFocusElement())
            return;
        CTRL.setCurrentFocusElement(this._promptElement);
        this._prompt.moveCaretToEndOfPrompt();
    },

    wasShown: function()
    {
        this.focus();
        this._scheduleViewportRefresh();
    },

    _createToolbar: function()
    {
        this._clearConsoleButton = new CTRL.ToolbarButton('Clear', 'garbage-collect-toolbar-item');
        this._clearConsoleButton.setTitle('Clear cosnole');
        this._clearConsoleButton.addEventListener('click', this.clearConsole.bind(this));


        this._connectionButton = new CTRL.ToolbarButton('Disconnect', 'pause-outline-toolbar-item');
        //replay-outline-toolbar-item
        this._connectionButton.addEventListener('click', this.connectionButtonClick.bind(this));

        this._sendModeComboBox = new CTRL.ToolbarComboBox(null, "sendmode");
        this._sendModeComboBox.setMaxWidth(200);
        this._sendModeComboBox.createOption('Both NL & CR', '', 3);
        this._sendModeComboBox.createOption('No line ending', '', 0);
        this._sendModeComboBox.createOption('New line', '', 1);
        this._sendModeComboBox.createOption('Carriage return', '', 2);

        this._sendModeComboBox.selectValue( CTRL.settings.get('devSendMode', 3) );

        var toolbar = new CTRL.Toolbar(this._contentsElement);
        toolbar.appendToolbarItem(this._clearConsoleButton);
        toolbar.appendToolbarItem(this._connectionButton);

        var sep = new CTRL.ToolbarSeparator();
        sep.element.classList.add('marginleftauto');
        toolbar.appendToolbarItem(sep);

        toolbar.appendToolbarItem(this._sendModeComboBox);
    },

    _completionsForTextPromptInCurrentContext: function(proxyElement, wordRange, force, completionsReadyCallback)
    {
        var d = this._prompt.historyData(),
            startWith = proxyElement.innerText.toLowerCase();
        if(!startWith)
            return completionsReadyCallback([]);
        var ret = [];
        for(var i=0,l=d.length;i<l;i++) {
            if((d[i]||'').toLowerCase().indexOf(startWith)===0)
                ret.push(d[i]);
        }
        completionsReadyCallback(ret)
    },

    _registerShortcuts: function()
    {
        this._shortcuts = {};
    },

    _promptKeyDown: function(event)
    {
        if(isEnterKey(event))
            return this._enterKeyPressed(event);

        var shortcut = CTRL.KeyboardShortcut.makeKeyFromEvent(event);
        var handler = this._shortcuts[shortcut];
        if (handler) {
            handler();
            event.preventDefault();
        }

    },

    _enterKeyPressed: function(event)
    {
        if (event.altKey || event.ctrlKey || event.shiftKey)
            return;
        event.consume(true);
        this._prompt.clearAutoComplete(true);
        var str = this._prompt.text();
        if (!str.length)
            return;
        this._executeCommand(str);
    },

    _executeCommand: function(text)
    {
        this._prompt.setText("");
        this._prompt.pushHistoryItem(text);
        this._consoleHistorySetting.set(this._prompt.historyData().slice(-CTRL.DeviceConsoleView.persistedHistorySize));

        var endline = this._sendModeComboBox.selectElement().value;       
        if(endline === "3")
            text += '\r\n';
        else if(endline === "2")
            text += '\n';
        else if(endline === "1")
            text += '\r';

        this.dispatchEventToListeners(CTRL.DeviceConsoleView.Events.Send, text);
    },


    _createViewMessage: function(message, type, format)
    {
        switch(type) {
            case CTRL.DeviceConsoleView.MessageType.Receive:
                return new CTRL.ConsoleMsgReceive(message, format);
            case CTRL.DeviceConsoleView.MessageType.Send:
                return new CTRL.ConsoleMsgSend(message, format);
            case CTRL.DeviceConsoleView.MessageType.Log:
                return new CTRL.ConsoleMsgLog(message, format);
            default:
                return new CTRL.ConsoleViewMessage(message, format);
        }
    },

    _scheduleViewportRefresh: function()
    {
        function invalidateViewport()
        {
            if (this._needsFullUpdate) {
                this._updateMessageList();
                delete this._needsFullUpdate;
            } else {
                this._viewport.invalidate();
            }
            return Promise.resolve();
        }
        this._viewportThrottler.schedule(invalidateViewport.bind(this));
    },

    //Viewport interface
    itemCount: function()
    {
        return this._messages.length;
    },
    fastHeight: function(index)
    {
        return this._messages[index].fastHeight();
    },
    minimumRowHeight: function()
    {
        return 16;
    },
    itemElement: function(index)
    {
        return this._messages[index];
    },

    //Pub
    isBinary: function(msg)
    {
        var c;
        for(var i=0,l=msg.length;i<l;i++) {
            c = msg.charCodeAt(i);
            if(!(c > 31 && c < 126) && (c!==10) && (c!==13))
                return true;
        }
        return false;
    },

    addReceiveMessage: function(rawMessage)
    {
        var msg = '';
        if( (rawMessage+'') === '[object ArrayBuffer]') { //(rawMessage instanceof ArrayBuffer) {
            var bufView = new Uint8Array(rawMessage);
            msg = String.fromCharCode.apply(null, bufView);
        } else
            msg = rawMessage + '';

        if(this.isBinary(msg)) {
            this.receiveOpenMsg = null;
            this.addMessage(msg, CTRL.DeviceConsoleView.MessageType.Receive, CTRL.ConsoleViewMessage.Format.Hex);
            return;
        }


        var partMsg;

        while(msg) {
            var lbR = msg.indexOf('\r'),
                lbN = msg.indexOf('\n'),
                lbNext, isRN;

            //Wtf
            if(lbR === -1 && lbN === 1)
                lbNext = -1;
            else {
                if(lbR === -1)
                    lbNext = lbN
                else
                if(lbN === -1)
                    lbNext = lbR;
                else
                    lbNext = Math.min(lbR, lbN);
            }

            isRN = lbNext === lbR && lbR+1 === lbN;

            if(lbNext === -1) {
                partMsg = msg;
                msg = "";

                if(this.receiveOpenMsg) {
                    this.receiveOpenMsg.addMsgPart(partMsg);
                } else
                    this.receiveOpenMsg = this.addMessage(partMsg, CTRL.DeviceConsoleView.MessageType.Receive);
            } else {
                if(lbNext === 0)
                    partMsg = ""
                else
                    partMsg = msg.substr(0, lbNext );
                msg = msg.substr(lbNext+1 + (isRN ? 1 : 0));

                if(this.receiveOpenMsg) {
                    this.receiveOpenMsg.addMsgPart(partMsg);
                    this.receiveOpenMsg = null;
                } else
                    this.addMessage(partMsg, CTRL.DeviceConsoleView.MessageType.Receive);
            }
        }

        /*
        var lbR = msg.indexOf('\r'),
            lbN = msg.indexOf('\n'),
            containsLineBreak =

        if(this.receiveOpenMsg) {

        }

        var containsLineBreak = msg.indexOf('\r') != -1 || msg.indexOf('\n') != -1,
            curMsgView = this.addMessage(msg, CTRL.DeviceConsoleView.MessageType.Receive);
        if(!containsLineBreak)
            this.receiveOpenMsg = curMsgView;
        else
            delete this.receiveOpenMsg;
        */
    },

    addSendMessage: function(rawMessage)
    {
        var msg = '';
        if( (rawMessage+'') === '[object ArrayBuffer]') { //(rawMessage instanceof ArrayBuffer) {
            var bufView = new Uint8Array(rawMessage);
            msg = String.fromCharCode.apply(null, bufView);
        } else
            msg = rawMessage + '';

        var format = CTRL.ConsoleViewMessage.Format.Text;
        if(this.isBinary(rawMessage))
            format = CTRL.ConsoleViewMessage.Format.Hex;

        this.addMessage(msg, CTRL.DeviceConsoleView.MessageType.Send, format);
    },

    addMessage: function(message, type, format)
    {
        var viewMessage = this._createViewMessage(message, type, format);
        message[ this._viewMessageSymbol ] = viewMessage;
        this._messages.push(viewMessage); //TODO auto shift out old messages ?
        this._scheduleViewportRefresh();
        return viewMessage;
    },

    clearConsole: function()
    {
        this._messages = [];
        this._viewport.refresh();
    },

    connectionButtonClick: function() {
        if(this.isDeviceConnected)
            this.dispatchEventToListeners(CTRL.DeviceConsoleView.Events.Disconnect);
        else
            this.dispatchEventToListeners(CTRL.DeviceConsoleView.Events.Connect);
    },

    updateConnectionButton: function() {
        var cl = this._connectionButton.element.classList;
        cl.remove('pause-outline-toolbar-item');
        cl.remove('replay-outline-toolbar-item');
        if(this.isDeviceConnected)
            cl.add('pause-outline-toolbar-item');
        else
            cl.add('replay-outline-toolbar-item');
    },

    onDeviceConnected: function(devInfo) {
        this.isDeviceConnected = true;
        this.addMessage({
            text: 'Connected to '+devInfo.path,
            level: 'info'
        }, CTRL.DeviceConsoleView.MessageType.Log);
        this.updateConnectionButton();
    },

    onDeviceDisconnected: function(reason) {
        this.isDeviceConnected = false;
        this.receiveOpenMsg = null;
        this.addMessage({
            text: 'Disconnected'+(reason ? ' '+reason : ''),
            level: 'warning'
        }, CTRL.DeviceConsoleView.MessageType.Log);
        this.updateConnectionButton();
    }
}
