/**
 * Imports
 */

import test from 'tape'
import {forkEffect, fork, join, cancel, BOOT} from '../src'

import channel from '@f/channel'
import boot from '@koax/boot'
import run from '@koax/run'
import promise from '@koax/promise'
import compose from '@koax/compose'

/**
 * Tests
 */

test('should fork generator', (t) => {
  t.plan(3)

  let dispatch = createDispatch()

  let finished = false

  function * getBar () {
    let res = yield new Promise(function (resolve) {
      setTimeout(function () {
        resolve('foo')
      }, 5)
    })
    t.equal(res, 'foo')
    t.equal(finished, true)
    return 'bar'
  }

  dispatch(function * () {
    yield fork(getBar)
    return 'woot'
  }).then(function (val) {
    t.equal(val, 'woot')
    finished = true
  })

})

test('should not drop puts', (t) => {
  t.plan(3)
  let dispatch = createDispatch()
  let {take, put} = channel()

  function * fnA () {
    while (true) {
      let res = yield take()
      yield fork(someAction(res))
    }
  }

  function * fnB () {
    yield put(1)
    yield put(2)
    yield put(3)
  }

  let count = 1
  function * someAction (res) {
    t.equal(res, count++)
  }

  dispatch(function * () {
    yield [fork(fnA), fork(fnB)]
  })
})

test('should join', (t) => {
  t.plan(1)

  let dispatch = createDispatch()

  function * child () {
    return yield new Promise(function (resolve) {
      setTimeout(function () {
        resolve('foo')
      }, 5)
    })
  }

  dispatch(function * () {
    const task = yield fork(child)
    const result = yield join(task)
    t.equal(result, 'foo')
  })
})

test('should cancel', (t) => {
  t.plan(1)

  let dispatch = createDispatch()

  function * child () {
    try {
      return yield new Promise(function (resolve) {
        setTimeout(function () {
          resolve('foo')
        }, 10)
      })
    } catch (err) {
      t.equal(err.message, 'TaskCanceled')
    }
  }

  dispatch(function * () {
    const task = yield fork(child)
    yield cancel(task)
  })
})

function createDispatch () {
  let ctx = {}
  return ctx.dispatch = run(compose([promise, forkEffect(ctx)]))
}
