import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { CommandEnvelope } from 'src/platform/aggregate'
import { LogMessage, lambdaLog } from 'src/platform/log'

const log = lambdaLog<LogMessage>(console)

const client = new SQSClient({})
const commandQueueUrl = process.env.COMMAND_QUEUE_URL as string

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  log({ msg: 'handling request', request: event })

  if (event.body === null) return { statusCode: 400, body: '' }

  const command = JSON.parse(event.body) as CommandEnvelope<string, string, string, string, unknown>
  const c = { ...command, correlationId: getCorrelationId(event) }

  log({ msg: 'sending command', ...c })

  await client.send(new SendMessageCommand({
    MessageGroupId: command.aggregate,
    MessageDeduplicationId: command.commandId,
    QueueUrl: commandQueueUrl,
    MessageBody: JSON.stringify(c)
  }))

  return { statusCode: 202, body: '' }
}

export const getCorrelationId = (
  event: APIGatewayProxyEvent
): string | undefined => {
  const traceId = event.headers["X-Amzn-Trace-Id"]
  return traceId && parseAmznTraceIdRoot(traceId) || event.requestContext.requestId
}


export const parseAmznTraceIdRoot = (
  amznTraceIdHeader: string
): string | undefined => {
  const result = amznTraceIdRootRegExp.exec(amznTraceIdHeader)
  return result ? result[1] : undefined
}

const amznTraceIdRootRegExp = /Root=([-a-fA-F0-9]+)/
