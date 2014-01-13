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
        app[method](pattern, function(req, res, next) {
          var path = _.sprintf('%s/%s.%s', app.get('views'), route, app.get('view engine'));

          if(fs.existsSync(path)) {
            res.render(path);
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

        console.log('%s %s ===> %s.%s', route['method'], route['pattern'], route['controller'], route['action']);
        app[route['method']](route['pattern'], me.controllers[route['controller']][route['action']]);
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
          method      : 'all',
          pattern     : _.sprintf('/%s/%s/:id?', path, actionName),
          controller  : file.slice(0, -3),
          action      : action
        };

        if(action == 'indexAction') {
          routeName = _.sprintf('get /%s', path);

          routes[routeName] = {
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

    if(_.has(controller, 'findAction')) {
      var routeName = _.sprintf('all /%s/find', path);

      routes[routeName] = {
        method      : 'all',
        pattern     : _.sprintf('/%s/find/:id?', path),
        controller  : file.slice(0, -3),
        action      : 'findAction'
      }
    }

    if(_.has(controller, 'createAction')) {
      var routeName = _.sprintf('all /%s/create', path);

      routes[routeName] = {
        method      : 'all',
        pattern     : _.sprintf('/%s/create', path),
        controller  : file.slice(0, -3),
        action      : 'createAction'
      }
    }

    if(_.has(controller, 'updateAction')) {
      var routeName = _.sprintf('all /%s/update', path);

      routes[routeName] = {
        method      : 'all',
        pattern     : _.sprintf('/%s/update/:id', path),
        controller  : file.slice(0, -3),
        action      : 'updateAction',
      }
    }

    if(_.has(controller, 'deleteAction')) {
      var routeName = _.sprintf('all /%s/delete', path);

      routes[routeName] = {
        method      : 'all',
        pattern     : _.sprintf('/%s/delete/:id', path),
        controller  : file.slice(0, -3),
        action      : 'deleteAction'
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

    if(_.has(controller, 'findAction')) {
      var routeName = _.sprintf('get /%s', path);

      routes[routeName] = {
        method      : 'get',
        pattern     : _.sprintf('/%s/:id?', path),
        controller  : file.slice(0, -3),
        action      : 'findAction'
      }
    }

    if(_.has(controller, 'createAction')) {
      var routeName = _.sprintf('post /%s', path);

      routes[routeName] = {
        method      : 'post',
        pattern     : _.sprintf('/%s', path),
        controller  : file.slice(0, -3),
        action      : 'createAction'
      }
    }

    if(_.has(controller, 'updateAction')) {
      var routeName = _.sprintf('put /%s', path);

      routes[routeName] = {
        method      : 'put',
        pattern     : _.sprintf('/%s/:id', path),
        controller  : file.slice(0, -3),
        action      : 'createAction'
      }
    }

    if(_.has(controller, 'deleteAction')) {
      var routeName = _.sprintf('delete /%s', path);

      routes[routeName] = {
        method      : 'delete',
        pattern     : _.sprintf('/%s/:id', path),
        controller  : file.slice(0, -3),
        action      : 'createAction'
      }
    }

    return routes;
  }
}
