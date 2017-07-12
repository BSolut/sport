CTRL.RootView = function()
{
    CTRL.VBox.call(this);
    this.markAsRoot();
    this.element.classList.add("root-view");
    this.element.setAttribute("spellcheck", false);
}

CTRL.RootView.prototype = {
    /**
     * @param {!Document} document
     */
    attachToDocument: function(document)
    {
        document.defaultView.addEventListener("resize", this.doResize.bind(this), false);
        this._window = document.defaultView;
        this.doResize();
        this.show(document.body);
    },

    doResize: function()
    {
        if (this._window) {
            var size = this.constraints().minimum;
            var right = Math.min(0, this._window.innerWidth - size.width);
            this.element.style.marginRight = right + "px";
            var bottom = Math.min(0, this._window.innerHeight - size.height);
            this.element.style.marginBottom = bottom + "px";
        }
        CTRL.VBox.prototype.doResize.call(this);
    },

    __proto__: CTRL.VBox.prototype
}
