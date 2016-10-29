// @flow
import React from 'react'
import { checkMountPath } from './utils/checks'
import createRegisterReducer from './createRegisterReducer'
import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'
import { normalizeMountPath } from './utils/normalize'

/**
 * Check preloadedState
 * @param  {Object} preloadedState
 * @return {void}
 */
const checkPreloadedState = (preloadedState: any) => {
  if (!isPlainObject(preloadedState)) {
    throw new Error('PreloadedState must be plain object')
  }
}

/**
 * Check listenActions
 */
const checkListenActions = (listenActions) => {
  if (!isPlainObject(listenActions)) {
    throw new Error('ListenActions must be plain object')
  }
}

/**
 * Check persist
 */
const checkPersist = (persist) => {
  if (typeof persist !== 'boolean') {
    throw new Error('Persist must be boolean')
  }
}

/**
 * Check action prefix
 */
const checkActionPrefix = (actionPrefix) => {
  if (typeof actionPrefix !== 'string' || !actionPrefix.length) {
    throw new Error('ActionPrefix must be non empty string')
  }
}

/**
 * Check options
 * @param  {Object} options
 * @return {void}
 */
const checkOptions = (options: any) => {
  if (typeof options !== 'undefined' && !isPlainObject(options)) {
    throw new Error('Options must be plain object ')
  }
}

/**
 * Check properties of an object options
 * @param  {Array}  default options
 * @param  {Object}  options
 * @return {void}
 */
const checkDetailOptions = (defaultOptions, options) => {
  if (typeof options.connectToStore !== 'boolean') {
    throw new Error('ConnectToStore must be boolean')
  }
  checkPersist(options.persist)
  if (options.actionPrefix) {
    checkActionPrefix(options.actionPrefix)
  }
  if (['production', 'test'].indexOf(process.env.NODE_ENV) === -1) {
    const undefinedOptions = Object.keys(options).reduce((prev, next) => {
      if (defaultOptions.indexOf(next) === -1) {
        prev = `${prev}${next}, `
      }
      return prev
    }, '').slice(0, -2)
    if (undefinedOptions) {
      warning(`Undefined options: ${undefinedOptions}`)
    }
  }
}

/**
 * Create/mount reducer
 * @param  {string | Function | Object} mountPath
 * @param  {Function | Object} preloadedState
 * @param  {Function | Object} listenActions
 * @param  {Object} options
 * @return {
 *   @param {Object} wrapped React component
 *   @return {Object} React component
 * }
 */
export default (
  mountPath: any,
  preloadedState: any,
  listenActions: any,
  options: any
) => {
  if (!mountPath) {
    throw new Error('Invalid parameters')
  }
  if (typeof mountPath === 'function' || isPlainObject(mountPath)) {
    if (typeof options !== 'undefined') {
      throw new Error('Invalid parameters')
    }
    if (listenActions) {
      options = listenActions
    }
    listenActions = preloadedState
    preloadedState = mountPath
    mountPath = null
  }

  if (mountPath) {
    checkMountPath(mountPath)
  }

  if (typeof preloadedState !== 'function') {
    checkPreloadedState(preloadedState)
  }

  if (listenActions && typeof listenActions !== 'function') {
    checkListenActions(listenActions)
  }

  checkOptions(options)

  if (typeof options === 'undefined') {
    options = {}
  }
  const defaultOptions = {
    connectToStore: true,
    persist: false,
    actionPrefix: '',
  }
  const _options = {
    ...defaultOptions,
    ...options
  }
  checkDetailOptions(Object.keys(defaultOptions), _options)

  return (WrappedComponent: any) =>
    // Transferred some parameters is functions
    class CreateReducer extends React.Component {
      RegisterReducer: any
      propMountPath: ?string

      props: {
        reduxMountPath: string,
        reduxPersist: boolean
      }

      constructor(props: any) {
        super(props)

        let { reduxMountPath: propMountPath, reduxPersist: propPersist, reduxActionPrefix: propActionPrefix } = props
        // Mount path must be passed in props or options
        if (!mountPath && !propMountPath) {
          throw new Error('Mount path must be defined')
        }

        let realMountPath = mountPath
        // Priority mount path from props
        if (typeof propMountPath !== 'undefined') {
          checkMountPath(propMountPath)
          realMountPath = propMountPath
        }
        realMountPath = normalizeMountPath(realMountPath)

        // Priority actionPrefix from props
        if (typeof propActionPrefix !== 'undefined') {
          checkActionPrefix(propActionPrefix)
          _options.actionPrefix = propActionPrefix
        }

        // Default value for action prefix consist from mount path
        if (!_options.actionPrefix) {
          _options.actionPrefix = `${realMountPath}/`
        }

        // Priority persist from props
        if (typeof propPersist !== 'undefined') {
          checkPersist(propPersist)
          _options.persist = propPersist
        }

        // Preloaded state is function
        let _preloadedState = preloadedState
        if (typeof _preloadedState === 'function') {
          _preloadedState = _preloadedState(props, realMountPath)
          checkPreloadedState(_preloadedState)
        }

        // Listen actions is function
        let _listenActions = listenActions
        if (typeof _listenActions === 'function') {
          _listenActions = _listenActions(props, realMountPath)
          checkListenActions(_listenActions)
        }

        this.RegisterReducer = createRegisterReducer(realMountPath, _preloadedState, _listenActions,
          _options, WrappedComponent)
      }

      componentWillUnmount() {
        this.RegisterReducer = null
      }

      render() {
        const RegisterReducer = this.RegisterReducer
        return <RegisterReducer {...this.props} />
      }
    }
}
