import { Component, createMemo, createSignal, untrack } from "solid-js"
import { useId, useRef, useState } from "../src"

const App: Component = () => {
  const [count, setCount] = createSignal(0)

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

    console.log(ref.current, count())

    return untrack(() => {
      const [count, setCount] = useState(() => {
        console.log("useState called")
        return 0
      })

      return { count, setCount }
    })
  })

  return (
    <div class="p-24 box-border w-full min-h-screen flex flex-col justify-center items-center space-y-4 bg-gray-800 text-white">
      <div class="wrapper-v">
        <h4>{"Counter component"}</h4>
        <p class="caption">useRef</p>
        <button class="btn" onClick={increment}>
          {memo()}
        </button>
        <p class="caption">useState</p>
        <button class="btn" onClick={() => stateMemo().setCount(p => ++p)}>
          {stateMemo().count}
        </button>
      </div>
    </div>
  )
}

export default App
