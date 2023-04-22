import { Id, aggregate } from 'src/platform/aggregate'

export type Todo = Readonly<{
  id: Id<Todo>
  description: string
  complete: boolean
}>

export type TodoList = Readonly<{
  id: Id<TodoList>,
  name: string,
  todos: Record<Id<Todo>, Todo>
  archived: boolean
}>

export type TodoListCommand =
  | Readonly<{ key: 'todo-list/create', id: Id<TodoList>, name: string }>
  | Readonly<{ key: 'todo-list/archive', id: Id<TodoList> }>
  | Readonly<{ key: 'todo-list/rename', id: Id<TodoList>, name: string }>
  | Readonly<{ key: 'todo-list/todo-add', id: Id<Todo>, todo: Todo }>
  | Readonly<{ key: 'todo-list/todo-complete', id: Id<Todo> }>
  | Readonly<{ key: 'todo-list/todo-uncomplete', id: Id<Todo> }>
  | Readonly<{ key: 'todo-list/todo-update-description', id: Id<Todo>, description: string }>

export type TodoListEvent =
  | Readonly<{ key: 'todo-list/created', id: Id<TodoList>, name: string }>
  | Readonly<{ key: 'todo-list/archived', id: Id<TodoList> }>
  | Readonly<{ key: 'todo-list/renamed', id: Id<TodoList>, name: string }>
  | Readonly<{ key: 'todo-list/todo-added', todo: Todo }>
  | Readonly<{ key: 'todo-list/todo-completed', id: Id<Todo> }>
  | Readonly<{ key: 'todo-list/todo-uncompleted', id: Id<Todo> }>
  | Readonly<{ key: 'todo-list/todo-description-updated', id: Id<Todo>, description: string }>

export const initialState: TodoList = {
  id: '' as Id<TodoList>,
  name: '',
  todos: {},
  archived: false
}

export const nextState = (e: TodoListEvent, s: TodoList = initialState): TodoList =>
  e.key === 'todo-list/created' ? { ...initialState, id: e.id, name: e.name }
    : e.key === 'todo-list/archived' ? { ...s, archived: true }
      : e.key === 'todo-list/renamed' ? { ...s, name: e.name }
        : e.key === 'todo-list/todo-added' ? { ...s, todos: { ...s.todos, [e.todo.id]: e.todo } }
          : e.key === 'todo-list/todo-completed' ? { ...s, todos: { ...s.todos, [e.id]: { ...s.todos[e.id], complete: true } } }
            : e.key === 'todo-list/todo-uncompleted' ? { ...s, todos: { ...s.todos, [e.id]: { ...s.todos[e.id], complete: false } } }
              : e.key === 'todo-list/todo-description-updated' ? { ...s, todos: { ...s.todos, [e.id]: { ...s.todos[e.id], description: e.description } } }
                : s

export const interpretCommand = (c: TodoListCommand, s: TodoList = initialState): readonly TodoListEvent[] =>
  c.key === 'todo-list/create' && s === initialState ? [{ key: 'todo-list/created', id: c.id, name: c.name }]
    : c.key === 'todo-list/archive' && !s.archived ? [{ key: 'todo-list/archived', id: c.id }]
      : c.key === 'todo-list/rename' && s.name !== c.name ? [{ key: 'todo-list/renamed', id: c.id, name: c.name }]
        : c.key === 'todo-list/todo-add' && s.todos[c.todo.id] === undefined ? [{ key: 'todo-list/todo-added', todo: c.todo }]
          : c.key === 'todo-list/todo-complete' && s.todos[c.id]?.complete === false ? [{ key: 'todo-list/todo-completed', id: c.id }]
            : c.key === 'todo-list/todo-uncomplete' && s.todos[c.id]?.complete === true ? [{ key: 'todo-list/todo-uncompleted', id: c.id }]
              : c.key === 'todo-list/todo-update-description' && typeof s.todos[c.id]?.description === 'string' && s.todos[c.id]?.description !== c.description ? [{ key: 'todo-list/todo-description-updated', id: c.id, description: c.description }]
                : []

export const todoList = aggregate(
  'todo-list',
  nextState,
  interpretCommand
)
