import { SQSEvent } from 'aws-lambda'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, paginateQuery, TransactWriteCommand } from '@aws-sdk/lib-dynamodb'

import { todoList } from './todo-list'
import { Aggregate, CommandEnvelope, EventEnvelope, sequenceNext, sequenceStart } from 'src/platform/aggregate'
import { context, LogMessage, lambdaLog } from 'src/platform/log'

const log = lambdaLog<LogMessage>(console)

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const tableName = process.env.TABLE_NAME

const commandHandler = <State, Event, Command, EventId extends string, AggregateName extends string, AggregateId extends string, CorrelationId extends string>(
  { name, nextState, interpretCommand }: Aggregate<AggregateName, Command, Event, State>
) => {
  return async (batch: SQSEvent): Promise<void> => {
    const results = await Promise.allSettled(batch.Records.map(async r => {
      const { command, ...env } = JSON.parse(r.body) as CommandEnvelope<AggregateName, AggregateId, string, string, Command>
      const rlog = context(env, log)

      rlog({ msg: 'handling command', commandId: env.commandId })

      const events = paginateQuery({ client: ddb }, {
        TableName: tableName,
        KeyConditionExpression: `id = :id`,
        ExpressionAttributeValues: {
          ':id': env.aggregateId
        },
        ScanIndexForward: true
      })

      let state = undefined
      let lastSequence = sequenceStart
      for await (const { Items } of events) {
        if (Items?.[0]) {
          const { event, sequence } = Items[0] as EventEnvelope<AggregateName, AggregateId, EventId, CorrelationId, Event>
          state = nextState(event, state)
          lastSequence = sequence
        }
      }

      lastSequence = sequenceNext(lastSequence)

      const newEvents = interpretCommand(command, state)

      rlog({ msg: 'aggregate events', command, state, lastSequence, newEvents })

      if (newEvents.length === 0) return

      const updates = newEvents.map((event, i) => ({
        Put: {
          TableName: tableName,
          Item: {
            id: env.aggregateId,
            sequence: lastSequence + i,
            aggregate: name,
            aggregateId: env.aggregateId,
            correlationId: env.correlationId,
            event,
          }
        }
      } as const))

      return ddb.send(new TransactWriteCommand({
        TransactItems: updates
      }))
    }))

    log({ msg: 'done', results })
  }
}

export const handler = commandHandler(todoList)
