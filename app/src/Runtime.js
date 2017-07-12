// This gets all concatenated module descriptors in the release mode.
var allDescriptors = [];
var applicationDescriptor;
var _loadedScripts = {};


function loadResourcePromise(url)
{
    return new Promise(load);

    /**
     * @param {function(?)} fulfill
     * @param {function(*)} reject
     */
    function load(fulfill, reject)
    {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = onreadystatechange;

        /**
         * @param {Event} e
         */
        function onreadystatechange(e)
        {
            if (xhr.readyState !== 4)
                return;

            if ([0, 200, 304].indexOf(xhr.status) === -1)  // Testing harness file:/// results in 0.
                reject(new Error("While loading from url " + url + " server responded with a status of " + xhr.status));
            else
                fulfill(e.target.response);
        }
        xhr.send(null);
    }
}

function normalizePath(path)
{
    if (path.indexOf("..") === -1 && path.indexOf('.') === -1)
        return path;

    var normalizedSegments = [];
    var segments = path.split("/");
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === ".")
            continue;
        else if (segment === "..")
            normalizedSegments.pop();
        else if (segment)
            normalizedSegments.push(segment);
    }
    var normalizedPath = normalizedSegments.join("/");
    if (normalizedPath[normalizedPath.length - 1] === "/")
        return normalizedPath;
    if (path[0] === "/" && normalizedPath)
        normalizedPath = "/" + normalizedPath;
    if ((path[path.length - 1] === "/") || (segments[segments.length - 1] === ".") || (segments[segments.length - 1] === ".."))
        normalizedPath = normalizedPath + "/";

    return normalizedPath;
}

function loadScriptsPromise(scriptNames, base)
{
    var toLoad = [],
        sources = new Array(scriptNames.length);
    for (var i = 0; i < scriptNames.length; ++i) {
        var scriptName = scriptNames[i];
        var sourceURL = (base || self._importScriptPathPrefix) + scriptName;
        var schemaIndex = sourceURL.indexOf("://") + 3;
        sourceURL = sourceURL.substring(0, schemaIndex) + normalizePath(sourceURL.substring(schemaIndex));
        if (_loadedScripts[sourceURL])
            continue;     
        _loadedScripts[sourceURL] = true;
        toLoad.push(sourceURL);
    }

    return new Promise(doLoadAll);

    function doLoadAll(fulfill, reject) {
        var idx = 0;
        (function next() {
            var sourceURL = toLoad[idx++];
            if(!sourceURL)
                return fulfill();

            var s = document.createElement('script');
            s.src = sourceURL;
            s.onload = next;
            s.onerror = reject;
            document.head.appendChild(s);
        })();
    }
}

self._importScriptPathPrefix ="";


function Runtime(descriptors, coreModuleNames)
{
    this._modules = [];
    this._modulesMap = {};
    this._extensions = [];
    this._cachedTypeClasses = {};
    this._descriptorsMap = {};
    for (var i = 0; i < descriptors.length; ++i)
        this._registerModule(descriptors[i]);
    if (coreModuleNames)
        this._loadAutoStartModules(coreModuleNames);
}

Runtime.cachedResources = { __proto__: null };

Runtime.startApplication = function(appName, toRun) {

	var applicationPromise = loadResourcePromise(appName+".json").then(JSON.parse.bind(JSON));
	applicationPromise.then(parseModuleDescriptors);

	function parseModuleDescriptors(configuration) {
        var moduleJSONPromises = [];
        var coreModuleNames = [];
        for (var i = 0; i < configuration.length; ++i) {
            var descriptor = configuration[i];
            if (descriptor["type"] === "worker")
                continue;
            var name = descriptor["name"];
			moduleJSONPromises.push(loadResourcePromise(name + "/module.json").then(JSON.parse.bind(JSON)));
            if (descriptor["type"] === "autostart")
                coreModuleNames.push(name);
        }

        Promise.all(moduleJSONPromises).then(instantiateRuntime);

        function instantiateRuntime(moduleDescriptors)
        {
            for (var i = 0, l = moduleDescriptors.length; i < l; ++i) {
                moduleDescriptors[i]["name"] = configuration[i]["name"];
                moduleDescriptors[i]["condition"] = configuration[i]["condition"];
            }
            self.runtime = new Runtime(moduleDescriptors, coreModuleNames);
            if(!toRun)
                return;
            var application = self.runtime.extensions('@Application').find(function(itm){
                return itm.descriptor().name == toRun
            });
            if(!application)
                return;
            application.instancePromise().then(function(appInst){
                appInst.run();
            })
        }		
	}
}


