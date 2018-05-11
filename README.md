# tiny-cps
Tiny goodies for Continuation-Passing-Style functions

# CPS functions

## Terminology
A *Continuation-Passing-Style (CPS) function* is any JavaScript function
```js
const cps = (f1, f2, ...) => { 
	/* f1, f2, ... are called arbitrarily often with any number of arguments */ 
}
```
that expects to be called with zero or several functions as its arguments.
By *expects* we mean that this library and the following discussion 
only applies when functions are passed.
In a strictly typed language that would mean those arguments are required to be functions.
However, in JavaScript, where it is possible to pass any argument,
we don't aim to force errors when some arguments passed are not functions
and let the standard JavaScript engine deal with it the usual way.

We also call the argument functions `f1, f2, ...` the "callbacks"
due to the way how they are used.
Each of the callbacks can be called arbitrarily many times
with zero to many arguments each time.
The number of arguments inside each callback 
can change from call to call and is not required to be bounded.

By a *parametrized CPS function* we mean any curried function with zero or more parameters 
that returns a CPS function:
```js
const paramCps = (param1, param2, ...) => (f1, f2, ...) => { ... }
```

We shall adopt somewhat loose terminology calling *parametrized CPS functions* both
the curried function `paramCps` and its return value `paramCps(params)`,
in the hope that the context will make clear the precisce meaning.
In the same vein, by a *function call* of the parametrized CPS function,
we mean its call with both arguments and callbacks passed:
```js
paramCps(...args)(...callbacks)
```
Otherwise `parmCps(...args)` is considered a *partial call*.

## Using CPS functions
Using CPS functions is as simple as using JavaScript Promises:
```js
// Set up database query as parametrized CPS function with 2 callbacks,
// one for the result and one for the error
const cpsQuery = query => (resBack, errBack) => 
	queryDb(query, (err, res) => err 
		? resBack(res) 
		: errBack(err))
// Now just call as regular curried function
cpsQuery({name: 'Jane'})(
	result => console.log("Your Query returned: ", result), 
	error => console.error("Sorry, here is what happened: ", error)
)
```

# Examples of CPS functions

## Promise producers
Any producer (aka executor) function 
```js
const producer = function(resolve, reject) {
	// some work ...
	if (/* everything is good */) resolve(result)
	else reject(error) 
}
``` 
passed to the [Promise constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) is an example of a CPS function. 

The constructed promise `new Promise(producer)` only keeps the very first call of either of the callbacks,
whereas the producer function itself can call its callbacks multiple times,
each of which would be fully retained as output in case of CPS functions.

## Promises
Any JavaScript Promise generates a CPS function via its `.then` method
that completely captures the information held by the Promise:
```js
const cpsPromise = (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected)
```
The important restictions for functions arising that way are:
1. At most one callback function is called.
2. Each of the callback functions is called precisely with one argument.

The general CPS functions do assume such restrictions.


## Node API
Any Node-Style function with one of more callbacks can be curried into a parametrized CPS function:
```js
const readFileCPS = (path, options) => callback => fs.readFile(path, options, callback)
```
Here `readFileCPS` returns a CPS function for each values of its parameters `(path, options)`.

Typically Node API callbacks are called with at least two arguments as `callback(error, arg1, ...)`,
where the first argument is used as indication of error. 
The CPS functions include this case by not restricting the number arguments 
passed to any of its callback functions.


## HTTP requests
In a similar vein, any HTTP request with callback(s) can be regarded as parametrized CPS function:
```js
const = (url, options, data) => cb => request(url, options, data, cb)
```

## Database Access
Any async database access API with callback can be curried into parametrized CPS functions:
```js
const queryDb = (db, query) => callback => getQuery(db, query, callback)
const insertDb = (db, data) => callback => inserData(db, data, callback)
```
In most cases each of these is considered a single request resulting in either success of failure.
However, more general CPS functions can implement more powerful functionality with multiple callback calls.
For instance, the function can run multiple data insetion attempts with progress reported back to client.
Or the query function can return its result in multiple chunks, each with a separate callback call.
Further, the Database query funtion can hold a state that is advanced with each call.
Similarly, any Database access can be cancelled by subsequent call of the same CPS function with suitable parameters. 

