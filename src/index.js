/**
 * Imports
 */

import {put, take} from '@koax/channels'
import defer from '@f/defer-promise'
import isGenerator from '@f/is-generator'
import isIterator from '@f/is-iterator'
import isFunction from '@f/is-function'

/**
 * Channel
 */

const TASKS = '@koax/fork/TASKS'

/**
 * fork
 */

function taskRunner (dispatch) {
  dispatch(function * () {
    while (true) {
      let task = yield take(TASKS)
      dispatch(task.run()).then(task.result, task.error)
    }
  })
  return dispatch
}

function * fork (fn) {
  let task = createTask(fn)
  yield put(TASKS, task)
  return task
}

function join (task) {
  return task.done
}

function cancel (task) {
  return task.cancel()
}

function createTask (fn) {
  if (! (isGenerator(fn) || isIterator(fn) || isFunction(fn))) {
    throw new Error('Task must be a function, a generator, or an iterator.')
  }

  let deferred = defer()
  let _isRunning, _iterator, _result, _error

  return {
    run,
    isRunning,
    result,
    error,
    cancel,
    done: deferred.promise
  }

  function run () {
    _isRunning = true
    if (isGenerator(fn)) {
      _iterator = fn()
      return _iterator
    } else if (isIterator(fn)) {
      _iterator = fn
      return _iterator
    } else {
      return fn()
    }
  }

  function isRunning () {
    return _isRunning
  }

  function result (val) {
    if (val) {
      _isRunning = false
      _result = val
      deferred.resolve(val)
    } else {
      return _result
    }
  }

  function error (err) {
    if (err) {
      _isRunning = false
      _error = err
    } else {
      return _error
    }
  }

  function cancel () {
    if (isRunning() && _iterator) {
      try {
        _iterator.throw(new Error('TaskCanceled'))
      } catch (err) {
        if (err.message !== 'TaskCanceled') {
          throw err
        }
      }

      return
    }
  }
}

/**
 * Exports
 */

export {taskRunner, fork, join, cancel}
