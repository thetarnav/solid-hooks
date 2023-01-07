import {
  createComputed,
  createRoot,
  createSignal,
  getListener,
  getOwner,
  onCleanup,
} from "solid-js"
import type { Computation, SignalState } from "solid-js/types/reactive/signal"

declare module "solid-js" {
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
  data: (RefData | StateData<any> | IdData)[]
  onCleanup: VoidFunction | undefined
}

type RefData = { current: any }

function getHookData<T extends HooksData["data"][number]>(factory: (hooksData: HooksData) => T): T {
  const owner = getOwner() as Computation<unknown>
  if (!owner) {
    throw new Error("hooks can only be used inside a computation.")
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
          const owner = getOwner() as Computation<unknown>
          signal = owner.sources![0]!
          owner.sources = owner.sourceSlots = signal.observerSlots = signal.observers = null
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
      })
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

type IdData = string

export function useId(): string {
  return getHookData<IdData>(() => Math.random().toString(36).substring(2, 9))
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
      value: typeof initValue === "function" ? (initValue as () => T)() : initValue,
      setter(newValue) {
        obj.value =
          typeof newValue === "function" ? (newValue as (prev: T) => T)(obj.value) : newValue
        hooksData.trigger.trigger()
      },
    }
    return obj
  })

  return [stateData.value, stateData.setter]
}
