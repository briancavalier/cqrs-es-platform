import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { DynamoDBStreamEvent } from 'aws-lambda'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { AttributeValue } from '@aws-sdk/client-dynamodb'
import { EventEnvelope } from 'src/platform/aggregate'
import { LogMessage, lambdaLog } from 'src/platform/log'

const log = lambdaLog<LogMessage>(console)

const sns = new SNSClient({})

const topicArn = process.env.EVENT_TOPIC_ARN as string

export const handler = async ({ Records }: DynamoDBStreamEvent): Promise<void> => {
  const results = await Promise.allSettled(Records.map(({ dynamodb }) => {
    if (dynamodb?.NewImage === undefined) return

    const event = unmarshall(dynamodb?.NewImage as Record<string, AttributeValue>) as EventEnvelope<string, string, string, string, unknown>

    log({ msg: 'producing event', ...event })
    return sns.send(new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event)
    }))
  }))

  log({ msg: 'done', results })
}
