CTRL.KeyboardShortcut = function()
{
}

/**
 * Constants for encoding modifier key set as a bit mask.
 * @see #_makeKeyFromCodeAndModifiers
 */
CTRL.KeyboardShortcut.Modifiers = {
    None: 0,   // Constant for empty modifiers set.
    Shift: 1,
    Ctrl: 2,
    Alt: 4,
    Meta: 8,   // Command key on Mac, Win key on other platforms.
    get CtrlOrMeta()
    {
        // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
        return CTRL.isMac() ? this.Meta : this.Ctrl;
    },
    get ShiftOrOption()
    {
        // Option on Mac, Shift on other platforms
        return CTRL.isMac() ? this.Alt : this.Shift;
    }
};

/** @typedef {!{code: number, name: (string|!Object.<string, string>)}} */
CTRL.KeyboardShortcut.Key;

/** @type {!Object.<string, !CTRL.KeyboardShortcut.Key>} */
CTRL.KeyboardShortcut.Keys = {
    Backspace: { code: 8, name: "\u21a4" },
    Tab: { code: 9, name: { mac: "\u21e5", other: "Tab" } },
    Enter: { code: 13, name: { mac: "\u21a9", other: "Enter" } },
    Shift: { code: 16, name: { mac: "\u21e7", other: "Shift" } },
    Ctrl: { code: 17, name: "Ctrl" },
    Esc: { code: 27, name: "Esc" },
    Space: { code: 32, name: "Space" },
    PageUp: { code: 33,  name: { mac: "\u21de", other: "PageUp" } },      // also NUM_NORTH_EAST
    PageDown: { code: 34, name: { mac: "\u21df", other: "PageDown" } },   // also NUM_SOUTH_EAST
    End: { code: 35, name: { mac: "\u2197", other: "End" } },             // also NUM_SOUTH_WEST
    Home: { code: 36, name: { mac: "\u2196", other: "Home" } },           // also NUM_NORTH_WEST
    Left: { code: 37, name: "\u2190" },           // also NUM_WEST
    Up: { code: 38, name: "\u2191" },             // also NUM_NORTH
    Right: { code: 39, name: "\u2192" },          // also NUM_EAST
    Down: { code: 40, name: "\u2193" },           // also NUM_SOUTH
    Delete: { code: 46, name: "Del" },
    Zero: { code: 48, name: "0" },
    H: { code: 72, name: "H" },
    Meta: { code: 91, name: "Meta" },
    F1: { code: 112, name: "F1" },
    F2: { code: 113, name: "F2" },
    F3: { code: 114, name: "F3" },
    F4: { code: 115, name: "F4" },
    F5: { code: 116, name: "F5" },
    F6: { code: 117, name: "F6" },
    F7: { code: 118, name: "F7" },
    F8: { code: 119, name: "F8" },
    F9: { code: 120, name: "F9" },
    F10: { code: 121, name: "F10" },
    F11: { code: 122, name: "F11" },
    F12: { code: 123, name: "F12" },
    Semicolon: { code: 186, name: ";" },
    NumpadPlus: { code: 107, name: "Numpad +" },
    NumpadMinus: { code: 109, name: "Numpad -" },
    Numpad0: { code: 96, name: "Numpad 0" },
    Plus: { code: 187, name: "+" },
    Comma: { code: 188, name: "," },
    Minus: { code: 189, name: "-" },
    Period: { code: 190, name: "." },
    Slash: { code: 191, name: "/" },
    QuestionMark: { code: 191, name: "?" },
    Apostrophe: { code: 192, name: "`" },
    Tilde: { code: 192, name: "Tilde" },
    LeftSquareBracket: { code: 219, name: "[" },
    RightSquareBracket: { code: 221, name: "]" },
    Backslash: { code: 220, name: "\\" },
    SingleQuote: { code: 222, name: "\'" },
    get CtrlOrMeta()
    {
        // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
        return CTRL.isMac() ? this.Meta : this.Ctrl;
    },
};

CTRL.KeyboardShortcut.KeyBindings = {};

(function() {
    for (var key in CTRL.KeyboardShortcut.Keys) {
        var descriptor = CTRL.KeyboardShortcut.Keys[key];
        if (typeof descriptor === "object" && descriptor["code"]) {
            var name = typeof descriptor["name"] === "string" ? descriptor["name"] : key;
            CTRL.KeyboardShortcut.KeyBindings[name] = descriptor;
        }
    }
})();

/**
 * Creates a number encoding keyCode in the lower 8 bits and modifiers mask in the higher 8 bits.
 * It is useful for matching pressed keys.
 *
 * @param {number|string} keyCode The code of the key, or a character "a-z" which is converted to a keyCode value.
 * @param {number=} modifiers Optional list of modifiers passed as additional parameters.
 * @return {number}
 */
CTRL.KeyboardShortcut.makeKey = function(keyCode, modifiers)
{
    if (typeof keyCode === "string")
        keyCode = keyCode.charCodeAt(0) - (/^[a-z]/.test(keyCode) ? 32 : 0);
    modifiers = modifiers || CTRL.KeyboardShortcut.Modifiers.None;
    return CTRL.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCode, modifiers);
}

/**
 * @param {?KeyboardEvent} keyboardEvent
 * @return {number}
 */
