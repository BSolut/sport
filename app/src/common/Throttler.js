


CTRL.Throttler = function(timeout)
{
    this._timeout = timeout;
    this._isRunningProcess = false;
    this._asSoonAsPossible = false;
    this._process = null;
}

CTRL.Throttler.prototype = {

    schedule: function(process, asSoonAsPossible) {
        // Deliberately skip previous process.
        this._process = process;

        // Run the first scheduled task instantly.
        var hasScheduledTasks = !!this._processTimeout || this._isRunningProcess;
        asSoonAsPossible = !!asSoonAsPossible || !hasScheduledTasks;

        var forceTimerUpdate = asSoonAsPossible && !this._asSoonAsPossible;
        this._asSoonAsPossible = this._asSoonAsPossible || asSoonAsPossible;

        this._innerSchedule(forceTimerUpdate);        
    },

    _innerSchedule: function(forceTimerUpdate) {
        if (this._isRunningProcess)
            return;
        if (this._processTimeout && !forceTimerUpdate)
            return;
        if (this._processTimeout)
            this._clearTimeout(this._processTimeout);

        var timeout = this._asSoonAsPossible ? 0 : this._timeout;
        this._processTimeout = this._setTimeout(this._onTimeout.bind(this), timeout);
    },

    _processCompleted: function()
    {
        this._isRunningProcess = false;
        if (this._process)
            this._innerSchedule(false);
        this._processCompletedForTests();
    },

    _processCompletedForTests: function()
    {
        // For sniffing in tests.
    },

    _onTimeout: function()
    {
        delete this._processTimeout;
        this._asSoonAsPossible = false;
        this._isRunningProcess = true;

        Promise.resolve()
            .then(this._process)
            .catch(console.error.bind(console))
            .then(this._processCompleted.bind(this));
        this._process = null;
    },

    _clearTimeout: function(timeoutId)
    {
        clearTimeout(timeoutId);
    },

    _setTimeout: function(operation, timeout)
    {
        return setTimeout(operation, timeout);
    }
}
