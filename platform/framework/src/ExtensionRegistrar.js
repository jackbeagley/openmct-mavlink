/*global define,Promise*/

/**
 * Module defining ExtensionRegistrar. Created by vwoeltje on 11/3/14.
 */
define(
    ['./Constants', './PartialConstructor'],
    function (Constants, PartialConstructor) {
        "use strict";

        /**
         * Responsible for registering extensions with Angular.
         *
         * @constructor
         * @param {angular.Module} the Angular application with which
         *        extensions should be registered
         * @param {Object.<string,function>} customRegistrars an object
         *        containing custom registration functions, primarily for
         *        Angular built-ins.
         * @param {*} $log Angular's logging service
         */
        function ExtensionRegistrar(app, customRegistrars, $log) {
            // Track which extension categories have already been registered.
            // Exceptions will be thrown if the same extension category is
            // registered twice.
            var registeredCategories = {};

            // Used to build unique identifiers for individual extensions,
            // so that these can be registered separately with Angular
            function identify(category, extension, index) {
                var name = extension.key ?
                        (extension.key + "-" + index) :
                        index;
                return category + "[" + name + "]";
            }

            // Echo arguments; used to represent groups of non-built-in
            // extensions as a single dependency.
            function echo() {
                return arguments.slice();
            }

            // Always return a static value; used to represent plain
            // metadata as a single dependency in Angular.
            function staticFunction(value) {
                return function () { return value; };
            }

            // Utility function; create the second argument for Angular's
            // .service service registration method (an array containing
            // both dependencies and a factory method for the service.)
            function makeServiceArgument(category, extension) {
                var dependencies = extension.depends || [],
                    factory = (typeof extension === 'function') ?
                            new PartialConstructor(extension) :
                            staticFunction(extension);

                return dependencies.concat([factory]);
            }

            // Register extension arrays with Angular under an appropriately
            // suffixed name, e.g. "types[]"
            function registerExtensionArraysForCategory(category, names) {
                var name = category + Constants.EXTENSION_SUFFIX;
                app.factory(name, names.concat([echo]));
            }

            function registerExtensionsForCategory(category, extensions) {
                var names = [];

                function registerExtension(extension, index) {
                    var name = identify(category, extension, index);

                    // Track individual extension names as-registered
                    names.push(name);

                    app.factory(
                        name,
                        makeServiceArgument(category, extension)
                    );
                }

                if (registeredCategories[category]) {
                    $log.warn([
                        "Tried to register extensions for category ",
                        category,
                        " more than once. Ignoring all but first set."
                    ].join(""));
                } else {
                    // Register all extensions. Use custom registration
                    // code for services, directives, etc; otherwise,
                    // just register them under generic names.
                    if (customRegistrars[category]) {
                        extensions.forEach(customRegistrars[category]);
                    } else {
                        extensions.forEach(registerExtension);
                        registerExtensionArraysForCategory(category, names);
                    }
                    registeredCategories[category] = true;
                    return true;
                }
            }

            function registerExtensionGroup(extensionGroup) {
                Object.keys(extensionGroup).forEach(function (category) {
                    registerExtensionsForCategory(
                        category,
                        extensionGroup[category]
                    );
                });

                // Return the application to which these extensions
                // have been registered
                return app;
            }

            customRegistrars = customRegistrars || {};

            return {
                /**
                 * Register a group of resolved extensions with the Angular
                 * module managed by this registrar.
                 *
                 * For convenient chaining (particularly from the framework
                 * initializer's perspective), this returns the Angular
                 * module with which extensions were registered.
                 *
                 * @param {Object.<string, object[]>} extensionGroup an object
                 *        containing key-value pairs, where keys are extension
                 *        categories and values are arrays of resolved
                 *        extensions
                 * @returns {angular.Module} the application module with
                 *        which extensions were registered
                 */
                registerExtensions: registerExtensionGroup
            };
        }

        return ExtensionRegistrar;
    }
);