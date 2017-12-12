import Observable from 'zen-observable'
import { print, } from 'graphql'
import { execute as pipe, } from 'apollo-link'
import { createOperation, } from '../utils/createOperation'

const OBSERVABLE_MULTIPLE_RESULTS_WARNING = `Promise Wrapper does not support multiple results from Observable`
const batch = new Map()

function stringify (obj) {
  return JSON.stringify(obj)
}

function isSubscribable (obj) {
  return typeof obj.subscribe === 'function'
}

function isThenable (obj) {
  return typeof obj.then === 'function'
}

function createOperationKey ({ source, variables, context, } = {}) {
  return `${source}-${stringify(variables)}-${stringify(context)}`
}

function toPromise (observable, key) {
  let completed = false
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: data => {
        if (completed) {
          // eslint-disable-next-line
          console.warn(OBSERVABLE_MULTIPLE_RESULTS_WARNING)
        } else {
          completed = true
          key && batch.delete(key)
          resolve(data)
        }
      },
      error: reject,
    })
  })
}

export function OperationManager (links) {
  function batcher (fn) {
    return function (sourceOrDocument, options) {
      const key = createOperationKey({
        source:
          typeof sourceOrDocument === 'string'
            ? sourceOrDocument
            : print(sourceOrDocument),
        ...options,
      })
      const cachedOperation = batch.get(key)

      if (cachedOperation) {
        return cachedOperation
      }

      const operation = createOperation(sourceOrDocument, options)

      return fn(operation, key)
    }
  }

  function query (operation, key) {
    const obj = pipe(links, operation)

    const request = isThenable(obj)
      ? obj
      : isSubscribable(obj) ? toPromise(obj, key) : Promise.resolve(obj)

    batch.set(key, request)
    return request
  }

  function mutate (sourceOrDocument, options) {
    const operation = createOperation(sourceOrDocument, options)
    const obj = pipe(links, operation)

    const request = isThenable(obj)
      ? obj
      : isSubscribable(obj) ? toPromise(obj) : Promise.resolve(obj)

    return request
  }

  function subscribe (sourceOrDocument, options) {
    const operation = createOperation(sourceOrDocument, options)
    return Observable.from(pipe(links, operation))
  }

  return {
    query: batcher(query),
    mutate: mutate,
    subscribe: subscribe,
  }
}
