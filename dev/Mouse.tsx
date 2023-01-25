import { destructure } from '@solid-primitives/destructure'
import { Component, createMemo } from 'solid-js'
import { useEffect, useMemo, useState, useSyncExternalStore } from '../src/hooks'

function useMousePosition() {
  const [lastEvent, setLastEvent] = useState<MouseEvent | null>(null)

  useEffect(() => {
    window.addEventListener('mousemove', setLastEvent)
    return () => window.removeEventListener('mousemove', setLastEvent)
  }, [])

  return useMemo(
    () => ({
      x: lastEvent?.clientX ?? 0,
      y: lastEvent?.clientY ?? 0,
    }),
    [lastEvent],
  )
}

export const MousePosition: Component = () => {
  console.log('MousePosition is rendered only once!! 🤯')

  const pos = createMemo(() => {
    const { x, y } = useMousePosition()

    const { width, height } = useSyncExternalStore(
      trigger => {
        window.addEventListener('resize', trigger)
        return () => window.removeEventListener('resize', trigger)
      },
      () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    )

    return { x, y, width, height }
  })

  const { x, y, width, height } = destructure(pos, { memo: true })

  return (
    <div>
      <p>
        The current mouse position is ({x()}, {y()})
      </p>
      <p>
        The current window size is ({width()}, {height()})
      </p>
    </div>
  )
}