CTRL.KeyboardShortcut.makeKeyFromEvent = function(keyboardEvent)
{
    var modifiers = CTRL.KeyboardShortcut.Modifiers.None;
    if (keyboardEvent.shiftKey)
        modifiers |= CTRL.KeyboardShortcut.Modifiers.Shift;
    if (keyboardEvent.ctrlKey)
        modifiers |= CTRL.KeyboardShortcut.Modifiers.Ctrl;
    if (keyboardEvent.altKey)
        modifiers |= CTRL.KeyboardShortcut.Modifiers.Alt;
    if (keyboardEvent.metaKey)
        modifiers |= CTRL.KeyboardShortcut.Modifiers.Meta;

    // Use either a real or a synthetic keyCode (for events originating from extensions).
    var keyCode = keyboardEvent.keyCode || keyboardEvent["__keyCode"];
    return CTRL.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCode, modifiers);
}

/**
 * @param {?KeyboardEvent} keyboardEvent
 * @return {number}
 */
CTRL.KeyboardShortcut.makeKeyFromEventIgnoringModifiers = function(keyboardEvent)
{
    var keyCode = keyboardEvent.keyCode || keyboardEvent["__keyCode"];
    return CTRL.KeyboardShortcut._makeKeyFromCodeAndModifiers(keyCode, CTRL.KeyboardShortcut.Modifiers.None);
}

/**
 * @param {(?KeyboardEvent|?MouseEvent)} event
 * @return {boolean}
 */
CTRL.KeyboardShortcut.eventHasCtrlOrMeta = function(event)
{
    return CTRL.isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

/**
 * @param {!Event} event
 * @return {boolean}
 */
CTRL.KeyboardShortcut.hasNoModifiers = function(event)
{
    return !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;
}

/** @typedef {!{key: number, name: string}} */
CTRL.KeyboardShortcut.Descriptor;

/**
 * @param {string|!CTRL.KeyboardShortcut.Key} key
 * @param {number=} modifiers
 * @return {!CTRL.KeyboardShortcut.Descriptor}
 */
CTRL.KeyboardShortcut.makeDescriptor = function(key, modifiers)
{
    return {
        key: CTRL.KeyboardShortcut.makeKey(typeof key === "string" ? key : key.code, modifiers),
        name: CTRL.KeyboardShortcut.shortcutToString(key, modifiers)
    };
}

/**
 * @param {string} shortcut
 * @return {?CTRL.KeyboardShortcut.Descriptor}
 */
CTRL.KeyboardShortcut.makeDescriptorFromBindingShortcut = function(shortcut)
{
    var parts = shortcut.split(/\+(?!$)/);
    var modifiers = 0;
    var keyString;
    for (var i = 0; i < parts.length; ++i) {
        if (typeof CTRL.KeyboardShortcut.Modifiers[parts[i]] !== "undefined") {
            modifiers |= CTRL.KeyboardShortcut.Modifiers[parts[i]];
            continue;
        }
        console.assert(i === parts.length - 1, "Only one key other than modifier is allowed in shortcut <" + shortcut + ">");
        keyString = parts[i];
        break;
    }
    console.assert(keyString, "Modifiers-only shortcuts are not allowed (encountered <" + shortcut + ">)");
    if (!keyString)
        return null;

    var key = CTRL.KeyboardShortcut.Keys[keyString] || CTRL.KeyboardShortcut.KeyBindings[keyString];
    if (key && key.shiftKey)
        modifiers |= CTRL.KeyboardShortcut.Modifiers.Shift;
    return CTRL.KeyboardShortcut.makeDescriptor(key ? key : keyString, modifiers);
}

/**
 * @param {string|!CTRL.KeyboardShortcut.Key} key
 * @param {number=} modifiers
 * @return {string}
 */
CTRL.KeyboardShortcut.shortcutToString = function(key, modifiers)
{
    return CTRL.KeyboardShortcut._modifiersToString(modifiers) + CTRL.KeyboardShortcut._keyName(key);
}

/**
 * @param {string|!CTRL.KeyboardShortcut.Key} key
 * @return {string}
 */
CTRL.KeyboardShortcut._keyName = function(key)
{
    if (typeof key === "string")
        return key.toUpperCase();
    if (typeof key.name === "string")
        return key.name;
    return key.name[CTRL.platform()] || key.name.other || '';
}

/**
 * @param {number} keyCode
 * @param {?number} modifiers
 * @return {number}
 */
CTRL.KeyboardShortcut._makeKeyFromCodeAndModifiers = function(keyCode, modifiers)
{
    return (keyCode & 255) | (modifiers << 8);
};

/**
 * @param {number} key
 * @return {!{keyCode: number, modifiers: number}}
 */
CTRL.KeyboardShortcut.keyCodeAndModifiersFromKey = function(key)
{
    return { keyCode: key & 255, modifiers: key >> 8 };
}

/**
 * @param {number|undefined} modifiers
 * @return {string}
 */
CTRL.KeyboardShortcut._modifiersToString = function(modifiers)
{
    var isMac = CTRL.isMac();
    var m = CTRL.KeyboardShortcut.Modifiers;
    var modifierNames = new Map([
        [m.Ctrl, isMac ? "Ctrl\u2004" : "Ctrl\u200A+\u200A"],
        [m.Alt, isMac ? "opt\u2004" : "Alt\u200A+\u200A"],
        [m.Shift, isMac ? "\u21e7\u2004" : "Shift\u200A+\u200A"],
        [m.Meta, isMac ? "\u2318\u2004" : "Win\u200A+\u200A"]
    ]);
    return [m.Meta, m.Ctrl, m.Alt, m.Shift].map(mapModifiers).join("");

    /**
     * @param {number} m
     * @return {string}
     */
    function mapModifiers(m)
    {
        return modifiers & m ? /** @type {string} */ (modifierNames.get(m)) : "";
    }
};

CTRL.KeyboardShortcut.SelectAll = CTRL.KeyboardShortcut.makeKey("a", CTRL.KeyboardShortcut.Modifiers.CtrlOrMeta);
