  /* global console */
  var _ = require('underscore');

  var tape = require('tape');
  var test = tape;

  var IOevents = {
    onFetch: 'fetch-response',
    create: 'model-create',
    update: 'model-update',
    fetch: 'model-fetch',
    remove: 'model-remove'
  };

  //qunit has equal/strictEqual, we just have equal
  tape.Test.prototype.strictEqual = function () {
    this.equal.apply(this, arguments);
  };

  //stub qunit module
  function module(moduleName, opts) {
    test = function (testName, cb) {
      if (opts.setup) opts.setup();
      tape.call(tape, moduleName + ' - ' + testName, cb);
    };

    test.only = function (testName, cb) {
      if (opts.setup) opts.setup();
      tape.only.call(tape, moduleName + ' - ' + testName, cb);
    };
  }

  var AmpersandModel = require('../ampersand-io-model');
  //Let's fake some backbone things to minimize test changes
  var env = {};
  var Backbone = {
    Model: AmpersandModel.extend({
      extraProperties: 'allow',
      emit: function (event, model, options) {
        env.emitArgs = {
          event: event,
          model: model,
          options: options
        };
      }
    }),
    Collection: {
      extend: function (o) {
        var Coll = function () {
          var k;
          for (k in o) {
            this[k] = o[k];
          }
        };
        Coll.prototype.add = function (m) {
          m.collection = this;
        };
        return Coll;
      }
    }
  };

//ALTERED BACKBONE FUNCS BASED ON THE NEW MODEL
(function newAlteredFuncs() {
  var proxy = Backbone.Model.extend();
  var klass = Backbone.Collection.extend();
  var doc, collection;

  module("Backbone.Model", {

    setup: function () {
      doc = new proxy({
        id     : '1-the-tempest',
        title  : "The Tempest",
        author : "Bill Shakespeare",
        textLength : 123
      });
      collection = new klass();
      collection.add(doc);
    }

  });

  test("validate after save", function (t) {
    t.plan(2);
    var lastError, model = new Backbone.Model();
    model.validate = function (attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.emit = function (event, model, options) {
      options.callback.call(this, null, {admin: true});
    };
    model.on('invalid', function (model, error) {
      lastError = error;
    });
    model.save(null);

    t.equal(lastError, "Can't change admin status.");
    t.equal(model.validationError, "Can't change admin status.");
  });

  test("save", function (t) {
    t.plan(2);
    doc.save({title : "Henry V"});
    t.equal(env.emitArgs.event, 'model-update');
    t.ok(_.isEqual(env.emitArgs.model, doc));
  });

  test("save, fetch, destroy triggers error event when an error occurs", function (t) {
    t.plan(3);
    var model = new Backbone.Model();
    model.on('error', function () {
      t.ok(true);
    });
    model.emit = function (event, model, options) {
      options.callback(true);
    };
    model.save({data: 2, id: 1});
    model.fetch();
    model.destroy();
  });

  test("non-persisted destroy", function (t) {
    t.plan(1);
    var a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    a.emit = function () { throw "should not be called"; };
    a.destroy();
    t.ok(true, "non-persisted model should not call emit");
  });

  test("model & result is passed to callback", function (t) {
    t.plan(6);
    var model = new Backbone.Model();
    var opts = {
      callback: function (err, model, result) {
        t.ok(result);
        t.ok(model);
      }
    };
    model.emit = function (event, model, options) {
      if(options.respCallback){
        return options.respCallback({data: 'test'});
      }
      options.callback(null, 'test');
    };
    model.save({id: 1}, opts);
    model.fetch(opts);
    model.destroy(opts);
  });

  test("#1365 - Destroy: New models execute the callback.", function (t) {
    t.plan(2);
    new Backbone.Model()
    .on('emit', function () { t.ok(false); })
    .on('destroy', function () { t.ok(true); })
    .destroy({ callback: function () { t.ok(true); }});
  });

  test("#1377 - Save without attrs triggers 'error'.", function (t) {
    t.plan(1);
    var Model = Backbone.Model.extend({
      emit: function (event, model, options) { options.callback(); },
      validate: function () { return 'invalid'; }
    });
    var model = new Model({id: 1});
    model.on('invalid', function () { t.ok(true); });
    model.save();
  });

  test("#1478 - Model `save` does not trigger change on unchanged attributes", function (t) {
    var Model = Backbone.Model.extend({
      emit: function (event, model, options) {
        setTimeout(function () {
          options.callback();
          t.end();
        }, 0);
      }
    });
    new Model({x: true})
    .on('change:x', function () { t.ok(false); })
    .save(null, {wait: true});
  });

  test("#1433 - Save: An invalid model cannot be persisted.", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.validate = function () { return 'invalid'; };
    model.emit = function () { t.ok(false); };
    t.strictEqual(model.save(), false);
  });
})();


