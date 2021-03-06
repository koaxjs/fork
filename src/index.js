/**
 * Imports
 */

import channel from '@f/channel'
import defer from '@f/defer-promise'
import isGenerator from '@f/is-generator'
import isIterator from '@f/is-iterator'
import isFunction from '@f/is-function'

/**
 * Channel
 */

const FORK = '@koax/fork/FORK'
const JOIN = '@koax/fork/JOIN'
const CANCEL = '@koax/fork/CANCEL'

/**
 * fork
 */

function forkEffect (interpret) {
  return function * (action, next) {
    switch (action.type) {
      case FORK:
        return forkHandler(interpret.dispatch || interpret, action.payload)
      case JOIN:
        return joinHandler(action.payload)
      case CANCEL:
        return cancelHandler(action.payload)
    }
    return next()
  }
}

function * forkHandler (interpret, fn) {
  let task = createTask(fn)
  interpret(task.run()).then(task.result, task.error)
  return task
}

function fork (fn) {
  return {type: FORK, payload: fn}
}

function joinHandler (task) {
  return task.done
}

function join (task) {
  return {type: JOIN, payload: task}
}

function cancelHandler (task) {
  return task.cancel()
}

function cancel (task) {
  return {type: CANCEL, payload: task}
}

function createTask (fn) {
  if (!(isGenerator(fn) || isIterator(fn) || isFunction(fn))) {
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

export {forkEffect, fork, join, cancel}
