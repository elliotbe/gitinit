import { noNew, reduceStr } from '../utils.js'
import { showCur, hideCur, left, lineClear, dw, bb } from '../ansi-escape.js'

class Spinner {
  constructor(message, charArray) {
    this.charArray = charArray || ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
    this.message = message || 'Loading…'
  }

  write = (...args) => {
    process.stdout.write(reduceStr(...args))
  }

  sigintHandle = () => {
    console.log(showCur)
    process.exit()
  }

  start = () => {
    let i = 0
    this.write(hideCur, left(2000), bb(this.charArray[i]), ` ${dw(this.message)}`)
    this.interval = setInterval(() => {
      i = ++i % this.charArray.length
      this.write(lineClear(), left(2000), bb(this.charArray[i]), ` ${dw(this.message)}`)
    }, 400)
    process.on('SIGINT', this.sigintHandle)
  }

  stop = () => {
    if (this.interval) {
      this.write(showCur, lineClear(), left(2000))
      clearInterval(this.interval)
      process.removeListener('SIGINT', this.sigintHandle)
    } else {
      throw new Error('Spinner.stop() callsed before Spinner.start()')
    }
  }
}

export default noNew(Spinner)
