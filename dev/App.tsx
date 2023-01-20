import { Component, createMemo, createSignal, untrack } from 'solid-js'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from '../src'

const Counter = () => {
  const count = createMemo(() => {
    const n = useRef(0)
    console.log('n', n.current++)

    const [count, setCount] = useState(0)
    console.log('-', count)
    const savedCallback = useRef<VoidFunction>()

    function callback() {
      console.log(n.current, 'update', count + 1)
      setCount(count + 1)
    }

    useEffect(() => {
      console.log(n.current, 'effect 1', count)
      savedCallback.current = callback
    })

    useEffect(() => {
      console.log('2')
      function tick() {
        savedCallback.current!()
      }

      let id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }, [])

    return count
  })

  return <h1>Count {count()}</h1>
}

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
    const el = useRef<HTMLElement | null>(null)

    const ref = useRef(`${i++}`)
    ref.current += ref.current[0]
    // console.log(ref.current)

    const multiplierValue = multiplier()

    const [count, setCount] = untrack(() => useState(() => 0))
    console.log('count', count)
    const double = useMemo(() => count * 2, [count])

    const increment = useCallback(() => {
      setCount(p => p + 1 * multiplierValue)
    }, [multiplierValue])

    useEffect(() => {
      console.log('effect', count, el.current?.innerText)
      return () => {
        console.log("cleanup 'effect'")
      }
    }, [count])

    useLayoutEffect(() => {
      console.log('layout effect', count, el.current?.innerText)
      return () => {
        console.log('cleanup layout effect')
      }
    }, [count])

    return { count, increment, double, el }
  })

  // createEffect(() => {
  //   // sources
  //   const countValue = count()
  //   const init = useRef(true)
  //   if (init.current) return (init.current = false)
  //   // effect
  //   console.log('3 effect', countValue)
  // })

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
        <button
          class="btn"
          onClick={() => stateMemo().increment()}
          ref={el => (stateMemo().el.current = el)}
        >
          C: {stateMemo().count} D: {stateMemo().double}
        </button>
        <Counter />
      </div>
    </div>
  )
}

export default App