// PRE-EXISTING BACKBONE TEST FUNCS
(function preExistingFuncs() {
  var proxy = Backbone.Model.extend();
  var klass = Backbone.Collection.extend();
  var doc, collection;

  module("Backbone.Model", {

    setup: function () {
      doc = new proxy({
        id     : '1-the-tempest',
        title  : "The Tempest",
        author : "Bill Shakespeare",
        textLength : 123
      });
      collection = new klass();
      collection.add(doc);
    }

  });

  test("initialize", function (t) {
    t.plan(3);
    var Model = Backbone.Model.extend({
      initialize: function () {
        this.one = 1;
        t.equal(this.collection, collection);
      }
    });
    var model = new Model({}, {collection: collection});
    t.equal(model.one, 1);
    t.equal(model.collection, collection);
  });

  test("initialize with attributes and options", function (t) {
    t.plan(1);
    var Model = Backbone.Model.extend({
      initialize: function (attributes, options) {
        this.one = options.one;
      }
    });
    var model = new Model({}, {one: 1});
    t.equal(model.one, 1);
  });

  test("initialize with parsed attributes", function (t) {
    t.plan(1);
    var Model = Backbone.Model.extend({
      parse: function (attrs) {
        attrs.value += 1;
        return attrs;
      }
    });
    var model = new Model({value: 1}, {parse: true});
    t.equal(model.get('value'), 2);
  });

  test("initialize with defaults", function (t) {
    t.plan(2);
    var Model = Backbone.Model.extend({
      props: {
        first_name: ['string', true, 'Unknown'],
        last_name: ['string', true, 'Unknown']
      }
    });
    var model = new Model({'first_name': 'John'});
    t.equal(model.get('first_name'), 'John');
    t.equal(model.get('last_name'), 'Unknown');
  });

  test("parse can return null", function (t) {
    t.plan(1);
    var Model = Backbone.Model.extend({
      parse: function (attrs) {
        attrs.value += 1;
        return null;
      }
    });
    var model = new Model({value: 1}, {parse: true});
    t.equal(JSON.stringify(model.toJSON()), "{}");
  });

  test("isNew", function (t) {
    t.plan(6);
    var a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    t.ok(a.isNew(), "it should be new");
    a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': -5 });
    t.ok(!a.isNew(), "any defined ID is legal, negative or positive");
    a = new Backbone.Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': 0 });
    t.ok(!a.isNew(), "any defined ID is legal, including zero");
    t.ok(new Backbone.Model({          }).isNew(), "is true when there is no id");
    t.ok(!new Backbone.Model({ 'id': 2  }).isNew(), "is false for a positive integer");
    t.ok(!new Backbone.Model({ 'id': -5 }).isNew(), "is false for a negative integer");
  });

  test("get", function (t) {
    t.plan(2);
    t.equal(doc.get('title'), 'The Tempest');
    t.equal(doc.get('author'), 'Bill Shakespeare');
  });

  test("escape", function (t) {
    t.plan(5);
    t.equal(doc.escape('title'), 'The Tempest');
    doc.set({audience: 'Bill & Bob'});
    t.equal(doc.escape('audience'), 'Bill &amp; Bob');
    doc.set({audience: 'Tim > Joan'});
    t.equal(doc.escape('audience'), 'Tim &gt; Joan');
    doc.set({audience: 10101});
    t.equal(doc.escape('audience'), '10101');
    doc.unset('audience');
    t.equal(doc.escape('audience'), '');
  });

  test("set and unset", function (t) {
    t.plan(8);
    var a = new Backbone.Model({id: 'id', foo: 1, bar: 2, baz: 3});
    var changeCount = 0;
    a.on("change:foo", function () { changeCount += 1; });
    a.set({'foo': 2});
    t.ok(a.get('foo') == 2, "Foo should have changed.");
    t.ok(changeCount == 1, "Change count should have incremented.");
    a.set({'foo': 2}); // set with value that is not new shouldn't fire change event
    t.ok(a.get('foo') == 2, "Foo should NOT have changed, still 2");
    t.ok(changeCount == 1, "Change count should NOT have incremented.");

    a.validate = function (attrs) {
      t.equal(attrs.foo, void 0, "validate:true passed while unsetting");
    };
    a.unset('foo', {validate: true});
    t.equal(a.get('foo'), void 0, "Foo should have changed");
    delete a.validate;
    t.ok(changeCount == 2, "Change count should have incremented for unset.");

    a.unset('id');
    t.equal(a.id, undefined, "Unsetting the id should remove the id property.");
  });

  test("#2030 - set with failed validate, followed by another set triggers change", function (t) {
    t.plan(1);
    var attr = 0, main = 0, error = 0;
    var Model = Backbone.Model.extend({
      validate: function (attr) {
        if (attr.x > 1) {
          error++;
          return "this is an error";
        }
      }
    });
    var model = new Model({x: 0});
    model.on('change:x', function () { attr++; });
    model.on('change', function () { main++; });
    model.set({x: 2}, {validate: true});
    model.set({x: 1}, {validate: true});
    t.deepEqual([attr, main, error], [1, 1, 1]);
  });

  test("set triggers changes in the correct order", function (t) {
    t.plan(1);
    var value = null;
    var model = new Backbone.Model();
    model.on('last', function () { value = 'last'; });
    model.on('first', function () { value = 'first'; });
    model.trigger('first');
    model.trigger('last');
    t.equal(value, 'last');
  });

  test("set falsy values in the correct order", function (t) {
    t.plan(2);
    var model = new Backbone.Model({result: 'result'});
    model.on('change', function () {
      t.equal(model._changed.result, void 0);
      t.equal(model.previous('result'), false);
    });
    model.set({result: void 0}, {silent: true});
    model.set({result: null}, {silent: true});
    model.set({result: false}, {silent: true});
    model.set({result: void 0});
  });

  test("multiple unsets", function (t) {
    t.plan(1);
    var i = 0;
    var counter = function () { i++; };
    var model = new Backbone.Model({a: 1});
    model.on("change:a", counter);
    model.set({a: 2});
    model.unset('a');
    model.unset('a');
    t.equal(i, 2, 'Unset does not fire an event for missing attributes.');
  });

  test("unset and changedAttributes", function (t) {
    t.plan(1);
    var model = new Backbone.Model({a: 1});
    model.on('change', function () {
      t.ok('a' in model.changedAttributes(), 'changedAttributes should contain unset properties');
    });
    model.unset('a');
  });

  test("set an empty string", function (t) {
    t.plan(1);
    var model = new Backbone.Model({name : "Model"});
    model.set({name : ''});
    t.equal(model.get('name'), '');
  });

  test("setting an object", function (t) {
    t.plan(1);
    var model = new Backbone.Model({
      custom: { foo: 1 }
    });
    model.on('change', function () {
      t.ok(1);
    });
    model.set({
      custom: { foo: 1 } // no change should be fired
    });
    model.set({
      custom: { foo: 2 } // change event should be fired
    });
  });

  test("change, hasChanged, changedAttributes, previous, previousAttributes", function (t) {
    t.plan(9);
    var model = new Backbone.Model({name: "Tim", age: 10});
    t.deepEqual(model.changedAttributes(), false);
    model.on('change', function () {
      t.ok(model.hasChanged('name'), 'name changed');
      t.ok(!model.hasChanged('age'), 'age did not');
      t.ok(_.isEqual(model.changedAttributes(), {name : 'Rob'}), 'changedAttributes returns the changed attrs');
      t.equal(model.previous('name'), 'Tim');
      t.ok(_.isEqual(model.previousAttributes(), {name : "Tim", age : 10}), 'previousAttributes is correct');
    });
    t.equal(model.hasChanged(), false);
    t.equal(model.hasChanged(undefined), false);
    model.set({name : 'Rob'});
    t.equal(model.get('name'), 'Rob');
  });

  test("changedAttributes", function (t) {
    t.plan(3);
    var model = new Backbone.Model({a: 'a', b: 'b'});
    t.deepEqual(model.changedAttributes(), false);
    t.equal(model.changedAttributes({a: 'a'}), false);
    t.equal(model.changedAttributes({a: 'b'}).a, 'b');
  });

  test("change with options", function (t) {
    t.plan(2);
    var value;
    var model = new Backbone.Model({name: 'Rob'});
    model.on('change', function (model, options) {
      value = options.prefix + model.get('name');
    });
    model.set({name: 'Bob'}, {prefix: 'Mr. '});
    t.equal(value, 'Mr. Bob');
    model.set({name: 'Sue'}, {prefix: 'Ms. '});
    t.equal(value, 'Ms. Sue');
  });

  test("change after initialize", function (t) {
    t.plan(1);
    var changed = 0;
    var attrs = {id: 1, label: 'c'};
    var obj = new Backbone.Model(attrs);
    obj.on('change', function () { changed += 1; });
    obj.set(attrs);
    t.equal(changed, 0);
  });





  test("validate", function (t) {
    t.plan(7);
    var lastError;
    var model = new Backbone.Model();
    model.validate = function (attrs) {
      if (attrs.admin != this.get('admin')) return "Can't change admin status.";
    };
    model.on('invalid', function (model, error) {
      lastError = error;
    });
    var result = model.set({a: 100});
    t.equal(result, model);
    t.equal(model.get('a'), 100);
    t.equal(lastError, undefined);
    result = model.set({admin: true});
    t.equal(model.get('admin'), true);
    result = model.set({a: 200, admin: false}, {validate: true});
    t.equal(lastError, "Can't change admin status.");
    t.equal(result, false);
    t.equal(model.get('a'), 100);
  });

  test("validate on unset and clear", function (t) {
    t.plan(6);
    var error;
    var model = new Backbone.Model({name: "One"});
    model.validate = function (attrs) {
      if (!attrs.name) {
        error = true;
        return "No thanks.";
      }
    };
    model.set({name: "Two"});
    t.equal(model.get('name'), 'Two');
    t.equal(error, undefined);
    model.unset('name', {validate: true});
    t.equal(error, true);
    t.equal(model.get('name'), 'Two');
    model.clear({validate: true});
    t.equal(model.get('name'), 'Two');
    delete model.validate;
    model.clear();
    t.equal(model.get('name'), undefined);
  });

  test("validate with error callback", function (t) {
    t.plan(8);
    var lastError, boundError;
    var model = new Backbone.Model();
    model.validate = function (attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.on('invalid', function (model, error) {
      boundError = true;
    });
    var result = model.set({a: 100}, {validate: true});
    t.equal(result, model);
    t.equal(model.get('a'), 100);
    t.equal(model.validationError, null);
    t.equal(boundError, undefined);
    result = model.set({a: 200, admin: true}, {validate: true});
    t.equal(result, false);
    t.equal(model.get('a'), 100);
    t.equal(model.validationError, "Can't change admin status.");
    t.equal(boundError, true);
  });

  test("defaults always extend attrs (#459)", function (t) {
    t.plan(2);
    var Defaulted = Backbone.Model.extend({
      props: {
        one: ['number', true, 1]
      },
      initialize : function (attrs, opts) {
        t.equal(this.attributes.one, 1);
      }
    });
    var providedattrs = new Defaulted({});
    var emptyattrs = new Defaulted();
  });

  test("Nested change events don't clobber previous attributes", function (t) {
    t.plan(4);
    new Backbone.Model()
    .on('change:state', function (model, newState) {
      t.equal(model.previous('state'), undefined);
      t.equal(newState, 'hello');
      // Fire a nested change event.
      model.set({other: 'whatever'});
    })
    .on('change:state', function (model, newState) {
      t.equal(model.previous('state'), undefined);
      t.equal(newState, 'hello');
    })
    .set({state: 'hello'});
  });

  test("hasChanged/set should use same comparison", function (t) {
    t.plan(2);
    var changed = 0, model = new Backbone.Model({a: null});
    model.on('change', function () {
      t.ok(this.hasChanged('a'));
    })
    .on('change:a', function () {
      changed++;
    })
    .set({a: undefined});
    t.equal(changed, 1);
  });

  test("#582, #425, change:attribute callbacks should fire after all changes have occurred", function (t) {
    t.plan(9);
    var model = new Backbone.Model();

    var assertion = function () {
      t.equal(model.get('a'), 'a');
      t.equal(model.get('b'), 'b');
      t.equal(model.get('c'), 'c');
    };

    model.on('change:a', assertion);
    model.on('change:b', assertion);
    model.on('change:c', assertion);

    model.set({a: 'a', b: 'b', c: 'c'});
  });

  test("set same value does not trigger change", function (t) {
    var model = new Backbone.Model({x: 1});
    model.on('change change:x', function () {
      t.ok(false);
    });
    model.set({x: 1});
    model.set({x: 1});
    t.end();
  });

  test("unset does not fire a change for undefined attributes", function (t) {
    var model = new Backbone.Model({x: undefined});
    model.on('change:x', function () { t.ok(false); });
    model.unset('x');
    t.end();
  });

  test("hasChanged works outside of change events, and true within", function (t) {
    t.plan(6);
    var model = new Backbone.Model({x: 1});
    model.on('change:x', function () {
      t.ok(model.hasChanged('x'));
      t.equal(model.get('x'), 1);
    });
    model.set({x: 2}, {silent: true});
    t.ok(model.hasChanged());
    t.equal(model.hasChanged('x'), true);
    model.set({x: 1});
    t.ok(model.hasChanged());
    t.equal(model.hasChanged('x'), true);
  });

  test("hasChanged gets cleared on the following set", function (t) {
    t.plan(4);
    var model = new Backbone.Model();
    model.set({x: 1});
    t.ok(model.hasChanged());
    model.set({x: 1});
    t.ok(!model.hasChanged());
    model.set({x: 2});
    t.ok(model.hasChanged());
    model.set({});
    t.ok(!model.hasChanged());
  });

  test("`hasChanged` for falsey keys", function (t) {
    t.plan(2);
    var model = new Backbone.Model();
    model.set({x: true}, {silent: true});
    t.ok(!model.hasChanged(0));
    t.ok(!model.hasChanged(''));
  });

  test("`previous` for falsey keys", function (t) {
    t.plan(2);
    var model = new Backbone.Model({0: true, '': true});
    model.set({0: false, '': false}, {silent: true});
    t.equal(model.previous(0), true);
    t.equal(model.previous(''), true);
  });

  test("nested `set` during `'change:attr'`", function (t) {
    t.plan(2);
    var events = [];
    var model = new Backbone.Model();
    model.on('all', function (event) { events.push(event); });
    model.on('change', function () {
      model.set({z: true}, {silent: true});
    });
    model.on('change:x', function () {
      model.set({y: true});
    });
    model.set({x: true});
    t.deepEqual(events, ['change:y', 'change:x', 'change']);
    events = [];
    model.set({z: true});
    t.deepEqual(events, []);
  });

  test("nested `change` only fires once", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.on('change', function () {
      t.ok(true);
      model.set({x: true});
    });
    model.set({x: true});
  });

  test("nested `set` during `'change'`", function (t) {
    t.plan(6);
    var count = 0;
    var model = new Backbone.Model();
    model.on('change', function () {
      switch (count++) {
        case 0:
        t.deepEqual(this.changedAttributes(), {x: true});
        t.equal(model.previous('x'), undefined);
        model.set({y: true});
        break;
        case 1:
        t.deepEqual(this.changedAttributes(), {x: true, y: true});
        t.equal(model.previous('x'), undefined);
        model.set({z: true});
        break;
        case 2:
        t.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
        t.equal(model.previous('y'), undefined);
        break;
        default:
        t.ok(false);
      }
    });
    model.set({x: true});
  });

  test("nested `change` with silent", function (t) {
    t.plan(3);
    var count = 0;
    var model = new Backbone.Model();
    model.on('change:y', function () { t.ok(false); });
    model.on('change', function () {
      switch (count++) {
        case 0:
        t.deepEqual(this.changedAttributes(), {x: true});
        model.set({y: true}, {silent: true});
        model.set({z: true});
        break;
        case 1:
        t.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
        break;
        case 2:
        t.deepEqual(this.changedAttributes(), {z: false});
        break;
        default:
        t.ok(false);
      }
    });
    model.set({x: true});
    model.set({z: false});
  });

  test("nested `change:attr` with silent", function (t) {
    var model = new Backbone.Model();
    model.on('change:y', function () { t.ok(false); });
    model.on('change', function () {
      model.set({y: true}, {silent: true});
      model.set({z: true});
    });
    model.set({x: true});
    t.end();
  });

  test("multiple nested changes with silent", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.on('change:x', function () {
      model.set({y: 1}, {silent: true});
      model.set({y: 2});
    });
    model.on('change:y', function (model, val) {
      t.equal(val, 2);
    });
    model.set({x: true});
  });

  test("multiple nested changes with silent", function (t) {
    t.plan(1);
    var changes = [];
    var model = new Backbone.Model();
    model.on('change:b', function (model, val) { changes.push(val); });
    model.on('change', function () {
      model.set({b: 1});
    });
    model.set({b: 0});
    t.deepEqual(changes, [0, 1]);
  });

  test("basic silent change semantics", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.set({x: 1});
    model.on('change', function () { t.ok(true); });
    model.set({x: 2}, {silent: true});
    model.set({x: 1});
  });

  test("nested set multiple times", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.on('change:b', function () {
      t.ok(true);
    });
    model.on('change:a', function () {
      model.set({b: true});
      model.set({b: true});
    });
    model.set({a: true});
  });

  test("#1122 - clear does not alter options.", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    var options = {};
    model.clear(options);
    t.ok(!options.unset);
  });

  test("#1122 - unset does not alter options.", function (t) {
    t.plan(1);
    var model = new Backbone.Model({x: 1});
    var options = {};
    model.unset('x', options);
    t.ok(!options.unset);
  });

  test("#1545 - `undefined` can be passed to a model constructor without coersion", function (t) {
    var Model = Backbone.Model.extend({
      defaults: { one: 1 },
      initialize : function (attrs, opts) {
        t.equal(attrs, undefined);
      }
    });
    var emptyattrs = new Model();
    var undefinedattrs = new Model(undefined);
    t.end();
  });



  test("#1664 - Changing from one value, silently to another, back to original triggers a change.", function (t) {
    t.plan(1);
    var model = new Backbone.Model({x: 1});
    model.on('change:x', function () { t.ok(true); });
    model.set({x: 2}, {silent: true});
    model.set({x: 3}, {silent: true});
    model.set({x: 1});
  });

  test("#1664 - multiple silent changes nested inside a change event", function (t) {
    t.plan(2);
    var changes = [];
    var model = new Backbone.Model();
    model.on('change', function () {
      model.set({a: 'c'}, {silent: true});
      model.set({b: 2}, {silent: true});
      model.unset('c', {silent: true});
    });
    model.on('change:a change:b change:c', function (model, val) { changes.push(val); });
    model.set({a: 'a', b: 1, c: 'item'});
    t.deepEqual(changes, ['a', 1, 'item']);
    t.deepEqual(model.attributes, {a: 'c', b: 2});
  });

  test("#1791 - `attributes` is available for `parse`", function (t) {
    var Model = Backbone.Model.extend({
      parse: function () { this.attributes; } // shouldn't throw an error
    });
    var model = new Model(null, {parse: true});
    t.end();
  });

  test("silent changes in last `change` event back to original triggers change", function (t) {
    t.plan(2);
    var changes = [];
    var model = new Backbone.Model();
    model.on('change:a change:b change:c', function (model, val) { changes.push(val); });
    model.on('change', function () {
      model.set({a: 'c'}, {silent: true});
    });
    model.set({a: 'a'});
    t.deepEqual(changes, ['a']);
    model.set({a: 'a'});
    t.deepEqual(changes, ['a', 'a']);
  });

  test("#1943 change calculations should use _.isEqual", function (t) {
    t.plan(1);
    var model = new Backbone.Model({a: {key: 'value'}});
    model.set('a', {key: 'value'}, {silent: true});
    t.equal(model.changedAttributes(), false);
  });

  test("#1964 - final `change` event is always fired, regardless of interim changes", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.on('change:property', function () {
      model.set('property', 'bar');
    });
    model.on('change', function () {
      t.ok(true);
    });
    model.set('property', 'foo');
  });

  test("isValid", function (t) {
    t.plan(5);
    var model = new Backbone.Model({valid: true});
    model.validate = function (attrs) {
      if (!attrs.valid) return "invalid";
    };
    t.equal(model.isValid(), true);
    t.equal(model.set({valid: false}, {validate: true}), false);
    t.equal(model.isValid(), true);
    model.set({valid: false});
    t.equal(model.isValid(), false);
    t.ok(!model.set('valid', false, {validate: true}));
  });

  test("#1179 - isValid returns true in the absence of validate.", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.validate = null;
    t.ok(model.isValid());
  });

  test("#1961 - Creating a model with {validate:true} will call validate and use the error callback", function (t) {
    t.plan(1);
    var Model = Backbone.Model.extend({
      validate: function (attrs) {
        if (attrs.id === 1) return "This shouldn't happen";
      }
    });
    var model = new Model({id: 1}, {validate: true});
    t.equal(model.validationError, "This shouldn't happen");
  });

  test("#2034 - nested set with silent only triggers one change", function (t) {
    t.plan(1);
    var model = new Backbone.Model();
    model.on('change', function () {
      model.set({b: true}, {silent: true});
      t.ok(true);
    });
    model.set({a: true});
  });

})();