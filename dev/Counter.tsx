import { Component, createMemo } from 'solid-js'
import { useEffect, useRef, useState } from '../src'

export const Counter: Component = () => {
  const count = createMemo(() => {
    const [count, setCount] = useState(0)
    const savedCallback = useRef<VoidFunction>()

    useEffect(() => {
      savedCallback.current = () => {
        setCount(count + 1)
      }
    })

    useEffect(() => {
      let id = setInterval(() => savedCallback.current!(), 1000)
      return () => clearInterval(id)
    }, [])

    return count
  })

  return <h1>Count {count()}</h1>
}
