export type CommandEnvelope<Aggregate, AggregateId, CommandId, CorrelationId, Command> = {
  correlationId: CorrelationId,
  aggregate: Aggregate,
  aggregateId: AggregateId,
  commandId: CommandId,
  command: Command,
}

export type EventEnvelope<Aggregate, AggregateId, EventId, CorrelationId, Event> = {
  correlationId: CorrelationId,
  eventId: EventId,
  aggregate: Aggregate,
  aggregateId: AggregateId,
  sequence: Sequence,
  event: Event
}

export type Aggregate<Name, Command, Event, State> = {
  name: Name,
  nextState: (e: Event, s?: State) => State
  interpretCommand: (c: Command, s?: State) => readonly Event[]
}

export const aggregate = <Name, Command, Event, State>(
  name: Name,
  nextState: (e: Event, s?: State) => State,
  interpretCommand: (c: Command, s?: State) => readonly Event[]
): Aggregate<Name, Command, Event, State> => ({
  name, nextState, interpretCommand
})

declare const id: unique symbol

export type Id<A> = string & { [id]: A }

declare const type: unique symbol

export type Sequence = number & { [type]: 'sequence' }

export const sequenceStart = 0 as Sequence
export const sequenceNext = (s: Sequence): Sequence => s + 1 as Sequence
