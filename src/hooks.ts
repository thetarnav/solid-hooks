/*

Don't do this at home, kids.

This is a proof of concept of how to implement hooks in Solid.

It's not meant to be used in production, but rather to show how it could be done.

It's not even complete, it's just a few hooks to show how it could work.

Hooks to implement:
- [x] useId
- [x] useRef
- [x] useCallback
- [x] useState
  - [x] add only if listener is present
- [x] useMemo
- [x] useEffect
- [x] useLayoutEffect
- [x] useReducer
- [ ] useImperativeHandle
- [ ] useDeferredValue
- [ ] useSyncExternalStore
- [ ] useEvent

*/

import {
  batch,
  createEffect,
  createRoot,
  createSignal,
  getListener,
  getOwner,
  onCleanup,
  runWithOwner,
} from 'solid-js'
import { Computation } from './solid-types'

const HooksDataMap = new WeakMap<Computation, HooksData>()

class HooksData {
  init = true

  #index = 0
  #list: object[] = []

  trigger: Trigger | null = null

  constructor(public owner: Computation) {
    if (process.env.DEV) {
      if (
        // component
        'props' in owner ||
        'componentName' in owner ||
        // solid-refresh memo
        ('value' in owner &&
          'comparator' in owner &&
          owner.pure === true &&
          owner.owner &&
          'props' in owner.owner &&
          owner.owner.componentName &&
          owner.owner.componentName.startsWith('_Hot$$'))
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          "Solid Hooks shouldn't be used in components. Components do not rerender, but computations do — wrap hooks with createMemo or createEffect.",
        )
      }
      // root
      else if (!('fn' in owner)) {
        // eslint-disable-next-line no-console
        console.warn(
          "Solid Hooks shouldn't be used in createRoot. Roots do not rerender, but computations do — wrap hooks with createMemo or createEffect.",
        )
      }
    }
  }

  cleanup() {
    this.#index = 0
    this.init = false
    this.trigger && this.trigger.reset()
  }

  next<T extends object>(factory: (hooksData: HooksData) => T): T {
    if (this.#index === 0) {
      onCleanup(this.cleanup.bind(this))
    }

    if (this.init) {
      const data = factory(this)
      this.#index = this.#list.push(data)
      return data
    }

    const data = this.#list[this.#index++]

    if (!data) {
      throw new Error(
        process.env.DEV ? 'Hooks can only be called in the same order in every update.' : '',
      )
    }

    return data as T
  }
}

function useHookData<T extends object>(factory: (hooksData: HooksData) => T): T {
  const owner = getOwner() as Computation
  if (!owner) {
    throw new Error(
      process.env.DEV ? 'Hooks can only be used synchronously inside a computation.' : '',
    )
  }

  let data = HooksDataMap.get(owner)
  if (!data) HooksDataMap.set(owner, (data = new HooksData(owner)))

  return data.next(factory)
}

const TriggerQueue: VoidFunction[] = []

function runTriggerQueue() {
  if (TriggerQueue.length === 0) {
    queueMicrotask(() => {
      const queue = TriggerQueue.slice()
      TriggerQueue.length = 0
      batch(() => queue.forEach(fn => fn()))
    })
  }
}

class Trigger {
  #tracked = false
  #track: VoidFunction

  #triggered = false
  #trigger: VoidFunction

  constructor() {
    const [track, trigger] = createSignal(void 0, { equals: false })
    this.#track = track
    this.#trigger = trigger
  }

  reset() {
    this.#tracked = false
  }

