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
  - [ ] add only if listener is present
- [x] useMemo
- [x] useEffect
- [x] useLayoutEffect
- [ ] useReducer
- [ ] useImperativeHandle
- [ ] useDeferredValue
- [ ] useSyncExternalStore
- [ ] useEvent

*/

import {
  batch,
  createComputed,
  createEffect,
  createRoot,
  createSignal,
  getOwner,
  onCleanup,
  runWithOwner,
} from 'solid-js'
import { Computation, SignalState } from 'solid-js/types/reactive/signal'

declare module 'solid-js/types/reactive/signal' {
  interface Owner {
    hooksData?: HooksData
  }
}

type HooksData = {
  owner: Computation<unknown>
  trigger: {
    updated: boolean
    trigger: VoidFunction
    signal: SignalState<unknown>
  }
  index: number
  data: (RefData | StateData<any> | IdData | CallbackData<any> | MemoData<any> | EffectData)[]
  onCleanup: VoidFunction | undefined
  onDispose: VoidFunction[]
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

      createRoot(dispose => {
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
          dispose()
        })
      })

      // Cleanups returned from thew effect and layoutEffect are called when the component is unmounted
      const onDisposeList: VoidFunction[] = []
      const parent = owner.owner
      if (parent) {
        const onDispose = () => {
          for (const dispose of onDisposeList) dispose()
        }
        if (parent.cleanups) parent.cleanups.push(onDispose)
        else parent.cleanups = [onDispose]
      }

      return {
        owner,
        index: 0,
        data: [],
        onCleanup: undefined,
        trigger: { signal, trigger, updated: false },
        onDispose: onDisposeList,
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

function compareDeps(prevDeps?: any[], deps?: any[]): boolean {
  if (!prevDeps) return false
  if (prevDeps.length !== deps!.length) {
    // eslint-disable-next-line no-console
    process.env.DEV && console.warn('deps length changed')
    return false
  }
  for (let i = 0; i < deps!.length; i++) {
    if (!Object.is(prevDeps[i], deps![i])) return false
  }
  return true
}

type IdData = string

const getNewId = () => Math.random().toString(36).substring(2, 9)

export function useId(): string {
  return getHookData<IdData>(getNewId)
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
export function useRef<T>(initialValue?: T): MutableRefObject<T> {
  return getHookData<RefData>(() => ({ current: initialValue }))
}

type CallbackData<T extends (...args: any[]) => any> = {
  callback: T
  deps?: any[]
}

export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T {
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

type MemoData<T> = {
  value: T
  deps?: any[]
}

export function useMemo<T>(calculateValue: () => T, deps?: any[]): T {
  let init = false
  const data = getHookData<MemoData<T>>(() => {
    init = true
    return { value: calculateValue(), deps }
  })

  if (!init && !compareDeps(data.deps, deps)) {
    data.value = calculateValue()
    data.deps = deps
  }

  return data.value
}

// ? make it into a set?
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

export type StateSetter<T> = (value: T | ((prev: T) => T)) => void

type StateData<T> = {
  value: T
  setter: StateSetter<T>
}

const getNextValue = <T>(newValue: T | ((prev: T) => T), prevValue: T) =>
  typeof newValue === 'function' ? (newValue as (prev: T) => T)(prevValue) : newValue

export function useState<T>(initValue: T | (() => T)): [T, StateSetter<T>] {
  const stateData = getHookData<StateData<T>>(hooksData => {
    const obj: StateData<T> = {
      value: typeof initValue === 'function' ? (initValue as () => T)() : initValue,
      setter(newValue) {
        if (!hooksData.trigger.updated) {
          obj.value = getNextValue(newValue, obj.value)
          hooksData.trigger.updated = true
          runTriggerQueue()
          TriggerQueue.push(() => {
            hooksData.trigger.trigger()
            hooksData.trigger.updated = false
          })
        } else {
          TriggerQueue.push(() => {
            obj.value = getNextValue(newValue, obj.value)
          })
        }
      },
    }
    return obj
  })

  return [stateData.value, stateData.setter]
}

const EffectQueue: VoidFunction[] = []

const [trackEffectQueueSignal, triggerEffectQueue] = createSignal(
  void 0,
  process.env.DEV ? { name: 'effectQueue', equals: false } : { equals: false },
)

createRoot(() => {
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
})

function pushEffectQueue(fn: VoidFunction) {
  EffectQueue.push(fn) === 1 && triggerEffectQueue()
}

type EffectData = {
  deps?: any[]
  cleanup?: VoidFunction
  run: (fn: () => void | undefined | VoidFunction) => void
}

export function useEffect(effect: () => void | undefined | VoidFunction, deps?: any[]): void {
  let init = false
  const data = getHookData<EffectData>(hooksData => {
    init = true
    return {
      deps,
      run(fn) {
        runWithOwner(hooksData.owner, () => {
          data.cleanup && hooksData.onDispose.splice(hooksData.onDispose.indexOf(data.cleanup), 1)
          const cleanup = fn()
          if (cleanup) hooksData.onDispose.push((data.cleanup = cleanup))
        })
      },
    }
  })

  if (init || !compareDeps(data.deps, deps)) {
    data.deps = deps
    runTriggerQueue()
    TriggerQueue.push(() => data.run(effect))
  }
}

export function useLayoutEffect(effect: () => void | undefined | VoidFunction, deps?: any[]): void {
  let init = false
  const data = getHookData<EffectData>(hooksData => {
    init = true
    return {
      deps,
      run(fn) {
        runWithOwner(hooksData.owner, () => {
          data.cleanup && hooksData.onDispose.splice(hooksData.onDispose.indexOf(data.cleanup), 1)
          const cleanup = fn()
          if (cleanup) hooksData.onDispose.push((data.cleanup = cleanup))
        })
      },
    }
  })

  if (init || !compareDeps(data.deps, deps)) {
    data.deps = deps
    pushEffectQueue(() => data.run(effect))
  }
}
