const test = require('tape')
// const test = require('tap').test

/*
Curried version of the `.is` assertion: patching test object with `.cis` prop to delegate to its `.is` prop

Usage: t.cis(a)(b)
*/
module.exports = (title, fn) =>	
	test(title, t => {
		t.cis = a => b => t.is(a, b)
		// run consumer test function
		fn(t)
		// tape requires to end each test
		t.end()
	})