  listen() {
    if (this.#tracked) return

    if (!getListener()) {
      throw new Error(
        process.env.DEV ? 'State hooks can only be used synchronously under tracking context.' : '',
      )
    }

    this.#track()
    this.#tracked = true
  }

  trigger(fn: VoidFunction) {
    if (this.#triggered) {
      TriggerQueue.push(fn)
    } else {
      this.#triggered = true
      runTriggerQueue()
      TriggerQueue.push(() => {
        this.#trigger()
        this.#triggered = false
      })
      fn()
    }
  }
}

function useTrigger(hooksData: HooksData): Trigger {
  return hooksData.trigger || (hooksData.trigger = new Trigger())
}

function onOwnerDispose(owner: Computation, fn: VoidFunction) {
  const parent = owner.owner
  if (parent) {
    if (parent.cleanups) parent.cleanups.push(fn)
    else parent.cleanups = [fn]
  }
}

function compareDeps(prevDeps?: any[], deps?: any[]): boolean {
  if (!prevDeps) return true
  if (prevDeps.length !== deps!.length) {
    // eslint-disable-next-line no-console
    process.env.DEV && console.warn('deps length changed')
    return true
  }
  for (let i = 0; i < deps!.length; i++) {
    if (!Object.is(prevDeps[i], deps![i])) return true
  }
  return false
}

function useDeps(
  data: { readonly hooksData: HooksData; deps: any[] | undefined },
  deps: any[] | undefined,
): boolean {
  if (data.hooksData.init || compareDeps(data.deps, deps)) {
    data.deps = deps
    return true
  }
  return false
}

export const getNewId = () => Math.random().toString(36).substring(2, 9)

export function useId(): string {
  return useHookData<{ id: string }>(() => ({ id: getNewId() })).id
}

export interface MutableRefObject<T> {
  current: T
}
export interface RefObject<T> {
  readonly current: T | null
}

export function useRef<T>(initialValue: T): MutableRefObject<T>
export function useRef<T>(initialValue: T | null): RefObject<T>
export function useRef<T = undefined>(): MutableRefObject<T | undefined>
export function useRef<T>(initialValue?: T): MutableRefObject<T | undefined> {
  return useHookData<{ current: T | undefined }>(() => ({ current: initialValue }))
}

export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T {
  const data = useHookData(hooksData => ({ callback: fn, hooksData, deps }))

  if (useDeps(data, deps)) {
    data.callback = fn
  }

  return data.callback
}

export function useMemo<T>(calculateValue: () => T, deps?: any[]): T {
  const data = useHookData(hooksData => ({ value: calculateValue(), hooksData, deps }))

  if (useDeps(data, deps)) {
    data.value = calculateValue()
  }

  return data.value
}

export type StateSetter<T> = (value: T | ((prev: T) => T)) => void

const getNextValue = <T>(newValue: T | ((prev: T) => T), prevValue: T) =>
  typeof newValue === 'function' ? (newValue as (prev: T) => T)(prevValue) : newValue

export function useState<T>(initValue: T | (() => T)): [T, StateSetter<T>] {
  const stateData = useHookData(hooksData => {
    const trigger = useTrigger(hooksData)

    const data = {
      value: typeof initValue === 'function' ? (initValue as () => T)() : initValue,
      setter(newValue) {
        trigger.trigger(() => (data.value = getNextValue(newValue, data.value)))
      },
      trigger,
    } satisfies { setter: StateSetter<T> } & { [k: string]: any }
    return data
  })

  stateData.trigger.listen()

  return [stateData.value, stateData.setter]
}

export type Dispatch<A> = (value: A) => void
export type DispatchWithoutAction = () => void

export type Reducer<S, A> = (prevState: S, action: A) => S
export type ReducerWithoutAction<S> = (prevState: S) => S

export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never
export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never

export type ReducerStateWithoutAction<R extends ReducerWithoutAction<any>> =
  R extends ReducerWithoutAction<infer S> ? S : never

export function useReducer<R extends ReducerWithoutAction<any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => ReducerStateWithoutAction<R>,
): [ReducerStateWithoutAction<R>, DispatchWithoutAction]
export function useReducer<R extends ReducerWithoutAction<any>>(
  reducer: R,
  initializerArg: ReducerStateWithoutAction<R>,
  initializer?: undefined,
): [ReducerStateWithoutAction<R>, DispatchWithoutAction]
export function useReducer<R extends Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I & ReducerState<R>,
  initializer: (arg: I & ReducerState<R>) => ReducerState<R>,
): [ReducerState<R>, Dispatch<ReducerAction<R>>]
export function useReducer<R extends Reducer<any, any>, I>(
  reducer: R,
  initializerArg: I,
  initializer: (arg: I) => ReducerState<R>,
): [ReducerState<R>, Dispatch<ReducerAction<R>>]
export function useReducer<R extends Reducer<any, any>>(
  reducer: R,
  initialState: ReducerState<R>,
  initializer?: undefined,
): [ReducerState<R>, Dispatch<ReducerAction<R>>]
export function useReducer(reducer: Reducer<any, any>, initialState: any, initializer?: any) {
  const [state, setState] = useState(initializer ? initializer(initialState) : initialState)
  return [state, (action: any) => setState((prevState: any) => reducer(prevState, action))]
}

export function useEffect(effect: () => void | undefined | VoidFunction, deps?: any[]): void {
  const data = useHookData(hooksData => {
    const owner = hooksData.owner
    onOwnerDispose(owner, () => data.cleanup && data.cleanup())
    return {
      deps,
      hooksData,
      run(fn: () => void | undefined | VoidFunction) {
        runWithOwner(owner, () => (data.cleanup = fn()))
      },
      cleanup: null as VoidFunction | null | undefined | void,
    }
  })

  if (useDeps(data, deps)) {
    runTriggerQueue()
    TriggerQueue.push(() => data.run(effect))
  }
}

const pushEffectQueue = /*#__PURE__*/ createRoot(() => {
  const EffectQueue: VoidFunction[] = []

  const [trackEffectQueueSignal, triggerEffectQueue] = createSignal(
    void 0,
    process.env.DEV ? { name: 'effectQueue', equals: false } : { equals: false },
  )

  let init = true
  createEffect(
    () => {
      trackEffectQueueSignal()
      if (init) return (init = false)

      const queue = EffectQueue.slice()
      EffectQueue.length = 0

      queue.forEach(fn => fn())
    },
    void 0,
    process.env.DEV ? { name: 'effectQueue' } : void 0,
  )

  return (fn: VoidFunction) => {
    EffectQueue.push(fn) === 1 && triggerEffectQueue()
  }
})

export function useLayoutEffect(effect: () => void | undefined | VoidFunction, deps?: any[]): void {
  const data = useHookData(hooksData => {
    const owner = hooksData.owner
    onOwnerDispose(owner, () => data.cleanup && data.cleanup())
    return {
      deps,
      hooksData,
      run(fn: () => void | undefined | VoidFunction) {
        runWithOwner(owner, () => (data.cleanup = fn()))
      },
      cleanup: null as VoidFunction | null | undefined | void,
    }
  })

  if (useDeps(data, deps)) {
    pushEffectQueue(() => data.run(effect))
  }
}
