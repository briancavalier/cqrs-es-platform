export type Log<Message> = <M extends Message>(m: M) => void

export const filter = <M>(p: (m: M) => boolean, l: Log<M>): Log<M> =>
  m => p(m) ? l(m) : void 0

export const context = <C, M>(c: C, l: Log<M>): Log<Omit<M, keyof C>> =>
  m => l({ ...c, ...m } as M)

export type LogMessage = {
  msg: string,
}

export const lambdaLog = <M>(c: Console = console): Log<M> => m => c.log(JSON.stringify(m))
