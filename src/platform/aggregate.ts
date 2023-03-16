export type Aggregate<Command, InputEvent, OutputEvent, State> = {
  zeroState: State,
  nextState: (s: State, e: InputEvent) => State
  interpretCommand: (s: State, c: Command) => readonly OutputEvent[]
}

export const handleCommand = <Command, InputEvent, OutputEvent, State>(
  a: Aggregate<Command, InputEvent, OutputEvent, State>,
  c: Command,
  e: readonly InputEvent[]
): readonly OutputEvent[] =>
  a.interpretCommand(e.reduce(a.nextState, a.zeroState), c)
