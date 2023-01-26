<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=React%20Hooks&background=tiles&project=%20" alt="Solid React Hooks">
</p>

# solid-react-hooks

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![npm](https://img.shields.io/npm/v/solid-react-hooks?style=for-the-badge)](https://www.npmjs.com/package/solid-react-hooks)
[![downloads](https://img.shields.io/npm/dw/solid-react-hooks?color=blue&style=for-the-badge)](https://www.npmjs.com/package/solid-react-hooks)

**React hooks API in SolidJS.**

A library we don't deserve, but also never wanted.

## Overview

This library aims to provide a React Hooks API in SolidJS. It's a thin layer on top of SolidJS primitives, so it's not a magic bullet. It's a tool to help you migrate your React code to SolidJS. Or just have fun with combining two, what might seem like, incompatible systems together :)

### Components don't rerender

In SolidJS the components don't rerender. They are just functions that run once and return real DOM elements. Which mean that if you try to use a hook top-level inside a component, it will only run once and never again. This is why we need to wrap hooks in a `createMemo`/`createEffect` call, or any other computation, because those are the APIs that rerun when their dependencies change.

Calling them outside of computations won't throw, but you'll see a friendly warning in the console.

[**>> CODE DEMO <<**](https://codesandbox.io/p/sandbox/solid-primitives-event-bus-forked-5g4gm)

## Installation

```bash
pnpm add solid-react-hooks
# or
npm install solid-react-hooks
```

## Examples:

### Dev playground

A kitchen sink of examples: https://github.com/thetarnav/solid-hooks/blob/main/dev/App.tsx

### Counter

https://codesandbox.io/p/sandbox/solid-primitives-event-bus-forked-5g4gm

```tsx
const count = createMemo(() => {
  const [count, setCount] = useState(0)
  const savedCallback = useRef()

  function callback() {
    setCount(count + 1)
  }

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    function tick() {
      savedCallback.current()
    }

    let id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return count
})

return <h1>Count {count()}</h1>
```

### useSyncExternalStore

https://github.com/thetarnav/solid-hooks/blob/main/dev/Mouse.tsx

```tsx
const pos = createMemo(() => {
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

  return { width, height }
})

return (
  <div>
    <p>
      The current window size is ({width()}, {height()})
    </p>
  </div>
)
```

### Tasks with useReducer

https://github.com/thetarnav/solid-hooks/blob/main/dev/Tasks.tsx

```tsx
export default function TaskApp() {
  // reducer handler can be defined in the component
  // because it doesn't rerender :)
  const tasksReducer: Reducer<
    readonly Task[],
    | { type: 'added'; id: number; text: string }
    | { type: 'changed'; task: Task }
    | { type: 'deleted'; id: number }
  > = (tasks, action) => {
    switch (action.type) {
      case 'added':
        return [
          ...tasks,
          {
            id: action.id,
            text: action.text,
            done: false,
          },
        ]

      case 'changed':
        return tasks.map(t => {
          if (t.id === action.task.id) {
            return action.task
          } else {
            return t
          }
        })

      case 'deleted':
        return tasks.filter(t => t.id !== action.id)
    }
  }

  const initialTasks = [
    { id: 0, text: 'Visit Kafka Museum', done: true },
    { id: 1, text: 'Watch a puppet show', done: false },
    { id: 2, text: 'Lennon Wall pic', done: false },
  ] as const satisfies readonly Task[]

  const state = createMemo(() => {
    const [tasks, dispatch] = useReducer(tasksReducer, initialTasks)
    return { tasks, dispatch }
  })

  // top-level let is fine
  let nextId = 3

  return (
    <>
      <h1>Prague itinerary</h1>
      <AddTask
        onAddTask={text =>
          state().dispatch({
            type: 'added',
            id: nextId++,
            text: text,
          })
        }
      />
      <TaskList
        tasks={state().tasks}
        onChangeTask={task => state().dispatch({ type: 'changed', task: task })}
        onDeleteTask={id => state().dispatch({ type: 'deleted', id })}
      />
    </>
  )
}
```
