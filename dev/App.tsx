import { Component, createMemo, createSignal, untrack } from 'solid-js'
import { useCallback, useId, useRef, useState } from '../src'

const App: Component = () => {
  const [count, setCount] = createSignal(0)
  const [multiplier, setMultiplier] = createSignal(1)

  const increment = () => setCount(count() + 1)

  let i = 0

  const memo = createMemo(() => {
    const ref = useRef(`${i++}`)
    const id = useId()

    ref.current += ref.current[0]

    console.log(ref.current, count(), id)

    return count()
  })

  const stateMemo = createMemo(() => {
    const ref = useRef(`${i++}`)
    ref.current += ref.current[0]
    console.log(ref.current)

    const multiplierValue = multiplier()

    const [count, setCount] = untrack(() => useState(() => 0))

    const increment = useCallback(() => {
      setCount(p => p + 1 * multiplierValue)
    }, [multiplierValue])

    return { count, increment }
  })

  return (
    <div class="p-24 box-border w-full min-h-screen flex flex-col justify-center items-center space-y-4 bg-gray-800 text-white">
      <div class="wrapper-v">
        <h4>{'Counter component'}</h4>
        <p class="caption">useRef</p>
        <button class="btn" onClick={increment}>
          {memo()}
        </button>
        <p class="caption">useState</p>
        <button
          class="btn"
          onClick={e => setMultiplier(p => ++p)}
          onContextMenu={e => {
            e.preventDefault()
            setMultiplier(p => --p)
          }}
        >
          M: {multiplier()}
        </button>
        <button class="btn" onClick={() => stateMemo().increment()}>
          {stateMemo().count}
        </button>
      </div>
    </div>
  )
}

export default App
