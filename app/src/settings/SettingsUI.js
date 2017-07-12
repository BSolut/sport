
CTRL.SettingsUI = {}


CTRL.SettingsUI.createSettingCheckbox = function(name, setting, omitParagraphElement, tooltip)
{
    var label = createCheckboxLabel(name);
    if (tooltip)
        label.title = tooltip;

    var input = label.checkboxElement;
    input.name = name;
    CTRL.SettingsUI.bindCheckbox(input, setting);

    if (omitParagraphElement)
        return label;

    var p = createElement("p");
    p.appendChild(label);
    return p;
}

CTRL.SettingsUI.bindCheckbox = function(input, setting)
{
    function settingChanged()
    {
        if (input.checked !== setting.get())
            input.checked = setting.get();
    }
    setting.addChangeListener(settingChanged);
    settingChanged();

    function inputChanged()
    {
        if (setting.get() !== input.checked)
            setting.set(input.checked);
    }
    input.addEventListener("change", inputChanged, false);
}


CTRL.SettingsUI.createSettingInputField = function(label, setting, numeric, maxLength, width, validatorCallback, instant, clearForZero, placeholder)
{
    var p = createElement("p");
    var labelElement = p.createChild("label");
    labelElement.textContent = label;
    var inputElement = p.createChild("input");
    inputElement.type = "text";
    if (numeric)
        inputElement.className = "numeric";
    if (maxLength)
        inputElement.maxLength = maxLength;
    if (width)
        inputElement.style.width = width;
    inputElement.placeholder = placeholder || "";

    if (validatorCallback || instant) {
        inputElement.addEventListener("change", onInput, false);
        inputElement.addEventListener("input", onInput, false);
    }
    inputElement.addEventListener("keydown", onKeyDown, false);

    var errorMessageLabel;
    if (validatorCallback)
        errorMessageLabel = p.createChild("div", "field-error-message");

    function onInput()
    {
        if (validatorCallback)
            validate();
        if (instant)
            apply();
    }

    function onKeyDown(event)
    {
        if (isEnterKey(event))
            apply();
        incrementForArrows(event);
    }

    function incrementForArrows(event)
    {
        if (!numeric)
            return;

        var increment = event.keyIdentifier === "Up" ? 1 : event.keyIdentifier === "Down" ? -1 : 0;
        if (!increment)
            return;
        if (event.shiftKey)
            increment *= 10;

        var value = inputElement.value;
        if (validatorCallback && validatorCallback(value))
            return;
        value = Number(value);
        if (clearForZero && !value)
            return;
        value += increment;
        if (clearForZero && !value)
            return;
        value = String(value);
        if (validatorCallback && validatorCallback(value))
            return;

        inputElement.value = value;
        apply();
        event.preventDefault();
    }

    function validate()
    {
        var error = validatorCallback(inputElement.value);
        if (!error)
            error = "";
        inputElement.classList.toggle("error-input", !!error);
        errorMessageLabel.textContent = error;
    }

    if (!instant)
        inputElement.addEventListener("blur", apply, false);

    function apply()
    {
        if (validatorCallback && validatorCallback(inputElement.value))
            return;
        setting.removeChangeListener(onSettingChange);
        setting.set(numeric ? Number(inputElement.value) : inputElement.value);
        setting.addChangeListener(onSettingChange);
    }

    setting.addChangeListener(onSettingChange);

    function onSettingChange()
    {
        var value = setting.get();
        if (clearForZero && !value)
            value = "";
        inputElement.value = value;
    }
    onSettingChange();

    if (validatorCallback)
      validate();

    return p;
}

/*
CTRL.SettingsUI.createCustomSetting = function(name, element)
{
    var p = createElement("p");
    var fieldsetElement = p.createChild("fieldset");
    fieldsetElement.createChild("label").textContent = name;
    fieldsetElement.appendChild(element);
    return p;
}

CTRL.SettingsUI.createSettingFieldset = function(setting)
{
    var fieldset = createElement("fieldset");
    fieldset.disabled = !setting.get();
    setting.addChangeListener(settingChanged);
    return fieldset;

    function settingChanged()
    {
        fieldset.disabled = !setting.get();
    }
}

CTRL.SettingsUI.regexValidator = function(text)
{
    var regex;
    try {
        regex = new RegExp(text);
    } catch (e) {
    }
    return regex ? null : CTRL.UIString("Invalid pattern");
}

CTRL.SettingsUI.createInput = function(parentElement, id, defaultText, eventListener, numeric, size)
{
    var element = parentElement.createChild("input");
    element.id = id;
    element.type = "text";
    element.maxLength = 12;
    element.style.width = size || "80px";
    element.value = defaultText;
    element.align = "right";
    if (numeric)
        element.className = "numeric";
    element.addEventListener("input", eventListener, false);
    element.addEventListener("keydown", keyDownListener, false);
    function keyDownListener(event)
    {
        if (isEnterKey(event))
            eventListener(event);
    }
    return element;
}

CTRL.SettingUI = function()
{
}

CTRL.SettingUI.prototype = {
    settingElement: function() { }
}
*/