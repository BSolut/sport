

CTRL.EditableSelect = function(parentElement) {

    this.element = parentElement ? parentElement.createChild("div", "editableSelect") : createElementWithClass("div", "editableSelect");
    this._shadowRoot = CTRL.createShadowRootWithCoreStyles(this.element);
    this._shadowRoot.appendChild(CTRL.Widget.createStyleElement("ui/editableSelect.css"));
    this._contentElement = this._shadowRoot;//this._shadowRoot.createChild("div");

    var select = this.select = this._contentElement.createChild('select'),
        input = this.input = this._contentElement.createChild('input');

    select.addEventListener('click', function() {
        input.value = select.value;
    })
}

CTRL.EditableSelect.prototype = {

    setValues: function(values) {
        this.select.innerHTML = values.map(function(a,b) {return (b||'') + '<option>'+a+'</option>';});
        this.input.value = values[0];
    },

    set value(val) {
        this.input.value = val;
    }

};