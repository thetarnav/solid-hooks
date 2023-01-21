import { Key } from '@solid-primitives/keyed'
import { batch, Component, createMemo, createSignal, Show } from 'solid-js'
import { Reducer, useReducer, useState } from '../src'

type Task = {
  readonly id: number
  readonly text: string
  readonly done: boolean
}

const TaskList: Component<{
  tasks: readonly Task[]
  onChangeTask: (task: Task) => void
  onDeleteTask: (taskId: number) => void
}> = props => {
  return (
    <ul>
      <Key each={props.tasks} by="id">
        {task => (
          <li>
            <Task task={task()} onChange={props.onChangeTask} onDelete={props.onDeleteTask} />
          </li>
        )}
      </Key>
    </ul>
  )
}

const Task: Component<{
  task: Task
  onChange: (task: Task) => void
  onDelete: (taskId: number) => void
}> = props => {
  const [isEditing, setIsEditing] = createSignal(false)

  return (
    <label>
      <input
        type="checkbox"
        checked={props.task.done}
        onChange={e => {
          props.onChange({
            ...props.task,
            done: e.currentTarget.checked,
          })
        }}
      />
      <Show
        when={isEditing()}
        fallback={
          <>
            {props.task.text}
            <button onClick={() => setIsEditing(true)}>Edit</button>
          </>
        }
      >
        <input
          value={props.task.text}
          onChange={e => {
            props.onChange({
              ...props.task,
              text: e.currentTarget.value,
            })
          }}
        />
        <button onClick={() => setIsEditing(false)}>Save</button>
      </Show>
      <button onClick={() => props.onDelete(props.task.id)}>Delete</button>
    </label>
  )
}

const AddTask: Component<{
  onAddTask: (text: string) => void
}> = props => {
  const text = createMemo(() => {
    const [text, setText] = useState('')
    return { text, setText }
  })
  return (
    <>
      <input
        placeholder="Add task"
        value={text().text}
        onChange={e => text().setText(e.currentTarget.value)}
      />
      <button
        onClick={() => {
          batch(() => {
            text().setText('')
            props.onAddTask(text().text)
          })
        }}
      >
        Add
      </button>
    </>
  )
}

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
