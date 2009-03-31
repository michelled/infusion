/*global importPackage, project, java, System, File, BufferedReader, FileReader */
/*global src include, exclude*/

/* 
 * This is a minified version of Douglas Crockford's JSON2.js parser, release in the public domain.
 * http://www.json.org/json2.js
 */
if(!this.JSON){JSON=function(){function f(n){return n<10?"0"+n:n}Date.prototype.toJSON=function(){return this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z"};var m={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};function stringify(value,whitelist){var a,i,k,l,r=/["\\\x00-\x1f\x7f-\x9f]/g,v;switch(typeof value){case"string":return r.test(value)?'"'+value.replace(r,function(a){var c=m[a];if(c){return c}c=a.charCodeAt();return"\\u00"+Math.floor(c/16).toString(16)+(c%16).toString(16)})+'"':'"'+value+'"';case"number":return isFinite(value)?String(value):"null";case"boolean":case"null":return String(value);case"object":if(!value){return"null"}if(typeof value.toJSON==="function"){return stringify(value.toJSON())}a=[];if(typeof value.length==="number"&&!(value.propertyIsEnumerable("length"))){l=value.length;for(i=0;i<l;i+=1){a.push(stringify(value[i],whitelist)||"null")}return"["+a.join(",")+"]"}if(whitelist){l=whitelist.length;for(i=0;i<l;i+=1){k=whitelist[i];if(typeof k==="string"){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+":"+v)}}}}else{for(k in value){if(typeof k==="string"){v=stringify(value[k],whitelist);if(v){a.push(stringify(k)+":"+v)}}}}return"{"+a.join(",")+"}"}}return{stringify:stringify,parse:function(text,filter){var j;function walk(k,v){var i,n;if(v&&typeof v==="object"){for(i in v){if(Object.prototype.hasOwnProperty.apply(v,[i])){n=walk(i,v[i]);if(n!==undefined){v[i]=n}}}}return filter(k,v)}if(/^[\],:{}\s]*$/.test(text.replace(/\\./g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(:?[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof filter==="function"?walk("",j):j}throw new SyntaxError("parseJSON")}}}()};


/*
 * This is the Fluid Infusion dependency manager.
 */

importPackage(java.lang);
importPackage(java.io);

var fluid = fluid || {};

(function () {
    // TODO: remove all the System.outs and the import for java.lang, also can importClass instead of the whole io package
    
    var parseArgument = function (arg) {
        var parsedArg = arg.split(",");
        for (var i = 0; i < parsedArg.length; i++) {
            parsedArg[i] = parsedArg[i].replace(/(^\s+)|(\s+$)/g, "");
        }
        return parsedArg;
    };
    
    var isDependencyIncluded = function (name, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === name) {
                return true;
            }
        }
        
    	return false;
    };
    
    var asArray = function (property) {
        if (property === undefined) {
            return [];
        } else if (typeof(property) === "string") {
            return [property];
        }
        
        return property;
    };
    
    var normalizeDeclaration = function (declaration) {
        declaration.files = asArray(declaration.files);
        declaration.dependencies = asArray(declaration.dependencies);
    };
    
    var assembleDependencyList = function (that, moduleName, str) {
        var i;
        // Debug. Delete me.
        System.out.println(str + " Processing module: " + moduleName + " ---");
        System.out.println("Dependency order so far: " + that.requiredModules);
        
        if (isDependencyIncluded(moduleName, that.requiredModules)) {
            return;
        }
        
        var moduleInfo = that.loadDeclarationForModule(moduleName);
        normalizeDeclaration(moduleInfo[moduleName]);
        that.moduleFileTable[moduleName] = moduleInfo[moduleName].files;        
        var moduleDependencies = moduleInfo[moduleName].dependencies;
        
        // Debugging. Delete me.
        System.out.println("Dependencies for " + moduleName + ": ");
        for (i = 0; i < moduleDependencies.length; i++) {
            System.out.println("  * " + moduleDependencies[i]);
        }
        // End debug.
        
        for (i = 0; i < moduleDependencies.length; i++) {
            System.out.println("For " + moduleName + " i is " + i);
            assembleDependencyList(that, moduleDependencies[i], str + "---");
        }
        
        if (!isDependencyIncluded(moduleName, that.excludedModules)) {
            that.requiredModules.push(moduleName);
        }
    };
    
    var addFullPathsForModuleFiles = function (targetArray, moduleName, moduleFileTable) {
        var filesForModule = moduleFileTable[moduleName];
        for (var i = 0; i < filesForModule.length; i++) {
            var path = src + File.separator + project.getProperty(moduleName) + File.separator + "js" + File.separator;
            targetArray.push(path + filesForModule[i]);
        }
        
        return targetArray;
    };
    
    fluid.dependencyResolver = function (modulesToInclude, modulesToExclude) {
        var that = {
            requiredModules: [], // A list of modules to be included in dependency order
            moduleFileTable: {}, // A map of the files related to modules
            excludedModules: modulesToExclude  
        };    
        
        that.resolve = function () {
            for (var i = 0; i < modulesToInclude.length; i++) {
                assembleDependencyList(that, modulesToInclude[i], " ---");
            }    
        };
        
        that.getAllRequiredFiles = function () {
            var fileList = [];
            for (var i = 0; i < that.requiredModules.length; i++) {
                var currentModule = that.requiredModules[i];
                addFullPathsForModuleFiles(fileList, currentModule, that.moduleFileTable);
            }
            
            return fileList;
        };
    
        /**
         * Fetches the dependency declaration for the given module name from the file system,
         * parsing it into an object from JSON data.
         * 
         * @param {String} the name of the module
         */
        that.loadDeclarationForModule = function (moduleName) {
            var modulePath = src + File.separator + project.getProperty(moduleName) + File.separator + moduleName + ".json";
            //System.out.println(modulePath);
        
            var moduleInfo = "";
            var rdr = new BufferedReader(new FileReader(new File(modulePath)));
            var line = rdr.readLine(); 
            while (line !== null) {
                moduleInfo += line;
                line = rdr.readLine();
            }
            
            //System.out.println("Unparsed JSON: " + moduleInfo);
            return JSON.parse(moduleInfo);
        };

        
        /**
         * Prints debugging information for all dependencies.
         */
        that.printDependencies = function () {
            for (var i = 0; i < modulesToInclude.length; i++) {
                var moduleName = modulesToInclude[i];
                project.log("Assembling module " + moduleName);
                
                var moduleInfo = that.loadDeclarationForModule(moduleName);
                System.out.println(moduleInfo);
            }
        };

        return that;
    };
    
    var resolveDependenciesFromArguments = function () {
        if (typeof(include) === "undefined") {
            return;
        }
        System.out.println("including: " + include);

        var excludedFiles = (typeof(exclude) === "undefined") ? [] : parseArgument(exclude);
        var resolver = fluid.dependencyResolver(parseArgument(include), excludedFiles);
        resolver.resolve();
        
        var fileSet = project.createDataType("fileset");

        System.out.println("*** All required files: ");
        var allFiles = resolver.getAllRequiredFiles();
        for (var i = 0; i < allFiles.length; i++) {
            System.out.println(" * " + allFiles[i]);
            fileSet.setFile(new File(allFiles[i]));
        }
        
        var concatTask = project.createTask("concat");
        concatTask.addFileset(fileSet);
        //concatTask.execute();
    };
    
    // Run this immediately.
    resolveDependenciesFromArguments();
})();
