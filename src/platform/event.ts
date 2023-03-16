import { Sequence } from './common'

export type EventEnvelope<Aggregate, CollationId, Event> = {
  aggregate: Aggregate,
  sequence: Sequence
  collationId: CollationId,
  event: Event
}
