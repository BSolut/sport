CTRL.ReportView = function(title) {
    CTRL.VBox.call(this, true);
    this.registerRequiredCSS("ui/reportView.css");
    var contentBox = this.contentElement.createChild("div", "report-content-box");
    this._headerElement = contentBox.createChild("div", "report-header vbox");
    this._headerElement.createChild("div", "report-title").textContent = title;
    this._sectionList = contentBox.createChild("div", "vbox");
    this._sectionMap = new Map();
}
CTRL.ReportView.prototype = {
    setSubtitle: function(subtitle) {
        if (this._subtitleElement && this._subtitleElement.textContent === subtitle)
            return;
        if (!this._subtitleElement)
            this._subtitleElement = this._headerElement.createChild("div", "report-subtitle");
        this._subtitleElement.textContent = subtitle;
    },
    setURL: function(url) {
        if (this._url === url)
            return;
        if (!this._urlElement)
            this._urlElement = this._headerElement.createChild("div", "report-url link");
        this._url = url;
        this._urlElement.removeChildren();
        if (url)
            this._urlElement.appendChild(CTRL.linkifyURLAsNode(url));
    },
    createToolbar: function() {
        var toolbar = new CTRL.Toolbar("");
        this._headerElement.appendChild(toolbar.element);
        return toolbar;
    },
    appendSection: function(title, className,expandable) {
        var section = new CTRL.ReportView.Section(title,className,expandable);
        section.show(this._sectionList);
        this._sectionMap.set(title, section);
        return section;
    },
    removeAllSection: function() {
        this._sectionList.removeChildren();
        this._sectionMap.clear();
    },
    getSection: function(title)
    {
        return this._sectionMap.get(title);
    },
    __proto__: CTRL.VBox.prototype
}
CTRL.ReportView.Section = function(title, className, expandable) {
    CTRL.VBox.call(this);
    this.element.classList.add("report-section");
    if(expandable)
    	this.element.classList.add("expandable");

    if (className)
        this.element.classList.add(className);
    this._headerElement = this.element.createChild("div", "report-section-header");
    this._titleElement = this._headerElement.createChild("div", "report-section-title");
    this._titleElement.textContent = title;
    this._titleElement.addEventListener("click", this._toggleExpanded.bind(this), false);

    this._fieldList = this.element.createChild("div", "vbox");
    this._fieldMap = new Map();
}
CTRL.ReportView.Section.prototype = {
    setTitle: function(title) {
        if (this._titleElement.textContent !== title)
            this._titleElement.textContent = title;
    },
    createToolbar: function() {
        var toolbar = new CTRL.Toolbar("");
        this._headerElement.appendChild(toolbar.element);
        return toolbar;
    },
    appendField: function(title, textValue) {
        var row = this._fieldMap.get(title);
        if (!row) {
            row = this._fieldList.createChild("div", "report-field");
            row.createChild("div", "report-field-name").textContent = title;
            this._fieldMap.set(title, row);
            row.createChild("div", "report-field-value");
        }
        if (textValue)
            row.lastElementChild.textContent = textValue;
        return ( row.lastElementChild) ;
    },
    remove: function() {
        this.element.remove();
    },
    removeField: function(title) {
        var row = this._fieldMap.get(title);
        if (row)
            row.remove();
        this._fieldMap.delete(title);
    },
    setFieldVisible: function(title, visible) {
        var row = this._fieldMap.get(title);
        if (row)
            row.classList.toggle("hidden", !visible);
    },
    fieldValue: function(title, textValue) {
        var row = this._fieldMap.get(title);
        if(row && textValue !== undefined) {
            row.lastElementChild.textContent = textValue;
        } else
            return row ? row.lastElementChild : null;
    },
    appendRow: function() {
        return this._fieldList.createChild("div", "report-row");
    },
    clearContent: function() {
        this._fieldList.removeChildren();
        this._fieldMap.clear();
    },
    _expand: function()
    {
        this.element.classList.add("expanded");
    },
    _collapse: function()
    {
        this.element.classList.remove("expanded");
    },
    _toggleExpanded: function()
    {
        if (this.element.classList.contains("expanded"))
            this._collapse();
        else
            this._expand();
    },


    __proto__: CTRL.VBox.prototype
};