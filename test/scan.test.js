const test = require('./config').test
const { scan } = require('..')

test('scan over single callback output', t => {
	const reducer = (acc, x) => acc + x
	const initState = 10
	const cpsFun = cb => cb(42)
	t.plan(1)
	scan(reducer)(initState)(cpsFun)(t.cis(52))
})

test('scan over single repeated callback output', t => {
	let called = false
	const reducer = (acc, x) => acc + x
	const initState = 10
	const cpsFun = cb => { cb(2); cb(8) }
	const newCps = scan(reducer)(initState)(cpsFun)

	// called twice with 
	// 12 = 10 + 2 and 20 = 10 + 2 + 8 as outputs
	t.plan(2)
	newCps(res => {
		t.cis(called ? 20 : 12)(res)
		called = true
	})	
})

test('scan over outputs from 2 callbacks', t => {
	const r = (acc, x) => acc + x
	const cpsFun = (cb1, cb2) => cb1(2) + cb2(3)
	const newCps = scan(r, r)(10, 11)(cpsFun)

	// called with 12 = 10 + 2 and 14 = 11 + 3
	t.plan(2)
	newCps(t.cis(12), t.cis(14))
})