## Middleware e.g. in Express or Redux
[Express Framework](https://expressjs.com/) in NodeJs popularised
the concept of [middleware](https://expressjs.com/en/guide/writing-middleware.html)
that later found its place in other frameworks such as 
[Redux](https://redux.js.org/advanced/middleware#understanding-middleware).
In each case, a *middleware* is a special kind of function,
plain in case of Express and curried in case of Redux,
which has one continuation callback among its parameters.
To each middleware in each of these frameworks, 
there is the associated parametrized CPS function,
obtained by switching parameters and (un)currying.
As the correspondence `middleware <-> CPS function` is in both ways,
it allows for each side to benefit from the other.


## Web Sockets
Here is a generic CPS function parametrized by its url `path`:
```js
const WebSocket = require('ws')
const createWS = path => callback => 
  new WebSocket(path).on('message', callback)
```
The callback will be called repeatedly with every new socket message emited.

Other websocket events can be subscribed by other callbacks,
so the CPS function with its muiltiple callbacks
can encapsulate the entire socket functionality.


## Stream libraries

### Pull Streams
The [Pull Streams](https://pull-stream.github.io/)
present an ingenious way of implementing 
a rich on-demand stream functionality,
including back pressure,
entirely with plain JavaScript functions.
In a way, they gave some of the original inspirations
for the general CPS function pattern.

Indeed, a Pull Stream is essentially a function `f(abort, callback)` that is called repeatedly
by the sink to produce on-demand stream of data.
Any such function can be clearly curried into a
is a parametrized CPS function 
```js
const pullStream = params => callback => {...}
```

### [Flyd](https://github.com/paldepind/flyd)
Any `flyd` stream can be wrapped into a CPS function with single callback called with single argument:
```js
const cpsFun = callback => flydStream
	.map(x => callback(x))
```
The resulting `cpsFun` function, when called with any `callback`,
simply subsribe that callback to the stream events.

Conversely, any CPS function `cpsFun` can be simply called with
any `flyd` stream in place of one of its callback arguments:
```js
let x = flyd.stream()
cpsFun(x)
```
That will push the first argument of any callback call of `x` into the stream.


## Event aggregation
Similarly to [`flyd` streams](https://github.com/paldepind/flyd/#creating-streams),
CPS functions can subscribe their callbacks to any event listener:
```js
const cpsFun = callback =>
	document.getElementById('button')
		.addEventListener('click', callback)
```
Furthermore, more complex CPS functions can similarly subscribe to 
muiltiple events:
```js
const cpsFun = (cb1, cb2) => {
	document.getElementById('button1')
		.addEventListener('click', cb1)
	document.getElementById('button2')
		.addEventListener('click', cb2)
}
```
and thereby serve as functional event aggregators
encapsulating the events.
Every time any of the event is emitted,
the corresponding callback will fire
with entire event data passed as arguments.
That way the complete event information 
remains accessible via the CPS function. 


# Comparison with Promises and Callbacks

Our main motivation for dealing with CPS functions is to enhance
the power of common coding patterns into a single unified abstraction,
which can capture the advantages typically associated with Promises vs callbacks.

In the [introductory section on Promises](http://exploringjs.com/es6/ch_promises.html#sec_introduction-promises) of his wonderful book [Exploring ES6](http://exploringjs.com/es6/),
[Dr. Axel Rauschmayer](http://dr-axel.de/) collected a list of 
advantages of Promises over callbacks,
that we would like to consider here in the light of CPS functions
and explain how, in our view, the latters can enjoy the same advantages.

## Returning results
> No inversion of control: similarly to synchronous code, Promise-based functions return results, they don’t (directly) continue – and control – execution via callbacks. That is, the caller stays in control.

We regard the CPS functions returning their output in similar fashion as promises, 
via the arguments inside each callback call.
Recall that a result inside promise can only be extracted via a callback,
which is essentially the same as passing the callback to a CPS function:
```js
// pass callbacks to promise
const promise.then(cb1, cb2) 
// => result is delivered via cb1(result)
```
```js
// pass callbacks to CPS function
const cps(f1, f2)
// => a tuple (vector) of results is deliverd via f1(res1, res2, ...)
```
Thus, CPS functions can be regarded as generalization of promises,
where callbacks are allowed to be called multiple times with several arguments each time,
rather than with a single value.
Note that syntax for CPS function is even shorter - ther is no `.then` method needed.


## Chaining
> Chaining is simpler: If the callback of `then()` returns a Promise (e.g. the result of calling another Promise-based function) then `then()` returns that Promise (how this really works is more complicated and explained later). As a consequence, you can chain then() method calls: 
> ```js
asyncFunction1(a, b)
  .then(result1 => {
      console.log(result1);
      return asyncFunction2(x, y);
  })
  .then(result2 => {
      console.log(result2);
  });
```

In our view, the complexity of chaing for the callbacks is merely due to the lack of the methods for doing it.
On a basic level, a Promise wraps a CPS function into an object providing such methods.
However, the Promise constructor also adds restricitons on the functionality and generally does a lot more.
On the other hand, to have similar chaining methods, much less powerful methods are needed,
that can be uniformly provided for general CPS functions. 
The above example can then be generalized to arbitrary CPS functions:

```js
// wrapper providing methods
CPS(cpsFunction1(a, b))
	// 'flatMap' (aka 'chain') is used to compose parametrized CPS functions
  .flatMap(result1 => {
      console.log(result1);
      return cpsFunction2(x, y);
  })
  // 'map' is used to compose CPS outputs with ordinary functions
  .map(result2 => {
      console.log(result2);
  });
```
Here `CPS(...)` is a lightweight object wrapper providing the `map` and `flatMap` methods among others,
such that `CPS.of` and `map` conform to the [Pointed Functor](https://stackoverflow.com/questions/39179830/how-to-use-pointed-functor-properly/41816326#41816326) and `CPS.of` and `flatMap` 
to the [Monadic](https://github.com/rpominov/static-land/blob/master/docs/spec.md#monad) [interface](https://github.com/fantasyland/fantasy-land#monad).
At the same time, the full functional structure is preserved allowing for drop in replacement
`cpsFun` with `CPS(cpsFun)`, see below.

## Asynchronous composition
> Composing asynchronous calls (loops, mapping, etc.): is a little easier, because you have data (Promise objects) you can work with.

Similar to promises wrapping their data, 
we regard the CPS functions as wrapping the outputs of their callbacks.
Whenever methods are needed, a CPS function can be explicitly wrapped into 
its CPS object via the `CPS`, 
similar to how the `Promise` constructor wraps its producer function,
except that `CPS` does nothing else.
There is no recursive unwrapping of "thenables" nor other promises as with
the Promise constructor.

In addition, the CPS object `CPS(cpsFunction)` retains the same information
by delivering the same functionality via direct funtion calls with the same callbacks!
That is, the following calls are identical: 
```js
cpsFunction(cb1, cb2, ...)
CPS(cpsFunction)(cb1, cb2, ...)
```
That means, the wrapped CPS function can be dropped directly into the same code
preserving all the functionality with no change!

In regard of composing asynchronous calls, with CPS functions it can be as simple as in
the above example.


## Error handling
> Error handling: As we shall see later, error handling is simpler with Promises, because, once again, there isn’t an inversion of control. Furthermore, both exceptions and asynchronous errors are managed the same way.

In regards of error handling, 
the following paragraph in here http://exploringjs.com/es6/ch_promises.html#_chaining-and-errors
seems relevant:

> There can be one or more then() method calls that don’t have error handlers. Then the error is passed on until there is an error handler.
```js
asyncFunc1()
.then(asyncFunc2)
.then(asyncFunc3)
.catch(function (reason) {
    // Something went wrong above
});
```

And here is the same example with CPS functions:
```js
CPS(cpsFunc1)
.flatMap(cpsFunc2)
.flatMap(cpsFunc3)
.map(null, reason => {
    // Something went wrong above
});
```
Here the `map` method is used with two arguments
and the second callback considered as holding errors,
in the same way as the Promises achieve that effect.

There is, however, no a priori restriction for the error callback
to be the second argument, it can also be the first callback
as in [Fluture](https://github.com/fluture-js/Fluture) or Folktale's [`Data.Task`](https://github.com/folktale/data.task), or the last one, or anywhere inbetween.

Similar to Promises, also for CPS functions, handling 
both exceptions and asynchronous errors can be managed the same way, if necessary:

On the other hand, in comparison with Promises, 
the CPS functions allow for clean separation between exceptions such as bugs 
that need to be caught as early as possible, and the asynchronous errors 
that are expected and returned via the error callbacks calls.
The absence of similar feature for Promises attracted [considerable criticisms](https://medium.com/@avaq/broken-promises-2ae92780f33).


## Signatures
> Cleaner signatures: With callbacks, the parameters of a function are mixed; some are input for the function, others are responsible for delivering its output. With Promises, function signatures become cleaner; all parameters are input.

The "curried nature" of the (parametrized) CPS functions 
ensures clean separation between their input parameters
and the callbacks that are used to hold the output only:
```js
const paramCps = (param1, param2, ...) => (cb1, cb2, ...) => { ... }
```
Here the output holding callbacks `cb1, cb2, ...` are 
cleanly "curried away" from the input parameters `param1, param2, ...`.

Note that, without currying, it would not be possible to achieve similar separation.
If function is called directly without currying, it is impossible to tell
which arguments are meant for input and which for output.

The principle here is very analogous to how that separation is achieved by Promises,
except that the CPS function do not impose any restricitons on the 
number of their callback calls, nor the number of arguments passed to each callback
with each call.


## Standardization
> Standardized: Prior to Promises, there were several incompatible ways of handling asynchronous results (Node.js callbacks, XMLHttpRequest, IndexedDB, etc.). With Promises, there is a clearly defined standard: ECMAScript 6. ES6 follows the standard Promises/A+ [1]. Since ES6, an increasing number of APIs is based on Promises.

The CPS functions build directly on the standard already established for JavaScript functions.
The provided methods such as `of` (aka `pure`, `return`), `map` (aka `fmap`), `flatMap` (aka `chain`, `bind`) strictly follow the general standards for algebraic data types established by Functional Programming languages and Category Theory.


# Functional and Fluent API

The `CPS` function transforms any CPS function into that very same CPS function, 
to which in addition all API methods can be applied.
The same methods are provided on the `CPS` namespace and
can be applied directly to CPS functions with the same effect.
For instance, the following expressions are equivalent ([in the sense of fantasyland](https://github.com/fantasyland/fantasy-land#terminology)):
```js
CPS(cpsFun).map(f)
CPS.map(cpsFun)(f)
```

## Conventions
In the following we slightly abuse the notation by placing methods directly
on the CPS functions, where the meaning is always after wrapping the functions into `CPS`.
That is, we write 
```js
cpsFun.map(f)
// instead of 
CPS(cpsFun).map(f)
```
We could have used instead the equivalent functional style `map(f)(cpsFun)`,
but the fluent style seems more common in JavaScript and closer to how Promises are used,
so we use it instead.


## CPS.map
The `map` method and the equivalent `CPS.map` function in their simplest form 
are similar to `Array.map` as well as other `map` functions/methods used in JavaScript.

### Mapping over single function
In the simplest case of a single function `x => f(x)` with one argument,
the corresponding transformation of the CPS function only affects the first callback,
very similar to how the function inside `.then` method of a promise only affects the fulfilled value:
```js
const newPromise = oldPromise.then(res => f(res))
```
Except that the `map` behavior is simpler with no complex promise recognition nor any thenable unwrapping:
```js
const newCps = CPS(oldCps).map(res => f(res))
```
The `newCps` function will call its first callback
with the single transformed value `f(res)`,
whereas the functionality of the other callbacks remains unchanged.


### Mapping over multiple functions
To transform results inside other callbacks, the same `map` method
can be used with mulitple functions:
```js
const newCps = CPS(oldCps).map(res => f(res), err => g(err))
```
Here we are calling the second result `err` in analogy with promises,
however, in general, it is just the second callback argument with no other meaning.
The resulting CPS function will call its first and second callbacks
with correspondingly transformed arguments `f(res)` and `g(res)`,
whereas all other callbacks will be passed from `newCps` to `oldCps` unchanged.

The latter property generalized the praised feature of the Promises,
where a single error handler can deal with all accumulated errors.
In our case, the same behavior occurs for the `n`-th callback
that will be picked by only those `map` invocations holding functions at their `n`-th spot.
For instance, a possible third callback `progress` 
will similaly be handled only invocations of `map(f1, f2, f3)`
with some `f3` provided.


### Mapping over maps taking multiple arguments
The single function `map` infocation actually applies the function to all the arguments
passed to the callback. That means, the above pattern can be generalized to
```js
const newCps = CPS(oldCps).map((res1, res2, ...) => f(res1, res2, ...))
```
or just passing all the results as arguments:
```js
const newCps = CPS(oldCps).map((...args) => f(...args))
```
or some of them:
```js
const newCps = CPS(oldCps).map((iAmThrownAway, ...rest) => f(...rest))
```
or picking props from multiple objects via destructuring:

```js
const newCps = CPS(oldCps).map(({name: name1}, {name: name2}) => f(name1, name2))
```
Now the names from objects will go into `f`.
None of these is possible with promises where only single values are ever being passed.


### Functor laws
The `map` method for single functions of single argument satisfies the functor laws.
That is, the following pairs of expressions are equivalent:
```js
cpsFun.map(f).map(g)
cpsFun.map(x => g(f(x)))
```
```js
cpsFun
cpsFun.map(x => x)
```

In fact, we have more general equivalences with multiple arguments:
```js
cpsFun.map(f1, f2, ...).map(g1, g2, ...)
cpsFun.map(x1 => g1(f1(x1)), x2 => g2(f2(x2)), ...)
```
where in addition, the number of `f`'s can differ from the number of `g`'s,
in which case the missing maps have to replaced by the identities.


### CPS.of
The static method `CPS.of` that we simply call `of` here
is the simplest way to wrap values into a CPS function:
```js
const of = (x1, x2, ...) => callback => callback(x1, x2, ...)
```
or equivalently
```js
const of = (...args) => callback => callback(...args)
```

Here the full tuple `(x1, x2, ...)` becomes the single output of
the created CPS function `of(x1, x2, ...)`.

As mentioned before, 
`of` and `map` for single functions of single argument 
conform to the [Pointed Functor](https://stackoverflow.com/questions/39179830/how-to-use-pointed-functor-properly/41816326#41816326),
that is the following expressions are equivalent:
```js
of(x).map(f)
of(f(x))
```
The first function applies `f` to transform its single output,
whereas the second one outputs `f(x)` direclty into its callback, which is obviously the same.

More generally, the following are still equivalent
with the same reasoning:
```js
of(x1, x2, ...).map(f)
of(f(x1, x2, ...))
```


## CPS.flatMap

### Transforming multiple arguments into multiple arguments
There is a certain lack of symmetry with the `map` method,
due to the way the function are called with several arguments but 
only ever return a single value.

But what if we want not only to consume, but also to pass multiple arguments to the callback of the new CPS function?

No problem. Except that, we should wrap these into another CPS function and use `flatMap` instead:
```js
const newCps = CPS(oldCps).flatMap((x1, x2, ...) => of(x1 + 1, x2 * 2))
```
of equivalently and more directly
```js
const newCps = CPS(oldCps).flatMap((x1, x2, ...) => cb => cb(x1 + 1, x2 * 2))
```

Here we pass both `x1 + 1` and `x2 * 2` simultaneously into the transformation callback `cb`.
Similar to promises, we can regard `(x1, x2, ...)` as the tuple of values held inside the CPS function,
in fact, being passed to its first callback. 
Now the `flatMap` receives this tuple,
trasnforms it according to the second CPS function, i.e. into the pair `(x1 + 1, x2 * 2)`,
and finally passes it into the first callback of `newCps`.
The final result is exactly the intended one, that is, 
the result tuple output `(x1, x2, ...)` from `oldCps` is transformed into the new pair `(x1 + 1, x2 * 2)`
that becomes the output of `newCps`.


### Why is it called `flatMap`?
Have you noticed the difference between how `map` and `flatMap` are used?
Here is the simplest case comparison:
```js
cpsFun.map(x => x+1)
cpsFun.flatMap(x => of(x+1))
```
The first time the value `x+1` is passed directly,
the second time it is wrapped into CPS function with `of`.
The first time the return value of the function is used,
the second time it is the output value of the CPS function inside `flatMap`.

The "Promised" way is very similar:
```js
promise.then(x => x + 1)
promise.then(x => Promise.resolve(x))
```
Except that both times `then` is used,
so we don't have to choose between `map` and `flatMap`.
However, such simplicity comes with its cost.
Since `then` has to do its work to detect 
and recursively unwrap any promise or thenable,
there can be a loss in performance as well as 
in safety to refactor 
```js
promise.then(f).then(g)
```
to
```js
promise.then(x => g(f(x)))
```
which is [not always the same](...).

On the other hand, our `map` method
conforms to the Functor composition law,
that is the following are always equivalent
and safe to refactor to each other (as mentioned above):
```js
cpsFun.map(f).map(g)
cpsFun.map(x => g(f(x)))
```
And since there is no other work involved,
our performance wins.

However, if we try use `map` in the second case,
instead of `flatMap`, we get
```js
cpsFun.map(x => of(x+1))
```
which emits `of(x+1)` as output, rather than `x+1`.
That is, the output result of our CPS function is another CPS function,
so we get our value wrapped twice.
This is where `flatMap` becomes useful,
in that in removes one of the layers,
aka "flattens" the result.

And the rule becomes very simple:

*Use `map` with "plain" functions and `flatMap` with CPS functions inside*


### Composing multiple outputs
In the previous case we had `flatMap` over a CPS function with single output,
even when the output itself is a tuple.
In comparison, a general Promise has two outputs - the result and the error.
Of course, in case of Promises, there are more restrctions such as only one of these two
outputs can be emitted.

No such restrictions are iposed on CPS functions,
where two or more callbacks can receive arbitrary number of outputs arbitrarily often.
To keep things simple, consider how the Promise functionality can be extended
without the output exclusivity restriction:
```js
const cpsFun = (cb1, cb2) => {
	/* some work here... */
	cb1(res1)
	/* some more work... */
	cb2(res2)
}
```
So both callbacks are called with their individual results at different moments.

A very useful and realistic example of this functionality would be,
when the server sent an error but then eventually managed to deliver the data.
That would be impossible to implement with Promises.

Back to our example,
we now want to use the output for the next CPS computation:
```js
const newCps = cpsFun.flatMap(res => anotherCps(res))
```
We are now chaining aka sequentially executing `cpsFun`,
followed by the next parametrized CPS function
`anotherCps` applied to the result `res` of the previous computation.

So how should we combine both computations?
And should we apply the second one to `res1` or `res2`?

If you read the above description of the `map`, you know the answer.
The principle is the same. As we only pass one function to `flatMap`,
only the first callback is affected. 
That is, we must pass only the first result `res1` to `anotherCps`.
Whose output will be our final result inside the first callback,
whereas all other callbacks remain unchanged.

So the functionality of `newCps` is equivalent to the following:
```js
const newCps = (...args) => cpsFun(
	res1 => anotherCps(res1)(...args), 
	res2 => cb2(args[1])
)
```
Note how all callbacks are passed to the inner CPS function in the same order as `args`.
That guarantees that no outgoing information from `anotherCps` can ever get lost.


### Passing multiple CPS functions to `flatMap`
Similarly to `map`, also `flatMap` accepts arbitrary number of functins, 
this time CPS functions:
```js
const newCps = oldCps.flatMap(
	res1 => anotherCps1(res1), 
	res2 => anotherCps2(res2), 
		...
)
```
Look how similar it is with Promises usage:
```js
// Promises
promise.then(
	res => anotherPromise(res),
	error => errorHandlerPromise(err) 
)
// CPS functions
cpsFun.flatMap(
	res => anotherCps(res),
	err => errorHandlerCps(err)	
)
```
You can barely tell the difference, can you?

Or, since the CPS functions are just functions, 
we can even drop any Promise `then` function directly into `flatMap`:
```js
// CPS functions
cpsFun.flatMap(
	res => anotherPromise.then(res),
	error => errorHandlerPromise.then(err)
)
// or just the shorter
cpsFun.flatMap( anotherPromise.then, errorHandlerPromise.then )
```

On the other hand, the CPS functions are more powerful
in that they can call their callbacks multiple times in the future,
with the potential of passing further important information back to the caller.
Also we don't want to prescribe in which callback the error should go,
treating all the callbacks in a uniform way.
Here is some pseudocode demonstrating general usage of `flatMap`
with mulitple functions:
```js
const newCps = oldCps.flatMap(
	(x1, x2, ...) => cpsFun1(x1, x2, ...),
	(y1, y2, ...) => cpsFun2(y1, y2, ...),
		...
)
```
And the functionality of `newCps` is equivalent to
```js
const newCps = (cb1, cb2, ...) => oldCps(
	(x1, x2, ...) => cpsFun1(x1, x2, ...)(cb1, cb2, ...)
	(y1, y2, ...) => cpsFun1(y1, y2, ...)(cb1, cb2, ...)
		...
)
```
As any other CPS function, our `newCps` accepts arbitrary number of callbacks
that are simply all passed to each interior CPS function in the same order.
That leads to the effect of capturing output events from each of them,
and "flattening" the event streams via simple merging.


### Monadic laws
When used with single callback argument,
`of` and `flatMap` satisfy the regular monadic laws.

#### Associativity law
The associativity law analogue for Promises is the equivalence of:
```js
promise
	.then(x1 => promise1(x1))
	.then(x2 => promise2(x2))
promise
	.then(x1 => promise1.then(x2 => promise2(x2)))
```
For CPS functions, this looks nearly identical:
```js
cpsFun
	.flatMap(x1 => cpsFun1(x1))
	.flatMap(x2 => cpsFun2(x2))
cpsFun
	.flatMap(x1 => cpsFun1.flatMap(x2 => cpsFun2(x2)))
```
And since these are just functions, 
both expressions can be direclty expanded into
```js
cb => cpsFun(x1 => cpsFun1(x1)(x2 => cpsFun2(x2)(cb)))
```
That is, the output `x1` of `cpsFun` is passed to `cpsFun1`,
which transforms it into `x2` as output, 
subsequently passed to `cpsFun2`,
whose output is finally diverted direclty into `cb`.

More generally, similar law still holds for mulitple arguments,
that is the following are equivalent
```js
cpsFun
	.flatMap(f1, f2, ...)
	.flatMap(g1, g2, ...)
cpsFun
	.flatMap(
		(...xs) => f1(...xs).flatMap((...ys) => g1(...ys)),
		(...xs) => f2(...xs).flatMap((...ys) => g2(...ys)),
			...
	)
```
and both expand into
```js
(...cbs) => cpsFun(
	(...xs) => f1(...xs)((...ys) => g1(...ys)(...cbs)),
	(...xs) => f2(...xs)((...ys) => g2(...ys)(...cbs)),
		...
)
```

#### Identity laws
The monadic identity laws asserts that both following 
expressions are equivalent to the CPS function `cpsFun`:
```js
cpsFun
// is equivalent to
flatMap(y => of(y))(cpsFun)
```
Here `cpsFun` is any CPS function,
whose output is composed with the CPS identity `y => of(y)`.


On the other hand, taking a parametrized CPS function 
`x => cpsFun(x)` and moving the identity to other side,
we get the other law asserting the equivalence of:
```js
x => cpsF(x)
// is equivalent to
x => flatMap(y => cpsF(y))(cb => cb(x))
```

Once expanded, both equivalences are 
became straightforward to check.
More interestingly, they still hold for multiple arguments:
```js
cpsFun
// is equivalent to
cpsFun.flatMap(
	(...ys) => of(...ys),
	(...ys) => of(...ys),
		... /* any number of identities */
)
```
and the other way around:
```js
(...xs) => cpsF(...xs)
// is equivalent to
(...xs) => flatMap(
	(...ys) => cpsF(...ys))((...cbs) => cbs.map(cb => cb(...xs))
)
```


## CPS.ap
The `ap` operator plays the important role of
*running functions in parallel* and combining their output via ordinary functions.


### Running CPS functions in parallel
Similarly to `map(f)` applying a plain function `f` to (the output of) a CPS function,
`ap(cpsF)` applies functions that are themselves outputs of some CPS function,
delivered via callbacks. 
A simple example is getting result from a database query via `cpsDb` function
and display it with via function transformer obtained from an independent query:
```js
// returns result via 'cb(result)' call
const cpsDb = query => cb => getQuery(query, cb)
// returns transformer function via 'cb(transformer)'
const cpsTransformer = path => cb => getTransformer(path, cb)
// Now use the 'ap' operator to apply the transformer to the query result:
const getTransformedRes = (query, path) => CPS(cpsDb(query)).ap(cpsTransformer(path))
// or equivalently in the functional style, without the need of the 'CPS' wrapper:
const getTransformedRes = (query, path) => ap(cpsTransformer(path))(cpsDb(query))
```

Note that we could have used `map` and `flatMap` to run the same functions sequentially,
one after another:
```js
(query, path) => CPS(cpsDb(query))
	.flatMap(result => cpsTransformer(path)
		.map(transformer => transformer(result)))
```
Here we have to nest, in order to keep `result` in the scope of the second function.
However, `result` from the first function was not needed to run the `cpsTransformer`,
so it was a waste of time and resources to wait for the query `result`
before getting the `transformer`.
It would be more efficient to run both functions in parallel and then combine the results,
which is precisely what the `ap` operator does.


### Lifting functions of muiltiple parameters
Perhaps the most important use of the `ap` operator is lifting plain functions
to act on results of CPS functional computations.
That way simple plain functions can be created and re-used
with arbitrary data, regardless of how the data are retrieved.
In the above example we have used the general purpose plain function
```js
const f =(result, transformer) => transformer(result)
```
which is, of course, just the ordinary function call.
That function was "lifted" to act on the data delivered as outputs
from separate CPS functions.

Since this use case is very common,
we have the convenience operator doing exactly that called `lift`:
```js
const getTransformedRes = (query, path) => 
	lift(transformer => transformer(result))
		(cpsDb(query), cpsTransformer(path))
```

#### Promise.all
The common way to run Promises in parallel via `Promise.all`
is a special case of the `lift` usage,
corresponding to lifting the function 
combining values in array:
```js
const combine = (...args) => args
Promise.all = promiseArray => lift(combine)(...promiseArray)
```

Similarly, the same `combine` function (or any other) can be lifted
over to act on outputs of CPS functions:
```js
(cpsF1, cpsF2, ...) => lift((x1, x2, ...) => f(x1, x2, ...))(cpsF1, cpsF2, ...)
```


#### Usage notes
Note that `lift` (and `ap`) are best used when 
their arguments can only be retrieved as outputs from separate CPS functions.
If for instance, both `result` and `transformer`
can be delivered via single query,
using `lift` would be a waste of its parallel execution functionality.
Instead we could have used the simple `map` with a single CPS function:
```js
const getTransformedResSingle = (query, path) =>
	CPS(getData(query, path)).map((result, transformer) => transformer(result))
```
Note how the `map` function is applied with two arguments,
which assumes the `getData` function to have these in a single callback output 
as `callback(result, transformer)`.


### Applying multiple functions inside `ap`

As with `map` and `flatMap`, the same rules apply for `ap`:
```js
const transformed = CPS(cpsFun).ap(F1, F2, ...)
```
When called with callbacks `(cb1, cb2, ...)`,
the output from `cb1` is transformed with the output function from `F1`,
the output from `cb2` with function from `F2` and so on.

For instance, a CPS function with two callbacks such as `(resBack, errBack)`
can be `ap`ed over a pair of CPS functions, outputting plain functions each
```js
// These call some remote API
const cpsResTransformer = cb => getResTransformer(cb)
const cpsErrHandler = cb => getErrHandler(cb)
// This requires error handlers
const cpsValue = (resBack, errBack) => getValue(resBack, errBack)
// Now run all requests in parallel and consume both outputs as they arrive
// via plain function call
CPS(cpsValue).ap(cpsResTransformer, cpsErrHandler)(
	res => console.log("Transformed Result: ", res)
	err => console.log("The Error had been handled: ", err)
)
```

The above pattern can be very powrful,
for instance the `cpsErrHandler` function
can include a remote retry or cleanup service
that is now completely abstracted away from the main code pipeline!



### Applicative laws
The `ap` operator together with `of` conforms to the [Applicative interface](https://github.com/rpominov/static-land/blob/master/docs/spec.md#applicative)



## CPS.merge
The `merge` operator merges outputs events from multiple CPS functions,
which occurs separately for each callback slot:
```js
// merge outputs into single CPS function
const cpsMerged = merge(cpsF1, cpsF2, ...)
// cb1 receives all outputs from the first callback of each of the cpsF1, cpsF2, ...
cpsMerged(cb1, cb2, ...)
```
Here the `N`-th callback of `cpsMerged` gets called each time
the `N`-th callback of any of the functions `cpsF1`, `cpsF2`, ...,
with the same arguments.
This behaviour corresponds to merging the values emitted by 
each event stream.

### Relation with Promise.race
The `merge` operator generalizes the functionality provided for Promises via `Promise.race`.
Since Promises only take the first emitted value from each output,
merging those results in the earliest value from all being picked by the Promise,
hence the direct analogy with `Promise.race`.



### Commutative Monoid
The `merge` operator makes the set of all CPS functions a commutative Monoid,
where the identity is played by the trivial CPS function that never emits any output.




