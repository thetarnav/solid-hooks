import type * as API from '.'
import { getNewId, Reducer } from './hooks'

export const useId: typeof API.useId = () => getNewId()

export const useRef: typeof API.useRef = (initialValue => {
  return { current: initialValue }
}) as typeof API.useRef

export const useCallback: typeof API.useCallback = callback => callback

export const useMemo: typeof API.useMemo = callback => callback()

export const useState: typeof API.useState = initialValue => [
  typeof initialValue === 'function' ? (initialValue as any)() : initialValue,
  () => {},
]

export const useReducer: typeof API.useReducer = (
  reducer: Reducer<any, any>,
  initialState: any,
  initializer?: any,
) => useState(initializer ? initializer(initialState) : initialState) as any

export const useSyncExternalStore: typeof API.useSyncExternalStore = (
  subscribe,
  getSnapshot,
  getServerSnapshot,
) => (getServerSnapshot ? getServerSnapshot() : getSnapshot())

export const useEffect: typeof API.useEffect = () => {}

export const useLayoutEffect: typeof API.useLayoutEffect = () => {}
