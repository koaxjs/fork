/**
 * Imports
 */

import test from 'tape'
import {forkDriver, fork, join, cancel} from '../src'
import run from '@koax/run'
import promise from '@koax/promise'
import {take, put, channelsEffect} from '@koax/channels'

/**
 * Tests
 */

test('should fork generator', (t) => {
  t.plan(3)

  let dispatch = forkDriver(run([promise, channelsEffect()]))

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
  let dispatch = forkDriver(run([promise, channelsEffect()]))

  function * fnA () {
    while (true) {
      let res = yield take('a')
      yield fork(someAction(res))
    }
  }

  function * fnB () {
    yield put('a', 1)
    yield put('a', 2)
    yield put('a', 3)
  }

  let count = 1
  function * someAction(res) {
    t.equal(res, count++)
  }

  dispatch(function * () {
    yield [fork(fnA), fork(fnB)]
  })

})

test('should join', (t) => {
  t.plan(1)

  let dispatch = forkDriver(run([promise, channelsEffect()]))

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

  let dispatch = forkDriver(run([promise, channelsEffect()]))

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
    t.equal(result, 'bar')
  })

})
