var path = require('path');
var fs = require('fs');
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());
_.str.include('Underscore.string', 'string');


module.exports = {
  config: {},
  controllers: {},
  routes: {},

  /**
   * load Config
   */
  loadConfig: function(basedir) {
    var me = this;

    if(!basedir) throw 'Missing basedir!';

    this.config['baseDir'] = basedir;
    this.config['configDir'] = path.join(this.config.baseDir, 'config');
    this.config['controllerDir'] = path.join(this.config.baseDir, 'controllers');
    this.config['modelDir'] = path.join(this.config.baseDir, 'models');
    this.config['viewDir'] = path.join(this.config.baseDir, 'views');

    fs.readdirSync(this.config.configDir).forEach(function(file) {
      if(file.substr(-3) == '.js') {
        var _config = require(me.config.configDir + '/' + file);
        me.config = _.extend({}, me.config, _config);
      }
    });

    return this;
  },


  /**
   * init Route
   */
  initRoute: function() {
    var me = this;

    fs.readdirSync(this.config.controllerDir).forEach(function(file) {
      if(file.substr(-3) == '.js' && file.slice(0, -3) != 'BaseController') {
        var controller = require(me.config.controllerDir + '/' + file);

        me.controllers[file.slice(0, -3)] = controller;

        // action
        if(controller.config.action) {
          me.routes = _.extend({}, me.routes, me.actionRoute(controller, file));
        }

        // shortcut
        if(controller.config.shortcut) {
          me.routes = _.extend({}, me.routes, me.shortcutRoute(controller, file));
        }

        // REST
        if(controller.config.rest) {
          me.routes = _.extend({}, me.routes, me.restRoute(controller, file));
        }
      }
    });

    me.routes = _.extend({}, this.routes, this.config.routes);

    return this;
  },


  /**
   * regist Route
   */
  registRoute: function(app) {
    var me = this;

    _.each(this.routes, function(route, key) {
      var method = 'get';
      var pattern = '/';
      var controller = 'HomeController';
      var action = 'indexAction';

      if(key.indexOf(' ')) {
        var words = _.words(key);
        method = words[0].toLowerCase();
        pattern = words[1];
      } else {
        pattern = key;
      }

      if(_.isString(route)) {
        console.log(
          '%s %s => %s',
          _.rpad(method.toUpperCase(), 6),
          _.rpad(pattern, 25),
          route
        );

        app[method](pattern, function(req, res, next) {
          var path = _.sprintf('%s/%s.%s', app.get('views'), route, app.get('view engine'));

          if(fs.existsSync(path)) {
            res.render(_.sprintf('%s.%s', route, app.get('view engine')));
          } else {
            next();
          }
        });
      } else if(_.isObject(route)) {
        if(! _.has(route, 'method')) {
          route['method'] = method;
        }

        if(! _.has(route, 'pattern')) {
          route['pattern'] = pattern;
        }

        if(! _.has(route, 'controller')) {
          route['controller'] = controller;
        }

        if(! _.has(route, 'action')) {
          route['action'] = action;
        }

        console.log(
          '%s %s => %s',
          _.rpad(route['method'].toUpperCase(), 6),
          _.rpad(route['pattern'], 25),
          (route['controller'] + '.' + route['action'])
        );
        app[route['method']](
          route['pattern'],
          function(req, res, next) {
            me.controllers[route['controller']][route['action']](req, res, next);
          }
        );
      }
    });

    return this;
  },


  /**
   * Action Route
   */
  actionRoute: function(controller, file) {
    var routes = {};
    var path = file.slice(0, -13).toLowerCase();

    _.each(_.functions(controller), function(action) {
      if(action.substr(-6) == 'Action') {
        var actionName = action.slice(0, -6).toLowerCase();
        var routeName = _.sprintf('all /%s/%s', path, actionName);

        routes[routeName] = {
          type        : 'action',
          method      : 'all',
          pattern     : _.sprintf('/%s/%s/:id?', path, actionName),
          controller  : file.slice(0, -3),
          action      : action
        };

        if(action == 'indexAction') {
          routeName = _.sprintf('get /%s', path);

          routes[routeName] = {
            type        : 'action',
            method      : 'get',
            pattern     : _.sprintf('/%s', path),
            controller  : file.slice(0, -3),
            action      : 'indexAction'
          };
        }
      }
    });

    return routes;
  },


  /**
   * Shotcut Route
   */
  shortcutRoute: function(controller, file) {
    var routes = {};
    var path = file.slice(0, -13).toLowerCase();

    if(_.isFunction(controller.find)) {
      var routeName = _.sprintf('all /%s/find', path);

      routes[routeName] = {
        type        : 'shotcut',
        method      : 'all',
        pattern     : _.sprintf('/%s/find/:id?', path),
        controller  : file.slice(0, -3),
        action      : 'find'
      }
    }

    if(_.isFunction(controller.create)) {
      var routeName = _.sprintf('all /%s/create', path);

      routes[routeName] = {
        type        : 'shotcut',
        method      : 'all',
        pattern     : _.sprintf('/%s/create', path),
        controller  : file.slice(0, -3),
        action      : 'create'
      }
    }

    if(_.isFunction(controller.update)) {
      var routeName = _.sprintf('all /%s/update', path);

      routes[routeName] = {
        type        : 'shotcut',
        method      : 'all',
        pattern     : _.sprintf('/%s/update/:id', path),
        controller  : file.slice(0, -3),
        action      : 'update',
      }
    }

    if(_.isFunction(controller.delete)) {
      var routeName = _.sprintf('all /%s/delete', path);

      routes[routeName] = {
        type        : 'shotcut',
        method      : 'all',
        pattern     : _.sprintf('/%s/delete/:id', path),
        controller  : file.slice(0, -3),
        action      : 'delete'
      }
    }

    return routes;
  },


  /**
   * REST Route
   */
  restRoute: function(controller, file) {
    var routes = {};
    var path = file.slice(0, -13).toLowerCase();

    if(_.isFunction(controller.find)) {
      var routeName = _.sprintf('get /%s', path);

      routes[routeName] = {
        type        : 'rest',
        method      : 'get',
        pattern     : _.sprintf('/%s/:id?', path),
        controller  : file.slice(0, -3),
        action      : 'find'
      }
    }

    if(_.isFunction(controller.create)) {
      var routeName = _.sprintf('post /%s', path);

      routes[routeName] = {
        type        : 'rest',
        method      : 'post',
        pattern     : _.sprintf('/%s', path),
        controller  : file.slice(0, -3),
        action      : 'create'
      }
    }

    if(_.isFunction(controller.update)) {
      var routeName = _.sprintf('put /%s', path);

      routes[routeName] = {
        type        : 'rest',
        method      : 'put',
        pattern     : _.sprintf('/%s/:id', path),
        controller  : file.slice(0, -3),
        action      : 'update'
      }
    }

    if(_.isFunction(controller.delete)) {
      var routeName = _.sprintf('delete /%s', path);

      routes[routeName] = {
        type        : 'rest',
        method      : 'delete',
        pattern     : _.sprintf('/%s/:id', path),
        controller  : file.slice(0, -3),
        action      : 'delete'
      }
    }

    return routes;
  }
}
