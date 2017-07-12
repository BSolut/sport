/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

CTRL.highlightedSearchResultClassName = "highlighted-search-result";

/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {?string=} hoverCursor
 */
CTRL.installDragHandle = function(element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor)
{
    element.addEventListener("mousedown", CTRL.elementDragStart.bind(CNC, elementDragStart, elementDrag, elementDragEnd, cursor), false);
    if (hoverCursor !== null)
        element.style.cursor = hoverCursor || cursor;
}

/**
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {string} cursor
 * @param {!Event} event
 */
CTRL.elementDragStart = function(elementDragStart, elementDrag, elementDragEnd, cursor, event)
{
    // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
    if (event.button)//todo || (CTRL.isMac() && event.ctrlKey))
        return;

    if (CTRL._elementDraggingEventListener)
        return;

    if (elementDragStart && !elementDragStart(/** @type {!MouseEvent} */ (event)))
        return;

    if (CTRL._elementDraggingGlassPane) {
        CTRL._elementDraggingGlassPane.dispose();
        delete CTRL._elementDraggingGlassPane;
    }

    var targetDocument = event.target.ownerDocument;

    CTRL._elementDraggingEventListener = elementDrag;
    CTRL._elementEndDraggingEventListener = elementDragEnd;
    CTRL._mouseOutWhileDraggingTargetDocument = targetDocument;
    CTRL._dragEventsTargetDocument = targetDocument;
    CTRL._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;

    targetDocument.addEventListener("mousemove", CTRL._elementDragMove, true);
    targetDocument.addEventListener("mouseup", CTRL._elementDragEnd, true);
    targetDocument.addEventListener("mouseout", CTRL._mouseOutWhileDragging, true);
    if (targetDocument !== CTRL._dragEventsTargetDocumentTop)
        CTRL._dragEventsTargetDocumentTop.addEventListener("mouseup", CTRL._elementDragEnd, true);

    var targetElement = /** @type {!Element} */ (event.target);
    if (typeof cursor === "string") {
        CTRL._restoreCursorAfterDrag = restoreCursor.bind(null, targetElement.style.cursor);
        targetElement.style.cursor = cursor;
        targetDocument.body.style.cursor = cursor;
    }
    function restoreCursor(oldCursor)
    {
        targetDocument.body.style.removeProperty("cursor");
        targetElement.style.cursor = oldCursor;
        CTRL._restoreCursorAfterDrag = null;
    }
    event.preventDefault();
}

CTRL._mouseOutWhileDragging = function()
{
    var document = CTRL._mouseOutWhileDraggingTargetDocument;
    CTRL._unregisterMouseOutWhileDragging();
    CTRL._elementDraggingGlassPane = new CTRL.GlassPane(document);
}

CTRL._unregisterMouseOutWhileDragging = function()
{
    if (!CTRL._mouseOutWhileDraggingTargetDocument)
        return;
    CTRL._mouseOutWhileDraggingTargetDocument.removeEventListener("mouseout", CTRL._mouseOutWhileDragging, true);
    delete CTRL._mouseOutWhileDraggingTargetDocument;
}

CTRL._unregisterDragEvents = function()
{
    if (!CTRL._dragEventsTargetDocument)
        return;
    CTRL._dragEventsTargetDocument.removeEventListener("mousemove", CTRL._elementDragMove, true);
    CTRL._dragEventsTargetDocument.removeEventListener("mouseup", CTRL._elementDragEnd, true);
    if (CTRL._dragEventsTargetDocument !== CTRL._dragEventsTargetDocumentTop)
        CTRL._dragEventsTargetDocumentTop.removeEventListener("mouseup", CTRL._elementDragEnd, true);
    delete CTRL._dragEventsTargetDocument;
    delete CTRL._dragEventsTargetDocumentTop;
}

/**
 * @param {!Event} event
 */
CTRL._elementDragMove = function(event)
{
    if (event.buttons !== 1) {
        CTRL._elementDragEnd(event);
        return;
    }

    if (CTRL._elementDraggingEventListener(/** @type {!MouseEvent} */ (event)))
        CTRL._cancelDragEvents(event);
}

/**
 * @param {!Event} event
 */
CTRL._cancelDragEvents = function(event)
{
    CTRL._unregisterDragEvents();
    CTRL._unregisterMouseOutWhileDragging();

    if (CTRL._restoreCursorAfterDrag)
        CTRL._restoreCursorAfterDrag();

    if (CTRL._elementDraggingGlassPane)
        CTRL._elementDraggingGlassPane.dispose();

    delete CTRL._elementDraggingGlassPane;
    delete CTRL._elementDraggingEventListener;
    delete CTRL._elementEndDraggingEventListener;
}

/**
 * @param {!Event} event
 */
CTRL._elementDragEnd = function(event)
{
    var elementDragEnd = CTRL._elementEndDraggingEventListener;

    CTRL._cancelDragEvents(/** @type {!MouseEvent} */ (event));

    event.preventDefault();
    if (elementDragEnd)
        elementDragEnd(/** @type {!MouseEvent} */ (event));
}

/**
 * @constructor
 * @param {!Document} document
 */