Runtime.prototype = {
    
    _registerModule: function(descriptor)
    {
        var module = new Runtime.Module(this, descriptor);
        this._modules.push(module);
        this._modulesMap[descriptor["name"]] = module;
    },

    _loadAutoStartModules: function(moduleNames)
    {
        var promises = [];
        for (var i = 0; i < moduleNames.length; ++i)            
			promises.push(this.loadModulePromise(moduleNames[i]));
        return Promise.all(promises);
    },

    loadModulePromise: function(moduleName)
    {
        return this._modulesMap[moduleName]._loadPromise();
    },

    extensions: function(type, context)
    {
        return this._extensions.filter(filter).sort(orderComparator);

        /**
         * @param {!Runtime.Extension} extension
         * @return {boolean}
         */
        function filter(extension)
        {
            if (extension._type !== type && extension._typeClass() !== type)
                return false;
            if (!extension.enabled())
                return false;
            return !context || extension.isApplicable(context);
        }

        /**
         * @param {!Runtime.Extension} extension1
         * @param {!Runtime.Extension} extension2
         * @return {number}
         */
        function orderComparator(extension1, extension2)
        {
            var order1 = extension1.descriptor()["order"] || 0;
            var order2 = extension2.descriptor()["order"] || 0;
            return order1 - order2;
        }
    },    

    extension: function(type, context)
    {
        return this.extensions(type, context)[0] || null;
    },    

    _resolve: function(typeName)
    {
        if (!this._cachedTypeClasses[typeName]) {
            var path = typeName.split(".");
            var object = window;
            for (var i = 0; object && (i < path.length); ++i)
                object = object[path[i]];
            if (object)
                this._cachedTypeClasses[typeName] = (object);
        }
        return this._cachedTypeClasses[typeName] || null;
    }

}

/*
Runtime.prototype = {
    useTestBase: function()
    {
        Runtime._remoteBase = "http://localhost:8000/inspector-sources/";
    },

    /**
     * @param {!Runtime.ModuleDescriptor} descriptor
     * /

    /**
     * @param {string} moduleName
     * @return {!Promise.<undefined>}
     * /

    /**
     * @param {!Array.<string>} moduleNames
     * @return {!Promise.<!Array.<*>>}
     * /

    /**
     * @param {!Runtime.Extension} extension
     * @param {?function(function(new:Object)):boolean} predicate
     * @return {boolean}
     * /
    _checkExtensionApplicability: function(extension, predicate)
    {
        if (!predicate)
            return false;
        var contextTypes = /** @type {!Array.<string>|undefined} * / (extension.descriptor().contextTypes);
        if (!contextTypes)
            return true;
        for (var i = 0; i < contextTypes.length; ++i) {
            var contextType = this._resolve(contextTypes[i]);
            var isMatching = !!contextType && predicate(contextType);
            if (isMatching)
                return true;
        }
        return false;
    },

    /**
     * @param {!Runtime.Extension} extension
     * @param {?Object} context
     * @return {boolean}
     *  /
    isExtensionApplicableToContext: function(extension, context)
    {
        if (!context)
            return true;
        return this._checkExtensionApplicability(extension, isInstanceOf);

        /**
         * @param {!Function} targetType
         * @return {boolean}
         * /
        function isInstanceOf(targetType)
        {
            return context instanceof targetType;
        }
    },

    /**
     * @param {!Runtime.Extension} extension
     * @param {!Set.<!Function>=} currentContextTypes
     * @return {boolean}
     * /
    isExtensionApplicableToContextTypes: function(extension, currentContextTypes)
    {
        if (!extension.descriptor().contextTypes)
            return true;

        return this._checkExtensionApplicability(extension, currentContextTypes ? isContextTypeKnown : null);

        /**
         * @param {!Function} targetType
         * @return {boolean}
         * /
        function isContextTypeKnown(targetType)
        {
            return currentContextTypes.has(targetType);
        }
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Array.<!Runtime.Extension>}
     * /


    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {?Runtime.Extension}
     * /
    extension: function(type, context)
    {
        return this.extensions(type, context)[0] || null;
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Promise.<!Array.<!Object>>}
     * /
    instancesPromise: function(type, context)
    {
        var extensions = this.extensions(type, context);
        var promises = [];
        for (var i = 0; i < extensions.length; ++i)
            promises.push(extensions[i].instancePromise());
        return Runtime._some(promises);
    },

    /**
     * @param {*} type
     * @param {?Object=} context
     * @return {!Promise.<!Object>}
     * /
    instancePromise: function(type, context)
    {
        var extension = this.extension(type, context);
        if (!extension)
            return Promise.reject(new Error("No such extension: " + type + " in given context."));
        return extension.instancePromise();
    },

    /**
     * @return {?function(new:Object)}
     * /
}*/




