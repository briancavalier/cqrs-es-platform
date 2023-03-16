export type CommandEnvelope<Aggregate, CollationId, Command> = {
  aggregate: Aggregate,
  collationId: CollationId,
  command: Command
}
