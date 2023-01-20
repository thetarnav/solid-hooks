# solid-react-hooks

A library we don't deserve, but also never wanted.

React hooks API in SolidJS.

## Examples:

### Dev playground

A kitchen sink of examples: https://github.com/thetarnav/solid-hooks/blob/main/dev/App.tsx

### Simple counter

https://playground.solidjs.com/anonymous/f33901ee-0f0a-4ee4-8781-595109541805

```ts
const App: Component = () => {
  const count = createMemo(() => {
    const [count, setCount] = useState(0)

    useEffect(() => {
      setInterval(() => {
        setCount(p => ++p)
      }, 1000)
    }, [])

    return count
  })

  return <h1>Count {count()}</h1>
}
```

### Complete react counter

https://playground.solidjs.com/anonymous/b3c45398-92eb-479f-b9c8-d63afabd76fc

```ts
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
