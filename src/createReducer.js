// @flow
import React, { PropTypes } from 'react'
import isPlainObject from 'lodash/isPlainObject'
import { createStore, compose } from 'redux'
import { connect, Provider } from 'react-redux'
import { checkMountPath } from './utils/checks'
import { normalizeMountPath } from './utils/normalize'
import storeShape from './utils/storeShape'
import enhanceStore from './enhanceStore'
import createBoundedReducer from './createBoundedReducer'
import setReduxState from './setReduxState'
import { RESET_STATE, MOUNT_PATH } from './consts'
import getState from './getState'

/**
 * Check initialState
 * @param  {Object} initialState
 * @return {void}
 */
const checkInitialState = (initialState: any) => {
  if (!isPlainObject(initialState)) {
    throw new Error('InitialState must be plain object')
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
 * Function creates and registers special reducer in Redux store,
 * and provides simple API to manage of its state.
 * @param {Object} config
 * @return {Function}
 *   @param {Component} WrappedComponent
 *   @return {Component} new component
 */
type ParamsType = {
  mountPath?: string,
  initialState: Object | Function,
  listenActions?: Object | Function,
  connectToStore: boolean,
  persist: boolean,
  actionPrefix?: string
}
export default ({
  mountPath,
  initialState,
  listenActions,
  connectToStore = true,
  persist = true,
  actionPrefix
}: ParamsType = {}) => {
  if (mountPath) {
    checkMountPath(mountPath)
  }
  if (typeof initialState !== 'function') {
    checkInitialState(initialState)
  }
  if (listenActions && typeof listenActions !== 'function') {
    checkListenActions(listenActions)
  }
  if (typeof connectToStore !== 'boolean') {
    throw new Error('ConnectToStore must be boolean')
  }
  checkPersist(persist)
  if (actionPrefix) {
    checkActionPrefix(actionPrefix)
  }

  return (WrappedComponent: any) =>
    class CreateReducer extends React.Component {
      static contextTypes = {
        store: process.env.NODE_ENV === 'test' ? PropTypes.object : storeShape
      }

      store: ?Object
      setReduxState: any
      resetReduxState: any
      ChildComponent: any
      persist: any
      actionPrefix: any

      props: {
        reduxMountPath: string,
        reduxPersist: boolean,
        reduxActionPrefix: string
      }

      constructor(props: any, context: any) {
        super(props, context)

        let { store } = context
        this.store = null
        if (!isPlainObject(store)) {
          const composeEnhancers =
            process.env.NODE_ENV !== 'production' &&
            typeof window === 'object' &&
            window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
              window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({}) : compose
          store = createStore(null, composeEnhancers(enhanceStore))
          this.store = store
        } else {
          if (typeof store.registerReducers !== 'function') {
            throw new Error('Redux store must be enhanced with redux-fly')
          }
        }

        let { reduxMountPath: propMountPath, reduxPersist: propPersist, reduxActionPrefix: propActionPrefix } = props

        if (typeof propMountPath !== 'undefined') {
          checkMountPath(propMountPath)
        }

        if (!mountPath && !propMountPath) {
          throw new Error('Mount path must be defined')
        }
        const _mountPath = normalizeMountPath(`${propMountPath || ''} ${mountPath || ''}`)

        let _connectToStore = connectToStore
        this.actionPrefix = actionPrefix
        this.persist = persist

        // Priority actionPrefix from props
        if (typeof propActionPrefix !== 'undefined') {
          checkActionPrefix(propActionPrefix)
          this.actionPrefix = propActionPrefix
        }

        // Default value for action prefix contain mount path
        if (!this.actionPrefix) {
          this.actionPrefix = `${_mountPath}/`
        }

        // Priority persist from props
        if (typeof propPersist !== 'undefined') {
          checkPersist(propPersist)
          this.persist = propPersist
        }

        let _initialState = initialState
        if (typeof _initialState === 'function') {
          _initialState = _initialState(props)
          checkInitialState(_initialState)
        }

        let _listenActions = listenActions
        if (typeof _listenActions === 'function') {
          _listenActions = _listenActions(props, this.actionPrefix)
          checkListenActions(_listenActions)
        }

        this.ChildComponent = WrappedComponent
        if (_connectToStore) {
          this.ChildComponent = connect((state) =>
            ({ reduxState: getState(_mountPath)(state) })
          )(WrappedComponent)
        }

        // Creation and registration reducer
        store.registerReducers({
          [_mountPath]: createBoundedReducer(_mountPath, _initialState, _listenActions || {}, this.actionPrefix),
        })
        // Binding setReduxState with redux store
        this.setReduxState = setReduxState(_mountPath, store.dispatch, store.getState, this.actionPrefix)
        // Action creator RESET redux state
        this.resetReduxState = () => store.dispatch({
          type: `${this.actionPrefix}${RESET_STATE}`,
          [MOUNT_PATH]: _mountPath
        })
      }

      componentWillUnmount() {
        // If component isn't persist then RESET redux state
        if (!this.persist) {
          this.resetReduxState()
        }
        this.store = null
        this.ChildComponent = null
        this.setReduxState = null
        this.actionPrefix = null
        this.resetReduxState = null
        this.persist = null
      }

      render() {
        let ChildComponent = this.ChildComponent
        let Component = (
          <ChildComponent
            {...this.props}
            setReduxState={this.setReduxState}
            resetReduxState={this.resetReduxState}
          />
        )
        if (process.env.NODE_ENV === 'test') {
          Component = React.cloneElement(Component, {
            persist: this.persist.toString(),
            actionPrefix: this.actionPrefix
          })
        }

        if (this.store) {
          return (
            <Provider store={this.store}>
              {Component}
            </Provider>
          )
        }
        return Component
      }
    }
}
