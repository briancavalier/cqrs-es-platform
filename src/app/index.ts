import { App, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway'
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { SqsEventSource, DynamoEventSource, SnsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { AttributeType, BillingMode, Table, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'
import { todoList } from './aggregate/todo-list/todo-list'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'

const app = new App()
const stack = new Stack(app, 'cqrs-es-example')
const api = new RestApi(stack, 'todo-list-app-api')

// ---------------------------------------------------
// Aggregate

const commandStream = new Queue(stack, 'Command-Queue', {
  fifo: true
})

const todoEventStore = new Table(stack, `${todoList.name}-events`, {
  tableName: `${todoList.name}-events`,
  partitionKey: { name: 'id', type: AttributeType.STRING },
  sortKey: { name: 'sequence', type: AttributeType.NUMBER },
  billingMode: BillingMode.PAY_PER_REQUEST,
  stream: StreamViewType.NEW_IMAGE,
  removalPolicy: RemovalPolicy.DESTROY
})

const handleCommand = new NodejsFunction(stack, `${todoList.name}-handle-command`, {
  entry: 'src/app/aggregate/todo-list/handler.ts',
  runtime: Runtime.NODEJS_18_X,
  environment: {
    TABLE_NAME: todoEventStore.tableName
  }
})

commandStream.grantConsumeMessages(handleCommand)
todoEventStore.grantReadWriteData(handleCommand)

handleCommand.addEventSource(new SqsEventSource(commandStream))

// ---------------------------------------------------
// Aggregate output event stream

const todoListEventStream = new Topic(stack, `${todoList.name}-event-topic`)

const publishTodoEvents = new NodejsFunction(stack, `${todoList.name}-ddb-stream-publisher`, {
  entry: 'src/app/ddb-publish-event.ts',
  runtime: Runtime.NODEJS_18_X,
  environment: {
    EVENT_TOPIC_ARN: todoListEventStream.topicArn
  }
})

todoListEventStream.grantPublish(publishTodoEvents)

publishTodoEvents.addEventSource(new DynamoEventSource(todoEventStore, {
  startingPosition: StartingPosition.LATEST,
}))

// ---------------------------------------------------
// Aggregate API

const postCommand = new NodejsFunction(stack, `${todoList.name}-post-command`, {
  entry: 'src/app/post-command.ts',
  runtime: Runtime.NODEJS_18_X,
  environment: {
    COMMAND_QUEUE_URL: commandStream.queueUrl
  }
})

commandStream.grantSendMessages(postCommand)

const todoListApiResource = api.root.addResource(todoList.name)
todoListApiResource.addMethod('POST', new LambdaIntegration(postCommand))

// ---------------------------------------------------
// Projection

// const todoListProjectionQueue = new Queue(stack, 'todo-list-projection-queue', {
//   fifo: true
// })

// todoListEventStream.addSubscription(new SqsSubscription(todoListProjectionQueue))

const todoListProjectionTable = new Table(stack, 'todo-list-projection', {
  tableName: 'todo-list-projection',
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  removalPolicy: RemovalPolicy.DESTROY
})

const todoListProjectionHandler = new NodejsFunction(stack, `${todoList.name}-projection-handler`, {
  entry: 'src/app/projection/todo-list/handler.ts',
  runtime: Runtime.NODEJS_18_X,
  environment: {
    TABLE_NAME: todoListProjectionTable.tableName
  }
})

todoListProjectionTable.grantReadWriteData(todoListProjectionHandler)
// todoListProjectionQueue.grantConsumeMessages(todoListProjectionHandler)
todoListEventStream.addSubscription(new LambdaSubscription(todoListProjectionHandler))

// ---------------------------------------------------
// Build

app.synth()
