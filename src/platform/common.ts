declare const id: unique symbol

export type Id<A> = string & { [id]: A }

declare const type: unique symbol

export type Sequence = number & { [type]: 'sequence' }

export const sequenceStart = 0 as Sequence
export const sequenceNext = (s: Sequence): Sequence => s + 1 as Sequence
