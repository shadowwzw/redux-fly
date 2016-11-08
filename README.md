## Purposes
* Library provides simple API for manage React component state stored in Redux.
* Library provides simple API for interact between components through API Redux: dispatch actions, state selectors.
* Library provides simple API for creation of the reused components which can placement of a state in the common Redux store or create incapsulated state.
* Library provides simple API for gradual registration reducers in any nested level of Redux store.

## API
### `createReducer(config)`
Function creates and registers special reducer in Redux store, and provides simple API to manage of its state.

#### Arguments
* `config` (*Object*)
  * `[mountPath]`\(*string*): if specified, the argument defines reducer mounting path. It contains from object keys separated by spaces.  
  * `initialState`\(*Object*): the argument defines reducer initial state.
  * `initialState(props): Object`\(*Function*): function receives props and must return object described above.  
  * `[listenActions]`\(*Object*): if specified, the argument defines listeners to actions.
    * `key`\(*string*): action type.
    * `value`\(*Function*): reducer.
  * `[listenActions(props, actionPrefix): Object]`\(*Function*): if specified, the argument defines function which receives props and actionPrefix and must return object described above.  
  * `connectToStore = true`\(*boolean*): by default the argument defines connect to current registered reducer by library `react-redux` and provides its state in `reduxState` prop. If the argument is `false` then need manual connect.
  * `persist = true`\(*boolean*): by default the argument defines need to keeps current reducer state in case of component is unmounted. If the argument is `false` then reducer resets state.  
  * `[actionPrefix]`\(*string*): if specified, the argument defines prefix for actions dispatched by `setReduxState` and `resetReduxState` described below.
  
#### Props
Are specified for creations the reused components.
* `[reduxMountPath]`\(*string*) if specified, defines reducer mounting path. Concatenates with `mountPath` transferred through arguments: `reduxMountPath + mountPath`
* `[reduxPersist]`\(*boolean*) if specified, defines need to reset state to `initialState` in case of component is unmounted. Replaces `persist` transferred through arguments.
* `[reduxActionPrefix]`\(*string*) if specified, defines prefix for actions dispatched in case of change current reducer state by special API. Replaces `actionPrefix` transferred through arguments.

#### Remarks
* Mounting path must be filled through `arguments` and(or) `props`.
* If action prefix isn't specified through `arguments` and `props` then it filled to mounting path.
* If `redux` store isn't created in app then it would be to automatic created.

### `enhanceStore`

Extend store object with `registerReducers` method for gradual registration reducers in any place of Redux store.
  
#### Example
Create enhanced store:
```javascript
import { createStore } from 'redux';
import { enhanceStore } from 'redux-fly';

const store = createStore(null, enhanceStore);
```  
or with preloaded state received from server or saved in any storage:  
```javascript 
const store = createStore(null, window.__INITIAL_STATE__, enhanceStore);
```
<br/>
Registration of the reducers together with store creation:
```javascript
import { createStore } from 'redux';
import { enhanceStore } from 'redux-fly';

const reducers = {
  'ui component': (state, action) => { ... },
  'ui todo list': (state, action) => { ... }
}
const store = createStore(reducers, enhanceStore);
```
or with preloaded state:
```javascript  
const store = createStore(reducers, window.__INITIAL_STATE__, enhanceStore);
```
  
### `getState(mountPath)(state)`

Get component state by mount path.

#### Arguments
* `mountPath`\(*string*): Path of mounting redux component state.
* `state`\(*Function*): All Redux state.

#### Example

Not reused component.
##### Menu component
```javascript
import { getState } from 'redux';    

const boundedGetState = getState('ui menu');

export const isOpened = (state) => boundedGetState(state).opened;
export const isCollapsed = (state) => boundedGetState(state).collapsed;
```

##### Any component
```javascript
import React, { PropTypes } from 'react';
import getContext from 'recompose/getContext' 
import { isOpened as menuIsOpened, isCollapsed as menuIsCollapsed } from './Menu';

class SideBar extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  componentDidMount() {
    const { store } = this.props;
    if (menuIsOpened(store.getState())) {
      ...
    }
    if (menuIsCollapsed(store.getState())) {
      ...
    }
  }
  ...
}
export default getContext({ store: PropTypes.object.isRequired })(SideBar)
```
<br/>
Reused component.
##### Modal component
```javascript
import React from 'react';
import { getState } from 'redux';    

export const isOpened = (mountPath, state) => getState(mountPath)(state).opened;
```

##### Any component
```javascript
import React, { PropTypes } from 'react';
import getContext from 'recompose/getContext' 
import { isOpened as modalIsOpened } from './Modal';

class Component extends React.Component {
  static propTypes = {
    store: PropTypes.object.isRequired
  }

  componentDidMount() {
    const { store } = this.props;
    if (modalIsOpened('ui component', store.getState())) {
      ...
    }
  }
  ...
}
export default getContext({ store: PropTypes.object.isRequired })(Component)
```

### `registerReducers(reducers)`
Registration of reducers in Redux store.

#### Arguments
* `reducers`\(*Object*) 
  * `key`\(*string*): reducer mounting path. Contains from object keys separate of spaces.  
  * `value`\(*Function*): reducer.
* `reducers(props): Object`\(*Function*): function receive props and must return object described above.  

#### Returns
A React component class that register the passed reducers in Redux store.

#### Remarks
* It needs to be invoked two times. The first time with its arguments described above, and a second time, with the component: registerReducers(reducers)(MyComponent).

* It does not modify the passed React component. It returns a new component that you should use instead.

#### Example

##### Todo reducer
```javascript
export default (state, action) => { ... }
```

##### Not reused component.
```javascript
import React, { PropTypes } from 'react';
import { registerReducers } from 'redux-fly';
import { connect } from 'react-redux';
import { compose } from 'redux';
import todoReducer from './reducer';

const Component = ({ todo }) => { ... };
Component.propTypes = {
  todo: PropTypes.object.isRequired,
}

export default compose(
  connect(state => ({ todo: state.ui.todo })),
  registerReducers({ 'ui todo': todoReducer })  
)(Component)
```

##### Reused component.
```javascript
import { getState, registerReducers } from 'redux-fly';
...
export default compose(
  connect((state, ownProps) => ({ todo: getState(`${ownProps.reduxMountPath} todo`)(state) })),
  registerReducers(props => ({ [`${props.reduxMountPath} todo`]: todoReducer }))  
)(Component)
```