Runtime.Module = function(manager, descriptor) {
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    this._instanceMap = {};
    var extensions = descriptor.extensions;
    for (var i = 0; extensions && i < extensions.length; ++i)
        this._manager._extensions.push(new Runtime.Extension(this, extensions[i]));
    this._loaded = false;
}

Runtime.Module.prototype = {

    name: function()
    {
        return this._name;
    },

    enabled: function()
    {
        var condition = this._descriptor["condition"];
        if (condition && !Runtime.queryParam(condition))
            return false;
        return true;
    },

    _loadPromise: function()
    {
        if (this._loaded)
            return Promise.resolve();

        if (!this.enabled())
            return Promise.reject(new Error("Module " + this._name + " is not enabled"));

        if (this._pendingLoadPromise)
            return this._pendingLoadPromise;

        var dependencies = this._descriptor.dependencies;
        var dependencyPromises = [];
        for (var i = 0; dependencies && i < dependencies.length; ++i)
            dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());

        this._pendingLoadPromise = Promise.all(dependencyPromises)
            .then(this._loadResources.bind(this))
            .then(this._loadScripts.bind(this))
            .then(markAsLoaded.bind(this));

        return this._pendingLoadPromise;

        /**
         * @this {Runtime.Module}
         */
        function markAsLoaded()
        {
            delete this._pendingLoadPromise;
            this._loaded = true;
        }
    },	

    _loadResources: function() {
        var resources = this._descriptor["resources"];
        if (!resources)
            return Promise.resolve();
        var promises = [];
        for (var i = 0; i < resources.length; ++i) {
            var url = this._modularizeURL(resources[i]);
            promises.push(loadResourcePromise(url).then(cacheResource.bind(this, url), cacheResource.bind(this, url, undefined)));
        }
        return Promise.all(promises).then(undefined);

        function cacheResource(path, content)
        {
            if (!content) {
                console.error("Failed to load resource: " + path);
                return;
            }
            var sourceURL = window.location.href;
            if (window.location.search)
                sourceURL = sourceURL.replace(window.location.search, "");
            sourceURL = sourceURL.substring(0, sourceURL.lastIndexOf("/") + 1) + path;
            Runtime.cachedResources[path] = content + "\n/*# sourceURL=" + sourceURL + " * /";
        }    	
    },

	_loadScripts: function()
    {
        if (!this._descriptor.scripts)
            return Promise.resolve();
        return loadScriptsPromise(this._descriptor.scripts.map(this._modularizeURL, this));
    },    

    _modularizeURL: function(resourceName)
    {
        return normalizePath(this._name + "/" + resourceName);
    },

    _instance: function(className, extension)
    {
        if (className in this._instanceMap)
            return this._instanceMap[className];

        var constructorFunction = runtime._resolve(className);
        if (!(constructorFunction instanceof Function)) {
            this._instanceMap[className] = null;
            return null;
        }

        var instance = new constructorFunction(extension);
        this._instanceMap[className] = instance;
        return instance;
    }
}