CTRL.GlassPane = function(document)
{
    this.element = createElement("div");
    this.element.style.cssText = "position:absolute;top:0;bottom:0;left:0;right:0;background-color:transparent;z-index:1000;overflow:hidden;";
    this.element.id = "glass-pane";
    document.body.appendChild(this.element);
    CTRL._glassPane = this;
}

CTRL.GlassPane.prototype = {
    dispose: function()
    {
        delete CTRL._glassPane;
        if (CTRL.GlassPane.DefaultFocusedViewStack.length)
            CTRL.GlassPane.DefaultFocusedViewStack.peekLast().focus();
        this.element.remove();
    }
}

/**
 * @type {!Array.<!CTRL.Widget|!CTRL.Dialog>}
 */
CTRL.GlassPane.DefaultFocusedViewStack = [];

/**
 * @param {?Node=} node
 * @return {boolean}
 */
CTRL.isBeingEdited = function(node)
{
    if (!node || node.nodeType !== Node.ELEMENT_NODE)
        return false;
    var element = /** {!Element} */ (node);
    if (element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA")
        return true;

    if (!CTRL.__editingCount)
        return false;

    while (element) {
        if (element.__editing)
            return true;
        element = element.parentElementOrShadowHost();
    }
    return false;
}

/**
 * @return {boolean}
 */
CTRL.isEditing = function()
{
    if (CTRL.__editingCount)
        return true;

    var element = CTRL.currentFocusElement();
    if (!element)
        return false;
    return element.classList.contains("text-prompt") || element.nodeName === "INPUT" || element.nodeName === "TEXTAREA";
}

/**
 * @param {!Element} element
 * @param {boolean} value
 * @return {boolean}
 */
CTRL.markBeingEdited = function(element, value)
{
    if (value) {
        if (element.__editing)
            return false;
        element.classList.add("being-edited");
        element.__editing = true;
        CTRL.__editingCount = (CTRL.__editingCount || 0) + 1;
    } else {
        if (!element.__editing)
            return false;
        element.classList.remove("being-edited");
        delete element.__editing;
        --CTRL.__editingCount;
    }
    return true;
}

CTRL.CSSNumberRegex = /^(-?(?:\d+(?:\.\d+)?|\.\d+))$/;

CTRL.StyleValueDelimiters = " \xA0\t\n\"':;,/()";


/**
 * @param {!Event} event
 * @return {?string}
 */
CTRL._valueModificationDirection = function(event)
{
    var direction = null;
    if (event.type === "mousewheel") {
        if (event.wheelDeltaY > 0)
            direction = "Up";
        else if (event.wheelDeltaY < 0)
            direction = "Down";
    } else {
        if (event.keyIdentifier === "Up" || event.keyIdentifier === "PageUp")
            direction = "Up";
        else if (event.keyIdentifier === "Down" || event.keyIdentifier === "PageDown")
            direction = "Down";
    }
    return direction;
}

/**
 * @param {string} hexString
 * @param {!Event} event
 */
CTRL._modifiedHexValue = function(hexString, event)
{
    var direction = CTRL._valueModificationDirection(event);
    if (!direction)
        return hexString;

    var number = parseInt(hexString, 16);
    if (isNaN(number) || !isFinite(number))
        return hexString;

    var maxValue = Math.pow(16, hexString.length) - 1;
    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var delta;

    if (arrowKeyOrMouseWheelEvent)
        delta = (direction === "Up") ? 1 : -1;
    else
        delta = (event.keyIdentifier === "PageUp") ? 16 : -16;

    if (event.shiftKey)
        delta *= 16;

    var result = number + delta;
    if (result < 0)
        result = 0; // Color hex values are never negative, so clamp to 0.
    else if (result > maxValue)
        return hexString;

    // Ensure the result length is the same as the original hex value.
    var resultString = result.toString(16).toUpperCase();
    for (var i = 0, lengthDelta = hexString.length - resultString.length; i < lengthDelta; ++i)
        resultString = "0" + resultString;
    return resultString;
}

/**
 * @param {number} number
 * @param {!Event} event
 */
CTRL._modifiedFloatNumber = function(number, event)
{
    var direction = CTRL._valueModificationDirection(event);
    if (!direction)
        return number;

    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");

    // Jump by 10 when shift is down or jump by 0.1 when Alt/Option is down.
    // Also jump by 10 for page up and down, or by 100 if shift is held with a page key.
    var changeAmount = 1;
    if (event.shiftKey && !arrowKeyOrMouseWheelEvent)
        changeAmount = 100;
    else if (event.shiftKey || !arrowKeyOrMouseWheelEvent)
        changeAmount = 10;
    else if (event.altKey)
        changeAmount = 0.1;

    if (direction === "Down")
        changeAmount *= -1;

    // Make the new number and constrain it to a precision of 6, this matches numbers the engine returns.
    // Use the Number constructor to forget the fixed precision, so 1.100000 will print as 1.1.
    var result = Number((number + changeAmount).toFixed(6));
    if (!String(result).match(CTRL.CSSNumberRegex))
        return null;

    return result;
}

/**
 * @param {string} wordString
 * @param {!Event} event
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {?string}
 */
CTRL.createReplacementString = function(wordString, event, customNumberHandler)
{
    var replacementString;
    var prefix, suffix, number;

    var matches;
    matches = /(.*#)([\da-fA-F]+)(.*)/.exec(wordString);
    if (matches && matches.length) {
        prefix = matches[1];
        suffix = matches[3];
        number = CTRL._modifiedHexValue(matches[2], event);

        replacementString = customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
    } else {
        matches = /(.*?)(-?(?:\d+(?:\.\d+)?|\.\d+))(.*)/.exec(wordString);
        if (matches && matches.length) {
            prefix = matches[1];
            suffix = matches[3];
            number = CTRL._modifiedFloatNumber(parseFloat(matches[2]), event);

            // Need to check for null explicitly.
            if (number === null)
                return null;

            replacementString = customNumberHandler ? customNumberHandler(prefix, number, suffix) : prefix + number + suffix;
        }
    }
    return replacementString || null;
}

/**
 * @param {!Event} event
 * @param {!Element} element
 * @param {function(string,string)=} finishHandler
 * @param {function(string)=} suggestionHandler
 * @param {function(string, number, string):string=} customNumberHandler
 * @return {boolean}
 */
CTRL.handleElementValueModifications = function(event, element, finishHandler, suggestionHandler, customNumberHandler)
{
    /**
     * @return {?Range}
     * @suppressGlobalPropertiesCheck
     */
    function createRange()
    {
        return document.createRange();
    }

    var arrowKeyOrMouseWheelEvent = (event.keyIdentifier === "Up" || event.keyIdentifier === "Down" || event.type === "mousewheel");
    var pageKeyPressed = (event.keyIdentifier === "PageUp" || event.keyIdentifier === "PageDown");
    if (!arrowKeyOrMouseWheelEvent && !pageKeyPressed)
        return false;

    var selection = element.getComponentSelection();
    if (!selection.rangeCount)
        return false;

    var selectionRange = selection.getRangeAt(0);
    if (!selectionRange.commonAncestorContainer.isSelfOrDescendant(element))
        return false;

    var originalValue = element.textContent;
    var wordRange = selectionRange.startContainer.rangeOfWord(selectionRange.startOffset, CTRL.StyleValueDelimiters, element);
    var wordString = wordRange.toString();

    if (suggestionHandler && suggestionHandler(wordString))
        return false;

    var replacementString = CTRL.createReplacementString(wordString, event, customNumberHandler);

    if (replacementString) {
        var replacementTextNode = createTextNode(replacementString);

        wordRange.deleteContents();
        wordRange.insertNode(replacementTextNode);

        var finalSelectionRange = createRange();
        finalSelectionRange.setStart(replacementTextNode, 0);
        finalSelectionRange.setEnd(replacementTextNode, replacementString.length);

        selection.removeAllRanges();
        selection.addRange(finalSelectionRange);

        event.handled = true;
        event.preventDefault();

        if (finishHandler)
            finishHandler(originalValue, replacementString);

        return true;
    }
    return false;
}

/**
 * @param {number} ms
 * @param {number=} precision
 * @return {string}
 */
Number.preciseMillisToString = function(ms, precision)
{
    precision = precision || 0;
    var format = "%." + precision + "f\u2009ms";
    return CTRL.UIString(format, ms);
}

/** @type {!CTRL.UIStringFormat} */
CTRL._subMillisFormat = new CTRL.UIStringFormat("%.2f\u2009ms");

/** @type {!CTRL.UIStringFormat} */
CTRL._millisFormat = new CTRL.UIStringFormat("%.0f\u2009ms");

/** @type {!CTRL.UIStringFormat} */
CTRL._secondsFormat = new CTRL.UIStringFormat("%.2f\u2009s");

/** @type {!CTRL.UIStringFormat} */
CTRL._minutesFormat = new CTRL.UIStringFormat("%.1f\u2009min");

/** @type {!CTRL.UIStringFormat} */
CTRL._hoursFormat = new CTRL.UIStringFormat("%.1f\u2009hrs");

/** @type {!CTRL.UIStringFormat} */
CTRL._daysFormat = new CTRL.UIStringFormat("%.1f\u2009days");

/**
 * @param {number} ms
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.millisToString = function(ms, higherResolution)
{
    if (!isFinite(ms))
        return "-";

    if (ms === 0)
        return "0";

    if (higherResolution && ms < 1000)
        return CTRL._subMillisFormat.format(ms);
    else if (ms < 1000)
        return CTRL._millisFormat.format(ms);

    var seconds = ms / 1000;
    if (seconds < 60)
        return CTRL._secondsFormat.format(seconds);

    var minutes = seconds / 60;
    if (minutes < 60)
        return CTRL._minutesFormat.format(minutes);

    var hours = minutes / 60;
    if (hours < 24)
        return CTRL._hoursFormat.format(hours);

    var days = hours / 24;
    return CTRL._daysFormat.format(days);
}

/**
 * @param {number} seconds
 * @param {boolean=} higherResolution
 * @return {string}
 */
Number.secondsToString = function(seconds, higherResolution)
{
    if (!isFinite(seconds))
        return "-";
    return Number.millisToString(seconds * 1000, higherResolution);
}

/**
 * @param {number} bytes
 * @return {string}
 */
Number.bytesToString = function(bytes)
{
    if (bytes < 1024)
        return CTRL.UIString("%.0f\u2009B", bytes);

    var kilobytes = bytes / 1024;
    if (kilobytes < 100)
        return CTRL.UIString("%.1f\u2009KB", kilobytes);
    if (kilobytes < 1024)
        return CTRL.UIString("%.0f\u2009KB", kilobytes);

    var megabytes = kilobytes / 1024;
    if (megabytes < 100)
        return CTRL.UIString("%.1f\u2009MB", megabytes);
    else
        return CTRL.UIString("%.0f\u2009MB", megabytes);
}

/**
 * @param {number} num
 * @return {string}
 */
Number.withThousandsSeparator = function(num)
{
    var str = num + "";
    var re = /(\d+)(\d{3})/;
    while (str.match(re))
        str = str.replace(re, "$1\u2009$2"); // \u2009 is a thin space.
    return str;
}

/**
 * @param {string} format
 * @param {?ArrayLike} substitutions
 * @param {?string} initialValue
 * @return {!Element}
 */
CTRL.formatLocalized = function(format, substitutions, initialValue)
{
    var element = createElement("span");
    var formatters = {
        s: function(substitution)
        {
            return substitution;
        }
    };
    function append(a, b)
    {
        if (typeof b === "string")
            b = createTextNode(b);
        else if (b.shadowRoot)
            b = createTextNode(b.shadowRoot.lastChild.textContent);
        element.appendChild(b);
    }
    String.format(CTRL.UIString(format), substitutions, formatters, initialValue, append);
    return element;
}

/**
 * @return {string}
 */
CTRL.openLinkExternallyLabel = function()
{
    return CTRL.UIString.capitalize("Open ^link in ^new ^tab");
}

/**
 * @return {string}
 */
CTRL.copyLinkAddressLabel = function()
{
    return CTRL.UIString.capitalize("Copy ^link ^address");
}

/**
 * @return {string}
 */
CTRL.anotherProfilerActiveLabel = function()
{
    return CTRL.UIString("Another profiler is already active");
}

/**
 * @param {string|undefined} description
 * @return {string}
 */
CTRL.asyncStackTraceLabel = function(description)
{
    if (description)
        return description + " " + CTRL.UIString("(async)");
    return CTRL.UIString("Async Call");
}

/**
 * @return {string}
 */
CTRL.manageBlackboxingButtonLabel = function()
{
    return CTRL.UIString("Manage framework blackboxing...");
}

/**
 * @param {!Element} element
 */
CTRL.installComponentRootStyles = function(element)
{
    element.appendChild(CTRL.Widget.createStyleElement("ui/common.css"));
    element.classList.add("platform-" + CTRL.platform());
    //if (Runtime.experiments.isEnabled("materialDesign"))
    //    element.classList.add("material");
}

/**
 * @param {!Element} element
 * @return {!DocumentFragment}
 */
CTRL.createShadowRootWithCoreStyles = function(element)
{
    var shadowRoot = element.createShadowRoot();
    shadowRoot.appendChild(CTRL.Widget.createStyleElement("ui/common.css"));
    shadowRoot.addEventListener("focus", CTRL._focusChanged.bind(CTRL), true);
    return shadowRoot;
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
CTRL._windowFocused = function(document, event)
{
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.remove("inactive");
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
CTRL._windowBlurred = function(document, event)
{
    if (event.target.document.nodeType === Node.DOCUMENT_NODE)
        document.body.classList.add("inactive");
}

/**
 * @return {!Element}
 */
CTRL.previousFocusElement = function()
{
    return CTRL._previousFocusElement;
}

/**
 * @return {!Element}
 */
CTRL.currentFocusElement = function()
{
    return CTRL._currentFocusElement;
}

/**
 * @param {!Event} event
 */
CTRL._focusChanged = function(event)
{
    var node = event.deepActiveElement();
    CTRL.setCurrentFocusElement(node);
}

/**
 * @param {!Document} document
 * @param {!Event} event
 */
CTRL._documentBlurred = function(document, event)
{
    // We want to know when currentFocusElement loses focus to nowhere.
    // This is the case when event.relatedTarget is null (no element is being focused)
    // and document.activeElement is reset to default (this is not a window blur).
    if (!event.relatedTarget && document.activeElement === document.body)
      CTRL.setCurrentFocusElement(null);
}

CTRL._textInputTypes = ["text", "search", "tel", "url", "email", "password"].keySet();
CTRL._isTextEditingElement = function(element)
{
    if (element instanceof HTMLInputElement)
        return element.type in CTRL._textInputTypes;

    if (element instanceof HTMLTextAreaElement)
        return true;

    return false;
}

/**
 * @param {?Node} x
 */
CTRL.setCurrentFocusElement = function(x)
{
    if (CTRL._glassPane && x && !CTRL._glassPane.element.isAncestor(x))
        return;
    if (CTRL._currentFocusElement !== x)
        CTRL._previousFocusElement = CTRL._currentFocusElement;
    CTRL._currentFocusElement = x;

    if (CTRL._currentFocusElement) {
        CTRL._currentFocusElement.focus();

        // Make a caret selection inside the new element if there isn't a range selection and there isn't already a caret selection inside.
        // This is needed (at least) to remove caret from console when focus is moved to some element in the panel.
        // The code below should not be applied to text fields and text areas, hence _isTextEditingElement check.
        var selection = x.getComponentSelection();
        if (!CTRL._isTextEditingElement(CTRL._currentFocusElement) && selection.isCollapsed && !CTRL._currentFocusElement.isInsertionCaretInside()) {
            var selectionRange = CTRL._currentFocusElement.ownerDocument.createRange();
            selectionRange.setStart(CTRL._currentFocusElement, 0);
            selectionRange.setEnd(CTRL._currentFocusElement, 0);

            selection.removeAllRanges();
            selection.addRange(selectionRange);
        }
    } else if (CTRL._previousFocusElement)
        CTRL._previousFocusElement.blur();
}

CTRL.restoreFocusFromElement = function(element)
{
    if (element && element.isSelfOrAncestor(CTRL.currentFocusElement()))
        CTRL.setCurrentFocusElement(CTRL.previousFocusElement());
}

/**
 * @param {!Element} element
 * @param {number} offset
 * @param {number} length
 * @param {!Array.<!Object>=} domChanges
 * @return {?Element}
 */
CTRL.highlightSearchResult = function(element, offset, length, domChanges)
{
    var result = CTRL.highlightSearchResults(element, [new CTRL.SourceRange(offset, length)], domChanges);
    return result.length ? result[0] : null;
}

/**
 * @param {!Element} element
 * @param {!Array.<!CTRL.SourceRange>} resultRanges
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
CTRL.highlightSearchResults = function(element, resultRanges, changes)
{
    return CTRL.highlightRangesWithStyleClass(element, resultRanges, CTRL.highlightedSearchResultClassName, changes);
}

/**
 * @param {!Element} element
 * @param {string} className
 */
CTRL.runCSSAnimationOnce = function(element, className)
{
    function animationEndCallback()
    {
        element.classList.remove(className);
        element.removeEventListener("webkitAnimationEnd", animationEndCallback, false);
    }

    if (element.classList.contains(className))
        element.classList.remove(className);

    element.addEventListener("webkitAnimationEnd", animationEndCallback, false);
    element.classList.add(className);
}

/**
 * @param {!Element} element
 * @param {!Array.<!CTRL.SourceRange>} resultRanges
 * @param {string} styleClass
 * @param {!Array.<!Object>=} changes
 * @return {!Array.<!Element>}
 */
CTRL.highlightRangesWithStyleClass = function(element, resultRanges, styleClass, changes)
{
    changes = changes || [];
    var highlightNodes = [];
    var lineText = element.deepTextContent();
    var ownerDocument = element.ownerDocument;
    var textNodes = element.childTextNodes();

    if (textNodes.length === 0)
        return highlightNodes;

    var nodeRanges = [];
    var rangeEndOffset = 0;
    for (var i = 0; i < textNodes.length; ++i) {
        var range = {};
        range.offset = rangeEndOffset;
        range.length = textNodes[i].textContent.length;
        rangeEndOffset = range.offset + range.length;
        nodeRanges.push(range);
    }

    var startIndex = 0;
    for (var i = 0; i < resultRanges.length; ++i) {
        var startOffset = resultRanges[i].offset;
        var endOffset = startOffset + resultRanges[i].length;

        while (startIndex < textNodes.length && nodeRanges[startIndex].offset + nodeRanges[startIndex].length <= startOffset)
            startIndex++;
        var endIndex = startIndex;
        while (endIndex < textNodes.length && nodeRanges[endIndex].offset + nodeRanges[endIndex].length < endOffset)
            endIndex++;
        if (endIndex === textNodes.length)
            break;

        var highlightNode = ownerDocument.createElement("span");
        highlightNode.className = styleClass;
        highlightNode.textContent = lineText.substring(startOffset, endOffset);

        var lastTextNode = textNodes[endIndex];
        var lastText = lastTextNode.textContent;
        lastTextNode.textContent = lastText.substring(endOffset - nodeRanges[endIndex].offset);
        changes.push({ node: lastTextNode, type: "changed", oldText: lastText, newText: lastTextNode.textContent });

        if (startIndex === endIndex) {
            lastTextNode.parentElement.insertBefore(highlightNode, lastTextNode);
            changes.push({ node: highlightNode, type: "added", nextSibling: lastTextNode, parent: lastTextNode.parentElement });
            highlightNodes.push(highlightNode);

            var prefixNode = ownerDocument.createTextNode(lastText.substring(0, startOffset - nodeRanges[startIndex].offset));
            lastTextNode.parentElement.insertBefore(prefixNode, highlightNode);
            changes.push({ node: prefixNode, type: "added", nextSibling: highlightNode, parent: lastTextNode.parentElement });
        } else {
            var firstTextNode = textNodes[startIndex];
            var firstText = firstTextNode.textContent;
            var anchorElement = firstTextNode.nextSibling;

            firstTextNode.parentElement.insertBefore(highlightNode, anchorElement);
            changes.push({ node: highlightNode, type: "added", nextSibling: anchorElement, parent: firstTextNode.parentElement });
            highlightNodes.push(highlightNode);

            firstTextNode.textContent = firstText.substring(0, startOffset - nodeRanges[startIndex].offset);
            changes.push({ node: firstTextNode, type: "changed", oldText: firstText, newText: firstTextNode.textContent });

            for (var j = startIndex + 1; j < endIndex; j++) {
                var textNode = textNodes[j];
                var text = textNode.textContent;
                textNode.textContent = "";
                changes.push({ node: textNode, type: "changed", oldText: text, newText: textNode.textContent });
            }
        }
        startIndex = endIndex;
        nodeRanges[startIndex].offset = endOffset;
        nodeRanges[startIndex].length = lastTextNode.textContent.length;

    }
    return highlightNodes;
}

CTRL.applyDomChanges = function(domChanges)
{
    for (var i = 0, size = domChanges.length; i < size; ++i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.parent.insertBefore(entry.node, entry.nextSibling);
            break;
        case "changed":
            entry.node.textContent = entry.newText;
            break;
        }
    }
}

CTRL.revertDomChanges = function(domChanges)
{
    for (var i = domChanges.length - 1; i >= 0; --i) {
        var entry = domChanges[i];
        switch (entry.type) {
        case "added":
            entry.node.remove();
            break;
        case "changed":
            entry.node.textContent = entry.oldText;
            break;
        }
    }
}

/**
 * @param {!Element} element
 * @param {?Element=} containerElement
 * @return {!Size}
 */
CTRL.measurePreferredSize = function(element, containerElement)
{
    containerElement = containerElement || element.ownerDocument.body;
    containerElement.appendChild(element);
    element.positionAt(0, 0);
    var result = new Size(element.offsetWidth, element.offsetHeight);
    element.positionAt(undefined, undefined);
    element.remove();
    return result;
}

/**
 * @constructor
 * @param {boolean} autoInvoke
 */
CTRL.InvokeOnceHandlers = function(autoInvoke)
{
    this._handlers = null;
    this._autoInvoke = autoInvoke;
}

CTRL.InvokeOnceHandlers.prototype = {
    /**
     * @param {!Object} object
     * @param {function()} method
     */
    add: function(object, method)
    {
        if (!this._handlers) {
            this._handlers = new Map();
            if (this._autoInvoke)
                this.scheduleInvoke();
        }
        var methods = this._handlers.get(object);
        if (!methods) {
            methods = new Set();
            this._handlers.set(object, methods);
        }
        methods.add(method);
    },

    /**
     * @suppressGlobalPropertiesCheck
     */
    scheduleInvoke: function()
    {
        if (this._handlers)
            requestAnimationFrame(this._invoke.bind(this));
    },

    _invoke: function()
    {
        var handlers = this._handlers;
        this._handlers = null;
        var keys = handlers.keysArray();
        for (var i = 0; i < keys.length; ++i) {
            var object = keys[i];
            var methods = handlers.get(object).valuesArray();
            for (var j = 0; j < methods.length; ++j)
                methods[j].call(object);
        }
    }
}

CTRL._coalescingLevel = 0;
CTRL._postUpdateHandlers = null;

CTRL.startBatchUpdate = function()
{
    if (!CTRL._coalescingLevel++)
        CTRL._postUpdateHandlers = new CTRL.InvokeOnceHandlers(false);
}

CTRL.endBatchUpdate = function()
{
    if (--CTRL._coalescingLevel)
        return;
    CTRL._postUpdateHandlers.scheduleInvoke();
    CTRL._postUpdateHandlers = null;
}

/**
 * @param {!Object} object
 * @param {function()} method
 */
CTRL.invokeOnceAfterBatchUpdate = function(object, method)
{
    if (!CTRL._postUpdateHandlers)
        CTRL._postUpdateHandlers = new CTRL.InvokeOnceHandlers(true);
    CTRL._postUpdateHandlers.add(object, method);
}

/**
 * @param {!Window} window
 * @param {!Function} func
 * @param {!Array.<{from:number, to:number}>} params
 * @param {number} frames
 * @param {function()=} animationComplete
 * @return {function()}
 */
CTRL.animateFunction = function(window, func, params, frames, animationComplete)
{
    var values = new Array(params.length);
    var deltas = new Array(params.length);
    for (var i = 0; i < params.length; ++i) {
        values[i] = params[i].from;
        deltas[i] = (params[i].to - params[i].from) / frames;
    }

    var raf = window.requestAnimationFrame(animationStep);

    var framesLeft = frames;

    function animationStep()
    {
        if (--framesLeft < 0) {
            if (animationComplete)
                animationComplete();
            return;
        }
        for (var i = 0; i < params.length; ++i) {
            if (params[i].to > params[i].from)
                values[i] = Number.constrain(values[i] + deltas[i], params[i].from, params[i].to);
            else
                values[i] = Number.constrain(values[i] + deltas[i], params[i].to, params[i].from);
        }
        func.apply(null, values);
        raf = window.requestAnimationFrame(animationStep);
    }

    function cancelAnimation()
    {
        window.cancelAnimationFrame(raf);
    }

    return cancelAnimation;
}

/**
 * @constructor
 * @extends {CTRL.Object}
 * @param {!Element} element
 */
CTRL.LongClickController = function(element)
{
    this._element = element;
}

/**
 * @enum {string}
 */
CTRL.LongClickController.Events = {
    LongClick: "LongClick"
};

CTRL.LongClickController.prototype = {
    reset: function()
    {
        if (this._longClickInterval) {
            clearInterval(this._longClickInterval);
            delete this._longClickInterval;
        }
    },

    enable: function()
    {
        if (this._longClickData)
            return;
        var boundMouseDown = mouseDown.bind(this);
        var boundMouseUp = mouseUp.bind(this);
        var boundReset = this.reset.bind(this);

        this._element.addEventListener("mousedown", boundMouseDown, false);
        this._element.addEventListener("mouseout", boundReset, false);
        this._element.addEventListener("mouseup", boundMouseUp, false);
        this._element.addEventListener("click", boundReset, true);

        this._longClickData = { mouseUp: boundMouseUp, mouseDown: boundMouseDown, reset: boundReset };

        /**
         * @param {!Event} e
         * @this {CTRL.LongClickController}
         */
        function mouseDown(e)
        {
            if (e.which !== 1)
                return;
            this._longClickInterval = setTimeout(longClicked.bind(this, e), 200);
        }

        /**
         * @param {!Event} e
         * @this {CTRL.LongClickController}
         */
        function mouseUp(e)
        {
            if (e.which !== 1)
                return;
            this.reset();
        }

        /**
         * @param {!Event} e
         * @this {CTRL.LongClickController}
         */
        function longClicked(e)
        {
            this.dispatchEventToListeners(CTRL.LongClickController.Events.LongClick, e);
        }
    },

    disable: function()
    {
        if (!this._longClickData)
            return;
        this._element.removeEventListener("mousedown", this._longClickData.mouseDown, false);
        this._element.removeEventListener("mouseout", this._longClickData.reset, false);
        this._element.removeEventListener("mouseup", this._longClickData.mouseUp, false);
        this._element.addEventListener("click", this._longClickData.reset, true);
        delete this._longClickData;
    },

    __proto__: CTRL.Object.prototype
}

/**
 * @param {!Window} window
 */
CTRL.initializeUIUtils = function(window)
{
    window.addEventListener("focus", CTRL._windowFocused.bind(CNC, window.document), false);
    window.addEventListener("blur", CTRL._windowBlurred.bind(CNC, window.document), false);
    window.document.addEventListener("focus", CTRL._focusChanged.bind(CNC), true);
    window.document.addEventListener("blur", CTRL._documentBlurred.bind(CNC, window.document), true);
}

/**
 * @param {string} name
 * @return {string}
 */
CTRL.beautifyFunctionName = function(name)
{
    return name || CTRL.UIString("(anonymous function)");
}

/**
 * @param {string} localName
 * @param {string} typeExtension
 * @param {!Object} prototype
 * @return {function()}
 * @suppressGlobalPropertiesCheck
 * @template T
 */
function registerCustomElement(localName, typeExtension, prototype)
{
    return document.registerElement(typeExtension, {
        prototype: Object.create(prototype),
        extends: localName
    });
}

/**
 * @param {string} text
 * @param {function(!Event)=} clickHandler
 * @param {string=} className
 * @param {string=} title
 * @return {!Element}
 */
function createTextButton(text, clickHandler, className, title)
{
    var element = createElementWithClass("button", className || "", "text-button");
    element.textContent = text;
    if (clickHandler)
        element.addEventListener("click", clickHandler, false);
    if (title)
        element.title = title;
    return element;
}

/**
 * @param {string} name
 * @param {string} title
 * @param {boolean=} checked
 * @return {!Element}
 */
function createRadioLabel(name, title, checked)
{
    var element = createElement("label", "dt-radio");
    element.radioElement.name = name;
    element.radioElement.checked = !!checked;
    element.createTextChild(title);
    return element;
}

/**
 * @param {string=} title
 * @param {boolean=} checked
 * @return {!Element}
 */
function createCheckboxLabel(title, checked)
{
    var element = createElement("label", "dt-checkbox");
    element.checkboxElement.checked = !!checked;
    if (title !== undefined) {
        element.textElement = element.createChild("div", "dt-checkbox-text");
        element.textElement.textContent = title;
    }
    return element;
}


CTRL.appendStyle = function(node, cssFile) { //TODO ???
    var content = Runtime.cachedResources[cssFile] || "";
    if (!content)
        console.error(cssFile + " not preloaded. Check module.json");
    var styleElement = createElement("style");
    styleElement.type = "text/css";
    styleElement.textContent = content;
    node.appendChild(styleElement);

    /*var themeStyleSheet = WebInspector.themeSupport.themeStyleSheet(cssFile, content);
    if (themeStyleSheet) {
        styleElement = createElement("style");
        styleElement.type = "text/css";
        styleElement.textContent = themeStyleSheet + "\n" + Runtime.resolveSourceURL(cssFile + ".theme");
        node.appendChild(styleElement);
    }*/
}

;(function() {
    registerCustomElement("button", "text-button", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this.type = "button";
            var root = CTRL.createShadowRootWithCoreStyles(this);
            root.appendChild(CTRL.Widget.createStyleElement("ui/textButton.css"));
            root.createChild("content");
        },

        __proto__: HTMLButtonElement.prototype
    });

    registerCustomElement("label", "dt-radio", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this.radioElement = this.createChild("input", "dt-radio-button");
            this.radioElement.type = "radio";
            var root = CTRL.createShadowRootWithCoreStyles(this);
            root.appendChild(CTRL.Widget.createStyleElement("ui/radioButton.css"));
            root.createChild("content").select = ".dt-radio-button";
            root.createChild("content");
            this.addEventListener("click", radioClickHandler, false);
        },

        __proto__: HTMLLabelElement.prototype
    });

    /**
     * @param {!Event} event
     * @suppressReceiverCheck
     * @this {Element}
     */
    function radioClickHandler(event)
    {
        if (this.radioElement.checked || this.radioElement.disabled)
            return;
        this.radioElement.checked = true;
        this.radioElement.dispatchEvent(new Event("change"));
    }

    registerCustomElement("label", "dt-checkbox", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            this._root = CTRL.createShadowRootWithCoreStyles(this);
            this._root.appendChild(CTRL.Widget.createStyleElement("ui/checkboxTextLabel.css"));
            var checkboxElement = createElementWithClass("input", "dt-checkbox-button");
            checkboxElement.type = "checkbox";
            this._root.appendChild(checkboxElement);
            this.checkboxElement = checkboxElement;

            this.addEventListener("click", toggleCheckbox.bind(this));

            /**
             * @param {!Event} event
             * @this {Node}
             */
            function toggleCheckbox(event)
            {
                if (event.target !== checkboxElement && event.target !== this)
                    checkboxElement.click();
            }

            this._root.createChild("content");
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set backgroundColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            this.checkboxElement.style.backgroundColor = color;
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set checkColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            var stylesheet = createElement("style");
            stylesheet.textContent = "input.dt-checkbox-themed:checked:after { background-color: " + color + "}";
            this._root.appendChild(stylesheet);
        },

        /**
         * @param {string} color
         * @this {Element}
         */
        set borderColor(color)
        {
            this.checkboxElement.classList.add("dt-checkbox-themed");
            this.checkboxElement.style.borderColor = color;
        },

        __proto__: HTMLLabelElement.prototype
    });

    registerCustomElement("label", "dt-icon-label", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            var root = CTRL.createShadowRootWithCoreStyles(this);
            root.appendChild(CTRL.Widget.createStyleElement("ui/smallIcon.css"));
            this._iconElement = root.createChild("div");
            root.createChild("content");
        },

        /**
         * @param {string} type
         * @this {Element}
         */
        set type(type)
        {
            this._iconElement.className = type;
        },

        __proto__: HTMLLabelElement.prototype
    });

    registerCustomElement("div", "dt-close-button", {
        /**
         * @this {Element}
         */
        createdCallback: function()
        {
            var root = CTRL.createShadowRootWithCoreStyles(this);
            root.appendChild(CTRL.Widget.createStyleElement("ui/closeButton.css"));
            this._buttonElement = root.createChild("div", "close-button");
        },

        /**
         * @param {boolean} gray
         * @this {Element}
         */
        set gray(gray)
        {
            this._buttonElement.className = gray ? "close-button-gray" : "close-button";
        },

        __proto__: HTMLDivElement.prototype
    });
})();

/**
 * @constructor
 */
CTRL.StringFormatter = function()
{
    this._processors = [];
    this._regexes = [];
}

CTRL.StringFormatter.prototype = {
    /**
     * @param {!RegExp} regex
     * @param {function(string):!Node} handler
     */
    addProcessor: function(regex, handler)
    {
        this._regexes.push(regex);
        this._processors.push(handler);
    },

    /**
     * @param {string} text
     * @return {!Node}
     */
    formatText: function(text)
    {
        return this._runProcessor(0, text);
    },

    /**
     * @param {number} processorIndex
     * @param {string} text
     * @return {!Node}
     */
    _runProcessor: function(processorIndex, text)
    {
        if (processorIndex >= this._processors.length)
            return createTextNode(text);

        var container = createDocumentFragment();
        var regex = this._regexes[processorIndex];
        var processor = this._processors[processorIndex];

        // Due to the nature of regex, |items| array has matched elements on its even indexes.
        var items = text.replace(regex, "\0$1\0").split("\0");
        for (var i = 0; i < items.length; ++i) {
            var processedNode = i % 2 ? processor(items[i]) : this._runProcessor(processorIndex + 1, items[i]);
            container.appendChild(processedNode);
        }

        return container;
    }
}
