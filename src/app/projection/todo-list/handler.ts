import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { SNSEvent } from 'aws-lambda'
import { nextState, TodoList, TodoListEvent } from 'src/app/aggregate/todo-list/todo-list'
import { EventEnvelope, Id } from 'src/platform/aggregate'
import { LogMessage, context, lambdaLog } from 'src/platform/log'

const log = lambdaLog<LogMessage>(console)

const tableName = process.env.TABLE_NAME
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export const handler = async (e: SNSEvent): Promise<void> => {
  for (const r of e.Records) {
    const { event, ...env } = JSON.parse(r.Sns.Message) as EventEnvelope<string, Id<TodoList>, string, string, TodoListEvent>
    const rlog = context(env, log)

    rlog({ msg: 'handling event', event })

    const todoList = await getTodoList(env.aggregateId)

    const updated = nextState(event, todoList)

    await putTodoList(updated)

    rlog({ msg: 'updated projection', before: todoList, after: updated })
  }
}

const getTodoList = (id: Id<TodoList>): Promise<TodoList | undefined> =>
  ddb.send(new GetCommand({
    TableName: tableName,
    Key: { id }
  })).then(x => x.Item as TodoList | undefined)

const putTodoList = (todoList: TodoList): Promise<unknown> =>
  ddb.send(new PutCommand({
    TableName: tableName,
    Item: todoList
  }))