/*
Runtime.Module = function(manager, descriptor)
{
}

Runtime.Module.prototype = {


    /**
     * @param {string} name
     * @return {string}
     * /
    resource: function(name)
    {
        var fullName = this._name + "/" + name;
        var content = Runtime.cachedResources[fullName];
        if (!content)
            throw new Error(fullName + " not preloaded. Check module.json");
        return content;
    },

    /**
     * @return {!Promise.<undefined>}
     * /


    /**
     * @return {!Promise.<undefined>}
     * @this {Runtime.Module}
     * /
    _loadResources: function()
    {
        var resources = this._descriptor["resources"];
        if (!resources)
            return Promise.resolve();
        var promises = [];
        for (var i = 0; i < resources.length; ++i) {
            var url = this._modularizeURL(resources[i]);
            promises.push(loadResourcePromise(url).then(cacheResource.bind(this, url), cacheResource.bind(this, url, undefined)));
        }
        return Promise.all(promises).then(undefined);

        /**
         * @param {string} path
         * @param {string=} content
         * /
        function cacheResource(path, content)
        {
            if (!content) {
                console.error("Failed to load resource: " + path);
                return;
            }
            var sourceURL = window.location.href;
            if (window.location.search)
                sourceURL = sourceURL.replace(window.location.search, "");
            sourceURL = sourceURL.substring(0, sourceURL.lastIndexOf("/") + 1) + path;
            Runtime.cachedResources[path] = content + "\n/*# sourceURL=" + sourceURL + " * /";
        }
    },

    /**
     * @return {!Promise.<undefined>}
     * /
    

    /**
     * @param {string} resourceName
     * /

    /**
     * @return {string|undefined}
     * /
    _remoteBase: function()
    {
        return this._descriptor.remote && Runtime._remoteBase || undefined;
    },

    /**
     * @param {string} value
     * @return {string}
     * /
    substituteURL: function(value)
    {
        var base = this._remoteBase() || "";
        return value.replace(/@url\(([^\)]*?)\)/g, convertURL.bind(this));

        function convertURL(match, url)
        {
            return base + this._modularizeURL(url);
        }
    },
}*/


Runtime.Extension = function(module, descriptor)
{
    this._module = module;
    this._descriptor = descriptor;
    this._type = descriptor.type;
    this._hasTypeClass = this._type.charAt(0) === "@";
    this._className = descriptor.className || null;
}

Runtime.Extension.prototype = {

	title: function(platform)
    {
        return this._descriptor["title"];
    },

    descriptor: function()
    {
        return this._descriptor;
    },

    module: function()
    {
        return this._module;
    },

    _typeClass: function()
    {
        if (!this._hasTypeClass)
            return null;
        return this._module._manager._resolve(this._type.substring(1));
    },

    enabled: function()
    {
        var condition = this.descriptor()["condition"];
        if (condition && !Runtime.queryParam(condition))
            return false;
        return this._module.enabled();
    },

    instancePromise: function()
    {
        if (!this._className)
            return Promise.reject(new Error("No class name in extension"));
        var className = this._className;
        if (this._instance)
            return Promise.resolve(this._instance);

        return this._module._loadPromise().then(constructInstance.bind(this));

        function constructInstance()
        {
            var result = this._module._instance(className, this);
            if (!result)
                return Promise.reject("Could not instantiate: " + className);
            return result;
        }
    },

    /*

    isApplicable: function(context)
    {
        return this._module._manager.isExtensionApplicableToContext(this, context);
    },
    */
}
