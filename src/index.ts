/*

Don't do this at home, kids.

This is a proof of concept of how to implement hooks in Solid.

It's not meant to be used in production, but rather to show how it could be done.

It's not even complete, it's just a few hooks to show how it could work.

Hooks to implement:
- [x] useId
- [x] useState
- [x] useRef
- [x] useCallback
- [ ] useMemo
- [ ] useLayoutEffect
- [ ] useEffect
- [ ] useReducer
- [ ] useImperativeHandle
- [ ] useDeferredValue
- [ ] useSyncExternalStore
- [ ] useEvent


brb 22:00

*/

import { createComputed, createRoot, createSignal, getOwner, onCleanup } from 'solid-js'
import type { Computation, SignalState } from 'solid-js/types/reactive/signal'

declare module 'solid-js' {
  interface Owner {
    hooksData?: HooksData
  }
}

type HooksData = {
  trigger: {
    trigger: VoidFunction
    signal: SignalState<unknown>
  }
  index: number
  data: (RefData | StateData<any> | IdData | CallbackData<any>)[]
  onCleanup: VoidFunction | undefined
}

type RefData = { current: any }

function getHookData<T extends HooksData['data'][number]>(factory: (hooksData: HooksData) => T): T {
  const owner = getOwner() as Computation<unknown>
  if (!owner) {
    throw new Error(process.env.DEV ? 'hooks can only be used inside a computation.' : '')
  }

  const hooksData =
    owner.hooksData ??
    (owner.hooksData = (() => {
      let signal!: SignalState<unknown>
      let trigger!: VoidFunction

      createRoot(() => {
        const [trackTrigger, _trigger] = createSignal(undefined, { equals: false })
        trigger = _trigger
        let init = true
        createComputed(() => {
          if (!init) return
          init = false
          trackTrigger()
          const cOwner = getOwner() as Computation<unknown>
          signal = cOwner.sources![0]!
          cOwner.sources = cOwner.sourceSlots = signal.observerSlots = signal.observers = null
        })
      })

      return {
        index: 0,
        data: [],
        onCleanup: undefined,
        trigger: { signal, trigger },
      }
    })())

  if (!hooksData.onCleanup) {
    onCleanup(
      (hooksData.onCleanup = () => {
        hooksData.index = 0
        hooksData.onCleanup = undefined
      }),
    )

    const signal = hooksData.trigger.signal
    // force subscribe owner to trigger signal
    if (owner.sources) {
      owner.sources.push(signal)
      owner.sourceSlots!.push(0)
    } else {
      owner.sources = [signal]
      owner.sourceSlots = [0]
    }
    signal.observerSlots = [0]
    signal.observers = [owner]
  }

  let hookData: T

  // init
  if (hooksData.index >= hooksData.data.length) hooksData.data.push((hookData = factory(hooksData)))
  else hookData = hooksData.data[hooksData.index]! as T

  hooksData.index++

  return hookData
}

function compareDeps(prevDeps: any[], deps: any[]): boolean {
  if (prevDeps.length !== deps.length) {
    // eslint-disable-next-line no-console
    process.env.DEV && console.warn('deps length changed')
    return false
  }
  for (let i = 0; i < deps.length; i++) {
    if (!Object.is(prevDeps[i], deps[i])) return false
  }
  return true
}

type IdData = string

const getNewId = () => Math.random().toString(36).substring(2, 9)

export function useId(): string {
  return getHookData<IdData>(getNewId)
}

export function useRef<T>(initValue: T): { current: T } {
  return getHookData<RefData>(() => ({ current: initValue }))
}

export type StateSetter<T> = (value: T | ((prev: T) => T)) => void

type StateData<T> = {
  value: T
  setter: StateSetter<T>
}

export function useState<T>(initValue: T | (() => T)): [T, StateSetter<T>] {
  const stateData = getHookData<StateData<T>>(hooksData => {
    const obj: StateData<T> = {
      value: typeof initValue === 'function' ? (initValue as () => T)() : initValue,
      setter(newValue) {
        obj.value =
          typeof newValue === 'function' ? (newValue as (prev: T) => T)(obj.value) : newValue
        hooksData.trigger.trigger()
      },
    }
    return obj
  })

  return [stateData.value, stateData.setter]
}

type CallbackData<T extends (...args: any[]) => any> = {
  callback: T
  deps: any[]
}

export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T {
  let init = false
  const data = getHookData<CallbackData<T>>(() => {
    init = true
    return { callback: fn, deps }
  })

  if (!init && !compareDeps(data.deps, deps)) {
    data.callback = fn
    data.deps = deps
  }

  return data.callback
}
